"use client";

import { useEffect, useState } from "react";

import type { DiscreteSymbol } from "../modes";

type Result = { symbol: DiscreteSymbol; predicted: DiscreteSymbol };

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
  const [pulse, setPulse] = useState<{ symbol: DiscreteSymbol; correct: boolean } | null>(
    null,
  );

  // Transient visual flash on each new trial; auto-clears via setTimeout.
  // The source of truth is a prop; the timed cleanup needs JS not CSS.
  useEffect(() => {
    if (!lastResult) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPulse({
      symbol: lastResult.symbol,
      correct: lastResult.symbol === lastResult.predicted,
    });
    const id = window.setTimeout(() => setPulse(null), 240);
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
      <p className="mb-3 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-500">
        {symbolLabels.length === 2
          ? "tap or press a key. try to be unpredictable."
          : "tap or press one of the keys. try to be unpredictable."}
      </p>
      <div
        className={`grid gap-3 ${
          symbolLabels.length === 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4"
        }`}
      >
        {symbolLabels.map((label, i) => {
          const isPredicted = showPrediction && predictedNext === i && !disabled;
          const isPulsing = pulse?.symbol === i;
          const ring = isPredicted ? "ring-2 ring-cyan-500/70" : "";
          const pulseColor = isPulsing
            ? pulse!.correct
              ? "bg-rose-500/15 border-rose-500"
              : "bg-emerald-500/15 border-emerald-500"
            : "";
          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => onPress(i)}
              className={`group relative aspect-square w-full rounded-xl border bg-[var(--surface)] transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 ${
                pulseColor || "border-[var(--line)] hover:border-cyan-500/60"
              } ${ring}`}
              aria-label={`Press ${label} (key ${keyMap[i]})`}
            >
              <span className="block text-4xl sm:text-5xl font-bold text-neutral-800 dark:text-neutral-200">
                {label}
              </span>
              <span className="absolute bottom-2 right-2 font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                key {keyMap[i]}
              </span>
              {isPredicted && (
                <span className="absolute left-2 top-2 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-400">
                  AI guess
                </span>
              )}
            </button>
          );
        })}
      </div>
      {pulse && (
        <p
          className={`mt-3 text-center font-mono text-xs ${
            pulse.correct
              ? "text-rose-600 dark:text-rose-400"
              : "text-emerald-600 dark:text-emerald-400"
          }`}
        >
          {pulse.correct ? "AI called it." : "You slipped past the AI."}
        </p>
      )}
    </div>
  );
}
