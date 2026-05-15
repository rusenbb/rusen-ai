"use client";

import type { PredictorMeta } from "../modes";

export type LeaderboardRow = {
  meta: PredictorMeta;
  primary: number;
  primaryLabel: string;
  secondary: number;
  secondaryLabel: string;
  isLeader: boolean;
  warmup: boolean;
};

export function Leaderboard({
  rows,
  primaryFmt,
  secondaryFmt,
}: {
  rows: LeaderboardRow[];
  primaryFmt: (v: number) => string;
  secondaryFmt: (v: number) => string;
}) {
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div
          key={row.meta.id}
          className={`flex items-center gap-3 rounded-md border px-3 py-2 ${
            row.isLeader
              ? "border-cyan-500 bg-cyan-500/5"
              : "border-[var(--line)] bg-[var(--surface)]"
          }`}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span
                className={`font-mono text-sm ${
                  row.isLeader
                    ? "text-cyan-700 dark:text-cyan-300 font-semibold"
                    : "text-neutral-800 dark:text-neutral-200"
                }`}
              >
                {row.meta.label}
              </span>
              {row.warmup && (
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber-600 dark:text-amber-400">
                  warmup
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate text-xs text-neutral-500">
              {row.meta.blurb}
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-baseline justify-end gap-2 font-mono">
              <span className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                {row.primaryLabel}
              </span>
              <span
                className={`text-sm tabular-nums ${
                  row.isLeader
                    ? "text-cyan-700 dark:text-cyan-300 font-semibold"
                    : "text-neutral-800 dark:text-neutral-200"
                }`}
              >
                {primaryFmt(row.primary)}
              </span>
            </div>
            <div className="flex items-baseline justify-end gap-2 font-mono">
              <span className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                {row.secondaryLabel}
              </span>
              <span className="text-xs tabular-nums text-neutral-500">
                {secondaryFmt(row.secondary)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
