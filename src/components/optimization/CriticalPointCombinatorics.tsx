"use client";

import { criticalPointCombinations } from "@/lib/optimization";

interface SignPatternGridProps {
  dimension: number;
}

function SignPatternGrid({ dimension }: SignPatternGridProps) {
  const total = 1 << dimension;
  const patterns: Array<{ signs: string[]; isMinimum: boolean }> = [];

  for (let i = 0; i < total; i++) {
    const signs: string[] = [];
    let allPositive = true;
    for (let bit = 0; bit < dimension; bit++) {
      const positive = (i >> bit) & 1;
      signs.push(positive ? "+" : "\u2212");
      if (!positive) allPositive = false;
    }
    patterns.push({ signs, isMinimum: allPositive });
  }

  const cols = dimension <= 2 ? 2 : 4;

  return (
    <div
      className="grid gap-1.5"
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
    >
      {patterns.map((pattern, i) => (
        <div
          key={i}
          className={`rounded-lg border px-2 py-1.5 text-center font-mono text-xs transition ${
            pattern.isMinimum
              ? "border-teal-400/60 bg-teal-50/80 text-teal-700 dark:border-teal-500/40 dark:bg-teal-950/30 dark:text-teal-300"
              : "border-neutral-200/80 bg-neutral-50/50 text-neutral-500 dark:border-neutral-800/60 dark:bg-neutral-900/30 dark:text-neutral-500"
          }`}
        >
          ({pattern.signs.join(", ")})
        </div>
      ))}
    </div>
  );
}

function RatioBar({ dimension }: { dimension: number }) {
  const stats = criticalPointCombinations(dimension);

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          {dimension}D
        </span>
        <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400">
          1 out of {stats.formattedTotal}
        </span>
      </div>
      <div className="h-6 w-full rounded-full bg-neutral-200/60 dark:bg-neutral-800/60 overflow-hidden">
        <div
          className="h-full rounded-full bg-teal-500/80"
          style={{
            width: `${Math.max(0.4, stats.fractionMinima * 100)}%`,
          }}
        />
      </div>
      <p className="text-[10px] text-neutral-500 dark:text-neutral-500">
        Only {stats.fractionMinima > 0.001
          ? `${(stats.fractionMinima * 100).toFixed(1)}%`
          : `1 in ${stats.formattedTotal}`}{" "}
        of critical points are local minima.
      </p>
    </div>
  );
}

export function CriticalPointCombinatorics() {
  const dimensions = [2, 3, 10, 64];

  return (
    <div className="rounded-[1.2rem] border border-neutral-200/80 bg-white/75 p-4 dark:border-neutral-800/80 dark:bg-neutral-950/45">
      <div className="text-[10px] font-mono uppercase tracking-[0.24em] text-neutral-500 dark:text-neutral-400 mb-4">
        Sign combinations at a critical point
      </div>

      <div className="space-y-6">
        {/* Small dimensions: show every pattern */}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                2D &mdash; 4 combinations
              </span>
              <span className="text-[10px] font-mono text-teal-600 dark:text-teal-400">
                1 is a minimum
              </span>
            </div>
            <SignPatternGrid dimension={2} />
          </div>
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                3D &mdash; 8 combinations
              </span>
              <span className="text-[10px] font-mono text-teal-600 dark:text-teal-400">
                1 is a minimum
              </span>
            </div>
            <SignPatternGrid dimension={3} />
          </div>
        </div>

        {/* Large dimensions: show ratio bars */}
        <div className="space-y-3 rounded-[0.9rem] border border-neutral-200/60 bg-neutral-50/50 p-3 dark:border-neutral-800/50 dark:bg-neutral-900/20">
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">
            As dimensions grow, local minima vanish
          </div>
          {dimensions
            .filter((d) => d >= 10)
            .map((d) => (
              <RatioBar key={d} dimension={d} />
            ))}
        </div>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
        Each eigenvalue of the Hessian can be positive or negative. A local minimum needs all
        positive. In 2D that is 1 out of 4. In 64D it is 1 out of 18.4 quintillion. Most critical
        points are saddles, and an optimizer that gets stuck almost certainly has escape routes.
      </p>
    </div>
  );
}
