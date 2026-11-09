"use client";

import type { PredictorExplanation } from "../predictors/discrete";

export function WhyPanelDiscrete({ why, symbolLabels, predictorLabel }: {
  why: PredictorExplanation | null;
  symbolLabels: string[];
  predictorLabel: string;
}) {
  if (!why) return <p className="text-xs">After 20 presses, this shows how the leading predictor makes its guess.</p>;
  return (
    <div className="space-y-3">
      <p className="text-xs">{why.rule}</p>
      <p className="text-xs">Next guess: <strong>{symbolLabels[why.prediction.argmax]}</strong> ({predictorLabel})</p>
      <ul aria-label="Next-key probabilities" className="space-y-2">
        {why.prediction.pmf.map((probability, index) => (
          <li key={index} className="flex items-center gap-2 font-mono text-xs">
            <span className="w-8">{symbolLabels[index]}</span>
            <div className="h-1.5 min-w-0 flex-1 overflow-hidden bg-[var(--line)]">
              <div className="h-full bg-[var(--accent)]" style={{ width: `${probability * 100}%` }} />
            </div>
            <span className="w-16 text-right tabular-nums">{(probability * 100).toFixed(1)}%</span>
          </li>
        ))}
      </ul>
      {why.contexts.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer">Counts behind the prediction</summary>
          <ul className="mt-2 space-y-2">
            {why.contexts.map(({ context, counts }, index) => (
              <li key={index} className="break-words">
                <span className="font-mono">{context.length ? context.map((symbol) => symbolLabels[symbol]).join(" → ") : "Whole session"}</span>
                {": "}{counts.map((count, symbol) => `${symbolLabels[symbol]} ${count}`).join(" · ")}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
