/**
 * Shared configuration constants across all demos.
 * Single source of truth for models, timeouts, and API settings.
 */

/** Available LLM models for selection */
export interface ModelOption {
  id: string;
  name: string;
  description?: string;
}

/**
 * Available models for all demos.
 * These are free-tier models available through OpenRouter.
 * Updated 2026-02 with current free models.
 */
export const AVAILABLE_MODELS: ModelOption[] = [
  {
    id: "auto",
    name: "Auto (Recommended)",
    description: "Picks best available model with fallback",
  },
  {
    id: "google/gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    description: "Fast, large context window",
  },
  {
    id: "google/gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash Lite",
    description: "Lighter, faster responses",
  },
  {
    id: "deepseek/deepseek-v3.2-20251201",
    name: "DeepSeek V3.2",
    description: "Strong reasoning capabilities",
  },
  {
    id: "x-ai/grok-4.1-fast",
    name: "Grok 4.1 Fast",
    description: "Fast responses from xAI",
  },
  {
    id: "openai/gpt-oss-120b",
    name: "GPT OSS 120B",
    description: "Large open-source model",
  },
];

/** Common timeout values in milliseconds */
export const TIMEOUTS = {
  /** Duration to show "Copied!" feedback */
  copyFeedback: 2000,
  /** Duration of completion pulse animation */
  completionPulse: 1500,
  /** Input debounce delay */
  debounce: 300,
  /** Rate limit countdown */
  rateLimitCountdown: 60,
} as const;

/** API configuration defaults */
export const API_CONFIG = {
  /** Max tokens by use case */
  maxTokens: {
    default: 4096,
    large: 8192,
    extraLarge: 16384,
  },
  /** Temperature presets */
  temperature: {
    creative: 0.7,
    balanced: 0.5,
    precise: 0.2,
    deterministic: 0.0,
  },
} as const;

/** Use case identifiers for the API */
export type UseCase = "paper-pilot" | "query-craft" | "data-forge" | "classify-anything";

/** SQL dialects supported by Query Craft and Data Forge */
export type SQLDialect = "postgresql" | "mysql" | "sqlite" | "sql-server";

export const SQL_DIALECTS: { value: SQLDialect; label: string }[] = [
  { value: "postgresql", label: "PostgreSQL" },
  { value: "mysql", label: "MySQL" },
  { value: "sqlite", label: "SQLite" },
  { value: "sql-server", label: "SQL Server" },
];
