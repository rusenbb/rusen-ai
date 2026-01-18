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
        const requestBody: Record<string, unknown> = {
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          stream: !!onStream,
          max_tokens: 4096,
          temperature: 0.2,
          use_case: "query-craft",
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
          const errorMessage =
            typeof errorData.error === "string"
              ? errorData.error
              : typeof errorData.error === "object" && errorData.error?.message
                ? errorData.error.message
                : errorData.message || `API error: ${response.status}`;
          throw new Error(errorMessage);
        }

        // Handle streaming response
        if (onStream && response.body) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let fullContent = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") continue;

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content || "";
                  if (content) {
                    fullContent += content;
                    onStream(fullContent);
                  }
                } catch {
                  // Skip invalid JSON chunks
                }
              }
            }
          }

          return cleanSQLOutput(fullContent);
        }

        // Handle non-streaming response
        const data = await response.json();
        let content = data.choices?.[0]?.message?.content || "";

        return cleanSQLOutput(content);
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

// Clean up SQL output from LLM responses
function cleanSQLOutput(content: string): string {
  let sql = content.trim();

  // Remove markdown code blocks
  if (sql.startsWith("```")) {
    sql = sql.replace(/^```(?:sql)?\n?/, "").replace(/\n?```$/, "");
  }

  // Remove any leading/trailing explanation text before/after SQL
  // Look for SELECT, INSERT, UPDATE, DELETE, WITH, CREATE, ALTER, DROP as SQL starters
  const sqlKeywords = /^(SELECT|INSERT|UPDATE|DELETE|WITH|CREATE|ALTER|DROP|EXPLAIN)/im;
  const match = sql.match(sqlKeywords);
  if (match && match.index !== undefined && match.index > 0) {
    sql = sql.substring(match.index);
  }

  // Remove trailing explanation after the semicolon
  const lastSemicolon = sql.lastIndexOf(";");
  if (lastSemicolon !== -1) {
    const afterSemicolon = sql.substring(lastSemicolon + 1).trim();
    // If there's significant text after the semicolon that's not SQL, remove it
    if (afterSemicolon.length > 0 && !sqlKeywords.test(afterSemicolon)) {
      sql = sql.substring(0, lastSemicolon + 1);
    }
  }

  return sql.trim();
}
