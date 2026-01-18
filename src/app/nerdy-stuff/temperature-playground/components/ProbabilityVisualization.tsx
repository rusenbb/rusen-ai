"use client";

import { useMemo } from "react";

interface ProbabilityVisualizationProps {
  temperatures: number[];
}

// Simulated token probabilities for a hypothetical next-token prediction
// This demonstrates how temperature affects the softmax distribution
const BASE_LOGITS = [
  { token: "the", logit: 5.2 },
  { token: "a", logit: 4.8 },
  { token: "an", logit: 3.5 },
  { token: "one", logit: 2.9 },
  { token: "this", logit: 2.1 },
  { token: "my", logit: 1.5 },
  { token: "some", logit: 0.8 },
  { token: "your", logit: 0.2 },
];

// Apply softmax with temperature
function softmaxWithTemperature(logits: typeof BASE_LOGITS, temperature: number) {
  // Prevent division by zero
  const T = Math.max(temperature, 0.001);

  // Scale logits by temperature
  const scaledLogits = logits.map((l) => l.logit / T);

  // Find max for numerical stability
  const maxLogit = Math.max(...scaledLogits);

  // Compute exp(x - max) for stability
  const expLogits = scaledLogits.map((l) => Math.exp(l - maxLogit));
  const sumExp = expLogits.reduce((a, b) => a + b, 0);

  return logits.map((l, i) => ({
    token: l.token,
    probability: expLogits[i] / sumExp,
  }));
}

export default function ProbabilityVisualization({
  temperatures,
}: ProbabilityVisualizationProps) {
  // Compute probability distributions for each temperature
  const distributions = useMemo(() => {
    return temperatures.map((temp) => ({
      temperature: temp,
      probabilities: softmaxWithTemperature(BASE_LOGITS, temp),
    }));
  }, [temperatures]);

  // Color scale based on probability
  const getBarColor = (prob: number) => {
    if (prob > 0.5) return "bg-green-500";
    if (prob > 0.2) return "bg-yellow-500";
    if (prob > 0.1) return "bg-orange-500";
    return "bg-red-500";
  };

  return (
    <div className="p-6 border border-neutral-200 dark:border-neutral-800 rounded-lg bg-neutral-50 dark:bg-neutral-900/50">
      <h3 className="font-semibold mb-2">Probability Distribution Demo</h3>
      <p className="text-sm text-neutral-500 mb-4">
        This shows how temperature affects next-token selection. Lower temperatures
        concentrate probability on the most likely tokens; higher temperatures spread
        it more evenly, enabling exploration of alternative paths.
      </p>

      <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${Math.min(distributions.length, 3)}, 1fr)` }}>
        {distributions.map(({ temperature, probabilities }) => {
          const maxProb = Math.max(...probabilities.map((p) => p.probability));
          const topToken = probabilities.find((p) => p.probability === maxProb);

          return (
            <div key={temperature} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold">T = {temperature.toFixed(1)}</span>
                <span className="text-xs text-neutral-500">
                  Top: "{topToken?.token}" ({(topToken?.probability || 0) * 100}%)
                </span>
              </div>

              <div className="space-y-1">
                {probabilities.slice(0, 6).map(({ token, probability }) => (
                  <div key={token} className="flex items-center gap-2">
                    <span className="w-12 text-xs font-mono text-right truncate">
                      {token}
                    </span>
                    <div className="flex-1 h-4 bg-neutral-200 dark:bg-neutral-700 rounded overflow-hidden">
                      <div
                        className={`h-full ${getBarColor(probability)} transition-all duration-300`}
                        style={{ width: `${probability * 100}%` }}
                      />
                    </div>
                    <span className="w-12 text-xs text-right">
                      {(probability * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>

              {/* Entropy indicator */}
              <div className="text-xs text-neutral-400 mt-2">
                Entropy: {computeEntropy(probabilities).toFixed(2)} bits
                <span className="ml-2">
                  ({temperature === 0 ? "deterministic" : temperature < 0.5 ? "focused" : temperature < 1 ? "balanced" : "exploratory"})
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Visual explanation */}
      <div className="mt-6 p-4 bg-neutral-100 dark:bg-neutral-800 rounded text-xs text-neutral-600 dark:text-neutral-400">
        <strong>Understanding the visualization:</strong>
        <ul className="mt-2 space-y-1 list-disc list-inside">
          <li>
            <strong>T = 0:</strong> Model always picks the highest-probability token (greedy decoding)
          </li>
          <li>
            <strong>T &lt; 1:</strong> Distribution is "sharpened" - high-prob tokens get even higher
          </li>
          <li>
            <strong>T = 1:</strong> Original model distribution (as trained)
          </li>
          <li>
            <strong>T &gt; 1:</strong> Distribution is "flattened" - low-prob tokens become more likely
          </li>
        </ul>
      </div>
    </div>
  );
}

// Compute Shannon entropy of a probability distribution
function computeEntropy(probabilities: { probability: number }[]): number {
  let entropy = 0;
  for (const { probability } of probabilities) {
    if (probability > 0) {
      entropy -= probability * Math.log2(probability);
    }
  }
  return entropy;
}
