"use client";

import { Spinner } from "@/components/ui";
import type { ModelPhase } from "../types";

interface StatusBarProps {
  phase: ModelPhase;
  loadProgress: number;
  encoderMs: number | null;
  decoderMs: number | null;
}

export default function StatusBar({
  phase,
  loadProgress,
  encoderMs,
  decoderMs,
}: StatusBarProps) {
  return (
    <div className="mt-3 flex items-center gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-xs dark:border-neutral-800 dark:bg-neutral-950">
      {phase === "idle" && (
        <>
          <Spinner size="sm" color="neutral" />
          <span className="text-neutral-500 dark:text-neutral-400">
            Initializing&hellip;
          </span>
        </>
      )}

      {phase === "loading" && (
        <>
          <Spinner size="sm" color="blue" />
          <span className="text-neutral-600 dark:text-neutral-300">
            Downloading model&hellip;
          </span>
          <div className="flex-1 h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-300"
              style={{ width: `${Math.max(loadProgress, 2)}%` }}
            />
          </div>
          <span className="tabular-nums text-neutral-500 dark:text-neutral-400">
            {loadProgress}%
          </span>
        </>
      )}

      {phase === "ready" && (
        <span className="text-neutral-500 dark:text-neutral-400">
          Model ready &mdash; select an image to begin
        </span>
      )}

      {phase === "encoding" && (
        <>
          <Spinner size="sm" color="blue" />
          <span className="text-neutral-600 dark:text-neutral-300">
            Encoding image&hellip;
          </span>
        </>
      )}

      {phase === "encoded" && (
        <>
          <span className="text-green-600 dark:text-green-400">&#10003;</span>
          <span className="text-neutral-600 dark:text-neutral-300">Ready</span>
          {encoderMs !== null && (
            <span className="text-neutral-400 dark:text-neutral-500">
              Encoder: {(encoderMs / 1000).toFixed(1)}s
            </span>
          )}
          {decoderMs !== null && (
            <span className="text-neutral-400 dark:text-neutral-500">
              Decoder: {decoderMs.toFixed(0)}ms
            </span>
          )}
        </>
      )}

      {phase === "error" && (
        <span className="text-red-600 dark:text-red-400">
          Model failed to load. Try refreshing the page.
        </span>
      )}
    </div>
  );
}
