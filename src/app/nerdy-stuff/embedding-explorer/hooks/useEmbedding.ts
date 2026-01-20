"use client";

import { useState, useCallback, useRef, useEffect } from "react";

// Type for pipeline function - we use dynamic import
type Pipeline = (texts: string | string[], options?: { pooling?: string; normalize?: boolean }) => Promise<{ data: Float32Array; dims: number[] }>;

export interface EmbeddingStats {
  dimensions: number;
  meanMagnitude: number;
  sampleSimilarity: number; // similarity between two test words
}

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
  stats: EmbeddingStats | null;
  clearModelCache: () => Promise<void>;
  runSanityCheck: () => Promise<{ passed: boolean; details: string }>;
}

// Model configuration
const MODEL_ID = "mixedbread-ai/mxbai-embed-xsmall-v1";

// Helper to compute cosine similarity
function cosineSim(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  magA = Math.sqrt(magA);
  magB = Math.sqrt(magB);
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

// Helper to compute magnitude
function magnitude(v: number[]): number {
  return Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
}

export function useEmbedding(): UseEmbeddingResult {
  const [isLoading, setIsLoading] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [backend, setBackend] = useState<"webgpu" | "wasm" | null>(null);
  const [cacheSize, setCacheSize] = useState(0);
  const [stats, setStats] = useState<EmbeddingStats | null>(null);

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

      // Verify output shape - should be [1, hidden_dim] after pooling
      if (output.dims?.[0] !== 1) {
        console.warn("Unexpected embedding batch size:", output.dims);
      }

      // Convert Float32Array to regular array (pooling already reduces to single vector)
      const embedding = Array.from(output.data);

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

  // Clear the model cache (IndexedDB) - fixes corrupted downloads
  const clearModelCache = useCallback(async () => {
    try {
      // Clear transformers.js cache from IndexedDB
      const databases = await indexedDB.databases();
      for (const db of databases) {
        if (db.name && (db.name.includes('transformers') || db.name.includes('onnx'))) {
          indexedDB.deleteDatabase(db.name);
          console.log(`Deleted IndexedDB: ${db.name}`);
        }
      }

      // Also try to clear the specific cache used by transformers.js
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (const name of cacheNames) {
          if (name.includes('transformers') || name.includes('huggingface')) {
            await caches.delete(name);
            console.log(`Deleted cache: ${name}`);
          }
        }
      }

      // Reset state
      embeddingPipeline.current = null;
      embeddingCache.current.clear();
      setCacheSize(0);
      setIsModelReady(false);
      setStats(null);
      setError(null);

      console.log('Model cache cleared. Reload the page to re-download the model.');
    } catch (err) {
      console.error('Error clearing cache:', err);
    }
  }, []);

  // Run sanity check to verify embeddings are working correctly
  const runSanityCheck = useCallback(async (): Promise<{ passed: boolean; details: string }> => {
    if (!embeddingPipeline.current) {
      return { passed: false, details: 'Model not loaded' };
    }

    try {
      // Test with words that should have known relationships
      const testWords = ['king', 'queen', 'man', 'woman', 'car', 'banana'];
      const embeddings: Map<string, number[]> = new Map();

      for (const word of testWords) {
        const output = await embeddingPipeline.current(word.toLowerCase(), {
          pooling: 'mean',
          normalize: true,
        });
        embeddings.set(word, Array.from(output.data));
      }

      const kingVec = embeddings.get('king')!;
      const queenVec = embeddings.get('queen')!;
      const manVec = embeddings.get('man')!;
      const womanVec = embeddings.get('woman')!;
      const carVec = embeddings.get('car')!;
      const bananaVec = embeddings.get('banana')!;

      // Check dimensions
      const dims = kingVec.length;

      // Check magnitude (should be ~1.0 for normalized vectors)
      const kingMag = magnitude(kingVec);

      // Compute similarities
      const kingQueen = cosineSim(kingVec, queenVec);
      const kingMan = cosineSim(kingVec, manVec);
      const kingCar = cosineSim(kingVec, carVec);
      const kingBanana = cosineSim(kingVec, bananaVec);
      const carBanana = cosineSim(carVec, bananaVec);

      // Update stats
      setStats({
        dimensions: dims,
        meanMagnitude: kingMag,
        sampleSimilarity: kingQueen,
      });

      // Sanity checks:
      // 1. Dimensions should be 384 for this model
      // 2. Magnitude should be ~1.0 (normalized)
      // 3. king-queen similarity should be HIGH (>0.7)
      // 4. king-car similarity should be LOWER than king-queen
      // 5. Different unrelated words should have varying similarities (not all ~0.5)

      const details: string[] = [];
      let passed = true;

      details.push(`Dimensions: ${dims} (expected: 384)`);
      if (dims !== 384) {
        passed = false;
        details.push('  ❌ Wrong dimensions!');
      }

      details.push(`Magnitude: ${kingMag.toFixed(4)} (expected: ~1.0)`);
      if (kingMag < 0.9 || kingMag > 1.1) {
        passed = false;
        details.push('  ❌ Vectors not properly normalized!');
      }

      details.push(`Similarities:`);
      details.push(`  king↔queen: ${(kingQueen * 100).toFixed(1)}% (should be high)`);
      details.push(`  king↔man: ${(kingMan * 100).toFixed(1)}%`);
      details.push(`  king↔car: ${(kingCar * 100).toFixed(1)}% (should be lower)`);
      details.push(`  king↔banana: ${(kingBanana * 100).toFixed(1)}%`);
      details.push(`  car↔banana: ${(carBanana * 100).toFixed(1)}%`);

      // Check if similarities are suspiciously uniform (sign of broken model)
      const sims = [kingQueen, kingMan, kingCar, kingBanana, carBanana];
      const simVariance = sims.reduce((sum, s) => sum + Math.pow(s - sims.reduce((a, b) => a + b, 0) / sims.length, 2), 0) / sims.length;

      details.push(`Similarity variance: ${simVariance.toFixed(4)}`);
      if (simVariance < 0.01) {
        passed = false;
        details.push('  ❌ Similarities too uniform - embeddings may be broken!');
      }

      // king-queen should be more similar than king-car
      if (kingQueen < kingCar) {
        passed = false;
        details.push('  ❌ king-queen should be more similar than king-car!');
      }

      // Vector arithmetic check: king - man + woman ≈ queen?
      const result: number[] = [];
      for (let i = 0; i < dims; i++) {
        result.push(kingVec[i] - manVec[i] + womanVec[i]);
      }
      const resultQueenSim = cosineSim(result, queenVec);
      details.push(`Vector arithmetic: king - man + woman`);
      details.push(`  Similarity to queen: ${(resultQueenSim * 100).toFixed(1)}%`);

      return {
        passed,
        details: details.join('\n')
      };
    } catch (err) {
      return {
        passed: false,
        details: `Error during sanity check: ${err instanceof Error ? err.message : 'Unknown error'}`
      };
    }
  }, []);

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
    stats,
    clearModelCache,
    runSanityCheck,
  };
}
