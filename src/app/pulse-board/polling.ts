"use client";

import { useEffect } from "react";

const cooldowns = new Map<string, { until: number; failures: number }>();

/** Public endpoints share bounded backoff, including HTTP Retry-After. */
export async function fetchPublic(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const previous = cooldowns.get(url);
  if (previous && previous.until > Date.now())
    throw new Error("Source is cooling down; retrying later.");
  try {
    const response = await fetch(url, init);
    if (response.status === 429 || response.status >= 500) {
      const failures = (previous?.failures ?? 0) + 1;
      const value = response.headers.get("Retry-After");
      const retryAfter =
        value === null
          ? 0
          : /^\d+(\.\d+)?$/.test(value)
            ? Number(value) * 1000
            : Math.max(0, Date.parse(value) - Date.now());
      const delay = Math.max(
        Number.isFinite(retryAfter) ? retryAfter : 0,
        Math.min(900_000, 30_000 * 2 ** Math.min(failures - 1, 5)),
      );
      cooldowns.set(url, { until: Date.now() + delay, failures });
      throw new Error(
        `Source returned ${response.status}; retrying after ${Math.ceil(delay / 1000)} seconds.`,
      );
    }
    cooldowns.delete(url);
    return response;
  } catch (error) {
    if (!init?.signal?.aborted && !cooldowns.has(url))
      cooldowns.set(url, { until: Date.now() + 30_000, failures: 1 });
    throw error;
  }
}

export function useVisiblePolling(
  task: (signal: AbortSignal) => Promise<void>,
  interval: number,
): void {
  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    let controller: AbortController | null = null;
    const run = async () => {
      if (disposed || document.hidden) return;
      const request = new AbortController();
      controller = request;
      try {
        await task(request.signal);
      } finally {
        if (!disposed && !request.signal.aborted && !document.hidden)
          timer = setTimeout(run, interval);
      }
    };
    const visibility = () => {
      clearTimeout(timer);
      controller?.abort();
      if (!document.hidden) void run();
    };
    timer = setTimeout(run, 0);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      disposed = true;
      clearTimeout(timer);
      controller?.abort();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [task, interval]);
}
