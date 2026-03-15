"use client";

import { formatCompact } from "@/lib/optimization";

interface DimensionRow {
  label: string;
  color: string;
  dimension: number;
  conditionNumber: number;
  stepsToHalfLoss: number | null;
  characterization: string;
}

export function DimensionComparisonTable({ rows }: { rows: DimensionRow[] }) {
  return (
    <div className="rounded-[1.2rem] border border-neutral-200/80 bg-white/75 p-4 dark:border-neutral-800/80 dark:bg-neutral-950/45">
      <div className="text-[10px] font-mono uppercase tracking-[0.24em] text-neutral-500 dark:text-neutral-400 mb-3">
        Dimension comparison
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              <th className="pb-2 text-left font-normal">Dim</th>
              <th className="pb-2 text-right font-normal">Cond. #</th>
              <th className="pb-2 text-right font-normal">Steps to 50%</th>
              <th className="pb-2 text-right font-normal">Character</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.label}
                className="border-t border-neutral-100 dark:border-neutral-800/60"
              >
                <td className="py-2 pr-3">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: row.color }}
                    />
                    <span className="font-mono text-neutral-900 dark:text-neutral-100">
                      {row.label}
                    </span>
                  </span>
                </td>
                <td className="py-2 text-right font-mono text-neutral-700 dark:text-neutral-300">
                  {formatCompact(row.conditionNumber)}
                </td>
                <td className="py-2 text-right font-mono text-neutral-700 dark:text-neutral-300">
                  {row.stepsToHalfLoss !== null ? row.stepsToHalfLoss : "\u2014"}
                </td>
                <td className="py-2 text-right text-neutral-600 dark:text-neutral-400">
                  {row.characterization}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
