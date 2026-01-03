"use client";

import { useState, useCallback, useRef } from "react";

const MODEL_ID = "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";

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
  loadModel: () => Promise<void>;
  generate: (prompt: string) => Promise<string>;
  unload: () => Promise<void>;
}

export function useWebLLM(): UseWebLLMReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
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

  const loadModel = useCallback(async () => {
    if (engineRef.current) return;

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

      const engine = await CreateMLCEngine(MODEL_ID, {
        initProgressCallback: (report) => {
          setLoadProgress(report.progress);
        },
        logLevel: "SILENT",
      });

      engineRef.current = engine as unknown as MLCEngine;
      setIsReady(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load model";
      setError(message);
      setIsReady(false);
    } finally {
      setIsLoading(false);
    }
  }, [checkWebGPUSupport]);

  const generate = useCallback(async (prompt: string): Promise<string> => {
    if (!engineRef.current) {
      throw new Error("Model not loaded");
    }

    const response = await engineRef.current.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "You are a data generator. Generate realistic fake data based on the schema provided. Always respond with valid JSON only, no explanation.",
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
    }
  }, []);

  return {
    isLoading,
    loadProgress,
    error,
    isReady,
    isSupported,
    loadModel,
    generate,
    unload,
  };
}
