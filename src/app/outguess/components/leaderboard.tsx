"use client";

import type { PredictorMeta } from "../modes";

export type LeaderboardRow = {
  meta: PredictorMeta;
  accuracy: number;
  bitsSaved: number;
  isLeader: boolean;
};

const LABEL = "font-mono text-[0.7rem] uppercase tracking-[0.08em] text-[var(--sub)]";

/** Every predictor's rolling score. Negative bits mean it does worse than a uniform guess. */
export function Leaderboard({ rows, window }: { rows: LeaderboardRow[]; window: number }) {
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-[var(--line)]">
          <th className={`py-1.5 text-left font-normal ${LABEL}`}>Predictor</th>
          <th className={`py-1.5 text-right font-normal ${LABEL}`}>Hit rate, last {window}</th>
          <th className={`py-1.5 text-right font-normal ${LABEL}`} title="Average bits per press saved compared with a uniform guess. Negative means worse than uniform.">
            Bits saved vs random
          </th>
        </tr>
      </thead>
      <tbody className="font-mono tabular-nums">
        {rows.map((row) => (
          <tr key={row.meta.id} className="border-b border-[var(--line)]">
            <td className={`py-1.5 ${row.isLeader ? "text-[var(--foreground)]" : ""}`} title={row.meta.blurb}>
              {row.meta.label}
              {row.isLeader ? <span className="ml-2 text-[var(--accent)]">leading</span> : null}
            </td>
            <td className="py-1.5 text-right">{(row.accuracy * 100).toFixed(0)}%</td>
            <td className="py-1.5 text-right">
              {row.bitsSaved >= 0 ? "+" : "−"}
              {Math.abs(row.bitsSaved).toFixed(2)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
