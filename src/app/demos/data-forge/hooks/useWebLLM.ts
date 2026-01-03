"use client";

import { useState, useCallback, useRef } from "react";
import { DEFAULT_MODEL_ID } from "../types";

interface MLCEngine {
  chat: {
    completions: {
      create: (params: {
        messages: { role: string; content: string }[];
        temperature?: number;
        max_tokens?: number;
        response_format?: { type: string };
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
  generate: (prompt: string) => Promise<string>;
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
      // If same model is already loaded, skip
      if (engineRef.current && loadedModelId === modelId) return;

      // If a different model is loaded, unload it first
      if (engineRef.current && loadedModelId !== modelId) {
        await engineRef.current.unload();
        engineRef.current = null;
        setIsReady(false);
        setLoadedModelId(null);
      }

      setIsLoading(true);
      setError(null);
      setLoadProgress(0);

      try {
        // Check WebGPU support first
        const supported = await checkWebGPUSupport();
        setIsSupported(supported);

        if (!supported) {
          throw new Error(
            "WebGPU is not supported in your browser. Please use Chrome 113+ or Edge 113+ with WebGPU enabled."
          );
        }

        // Dynamic import to avoid SSR issues
        const { CreateMLCEngine } = await import("@mlc-ai/web-llm");

        const engine = await CreateMLCEngine(modelId, {
          initProgressCallback: (report) => {
            setLoadProgress(report.progress);
          },
          logLevel: "SILENT",
        });

        engineRef.current = engine as unknown as MLCEngine;
        setLoadedModelId(modelId);
        setIsReady(true);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load model";
        setError(message);
        setIsReady(false);
        setLoadedModelId(null);
      } finally {
        setIsLoading(false);
      }
    },
    [checkWebGPUSupport, loadedModelId]
  );

  const generate = useCallback(async (prompt: string): Promise<string> => {
    if (!engineRef.current) {
      throw new Error("Model not loaded");
    }

    const response = await engineRef.current.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "You are a data generator. Generate realistic fake data based on the schema provided. Always respond with valid JSON only, no explanation. Do not use markdown formatting.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 4096,
      response_format: { type: "json_object" },
    });

    return response.choices[0].message.content || "{}";
  }, []);

  const unload = useCallback(async () => {
    if (engineRef.current) {
      await engineRef.current.unload();
      engineRef.current = null;
      setIsReady(false);
      setLoadProgress(0);
      setLoadedModelId(null);
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
