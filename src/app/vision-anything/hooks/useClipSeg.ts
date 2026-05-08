"use client";

import { useCallback, useRef, useState } from "react";

const MODEL_ID = "Xenova/clipseg-rd64-refined";

export type CLIPSegStatus = "idle" | "loading" | "ready" | "error";

export interface AttentionMask {
  /** Sigmoid'd probability per pixel, normalised to [0, 1], row-major. */
  data: Float32Array;
  width: number;
  height: number;
}

export interface UseClipSeg {
  status: CLIPSegStatus;
  progress: number;
  error: string | null;
  load: () => Promise<void>;
  segment: (imageUrl: string, label: string) => Promise<AttentionMask>;
}

export function useClipSeg(): UseClipSeg {
  const [status, setStatus] = useState<CLIPSegStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const tokenizerRef = useRef<unknown>(null);
  const processorRef = useRef<unknown>(null);
  const modelRef = useRef<unknown>(null);
  const initPromise = useRef<Promise<void> | null>(null);

  const load = useCallback(async () => {
    if (initPromise.current) return initPromise.current;
    if (tokenizerRef.current && processorRef.current && modelRef.current) return;

    initPromise.current = (async () => {
      try {
        setStatus("loading");
        setError(null);
        setProgress(0);
        const tf = await import("@huggingface/transformers");
        tf.env.allowLocalModels = false;
        tf.env.useBrowserCache = true;
        // transformers.js's `ProgressCallback` is a discriminated union over
        // download phases. We only care about the "progress" shape; cast keeps
        // the call sites tidy.
        const progress_callback = ((p: { progress?: number }) => {
          if (p.progress !== undefined) setProgress(Math.round(p.progress));
        }) as unknown as Parameters<typeof tf.AutoTokenizer.from_pretrained>[1] extends infer O
          ? O extends { progress_callback?: infer C }
            ? C
            : never
          : never;
        const [tokenizer, processor, model] = await Promise.all([
          tf.AutoTokenizer.from_pretrained(MODEL_ID, { progress_callback }),
          tf.AutoProcessor.from_pretrained(MODEL_ID, { progress_callback }),
          tf.CLIPSegForImageSegmentation.from_pretrained(MODEL_ID, {
            device: "wasm",
            progress_callback,
          }),
        ]);
        tokenizerRef.current = tokenizer;
        processorRef.current = processor;
        modelRef.current = model;
        setStatus("ready");
        setProgress(100);
      } catch (err) {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Failed to load attention model");
      } finally {
        initPromise.current = null;
      }
    })();
    return initPromise.current;
  }, []);

  const segment = useCallback(
    async (imageUrl: string, label: string): Promise<AttentionMask> => {
      if (!modelRef.current || !processorRef.current || !tokenizerRef.current) {
        await load();
      }
      const tokenizer = tokenizerRef.current as unknown as (
        texts: string[],
        opts?: { padding?: boolean; truncation?: boolean },
      ) => Record<string, unknown>;
      const processor = processorRef.current as unknown as (
        image: unknown,
      ) => Promise<Record<string, unknown>>;
      const model = modelRef.current as unknown as (
        inputs: Record<string, unknown>,
      ) => Promise<{ logits: { dims: number[]; data: Float32Array } }>;
      if (!tokenizer || !processor || !model) {
        throw new Error("Attention model not ready");
      }
      const tf = await import("@huggingface/transformers");
      const text_inputs = tokenizer([label], { padding: true, truncation: true });
      const image = await tf.RawImage.read(imageUrl);
      const image_inputs = await processor(image);
      const out = await model({ ...text_inputs, ...image_inputs });
      const dims = out.logits.dims;
      let height: number;
      let width: number;
      if (dims.length === 3) {
        height = dims[1];
        width = dims[2];
      } else if (dims.length === 2) {
        height = dims[0];
        width = dims[1];
      } else {
        throw new Error(`Unexpected logits shape: ${dims.join("x")}`);
      }
      const raw = out.logits.data;
      const total = width * height;
      const mask = new Float32Array(total);
      let mn = Infinity;
      let mx = -Infinity;
      for (let i = 0; i < total; i++) {
        const v = 1 / (1 + Math.exp(-raw[i]));
        mask[i] = v;
        if (v < mn) mn = v;
        if (v > mx) mx = v;
      }
      const range = mx - mn || 1;
      for (let i = 0; i < total; i++) {
        mask[i] = (mask[i] - mn) / range;
      }
      return { data: mask, width, height };
    },
    [load],
  );

  return { status, progress, error, load, segment };
}
