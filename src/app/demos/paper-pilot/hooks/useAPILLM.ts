"use client";

import { useState, useCallback } from "react";

interface UseAPILLMReturn {
  isGenerating: boolean;
  error: string | null;
  rateLimitRemaining: number | null;
  lastModelUsed: string | null;
  generate: (
    systemPrompt: string,
    userPrompt: string,
    onStream?: (text: string) => void
  ) => Promise<string>;
}

export function useAPILLM(selectedModel: string = "auto"): UseAPILLMReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitRemaining, setRateLimitRemaining] = useState<number | null>(null);
  const [lastModelUsed, setLastModelUsed] = useState<string | null>(null);

  const generate = useCallback(
    async (
      systemPrompt: string,
      userPrompt: string,
      onStream?: (text: string) => void
    ): Promise<string> => {
      setIsGenerating(true);
      setError(null);

      try {
        // Build request body
        const requestBody: Record<string, unknown> = {
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          stream: true,
          max_tokens: 16384,
          temperature: 0.5,
          use_case: "paper-pilot",
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
        });

        // Update rate limit info
        const remaining = response.headers.get("X-RateLimit-Remaining");
        if (remaining) {
          setRateLimitRemaining(parseInt(remaining, 10));
        }

        // Track which model was used
        const modelUsed = response.headers.get("X-Model-Used");
        if (modelUsed) {
          setLastModelUsed(modelUsed);
        }

        if (!response.ok) {
          const errorData = await response.json();
          // Handle both string errors and nested error objects
          const errorMessage = typeof errorData.error === "string"
            ? errorData.error
            : typeof errorData.error === "object" && errorData.error?.message
              ? errorData.error.message
              : errorData.message || `API error: ${response.status}`;
          throw new Error(errorMessage);
        }

        if (!response.body) {
          throw new Error("No response body");
        }

        // Process SSE stream with proper buffering
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = "";
        let buffer = ""; // Buffer for incomplete lines

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Append new chunk to buffer
          buffer += decoder.decode(value, { stream: true });

          // Process complete lines (split by double newline for SSE)
          const parts = buffer.split("\n");

          // Keep the last part in buffer if it's incomplete (doesn't end with newline)
          buffer = parts.pop() || "";

          for (const line of parts) {
            const trimmedLine = line.trim();

            // Skip empty lines and comments
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
                // Ignore parse errors for malformed chunks
                console.warn("[useAPILLM] Failed to parse SSE data:", data.substring(0, 100));
              }
            }
          }
        }

        // Process any remaining data in buffer
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

        return fullContent;
      } catch (err) {
        const message = err instanceof Error ? err.message : "API request failed";
        setError(message);
        throw err;
      } finally {
        setIsGenerating(false);
      }
    },
    [selectedModel]
  );

  return {
    isGenerating,
    error,
    rateLimitRemaining,
    lastModelUsed,
    generate,
  };
}
