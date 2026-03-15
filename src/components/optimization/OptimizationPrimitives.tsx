"use client";

import { type ReactNode, useMemo, useState } from "react";
import { clamp, formatCompact } from "@/lib/optimization";

export const OPTIMIZATION_SECTIONS = [
  {
    href: "#gradient-atlas",
    title: "Gradient Atlas",
    kicker: "Gradient flows",
    summary: "How momentum, memory, and adaptivity change the same downhill problem.",
  },
  {
    href: "#zeroth-order",
    title: "Zeroth Order",
    kicker: "Black-box search",
    summary: "What to do when you can score a candidate but cannot differentiate it.",
  },
  {
    href: "#high-d",
    title: "High-D to Heaven",
    kicker: "Why the cartoon breaks",
    summary: "Why high-dimensional optimization stops looking like a neat bowl with a ball.",
  },
] as const;

export function OptimizationSectionNav() {
  return (
    <nav
      aria-label="Optimization sections"
      className="grid gap-3 md:grid-cols-3"
    >
      {OPTIMIZATION_SECTIONS.map((item) => (
        <a
          key={item.href}
          href={item.href}
          className="group rounded-[1.3rem] border border-neutral-200/80 bg-white/72 px-4 py-4 transition hover:border-neutral-400/80 dark:border-neutral-800/80 dark:bg-neutral-950/45 dark:hover:border-neutral-600"
        >
          <div className="text-[10px] font-mono uppercase tracking-[0.24em] text-neutral-500 dark:text-neutral-400">
            {item.kicker}
          </div>
          <h2 className="mt-2 text-base font-semibold text-neutral-950 transition group-hover:text-neutral-700 dark:text-neutral-50 dark:group-hover:text-neutral-200">
            {item.title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
            {item.summary}
          </p>
        </a>
      ))}
    </nav>
  );
}

export function PlotModeToggle({
  mode,
  onChange,
}: {
  mode: "surface" | "contour";
  onChange: (mode: "surface" | "contour") => void;
}) {
  return (
    <div className="inline-flex rounded-full border border-neutral-300/80 bg-white/80 p-1 dark:border-neutral-700/80 dark:bg-neutral-950/60">
      {(["surface", "contour"] as const).map((option) => {
        const active = mode === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`rounded-full px-3 py-1.5 text-xs font-mono uppercase tracking-[0.18em] transition ${
              active
                ? "bg-neutral-900 text-white shadow-sm dark:bg-neutral-100 dark:text-neutral-900"
                : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

export function MetricGrid({
  items,
}: {
  items: Array<{
    label: string;
    value: string;
    accent?: string;
    description?: string;
  }>;
}) {
  return (
    <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(11rem,1fr))]">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-[1.2rem] border border-neutral-200/80 bg-white/80 p-4 dark:border-neutral-800/80 dark:bg-neutral-950/50"
        >
          <div className="text-[10px] font-mono uppercase tracking-[0.24em] text-neutral-500 dark:text-neutral-400">
            {item.label}
          </div>
          <div
            className="mt-3 whitespace-nowrap text-[clamp(1.9rem,4vw,2.6rem)] font-semibold leading-[0.92] tracking-tight tabular-nums"
            style={item.accent ? { color: item.accent } : undefined}
          >
            {item.value}
          </div>
          {item.description ? (
            <p className="mt-2 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
              {item.description}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

interface SeriesChartProps {
  series: Array<{
    id: string;
    label: string;
    color: string;
    values: number[];
  }>;
  height?: number;
  formatValue?: (value: number) => string;
  currentIndex?: number;
  xStartLabel?: string;
  xEndLabel?: string;
  yLabel?: string;
  selectionLabel?: string;
}

export function SeriesChart({
  series,
  height = 180,
  formatValue = formatCompact,
  currentIndex,
  xStartLabel = "start",
  xEndLabel = "end",
  yLabel,
  selectionLabel = "step",
}: SeriesChartProps) {
  const allValues = series.flatMap((entry) => entry.values).filter(Number.isFinite);
  const min = allValues.length ? Math.min(...allValues) : 0;
  const max = allValues.length ? Math.max(...allValues) : 1;
  const span = Math.max(1e-6, max - min);
  const longestSeriesLength = Math.max(...series.map((entry) => entry.values.length), 1);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [rangeState, setRangeState] = useState<{ start: number; end: number }>({
    start: 0,
    end: longestSeriesLength - 1,
  });
  const effectiveSelectedIndex = clamp(
    selectedIndex ?? currentIndex ?? 0,
    0,
    Math.max(0, longestSeriesLength - 1),
  );
  const visibleStart = clamp(
    Math.min(rangeState.start, rangeState.end),
    0,
    Math.max(0, longestSeriesLength - 1),
  );
  const visibleEnd = clamp(
    Math.max(rangeState.start, rangeState.end),
    visibleStart,
    Math.max(0, longestSeriesLength - 1),
  );
  const visibleSpan = Math.max(1, visibleEnd - visibleStart);
  const markerX =
    currentIndex === undefined || longestSeriesLength <= 1
      ? null
      : 18 + (604 / visibleSpan) * clamp(currentIndex - visibleStart, 0, visibleSpan);
  const selectedX =
    longestSeriesLength <= 1
      ? 18
      : 18 + (604 / visibleSpan) * clamp(effectiveSelectedIndex - visibleStart, 0, visibleSpan);

  const selectedValues = useMemo(
    () =>
      series.map((entry) => ({
        ...entry,
        value:
          entry.values[
            clamp(effectiveSelectedIndex, 0, Math.max(0, entry.values.length - 1))
          ] ?? entry.values[entry.values.length - 1] ?? 0,
      })),
    [effectiveSelectedIndex, series],
  );

  function toChartCoordinate(value: number, index: number, length: number): string {
    const safeIndex = clamp(index, visibleStart, visibleEnd);
    const x =
      18 +
      (length <= 1
        ? 0
        : (604 / visibleSpan) * (safeIndex - visibleStart));
    const y = 18 + (height - 36) * (1 - (value - min) / span);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }

  const handleZoom = (factor: number) => {
    if (longestSeriesLength <= 2) return;
    const currentWindow = visibleEnd - visibleStart + 1;
    const nextWindow = clamp(
      Math.round(currentWindow * factor),
      Math.min(8, longestSeriesLength),
      longestSeriesLength,
    );
    const halfWindow = Math.floor(nextWindow / 2);
    let nextStart = effectiveSelectedIndex - halfWindow;
    let nextEnd = nextStart + nextWindow - 1;

    if (nextStart < 0) {
      nextEnd -= nextStart;
      nextStart = 0;
    }
    if (nextEnd > longestSeriesLength - 1) {
      const overshoot = nextEnd - (longestSeriesLength - 1);
      nextStart = Math.max(0, nextStart - overshoot);
      nextEnd = longestSeriesLength - 1;
    }

    setRangeState({ start: nextStart, end: nextEnd });
  };

  const handleChartClick = (event: React.MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const localX = ((event.clientX - rect.left) / rect.width) * 640;
    const normalized = clamp((localX - 18) / 604, 0, 1);
    const nextIndex = Math.round(visibleStart + normalized * visibleSpan);
    setSelectedIndex(clamp(nextIndex, 0, Math.max(0, longestSeriesLength - 1)));
  };

  return (
    <div className="rounded-[1.2rem] border border-neutral-200/80 bg-white/75 p-4 dark:border-neutral-800/80 dark:bg-neutral-950/45">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-neutral-500 dark:text-neutral-400">
          Click the chart to inspect a point. Use zoom to focus on a smaller window.
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleZoom(0.6)}
            className="rounded-full border border-neutral-300 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.18em] text-neutral-700 transition hover:border-neutral-500 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500"
          >
            Zoom in
          </button>
          <button
            type="button"
            onClick={() => handleZoom(1.5)}
            className="rounded-full border border-neutral-300 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.18em] text-neutral-700 transition hover:border-neutral-500 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500"
          >
            Zoom out
          </button>
          <button
            type="button"
            onClick={() =>
              setRangeState({ start: 0, end: Math.max(0, longestSeriesLength - 1) })
            }
            className="rounded-full border border-neutral-300 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.18em] text-neutral-700 transition hover:border-neutral-500 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500"
          >
            Reset
          </button>
        </div>
      </div>

      <svg
        width="100%"
        height={height}
        viewBox={`0 0 640 ${height}`}
        className="overflow-visible cursor-crosshair"
        onClick={handleChartClick}
      >
        <rect
          x="0"
          y="0"
          width="640"
          height={height}
          rx="18"
          fill="transparent"
          stroke="rgba(115,115,115,0.18)"
        />
        {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
          const y = 18 + (height - 36) * tick;
          return (
            <line
              key={tick}
              x1="18"
              x2="622"
              y1={y}
              y2={y}
              stroke="rgba(115,115,115,0.18)"
              strokeDasharray="4 6"
            />
          );
        })}

        {markerX !== null ? (
          <line
            x1={markerX}
            x2={markerX}
            y1="18"
            y2={height - 18}
            stroke="rgba(148,163,184,0.55)"
            strokeDasharray="5 5"
          />
        ) : null}

        {series.map((entry) => {
          const points = entry.values
            .slice(visibleStart, visibleEnd + 1)
            .map((value, index) =>
              toChartCoordinate(value, index + visibleStart, entry.values.length),
            )
            .join(" ");
          const selectedValue =
            entry.values[
              clamp(effectiveSelectedIndex, 0, Math.max(0, entry.values.length - 1))
            ] ?? entry.values[entry.values.length - 1] ?? 0;
          const selectedY =
            18 + (height - 36) * (1 - (selectedValue - min) / span);
          return (
            <g key={entry.id}>
              <polyline
                fill="none"
                stroke={entry.color}
                strokeWidth="3"
                strokeLinejoin="round"
                strokeLinecap="round"
                points={points}
              />
              {effectiveSelectedIndex >= visibleStart &&
              effectiveSelectedIndex <= visibleEnd ? (
                <>
                  <circle
                    cx={selectedX}
                    cy={selectedY}
                    r="5"
                    fill={entry.color}
                    stroke="white"
                    strokeWidth="2"
                  />
                  <circle
                    cx={selectedX}
                    cy={selectedY}
                    r="9"
                    fill="none"
                    stroke={entry.color}
                    strokeOpacity="0.18"
                    strokeWidth="6"
                  />
                </>
              ) : null}
            </g>
          );
        })}

        {markerX !== null ? (
          <text x={markerX + 6} y="32" fontSize="11" fill="currentColor" opacity="0.72">
            current
          </text>
        ) : null}

        <text x="24" y="18" fontSize="11" fill="currentColor" opacity="0.7">
          {formatValue(max)}
        </text>
        <text x="24" y={height - 8} fontSize="11" fill="currentColor" opacity="0.7">
          {formatValue(min)}
        </text>
        {yLabel ? (
          <text
            x="618"
            y="18"
            fontSize="11"
            textAnchor="end"
            fill="currentColor"
            opacity="0.72"
          >
            {yLabel}
          </text>
        ) : null}
      </svg>

      <div className="mt-3 flex items-center justify-between text-[11px] font-mono uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
        <span>{xStartLabel}</span>
        <span>{xEndLabel}</span>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <div className="rounded-full bg-neutral-100/80 px-3 py-1 text-xs font-mono uppercase tracking-[0.18em] text-neutral-700 dark:bg-neutral-900/80 dark:text-neutral-300">
          selected {selectionLabel} {effectiveSelectedIndex}
        </div>
        {selectedValues.map((entry) => (
          <div
            key={`${entry.id}-selected`}
            className="inline-flex items-center gap-2 rounded-full bg-neutral-100/80 px-3 py-1 text-xs dark:bg-neutral-900/80"
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-neutral-700 dark:text-neutral-300">
              {entry.label}: {formatValue(entry.value)}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        {series.map((entry) => (
          <div key={entry.id} className="inline-flex items-center gap-2 rounded-full bg-neutral-100/80 px-3 py-1 text-xs dark:bg-neutral-900/80">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-neutral-700 dark:text-neutral-300">{entry.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SignedSpectrumChart({ values }: { values: number[] }) {
  const negative = values.filter((value) => value < 0).sort((a, b) => Math.abs(a) - Math.abs(b));
  const positive = values.filter((value) => value >= 0).sort((a, b) => a - b);
  const maxMagnitude = Math.max(...values.map((value) => Math.abs(value)), 1);

  return (
    <div className="rounded-[1.2rem] border border-neutral-200/80 bg-white/75 p-4 dark:border-neutral-800/80 dark:bg-neutral-950/45">
      <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-end">
        <div>
          <div className="mb-3">
            <div className="text-[10px] font-mono uppercase tracking-[0.24em] text-neutral-500 dark:text-neutral-400">
              Escape directions
            </div>
            <div className="mt-1 text-lg font-semibold text-rose-500">
              {negative.length} negative eigenvalues
            </div>
          </div>
          <div className="flex h-44 items-end justify-end gap-1">
            {negative.map((value, index) => {
              const height = `${(Math.abs(value) / maxMagnitude) * 100}%`;
              return (
                <div
                  key={`negative-${index}-${value}`}
                  className="min-w-0 flex-1 rounded-t-sm bg-rose-500/80"
                  style={{ height }}
                  title={formatCompact(value)}
                />
              );
            })}
          </div>
        </div>

        <div className="hidden h-56 w-px bg-neutral-300/70 md:block dark:bg-neutral-700/70" />

        <div>
          <div className="mb-3">
            <div className="text-[10px] font-mono uppercase tracking-[0.24em] text-neutral-500 dark:text-neutral-400">
              Stabilizing directions
            </div>
            <div className="mt-1 text-lg font-semibold text-teal-500">
              {positive.length} positive eigenvalues
            </div>
          </div>
          <div className="flex h-44 items-end gap-1">
            {positive.map((value, index) => {
              const height = `${(Math.abs(value) / maxMagnitude) * 100}%`;
              return (
                <div
                  key={`positive-${index}-${value}`}
                  className="min-w-0 flex-1 rounded-t-sm bg-teal-500/80"
                  style={{ height }}
                  title={formatCompact(value)}
                />
              );
            })}
          </div>
        </div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
        Left means the surface curves downward along that axis, so optimization can slide away.
        Right means the surface curves upward, so the geometry pushes the path back toward stability.
      </p>
    </div>
  );
}

export function EquationReveal({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <details className="rounded-[1.2rem] border border-neutral-200/80 bg-white/72 p-4 dark:border-neutral-800/80 dark:bg-neutral-950/50">
      <summary className="cursor-pointer text-sm font-semibold text-neutral-900 dark:text-neutral-100">
        {title}
      </summary>
      <div className="mt-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
        {children}
      </div>
    </details>
  );
}

export function SectionTakeaway({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-[1.1rem] border border-amber-500/30 bg-amber-50/70 px-4 py-3 text-sm leading-relaxed text-amber-950 dark:border-amber-400/20 dark:bg-amber-950/20 dark:text-amber-100">
      {children}
    </p>
  );
}
