"use client";

import { useCallback, useRef } from "react";

interface GenerateOptions {
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
  onStream?: (text: string) => void;
}

interface GenerateResult {
  content: string;
  modelUsed: string | null;
  rateLimitRemaining: number | null;
}

/**
 * Hook for making LLM API calls with custom temperature.
 * Unlike other demos, this hook doesn't track generation state internally -
 * the caller manages state for multiple parallel generations.
 */
export function useAPILLM(selectedModel: string = "auto") {
  const abortControllerRef = useRef<AbortController | null>(null);

  const generate = useCallback(
    async (options: GenerateOptions): Promise<GenerateResult> => {
      const { systemPrompt, userPrompt, temperature, onStream } = options;

      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();

      const requestBody: Record<string, unknown> = {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: true,
        max_tokens: 4096, // Shorter for playground comparisons
        temperature,
        use_case: "temperature-playground",
      };

      // If a specific model is selected (not auto), pass it
      if (selectedModel !== "auto") {
        requestBody.model = selectedModel;
      }

      const response = await fetch("/api/llm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: abortControllerRef.current.signal,
      });

      // Extract headers
      const rateLimitRemaining = response.headers.get("X-RateLimit-Remaining");
      const modelUsed = response.headers.get("X-Model-Used");

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage =
          typeof errorData.error === "string"
            ? errorData.error
            : typeof errorData.error === "object" && errorData.error?.message
              ? errorData.error.message
              : errorData.message || `API error: ${response.status}`;
        throw new Error(errorMessage);
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      // Process SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n");
        buffer = parts.pop() || "";

        for (const line of parts) {
          const trimmedLine = line.trim();
          if (!trimmedLine || trimmedLine.startsWith(":")) continue;

          if (trimmedLine.startsWith("data: ")) {
            const data = trimmedLine.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content || "";
              if (delta) {
                fullContent += delta;
                if (onStream) {
                  onStream(fullContent);
                }
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }

      // Process remaining buffer
      if (buffer.trim()) {
        const trimmedLine = buffer.trim();
        if (trimmedLine.startsWith("data: ")) {
          const data = trimmedLine.slice(6);
          if (data !== "[DONE]") {
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content || "";
              if (delta) {
                fullContent += delta;
              }
            } catch {
              // Ignore
            }
          }
        }
      }

      return {
        content: fullContent,
        modelUsed,
        rateLimitRemaining: rateLimitRemaining
          ? parseInt(rateLimitRemaining, 10)
          : null,
      };
    },
    [selectedModel]
  );

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  return { generate, abort };
}
