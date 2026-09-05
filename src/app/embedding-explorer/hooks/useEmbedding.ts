"use client";

import { useState, useCallback, useRef } from "react";

// Type for pipeline function - we use dynamic import
type Pipeline = (texts: string | string[], options?: { pooling?: string; normalize?: boolean }) => Promise<{ data: Float32Array; dims: number[] }>;

export interface UseEmbeddingResult {
  isLoading: boolean;
  isModelReady: boolean;
  loadProgress: number;
  error: string | null;
  backend: "webgpu" | "wasm" | null;
  loadModel: () => Promise<void>;
  embed: (text: string) => Promise<number[] | null>;
  cacheSize: number;
}

// Model configuration
const MODEL_ID = "mixedbread-ai/mxbai-embed-xsmall-v1";

export function useEmbedding(): UseEmbeddingResult {
  const [isLoading, setIsLoading] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [backend, setBackend] = useState<"webgpu" | "wasm" | null>(null);
  const [cacheSize, setCacheSize] = useState(0);

  // Refs for persistence across renders
  const embeddingPipeline = useRef<Pipeline | null>(null);
  const embeddingCache = useRef<Map<string, number[]>>(new Map());
  const initPromise = useRef<Promise<void> | null>(null);

  // Initialize the model
  const initModel = useCallback(async () => {
    // Return existing init promise if in progress
    if (initPromise.current) {
      return initPromise.current;
    }

    // Return immediately if already loaded
    if (embeddingPipeline.current) {
      return;
    }

    initPromise.current = (async () => {
      try {
        setIsLoading(true);
        setError(null);
        setLoadProgress(0);

        // Dynamic import to avoid SSR issues
        const { pipeline, env } = await import("@huggingface/transformers");

        // Configure environment
        env.allowLocalModels = false;
        env.useBrowserCache = true;

        // Always use WASM - WebGPU has inconsistent results across hardware
        const selectedBackend = "wasm";
        setBackend(selectedBackend);

        // Create the pipeline with progress tracking
        const extractor = await pipeline("feature-extraction", MODEL_ID, {
          device: selectedBackend,
          progress_callback: (progress: { progress?: number; status?: string }) => {
            if (progress.progress !== undefined) {
              setLoadProgress(Math.round(progress.progress));
            }
          },
        });

        embeddingPipeline.current = extractor as unknown as Pipeline;
        setIsModelReady(true);
        setLoadProgress(100);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load model";
        setError(message);
        console.error("Error loading embedding model:", err);
      } finally {
        setIsLoading(false);
        initPromise.current = null;
      }
    })();

    return initPromise.current;
  }, []);

  // Embed a single text
  const embed = useCallback(async (text: string): Promise<number[] | null> => {
    const normalizedText = text.toLowerCase().trim();

    // Check cache first
    const cached = embeddingCache.current.get(normalizedText);
    if (cached) {
      return cached;
    }

    // Initialize model if needed
    if (!embeddingPipeline.current) {
      await initModel();
    }

    if (!embeddingPipeline.current) {
      return null;
    }

    try {
      const output = await embeddingPipeline.current(normalizedText, {
        pooling: "mean",
        normalize: true,
      });

      // Verify output shape - should be [1, hidden_dim] after pooling
      if (output.dims?.[0] !== 1) {
        throw new Error("The model returned an unexpected embedding shape.");
      }

      // Convert Float32Array to regular array (pooling already reduces to single vector)
      const embedding = Array.from(output.data);

      if (output.dims.length !== 2 || output.dims[1] !== embedding.length || !embedding.length || embedding.some((value) => !Number.isFinite(value))) throw new Error("The model returned an invalid embedding.");

      // Cache the result
      embeddingCache.current.set(normalizedText, embedding);
      setCacheSize(embeddingCache.current.size);

      return embedding;
    } catch (err) {
      setError(`Could not embed “${text}”: ${err instanceof Error ? err.message : "Inference failed"}. Retry this item.`);
      return null;
    }
  }, [initModel]);

  return {
    isLoading,
    isModelReady,
    loadProgress,
    error,
    backend,
    loadModel: initModel,
    embed,
    cacheSize,
  };
}
