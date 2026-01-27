"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { ClassificationResult, ModelStatus } from "../types";

// Pipeline type for zero-shot classification
type ZeroShotPipeline = (
  text: string,
  labels: string[],
  options?: { multi_label?: boolean }
) => Promise<{
  sequence: string;
  labels: string[];
  scores: number[];
}>;

export interface UseClassifierResult {
  isLoading: boolean;
  isModelReady: boolean;
  loadProgress: number;
  modelStatus: ModelStatus;
  error: string | null;
  classify: (text: string, labels: string[]) => Promise<ClassificationResult[]>;
  clearCache: () => Promise<void>;
}

// Model configuration - using a smaller model for faster loading
const MODEL_ID = "Xenova/mobilebert-uncased-mnli";

export function useClassifier(): UseClassifierResult {
  const [isLoading, setIsLoading] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [modelStatus, setModelStatus] = useState<ModelStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  // Refs for persistence across renders
  const classifierPipeline = useRef<ZeroShotPipeline | null>(null);
  const initPromise = useRef<Promise<void> | null>(null);

  // Initialize the model
  const initModel = useCallback(async () => {
    // Return existing init promise if in progress
    if (initPromise.current) {
      return initPromise.current;
    }

    // Return immediately if already loaded
    if (classifierPipeline.current) {
      return;
    }

    initPromise.current = (async () => {
      try {
        setIsLoading(true);
        setModelStatus("loading");
        setError(null);
        setLoadProgress(0);

        // Dynamic import to avoid SSR issues
        const { pipeline, env } = await import("@huggingface/transformers");

        // Configure environment
        env.allowLocalModels = false;
        env.useBrowserCache = true;

        // Create the pipeline with progress tracking
        // Using WASM for consistent results across hardware
        const classifier = await pipeline(
          "zero-shot-classification",
          MODEL_ID,
          {
            device: "wasm",
            progress_callback: (progress: { progress?: number; status?: string }) => {
              if (progress.progress !== undefined) {
                setLoadProgress(Math.round(progress.progress));
              }
            },
          }
        );

        classifierPipeline.current = classifier as unknown as ZeroShotPipeline;
        setIsModelReady(true);
        setModelStatus("ready");
        setLoadProgress(100);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load model";
        setError(message);
        setModelStatus("error");
        console.error("Error loading classifier model:", err);
      } finally {
        setIsLoading(false);
        initPromise.current = null;
      }
    })();

    return initPromise.current;
  }, []);

  // Classify text with given labels
  const classify = useCallback(
    async (text: string, labels: string[]): Promise<ClassificationResult[]> => {
      if (!text.trim()) {
        return [];
      }

      if (labels.length < 2) {
        throw new Error("At least 2 labels are required for classification");
      }

      // Initialize model if needed
      if (!classifierPipeline.current) {
        await initModel();
      }

      if (!classifierPipeline.current) {
        throw new Error("Model failed to load");
      }

      try {
        const output = await classifierPipeline.current(text, labels, {
          multi_label: false,
        });

        // Convert to our result format
        const results: ClassificationResult[] = output.labels.map(
          (label, index) => ({
            label,
            score: output.scores[index],
          })
        );

        // Sort by score descending
        results.sort((a, b) => b.score - a.score);

        return results;
      } catch (err) {
        console.error("Error classifying text:", err);
        throw err;
      }
    },
    [initModel]
  );

  // Clear the model cache
  const clearCache = useCallback(async () => {
    try {
      // Clear transformers.js cache from IndexedDB
      const databases = await indexedDB.databases();
      for (const db of databases) {
        if (
          db.name &&
          (db.name.includes("transformers") || db.name.includes("onnx"))
        ) {
          indexedDB.deleteDatabase(db.name);
          console.log(`Deleted IndexedDB: ${db.name}`);
        }
      }

      // Clear browser caches
      if ("caches" in window) {
        const cacheNames = await caches.keys();
        for (const name of cacheNames) {
          if (
            name.includes("transformers") ||
            name.includes("huggingface")
          ) {
            await caches.delete(name);
            console.log(`Deleted cache: ${name}`);
          }
        }
      }

      // Reset state
      classifierPipeline.current = null;
      setIsModelReady(false);
      setModelStatus("idle");
      setLoadProgress(0);
      setError(null);

      console.log("Model cache cleared. Reload to re-download.");
    } catch (err) {
      console.error("Error clearing cache:", err);
    }
  }, []);

  // Auto-initialize on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      initModel();
    }, 500);

    return () => clearTimeout(timer);
  }, [initModel]);

  return {
    isLoading,
    isModelReady,
    loadProgress,
    modelStatus,
    error,
    classify,
    clearCache,
  };
}
