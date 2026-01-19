"use client";

import { useState, useCallback, useRef, useEffect } from "react";

// Type for pipeline function - we use dynamic import
type Pipeline = (texts: string | string[], options?: { pooling?: string; normalize?: boolean }) => Promise<{ data: Float32Array }>;

export interface UseEmbeddingResult {
  isLoading: boolean;
  isModelReady: boolean;
  loadProgress: number;
  error: string | null;
  backend: "webgpu" | "wasm" | null;
  embed: (text: string) => Promise<number[] | null>;
  embedBatch: (texts: string[]) => Promise<Map<string, number[]>>;
  getCached: (text: string) => number[] | null;
  cacheSize: number;
}

// Model configuration
const MODEL_ID = "mixedbread-ai/mxbai-embed-xsmall-v1";
const EMBEDDING_DIM = 384;

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

        // Try WebGPU first, fall back to WASM
        let selectedBackend: "webgpu" | "wasm" = "wasm";

        // Check WebGPU support
        if (typeof navigator !== "undefined" && "gpu" in navigator) {
          try {
            const adapter = await (navigator.gpu as GPU).requestAdapter();
            if (adapter) {
              selectedBackend = "webgpu";
              // Reduce WASM threads when using WebGPU
              if (env.backends?.onnx?.wasm) {
                env.backends.onnx.wasm.numThreads = 1;
              }
            }
          } catch {
            // WebGPU not available, use WASM
          }
        }

        setBackend(selectedBackend);

        // Configure environment
        env.allowLocalModels = false;
        env.useBrowserCache = true;

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

      // Convert Float32Array to regular array
      const embedding = Array.from(output.data.slice(0, EMBEDDING_DIM));

      // Cache the result
      embeddingCache.current.set(normalizedText, embedding);
      setCacheSize(embeddingCache.current.size);

      return embedding;
    } catch (err) {
      console.error("Error embedding text:", err);
      return null;
    }
  }, [initModel]);

  // Embed multiple texts efficiently
  const embedBatch = useCallback(async (texts: string[]): Promise<Map<string, number[]>> => {
    const results = new Map<string, number[]>();
    const uncached: string[] = [];

    // Check cache first
    for (const text of texts) {
      const normalizedText = text.toLowerCase().trim();
      const cached = embeddingCache.current.get(normalizedText);
      if (cached) {
        results.set(text, cached);
      } else {
        uncached.push(text);
      }
    }

    // If all cached, return immediately
    if (uncached.length === 0) {
      return results;
    }

    // Initialize model if needed
    if (!embeddingPipeline.current) {
      await initModel();
    }

    if (!embeddingPipeline.current) {
      return results;
    }

    // Embed uncached texts one by one (batch embedding has issues with varying lengths)
    for (const text of uncached) {
      const embedding = await embed(text);
      if (embedding) {
        results.set(text, embedding);
      }
    }

    return results;
  }, [embed, initModel]);

  // Get cached embedding without computing
  const getCached = useCallback((text: string): number[] | null => {
    return embeddingCache.current.get(text.toLowerCase().trim()) || null;
  }, []);

  // Auto-initialize on mount if in browser
  useEffect(() => {
    // Pre-warm the model in the background after a short delay
    const timer = setTimeout(() => {
      initModel();
    }, 1000);

    return () => clearTimeout(timer);
  }, [initModel]);

  return {
    isLoading,
    isModelReady,
    loadProgress,
    error,
    backend,
    embed,
    embedBatch,
    getCached,
    cacheSize,
  };
}
