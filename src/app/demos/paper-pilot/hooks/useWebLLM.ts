"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { DEFAULT_MODEL_ID } from "../types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MLCEngine = any;

interface UseWebLLMReturn {
  isLoading: boolean;
  loadProgress: number;
  error: string | null;
  isReady: boolean;
  isSupported: boolean | null;
  loadedModelId: string | null;
  loadModel: (modelId: string) => Promise<void>;
  generate: (
    systemPrompt: string,
    userPrompt: string,
    onStream?: (text: string) => void
  ) => Promise<string>;
  unload: () => Promise<void>;
}

// Strip <think> and </think> tags but keep all content
function stripThinkTags(content: string): string {
  return content.replace(/<\/?think>/g, "").trim();
}

export function useWebLLM(): UseWebLLMReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [loadedModelId, setLoadedModelId] = useState<string | null>(null);
  const engineRef = useRef<MLCEngine | null>(null);

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Loading lock to prevent race conditions
  const loadingPromiseRef = useRef<Promise<void> | null>(null);

  const checkWebGPUSupport = useCallback(async (): Promise<boolean> => {
    if (typeof navigator === "undefined") return false;
    if (!("gpu" in navigator)) return false;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const gpu = (navigator as any).gpu;
      const adapter = await gpu.requestAdapter();
      return !!adapter;
    } catch {
      return false;
    }
  }, []);

  const loadModel = useCallback(
    async (modelId: string = DEFAULT_MODEL_ID) => {
      // Wait for any in-progress loading to complete first
      if (loadingPromiseRef.current) {
        await loadingPromiseRef.current;
      }

      // If same model is already loaded, skip
      if (engineRef.current && loadedModelId === modelId) return;

      // Create a new loading promise
      const loadPromise = (async () => {
        // If a different model is loaded, unload it first
        if (engineRef.current && loadedModelId !== modelId) {
          await engineRef.current.unload();
          engineRef.current = null;
          if (isMountedRef.current) {
            setIsReady(false);
            setLoadedModelId(null);
          }
        }

        if (isMountedRef.current) {
          setIsLoading(true);
          setError(null);
          setLoadProgress(0);
        }

        try {
          // Check WebGPU support first
          const supported = await checkWebGPUSupport();
          if (isMountedRef.current) {
            setIsSupported(supported);
          }

          if (!supported) {
            throw new Error(
              "WebGPU is not supported in your browser. Please use Chrome 113+ or Edge 113+ with WebGPU enabled."
            );
          }

          // Dynamic import to avoid SSR issues
          const { CreateMLCEngine } = await import("@mlc-ai/web-llm");

          const engine = await CreateMLCEngine(
            modelId,
            {
              initProgressCallback: (report: { progress: number }) => {
                if (isMountedRef.current) {
                  setLoadProgress(report.progress);
                }
              },
              logLevel: "SILENT",
            },
            {
              // Override WebLLM's conservative 4096 limit - Qwen3 supports 32k
              context_window_size: 32768,
            }
          );

          engineRef.current = engine;
          if (isMountedRef.current) {
            setLoadedModelId(modelId);
            setIsReady(true);
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : "Failed to load model";
          if (isMountedRef.current) {
            setError(message);
            setIsReady(false);
            setLoadedModelId(null);
          }
        } finally {
          if (isMountedRef.current) {
            setIsLoading(false);
          }
        }
      })();

      loadingPromiseRef.current = loadPromise;
      await loadPromise;
      loadingPromiseRef.current = null;
    },
    [checkWebGPUSupport, loadedModelId]
  );

  const generate = useCallback(
    async (
      systemPrompt: string,
      userPrompt: string,
      onStream?: (text: string) => void
    ): Promise<string> => {
      if (!engineRef.current) {
        throw new Error("Model not loaded");
      }

      // Add /no_think to user message only to suppress Qwen3 thinking tags
      const systemMessage = systemPrompt;
      const userMessage = userPrompt + "\n\n/no_think";

      let fullContent = "";

      // Use streaming for better UX - prevents UI freezing
      const stream = await engineRef.current.chat.completions.create({
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: userMessage },
        ],
        temperature: 0.5,
        max_tokens: 8192, // 32k context, 24k input, 8k output
        stream: true,
      });

      // Process the stream
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || "";
        fullContent += delta;

        // Call the stream callback with cleaned content (strips think tags progressively)
        if (onStream) {
          onStream(stripThinkTags(fullContent));
        }
      }

      // Final cleanup of think tags
      return stripThinkTags(fullContent);
    },
    []
  );

  const unload = useCallback(async () => {
    if (engineRef.current) {
      await engineRef.current.unload();
      engineRef.current = null;
      if (isMountedRef.current) {
        setIsReady(false);
        setLoadProgress(0);
        setLoadedModelId(null);
      }
    }
  }, []);

  return {
    isLoading,
    loadProgress,
    error,
    isReady,
    isSupported,
    loadedModelId,
    loadModel,
    generate,
    unload,
  };
}
