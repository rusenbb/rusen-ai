"use client";

import { TEMPERATURES, type TemperatureKey } from "../types";

interface TemperatureTabsProps {
  active: TemperatureKey;
  onSelect: (t: TemperatureKey) => void;
}

const TEMP_LABELS: Record<TemperatureKey, string> = {
  "0.0": "T=0",
  "0.3": "T=0.3",
  "0.6": "T=0.6",
  "1.0": "T=1.0",
};

const TEMP_DESCRIPTIONS: Record<TemperatureKey, string> = {
  "0.0": "Greedy — always picks the most likely token",
  "0.3": "Focused — slight randomness, mostly predictable",
  "0.6": "Balanced — noticeable diversity in word choice",
  "1.0": "Creative — flat distribution, frequent surprises",
};

export default function TemperatureTabs({
  active,
  onSelect,
}: TemperatureTabsProps) {
  return (
    <div>
      <div className="flex gap-1.5">
        {TEMPERATURES.map((t) => (
          <button
            key={t}
            onClick={() => onSelect(t)}
            className={`rounded-lg px-3 py-1.5 text-sm font-mono transition-colors ${
              active === t
                ? "bg-blue-600 text-white dark:bg-blue-500"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
            }`}
          >
            {TEMP_LABELS[t]}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-[11px] text-neutral-400 dark:text-neutral-500">
        {TEMP_DESCRIPTIONS[active]}
      </p>
    </div>
  );
}
