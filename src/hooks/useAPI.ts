"use client";

/**
 * Unified API hook for LLM interactions across all demos.
 * Handles streaming, rate limiting, JSON mode, and model fallback.
 *
 * Consolidates:
 * - paper-pilot/hooks/useAPILLM.ts (streaming, large context)
 * - query-craft/hooks/useAPILLM.ts (streaming + JSON mode)
 * - data-forge/hooks/useAPILLM.ts (non-streaming, JSON mode)
 */

import { useState, useCallback } from "react";
import { getApiUrl } from "@/lib/api";
import { type UseCase, API_CONFIG } from "@/lib/config";

/** Result from a generation request */
export interface GenerationResult {
  /** Raw content from the API */
  content: string;
  /** Parsed SQL (if JSON mode with sql field) */
  sql?: string;
  /** Parsed explanation (if JSON mode with explanation field) */
  explanation?: string;
}

/** Options for the generate function */
export interface GenerateOptions {
  /** System prompt for the LLM */
  systemPrompt: string;
  /** User prompt for the LLM */
  userPrompt: string;
  /** Callback for streaming updates */
  onStream?: (content: string) => void;
  /** Use JSON response format */
  jsonMode?: boolean;
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Temperature for generation */
  temperature?: number;
}

/** Return type for useAPI hook */
export interface UseAPIReturn {
  /** Whether a generation is in progress */
  isGenerating: boolean;
  /** Error message if generation failed */
  error: string | null;
  /** Remaining rate limit requests */
  rateLimitRemaining: number | null;
  /** Last model that was actually used */
  lastModelUsed: string | null;
  /** Generate content from the LLM */
  generate: (options: GenerateOptions) => Promise<GenerationResult>;
  /** Clear the error state */
  clearError: () => void;
}

/** Configuration options for the hook */
export interface UseAPIConfig {
  /** Use case identifier for analytics */
  useCase: UseCase;
  /** Enable streaming by default */
  defaultStream?: boolean;
  /** Default max tokens */
  defaultMaxTokens?: number;
  /** Default temperature */
  defaultTemperature?: number;
}

/**
 * Unified API hook for LLM interactions.
 *
 * @param selectedModel - Model ID or 'auto' for automatic selection
 * @param config - Configuration options for the hook
 * @returns API state and generate function
 *
 * @example
 * ```tsx
 * // Paper Pilot - streaming, large context
 * const { generate, isGenerating } = useAPI('auto', {
 *   useCase: 'paper-pilot',
 *   defaultStream: true,
 *   defaultMaxTokens: 16384,
 * });
 *
 * // Query Craft - streaming + JSON mode
 * const { generate } = useAPI(model, {
 *   useCase: 'query-craft',
 *   defaultStream: true,
 * });
 * const result = await generate({
 *   systemPrompt,
 *   userPrompt,
 *   jsonMode: true,
 *   onStream: setStreamingSQL,
 * });
 *
 * // Data Forge - non-streaming, JSON mode
 * const { generate } = useAPI(model, {
 *   useCase: 'data-forge',
 *   defaultStream: false,
 *   defaultMaxTokens: 8192,
 * });
 * ```
 */
export function useAPI(
  selectedModel: string = "auto",
  config: UseAPIConfig
): UseAPIReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitRemaining, setRateLimitRemaining] = useState<number | null>(null);
  const [lastModelUsed, setLastModelUsed] = useState<string | null>(null);

  const {
    useCase,
    defaultStream = true,
    defaultMaxTokens = API_CONFIG.maxTokens.default,
    defaultTemperature = API_CONFIG.temperature.balanced,
  } = config;

  const clearError = useCallback(() => setError(null), []);

  const generate = useCallback(
    async (options: GenerateOptions): Promise<GenerationResult> => {
      const {
        systemPrompt,
        userPrompt,
        onStream,
        jsonMode = false,
        maxTokens = defaultMaxTokens,
        temperature = defaultTemperature,
      } = options;

      const shouldStream = defaultStream && !!onStream;

      setIsGenerating(true);
      setError(null);

      try {
        const requestBody: Record<string, unknown> = {
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          stream: shouldStream,
          max_tokens: maxTokens,
          temperature,
          use_case: useCase,
        };

        // Pass specific model if not auto
        if (selectedModel !== "auto") {
          requestBody.model = selectedModel;
        }

        // Request JSON structured output
        if (jsonMode) {
          requestBody.response_format = { type: "json_object" };
        }

        const response = await fetch(getApiUrl("/api/llm"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
        if (shouldStream && response.body) {
          const content = await processStream(response.body, onStream, jsonMode);
          return parseOutput(content, jsonMode);
        }

        // Handle non-streaming response
        const data = await response.json();
        let content = data.choices?.[0]?.message?.content || "";

        // Clean up markdown code blocks if present
        content = cleanContent(content);

        return parseOutput(content, jsonMode);
      } catch (err) {
        const message = err instanceof Error ? err.message : "API request failed";
        setError(message);
        throw err;
      } finally {
        setIsGenerating(false);
      }
    },
    [selectedModel, useCase, defaultStream, defaultMaxTokens, defaultTemperature]
  );

  return {
    isGenerating,
    error,
    rateLimitRemaining,
    lastModelUsed,
    generate,
    clearError,
  };
}

/** Minimum interval between stream updates (ms) for performance */
const STREAM_DEBOUNCE_MS = 50;

/**
 * Process a streaming response with proper buffering and debounced updates.
 * Updates are batched every 50ms to reduce React re-renders during streaming.
 */
async function processStream(
  body: ReadableStream<Uint8Array>,
  onStream: (content: string) => void,
  jsonMode: boolean
): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let fullContent = "";
  let buffer = "";
  let lastUpdateTime = 0;
  let pendingUpdate = false;

  // Helper to emit update with debouncing
  const emitUpdate = (force: boolean = false) => {
    const now = Date.now();
    if (force || now - lastUpdateTime >= STREAM_DEBOUNCE_MS) {
      if (jsonMode) {
        const partialSQL = extractPartialSQL(fullContent);
        onStream(partialSQL);
      } else {
        onStream(fullContent);
      }
      lastUpdateTime = now;
      pendingUpdate = false;
    } else {
      pendingUpdate = true;
    }
  };

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
            emitUpdate();
          }
        } catch {
          // Ignore parse errors for malformed chunks
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

  // Always emit final update to ensure UI is in sync
  if (pendingUpdate || fullContent) {
    emitUpdate(true);
  }

  return fullContent;
}

/**
 * Parse output based on mode (JSON or plain text).
 */
function parseOutput(content: string, jsonMode: boolean): GenerationResult {
  if (!jsonMode) {
    return { content: cleanSQLOutput(content) };
  }

  let cleaned = content.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  try {
    const parsed = JSON.parse(cleaned);
    return {
      content: cleaned,
      sql: parsed.sql ? cleanSQLOutput(parsed.sql) : undefined,
      explanation: parsed.explanation || undefined,
    };
  } catch {
    // Fallback: try regex extraction
    const sqlMatch = cleaned.match(/"sql"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    const explanationMatch = cleaned.match(/"explanation"\s*:\s*"((?:[^"\\]|\\.)*)"/);

    if (sqlMatch) {
      return {
        content: cleaned,
        sql: cleanSQLOutput(sqlMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"')),
        explanation: explanationMatch
          ? explanationMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"')
          : undefined,
      };
    }

    // Last resort: treat as plain content
    return { content: cleanSQLOutput(cleaned) };
  }
}

/**
 * Extract partial SQL from streaming JSON for display.
 */
function extractPartialSQL(content: string): string {
  const sqlMatch = content.match(/"sql"\s*:\s*"((?:[^"\\]|\\.)*)(?:"|$)/);
  if (sqlMatch) {
    return sqlMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"');
  }
  return "";
}

/**
 * Clean content by removing markdown code blocks.
 */
function cleanContent(content: string): string {
  let cleaned = content.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json|sql)?\n?/, "").replace(/\n?```$/, "");
  }
  return cleaned;
}

/**
 * Clean up SQL output from LLM responses.
 */
function cleanSQLOutput(content: string): string {
  let sql = content.trim();

  // Remove markdown code blocks
  if (sql.startsWith("```")) {
    sql = sql.replace(/^```(?:sql)?\n?/, "").replace(/\n?```$/, "");
  }

  // Remove leading explanation text before SQL keywords
  const sqlKeywords = /^(SELECT|INSERT|UPDATE|DELETE|WITH|CREATE|ALTER|DROP|EXPLAIN)/im;
  const match = sql.match(sqlKeywords);
  if (match && match.index !== undefined && match.index > 0) {
    sql = sql.substring(match.index);
  }

  // Remove trailing explanation after semicolon
  const lastSemicolon = sql.lastIndexOf(";");
  if (lastSemicolon !== -1) {
    const afterSemicolon = sql.substring(lastSemicolon + 1).trim();
    if (afterSemicolon.length > 0 && !sqlKeywords.test(afterSemicolon)) {
      sql = sql.substring(0, lastSemicolon + 1);
    }
  }

  return sql.trim();
}
