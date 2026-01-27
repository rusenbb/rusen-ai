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
 */
export const AVAILABLE_MODELS: ModelOption[] = [
  {
    id: "auto",
    name: "Auto (Recommended)",
    description: "Picks best available model with fallback",
  },
  {
    id: "google/gemini-2.0-flash-exp:free",
    name: "Gemini 2.0 Flash",
    description: "1M context, fast responses",
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    name: "Llama 3.3 70B",
    description: "131K context, reliable",
  },
  {
    id: "google/gemma-3-27b-it:free",
    name: "Gemma 3 27B",
    description: "131K context, multimodal",
  },
  {
    id: "deepseek/deepseek-r1-0528:free",
    name: "DeepSeek R1",
    description: "164K context, reasoning model",
  },
  {
    id: "qwen/qwen3-coder:free",
    name: "Qwen3 Coder 480B",
    description: "262K context, coding optimized",
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
