"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type VisionResult = { label: string; score: number };
export type VisionModelStatus = "idle" | "loading" | "ready" | "error";

type ZeroShotImagePipeline = (
  image: string,
  labels: string[]
) => Promise<Array<{ label: string; score: number }>>;

const MODEL_ID = "Xenova/clip-vit-base-patch16";

export interface UseVisionClassifier {
  isLoading: boolean;
  isModelReady: boolean;
  loadProgress: number;
  status: VisionModelStatus;
  error: string | null;
  classify: (imageUrl: string, labels: string[]) => Promise<VisionResult[]>;
}

export function useVisionClassifier(): UseVisionClassifier {
  const [isLoading, setIsLoading] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [status, setStatus] = useState<VisionModelStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const pipelineRef = useRef<ZeroShotImagePipeline | null>(null);
  const initPromise = useRef<Promise<void> | null>(null);

  const initModel = useCallback(async () => {
    if (initPromise.current) return initPromise.current;
    if (pipelineRef.current) return;

    initPromise.current = (async () => {
      try {
        setIsLoading(true);
        setStatus("loading");
        setError(null);
        setLoadProgress(0);

        const { pipeline, env } = await import("@huggingface/transformers");
        env.allowLocalModels = false;
        env.useBrowserCache = true;

        const classifier = await pipeline("zero-shot-image-classification", MODEL_ID, {
          device: "wasm",
          progress_callback: (progress: { progress?: number; status?: string }) => {
            if (progress.progress !== undefined) {
              setLoadProgress(Math.round(progress.progress));
            }
          },
        });

        pipelineRef.current = classifier as unknown as ZeroShotImagePipeline;
        setIsModelReady(true);
        setStatus("ready");
        setLoadProgress(100);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load model";
        setError(message);
        setStatus("error");
        console.error("vision-anything: load failed", err);
      } finally {
        setIsLoading(false);
        initPromise.current = null;
      }
    })();

    return initPromise.current;
  }, []);

  const classify = useCallback(
    async (imageUrl: string, labels: string[]): Promise<VisionResult[]> => {
      if (labels.length < 2) {
        throw new Error("At least 2 labels are required.");
      }
      if (!pipelineRef.current) {
        await initModel();
      }
      if (!pipelineRef.current) {
        throw new Error("Model failed to initialise.");
      }
      const out = await pipelineRef.current(imageUrl, labels);
      return [...out].sort((a, b) => b.score - a.score);
    },
    [initModel],
  );

  useEffect(() => {
    const t = setTimeout(() => {
      initModel();
    }, 400);
    return () => clearTimeout(t);
  }, [initModel]);

  return { isLoading, isModelReady, loadProgress, status, error, classify };
}
