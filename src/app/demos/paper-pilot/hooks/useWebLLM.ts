"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { DEFAULT_MODEL_ID } from "../types";

interface MLCEngine {
  chat: {
    completions: {
      create: (params: {
        messages: { role: string; content: string }[];
        temperature?: number;
        max_tokens?: number;
      }) => Promise<{
        choices: { message: { content: string | null } }[];
      }>;
    };
  };
  unload: () => Promise<void>;
}

interface UseWebLLMReturn {
  isLoading: boolean;
  loadProgress: number;
  error: string | null;
  isReady: boolean;
  isSupported: boolean | null;
  loadedModelId: string | null;
  loadModel: (modelId: string) => Promise<void>;
  generate: (systemPrompt: string, userPrompt: string) => Promise<string>;
  unload: () => Promise<void>;
}

export function useWebLLM(): UseWebLLMReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [loadedModelId, setLoadedModelId] = useState<string | null>(null);
  const engineRef = useRef<MLCEngine | null>(null);

  // Fix: Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Fix: Loading lock to prevent race conditions
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
      // Fix: Wait for any in-progress loading to complete first
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

          const engine = await CreateMLCEngine(modelId, {
            initProgressCallback: (report) => {
              if (isMountedRef.current) {
                setLoadProgress(report.progress);
              }
            },
            logLevel: "SILENT",
          });

          engineRef.current = engine as unknown as MLCEngine;
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

  const generate = useCallback(async (systemPrompt: string, userPrompt: string): Promise<string> => {
    if (!engineRef.current) {
      throw new Error("Model not loaded");
    }

    // Add /no_think to suppress Qwen3 thinking tags
    const systemMessage = systemPrompt + " /no_think";
    const userMessage = userPrompt + "\n\n/no_think";

    const response = await engineRef.current.chat.completions.create({
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage },
      ],
      temperature: 0.5,
      max_tokens: 2048,
    });

    let content = response.choices[0].message.content || "";

    // Strip any <think>...</think> tags that Qwen3 might still output
    content = content.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

    return content;
  }, []);

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
