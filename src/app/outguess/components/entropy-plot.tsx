"use client";

import { useMemo } from "react";

const W = 320;
const H = 64;
const PAD = 6;

export function EntropyPlot({
  series,
  max,
  label,
  unit,
}: {
  series: number[];
  max: number;
  label: string;
  unit: string;
}) {
  const path = useMemo(() => {
    if (series.length === 0) return "";
    const n = series.length;
    const dx = (W - PAD * 2) / Math.max(1, n - 1);
    const clamp = (v: number) => Math.max(0, Math.min(max, v));
    return series
      .map((v, i) => {
        const x = PAD + i * dx;
        const y = H - PAD - (clamp(v) / max) * (H - PAD * 2);
        return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ");
  }, [series, max]);

  const last = series.length === 0 ? 0 : series[series.length - 1];
  const ratio = max === 0 ? 0 : Math.min(1, last / max);

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="font-mono text-[0.7rem] uppercase tracking-[0.08em] text-[var(--sub)]">
          {label}
        </span>
        <span className="font-mono text-xs tabular-nums text-[var(--foreground)]">
          {last.toFixed(2)} <span className="text-[var(--sub)]">{unit}</span>
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-16 w-full text-[var(--accent)]"
        preserveAspectRatio="none"
      >
        <line
          x1={PAD}
          x2={W - PAD}
          y1={H - PAD - (1 - 0) * (H - PAD * 2)}
          y2={H - PAD - (1 - 0) * (H - PAD * 2)}
          stroke="currentColor"
          strokeOpacity="0.15"
          strokeDasharray="2 3"
        />
        <line
          x1={PAD}
          x2={W - PAD}
          y1={H - PAD - 1 * (H - PAD * 2)}
          y2={H - PAD - 1 * (H - PAD * 2)}
          stroke="currentColor"
          strokeOpacity="0.15"
          strokeDasharray="2 3"
        />
        <path
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="mt-1 flex justify-between font-mono text-[0.7rem] text-[var(--sub)]">
        <span>0</span>
        <span>{(ratio * 100).toFixed(0)}% of the maximum</span>
        <span>{max.toFixed(2)} {unit}</span>
      </div>
    </div>
  );
}
