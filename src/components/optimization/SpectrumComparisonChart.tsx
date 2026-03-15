"use client";

import { binSpectrum } from "@/lib/optimization";
import { formatCompact } from "@/lib/optimization";

interface SpectrumRow {
  label: string;
  color: string;
  spectrum: number[];
}

export function SpectrumComparisonChart({ rows }: { rows: SpectrumRow[] }) {
  const BIN_COUNT = 24;

  return (
    <div className="rounded-[1.2rem] border border-neutral-200/80 bg-white/75 p-4 dark:border-neutral-800/80 dark:bg-neutral-950/45">
      <div className="text-[10px] font-mono uppercase tracking-[0.24em] text-neutral-500 dark:text-neutral-400 mb-4">
        Eigenvalue spread by dimension
      </div>
      <div className="space-y-4">
        {rows.map((row) => {
          const bins = row.spectrum.length <= BIN_COUNT
            ? row.spectrum.map((v) => ({ value: v, count: 1 }))
            : binSpectrum(row.spectrum, BIN_COUNT).map((b) => ({ value: (b.start + b.end) / 2, count: b.count }));

          const maxCount = Math.max(...bins.map((b) => b.count), 1);
          const minVal = Math.min(...row.spectrum);
          const maxVal = Math.max(...row.spectrum);

          return (
            <div key={row.label}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: row.color }}
                  />
                  <span className="text-xs font-mono uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                    {row.label}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400">
                  {row.spectrum.length} eigenvalues &middot; {formatCompact(minVal)}&ndash;{formatCompact(maxVal)}
                </span>
              </div>
              <div className="flex h-8 items-end gap-px">
                {bins.map((bin, i) => (
                  <div
                    key={i}
                    className="min-w-0 flex-1 rounded-t-sm transition-all"
                    style={{
                      height: `${(bin.count / maxCount) * 100}%`,
                      backgroundColor: row.color,
                      opacity: 0.7 + 0.3 * (bin.count / maxCount),
                    }}
                    title={`${bin.count} eigenvalue${bin.count !== 1 ? "s" : ""}`}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
        As dimension grows, the eigenvalue spectrum widens. A wider spread means the optimizer
        sees very different curvature along different axes, making convergence harder.
      </p>
    </div>
  );
}
