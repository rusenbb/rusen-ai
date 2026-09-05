import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { fetchPublic, useVisiblePolling } from "./polling";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it("pauses hidden polling, aborts its request, and resumes on visibility", async () => {
  vi.useFakeTimers();
  const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  const task = vi.fn().mockResolvedValue(undefined);
  const { unmount } = renderHook(() => useVisiblePolling(task, 1000));
  await act(async () => vi.advanceTimersByTimeAsync(0));
  const signal = task.mock.calls[0][0] as AbortSignal;
  hidden.mockReturnValue(true);
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  await act(async () => vi.advanceTimersByTimeAsync(10000));
  expect(task).toHaveBeenCalledOnce();
  expect(signal.aborted).toBe(true);
  hidden.mockReturnValue(false);
  await act(async () => document.dispatchEvent(new Event("visibilitychange")));
  expect(task).toHaveBeenCalledTimes(2);
  unmount();
});

it("honors Retry-After instead of repeatedly hitting a rate-limited source", async () => {
  vi.useFakeTimers();
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      new Response("", { status: 429, headers: { "Retry-After": "120" } }),
    )
    .mockResolvedValue(new Response("{}"));
  vi.stubGlobal("fetch", fetch);
  await expect(
    fetchPublic("https://example.test/polling-backoff"),
  ).rejects.toThrow("429");
  await vi.advanceTimersByTimeAsync(60000);
  await expect(
    fetchPublic("https://example.test/polling-backoff"),
  ).rejects.toThrow("cooling down");
  expect(fetch).toHaveBeenCalledOnce();
  await vi.advanceTimersByTimeAsync(60001);
  await expect(
    fetchPublic("https://example.test/polling-backoff"),
  ).resolves.toHaveProperty("ok", true);
});
