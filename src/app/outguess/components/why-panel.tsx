"use client";

import type { DiscreteWhy } from "../why";

export function WhyPanelDiscrete({
  why,
  symbolLabels,
  predictorLabel,
}: {
  why: DiscreteWhy | null;
  symbolLabels: string[];
  predictorLabel: string;
}) {
  if (!why) {
    return (
      <p className="text-xs text-neutral-500">
        Not enough history yet for{" "}
        <span className="font-mono">{predictorLabel}</span> to anchor a context.
      </p>
    );
  }
  const ctxStr = why.context.map((s) => symbolLabels[s] ?? `?${s}`).join(" → ");
  return (
    <div className="space-y-2">
      <p className="text-xs text-neutral-600 dark:text-neutral-400">
        After context{" "}
        <code className="rounded bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)] px-1.5 py-0.5 font-mono">
          {ctxStr}
        </code>
        , you&apos;ve gone:
      </p>
      <ul className="space-y-1">
        {why.counts.map((c, i) => {
          const p = why.total === 0 ? 0 : c / why.total;
          return (
            <li
              key={i}
              className="flex items-center gap-2 font-mono text-xs"
            >
              <span className="w-12 text-neutral-700 dark:text-neutral-300">
                {symbolLabels[i] ?? `?${i}`}
              </span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-sm bg-neutral-200 dark:bg-neutral-800">
                <div
                  className="h-full bg-cyan-500"
                  style={{ width: `${(p * 100).toFixed(1)}%` }}
                />
              </div>
              <span className="w-20 text-right tabular-nums text-neutral-500">
                {c} / {why.total} ({(p * 100).toFixed(0)}%)
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
