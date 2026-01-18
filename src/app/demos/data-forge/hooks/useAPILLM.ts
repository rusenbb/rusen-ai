"use client";

import { useState, useCallback } from "react";

interface UseAPILLMReturn {
  isGenerating: boolean;
  error: string | null;
  rateLimitRemaining: number | null;
  lastModelUsed: string | null;
  generate: (prompt: string) => Promise<string>;
}

export function useAPILLM(selectedModel: string = "auto"): UseAPILLMReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitRemaining, setRateLimitRemaining] = useState<number | null>(null);
  const [lastModelUsed, setLastModelUsed] = useState<string | null>(null);

  const generate = useCallback(async (prompt: string): Promise<string> => {
    setIsGenerating(true);
    setError(null);

    try {
      const systemMessage = "You are a JSON data generator. Output ONLY valid JSON, nothing else. No explanations, no markdown, no code blocks.";

      const requestBody: Record<string, unknown> = {
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: prompt },
        ],
        stream: false,
        max_tokens: 8192,
        temperature: 0.3,
        response_format: { type: "json_object" },
        use_case: "data-forge",
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
        throw new Error(errorData.error || `API error: ${response.status}`);
      }

      const data = await response.json();
      let content = data.choices?.[0]?.message?.content || "{}";

      // Clean up any markdown code blocks if present
      content = content.trim();
      if (content.startsWith("```")) {
        content = content.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }

      console.log("[Data Forge] API response:", content.substring(0, 500));

      return content;
    } catch (err) {
      const message = err instanceof Error ? err.message : "API request failed";
      setError(message);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  }, [selectedModel]);

  return {
    isGenerating,
    error,
    rateLimitRemaining,
    lastModelUsed,
    generate,
  };
}
