"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { FeatureExtractionPipeline } from "@huggingface/transformers";

// Model to use - all-MiniLM-L6-v2 is small (~23MB) and good for semantic similarity
const MODEL_NAME = "Xenova/all-MiniLM-L6-v2";

export interface UseEmbeddingsReturn {
  isModelLoading: boolean;
  modelProgress: number;
  modelError: string | null;
  isReady: boolean;
  embed: (texts: string[]) => Promise<number[][]>;
  embedSingle: (text: string) => Promise<number[]>;
}

export function useEmbeddings(): UseEmbeddingsReturn {
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [modelProgress, setModelProgress] = useState(0);
  const [modelError, setModelError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const pipelineRef = useRef<FeatureExtractionPipeline | null>(null);
  const loadingPromiseRef = useRef<Promise<FeatureExtractionPipeline> | null>(null);

  // Load the model lazily
  const loadModel = useCallback(async (): Promise<FeatureExtractionPipeline> => {
    // Return existing pipeline if ready
    if (pipelineRef.current) {
      return pipelineRef.current;
    }

    // Return existing loading promise if in progress
    if (loadingPromiseRef.current) {
      return loadingPromiseRef.current;
    }

    // Start loading
    setIsModelLoading(true);
    setModelProgress(0);
    setModelError(null);

    loadingPromiseRef.current = (async () => {
      try {
        // Dynamic import to avoid SSR issues
        const { pipeline, env } = await import("@huggingface/transformers");

        // Configure for browser-only usage
        env.allowLocalModels = false;
        env.useBrowserCache = true;

        const extractor = await pipeline("feature-extraction", MODEL_NAME, {
          progress_callback: (progress: { progress?: number; status?: string }) => {
            if (progress.progress !== undefined) {
              setModelProgress(Math.round(progress.progress));
            }
          },
        });

        pipelineRef.current = extractor;
        setIsReady(true);
        setIsModelLoading(false);
        setModelProgress(100);

        return extractor;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load model";
        setModelError(message);
        setIsModelLoading(false);
        loadingPromiseRef.current = null;
        throw error;
      }
    })();

    return loadingPromiseRef.current;
  }, []);

  // Embed multiple texts
  const embed = useCallback(
    async (texts: string[]): Promise<number[][]> => {
      const extractor = await loadModel();

      // Process in batches to avoid memory issues
      const batchSize = 8;
      const results: number[][] = [];

      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const output = await extractor(batch, {
          pooling: "mean",
          normalize: true,
        });

        // Convert tensor to array
        const embeddings = output.tolist() as number[][];
        results.push(...embeddings);
      }

      return results;
    },
    [loadModel]
  );

  // Embed a single text
  const embedSingle = useCallback(
    async (text: string): Promise<number[]> => {
      const embeddings = await embed([text]);
      return embeddings[0];
    },
    [embed]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pipelineRef.current) {
        pipelineRef.current.dispose?.();
        pipelineRef.current = null;
      }
    };
  }, []);

  return {
    isModelLoading,
    modelProgress,
    modelError,
    isReady,
    embed,
    embedSingle,
  };
}

// Cosine similarity between two vectors
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
