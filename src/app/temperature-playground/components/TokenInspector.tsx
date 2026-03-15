"use client";

import { useMemo } from "react";
import type { TokenData } from "../types";
import { logprobsToProbs } from "../lib/softmax";
import { describeToken } from "./TokenChip";
import { DemoPanel } from "@/components/ui";

interface TokenInspectorProps {
  token: TokenData | null;
  tokenIndex: number | null;
  inspectorTemperature: number;
  onTemperatureChange: (value: number) => void;
}

const MAX_DISPLAY = 8;

function formatProb(prob: number, temperature: number): string {
  const pct = prob * 100;
  if (temperature <= 0) return `${pct.toFixed(1)}%`;
  if (pct >= 99.95) return "~100%";
  if (pct < 0.05 && pct > 0) return "<0.1%";
  return `${pct.toFixed(1)}%`;
}

export default function TokenInspector({
  token,
  tokenIndex,
  inspectorTemperature,
  onTemperatureChange,
}: TokenInspectorProps) {
  const probabilities = useMemo(() => {
    if (!token || token.logprobs.length === 0) return [];
    const lps = token.logprobs.map((lp) => lp.logprob);
    const probs = logprobsToProbs(lps, inspectorTemperature);
    return token.logprobs
      .map((lp, i) => ({
        id: lp.id,
        text: lp.text,
        prob: probs[i],
        isSampled: lp.id === token.id,
      }))
      .slice(0, MAX_DISPLAY);
  }, [token, inspectorTemperature]);

  if (!token) {
    return (
      <DemoPanel title="Token Inspector" padding="md">
        <p className="text-xs text-neutral-400 dark:text-neutral-500 py-4 text-center">
          Click any token to inspect its probability distribution.
        </p>
      </DemoPanel>
    );
  }

  const maxProb = probabilities.length > 0 ? probabilities[0].prob : 0;
  const tokenDesc = describeToken(token.text);

  return (
    <DemoPanel title="Token Inspector" padding="md">
      {/* Token info */}
      <div className="mb-3">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            &ldquo;{tokenDesc.display}&rdquo;
          </span>
          {tokenIndex !== null && (
            <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
              position {tokenIndex + 1}
            </span>
          )}
        </div>
      </div>

      {/* Probability bars */}
      <div className="flex flex-col gap-1">
        {probabilities.map((entry) => {
          const barWidth = maxProb > 0 ? (entry.prob / maxProb) * 100 : 0;
          const described = describeToken(entry.text);

          return (
            <div key={entry.id} className="flex items-center gap-2 text-xs">
              <div className={`w-16 shrink-0 truncate font-mono text-right ${described.isSpecial ? "italic text-neutral-400 dark:text-neutral-500" : "text-neutral-600 dark:text-neutral-300"}`}>
                {described.display}
              </div>
              <div className="flex-1 h-4 rounded bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                <div
                  className={`h-full rounded transition-all duration-200 ${
                    entry.isSampled
                      ? "bg-blue-500 dark:bg-blue-400"
                      : "bg-neutral-300 dark:bg-neutral-600"
                  }`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
              <span className="w-12 shrink-0 text-right tabular-nums text-neutral-500 dark:text-neutral-400">
                {formatProb(entry.prob, inspectorTemperature)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Temperature slider */}
      <div className="mt-4 pt-3 border-t border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
            Adjust temperature
          </span>
          <span className="text-xs tabular-nums font-mono text-neutral-500 dark:text-neutral-400">
            T={inspectorTemperature.toFixed(2)}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={2}
          step={0.01}
          value={inspectorTemperature}
          onChange={(e) => onTemperatureChange(parseFloat(e.target.value))}
          className="w-full accent-blue-500"
        />
        <div className="flex justify-between text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">
          <span>0 (greedy)</span>
          <span>1.0</span>
          <span>2.0 (chaotic)</span>
        </div>
      </div>
    </DemoPanel>
  );
}
