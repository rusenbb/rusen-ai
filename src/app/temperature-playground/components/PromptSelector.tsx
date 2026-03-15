"use client";

import type { PromptManifestEntry } from "../types";

interface PromptSelectorProps {
  manifest: PromptManifestEntry[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  disabled: boolean;
}

const LEVEL_DOTS: Record<string, string> = {
  deterministic: "●●●",
  medium: "●●○",
  creative: "●○○",
};

const LEVEL_LABELS: Record<string, string> = {
  deterministic: "Deterministic",
  medium: "Medium",
  creative: "Creative",
};

export default function PromptSelector({
  manifest,
  selectedIndex,
  onSelect,
  disabled,
}: PromptSelectorProps) {
  if (manifest.length === 0) return null;

  // Group by category for the optgroup display
  const categories: { name: string; entries: { entry: PromptManifestEntry; index: number }[] }[] = [];
  let currentCategory = "";

  manifest.forEach((entry, index) => {
    if (entry.category !== currentCategory) {
      currentCategory = entry.category;
      categories.push({ name: entry.category, entries: [] });
    }
    categories[categories.length - 1].entries.push({ entry, index });
  });

  return (
    <div className="flex items-center gap-3">
      <label
        htmlFor="prompt-select"
        className="text-xs font-medium text-neutral-500 dark:text-neutral-400 shrink-0"
      >
        Prompt
      </label>
      <select
        id="prompt-select"
        value={selectedIndex}
        onChange={(e) => onSelect(parseInt(e.target.value))}
        disabled={disabled}
        className="flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm
          text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100
          focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
      >
        {categories.map((cat) => (
          <optgroup key={cat.name} label={cat.name}>
            {cat.entries.map(({ entry, index }) => (
              <option key={index} value={index}>
                {entry.label} {LEVEL_DOTS[entry.level] ?? ""}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      {/* Determinism level legend */}
      {manifest[selectedIndex] && (
        <span className="text-[10px] text-neutral-400 dark:text-neutral-500 shrink-0 hidden sm:inline">
          {LEVEL_LABELS[manifest[selectedIndex].level] ?? manifest[selectedIndex].level}
        </span>
      )}
    </div>
  );
}
