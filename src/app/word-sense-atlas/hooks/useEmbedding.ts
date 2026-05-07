"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MODEL_ID = "mixedbread-ai/mxbai-embed-xsmall-v1";

type FeatureExtractionPipeline = (
  texts: string | string[],
  options?: { pooling?: string; normalize?: boolean }
) => Promise<{ data: Float32Array; dims: number[] }>;

export type EmbeddingStatus = "idle" | "loading" | "ready" | "error";

export interface UseEmbedding {
  status: EmbeddingStatus;
  progress: number;
  error: string | null;
  embedBatch: (texts: string[]) => Promise<Float32Array[]>;
}

export function useEmbedding(): UseEmbedding {
  const [status, setStatus] = useState<EmbeddingStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const pipelineRef = useRef<FeatureExtractionPipeline | null>(null);
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

        const extractor = await pipeline("feature-extraction", MODEL_ID, {
          device: "wasm",
          progress_callback: (p: { progress?: number; status?: string }) => {
            if (p.progress !== undefined) setProgress(Math.round(p.progress));
          },
        });
        pipelineRef.current = extractor as unknown as FeatureExtractionPipeline;
        setStatus("ready");
        setProgress(100);
      } catch (err) {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Failed to load embedding model");
      } finally {
        initPromise.current = null;
      }
    })();

    return initPromise.current;
  }, []);

  const embedBatch = useCallback(async (texts: string[]): Promise<Float32Array[]> => {
    if (!pipelineRef.current) await initModel();
    if (!pipelineRef.current) throw new Error("Model failed to load");

    const out = await pipelineRef.current(texts, { pooling: "mean", normalize: true });
    const dim = out.dims[out.dims.length - 1];
    const result: Float32Array[] = [];
    for (let i = 0; i < texts.length; i++) {
      result.push(out.data.slice(i * dim, (i + 1) * dim));
    }
    return result;
  }, [initModel]);

  useEffect(() => {
    const t = setTimeout(() => {
      initModel();
    }, 400);
    return () => clearTimeout(t);
  }, [initModel]);

  return { status, progress, error, embedBatch };
}
