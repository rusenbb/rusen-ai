"use client";

import { useEffect, useState } from "react";

import type { DiscreteSymbol } from "../modes";

type Result = { index: number; symbol: DiscreteSymbol; predicted: DiscreteSymbol };

export function ArenaDiscrete({
  symbolLabels,
  keyMap,
  predictedNext,
  showPrediction,
  lastResult,
  disabled,
  onPress,
}: {
  symbolLabels: string[];
  keyMap: string[];
  predictedNext: DiscreteSymbol | null;
  showPrediction: boolean;
  lastResult: Result | null;
  disabled: boolean;
  onPress: (symbol: DiscreteSymbol) => void;
}) {
  const [expiredResult, setExpiredResult] = useState<Result | null>(null);
  const pulse = lastResult && lastResult !== expiredResult
    ? { symbol: lastResult.symbol, correct: lastResult.symbol === lastResult.predicted }
    : null;

  // The trial index makes repeated outcomes distinct; clear feedback on reset.
  useEffect(() => {
    if (!lastResult) return;
    const id = window.setTimeout(() => setExpiredResult(lastResult), 700);
    return () => window.clearTimeout(id);
  }, [lastResult]);

  useEffect(() => {
    if (disabled) return;
    const handler = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const key = e.key.toLowerCase();
      const idx = keyMap.indexOf(key);
      if (idx === -1) return;
      e.preventDefault();
      onPress(idx);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [keyMap, disabled, onPress]);

  return (
    <div className="select-none">
      <div
        className={`grid gap-3 ${
          "grid-cols-2"
        }`}
      >
        {symbolLabels.map((label, i) => {
          const isPredicted = showPrediction && predictedNext === i && !disabled;
          const isPulsing = pulse?.symbol === i;
          // Accent-2 when the AI called it, accent when the press slipped past.
          const pulseColor = isPulsing
            ? pulse!.correct
              ? "border-[var(--accent-2)] bg-[color-mix(in_srgb,var(--accent-2)_14%,var(--surface))]"
              : "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_14%,var(--surface))]"
            : "";
          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => onPress(i)}
              className={`group relative ${symbolLabels.length === 2 ? "aspect-[4/3]" : "aspect-[2/1]"} w-full cursor-pointer border bg-[var(--surface)] transition-[transform,background-color,border-color] duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${
                pulseColor || (isPredicted ? "border-[var(--accent)]" : "border-[var(--line)] hover:border-[var(--line-strong)]")
              }`}
              aria-label={`Press ${label} (key ${keyMap[i]})`}
            >
              <span className="block font-mono text-4xl font-bold sm:text-5xl">
                {label}
              </span>
              {isPredicted && (
                <span className="absolute left-2 top-2 font-mono text-[0.65rem] uppercase tracking-[0.08em] text-[var(--accent)]">
                  AI guess
                </span>
              )}
            </button>
          );
        })}
      </div>
      {pulse && (
        <p className="mt-2 text-center font-mono text-xs text-[var(--muted)]">
          {pulse.correct ? "AI called it." : "You slipped past the AI."}
        </p>
      )}
      {!pulse && <p aria-hidden className="mt-2 font-mono text-xs">&nbsp;</p>}
    </div>
  );
}
