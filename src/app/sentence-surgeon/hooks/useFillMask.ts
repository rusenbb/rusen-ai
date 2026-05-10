"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const MODEL_ID = "Xenova/distilbert-base-uncased";

type RawPrediction = {
  token: number;
  token_str: string;
  score: number;
  sequence: string;
};

type FillMaskPipeline = {
  (text: string, options?: { topk?: number }): Promise<RawPrediction[]>;
  tokenizer: {
    tokenize: (text: string) => string[];
    mask_token?: string;
  };
};

export type FillMaskStatus = "idle" | "loading" | "ready" | "error";

export interface FillMaskPrediction {
  token: string;
  score: number;
}

export interface UseFillMask {
  status: FillMaskStatus;
  progress: number;
  error: string | null;
  predict: (sentenceWithMask: string, topk?: number) => Promise<FillMaskPrediction[]>;
  /** Run the model's WordPiece tokenizer. Empty array if not yet ready. */
  tokenize: (text: string) => string[];
}

export function useFillMask(): UseFillMask {
  const [status, setStatus] = useState<FillMaskStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const pipelineRef = useRef<FillMaskPipeline | null>(null);
  const initPromise = useRef<Promise<void> | null>(null);

  const initModel = useCallback(async () => {
    if (initPromise.current) return initPromise.current;
    if (pipelineRef.current) return;

    initPromise.current = (async () => {
      try {
        setStatus("loading");
        setError(null);
        setProgress(0);

        const { pipeline, env } = await import("@huggingface/transformers");
        env.allowLocalModels = false;
        env.useBrowserCache = true;

        const fm = await pipeline("fill-mask", MODEL_ID, {
          device: "wasm",
          progress_callback: (p: { progress?: number; status?: string }) => {
            if (p.progress !== undefined) setProgress(Math.round(p.progress));
          },
        });
        pipelineRef.current = fm as unknown as FillMaskPipeline;
        setStatus("ready");
        setProgress(100);
      } catch (err) {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Failed to load model");
      } finally {
        initPromise.current = null;
      }
    })();

    return initPromise.current;
  }, []);

  const predict = useCallback(
    async (sentenceWithMask: string, topk = 5): Promise<FillMaskPrediction[]> => {
      if (!pipelineRef.current) await initModel();
      if (!pipelineRef.current) throw new Error("Fill-mask model failed to load");
      const out = await pipelineRef.current(sentenceWithMask, { topk });
      return out.map((p) => ({ token: p.token_str.trim(), score: p.score }));
    },
    [initModel],
  );

  const tokenize = useCallback((text: string): string[] => {
    const pipe = pipelineRef.current;
    if (!pipe) return [];
    try {
      return pipe.tokenizer.tokenize(text);
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      initModel();
    }, 400);
    return () => clearTimeout(t);
  }, [initModel]);

  return useMemo(
    () => ({ status, progress, error, predict, tokenize }),
    [status, progress, error, predict, tokenize],
  );
}
