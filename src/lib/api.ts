/**
 * API utilities for client-side requests.
 *
 * In development, Cloudflare Pages Functions aren't available,
 * so we proxy through the production API.
 */

const PRODUCTION_URL = "https://rusen.ai";

/**
 * Get the base URL for API requests.
 * - In production: relative paths work ("/api/llm")
 * - In development: proxy through production
 */
export function getApiBaseUrl(): string {
  if (typeof window === "undefined") {
    return ""; // Server-side: use relative paths
  }

  // Check if we're on localhost or development
  const isDev = window.location.hostname === "localhost"
    || window.location.hostname === "127.0.0.1"
    || window.location.port === "3000";

  return isDev ? PRODUCTION_URL : "";
}

/**
 * Build the full API URL for a given path.
 */
export function getApiUrl(path: string): string {
  const base = getApiBaseUrl();
  return `${base}${path}`;
}
