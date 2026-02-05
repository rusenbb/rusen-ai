/**
 * Shared configuration constants across all demos.
 * Single source of truth for timeouts and API settings.
 */

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
