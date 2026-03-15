"use client";

import { useCallback } from "react";
interface TokenChipProps {
  text: string;
  /** Probability of this token being chosen (0–1), used for coloring */
  probability: number;
  /** Whether this token is currently selected in the inspector */
  isSelected: boolean;
  /** Whether this token has child branches (shows fork indicator) */
  hasBranches: boolean;
  onClick: () => void;
}

/**
 * Returns a background color class based on how "surprising" the token was.
 */
function getProbabilityColorClasses(prob: number, isSelected: boolean): string {
  if (isSelected) {
    return "bg-blue-200 dark:bg-blue-800 ring-2 ring-blue-500";
  }
  if (prob > 0.8) {
    return "bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700";
  }
  if (prob > 0.5) {
    return "bg-sky-100 dark:bg-sky-900/50 hover:bg-sky-200 dark:hover:bg-sky-800/60";
  }
  if (prob > 0.2) {
    return "bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-800/50";
  }
  return "bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-800/50";
}

/**
 * Describe a token for display using the raw BPE vocab.
 *
 * The vocab maps token IDs to raw BPE strings (e.g. "Ġhello" for " hello",
 * "Ċ" for "\n", byte-level tokens like "Į" for raw byte 0xEA).
 * This replaces all hardcoded pattern-matching — the vocab is the source of truth.
 */
// Character replacement map — every character that needs a visible substitute.
const CHAR_MAP: Record<string, string> = {
  " ": "\u2423",  // ␣
  "\n": "\u23ce", // ⏎
  "\t": "\u2192", // →
  "\ufffd": "\u2B1A", // ⬚ (partial UTF-8 byte)
};

export function describeToken(text: string): { display: string; isSpecial: boolean } {
  let display = "";
  let hasSpecial = false;

  for (const ch of text) {
    const replacement = CHAR_MAP[ch];
    if (replacement) {
      display += replacement;
      hasSpecial = true;
    } else {
      display += ch;
    }
  }

  // A token is "special" (styled differently) when it's entirely
  // non-printable — pure whitespace, byte fragments, or a mix of both.
  const isSpecial = hasSpecial && display.length > 0 &&
    [...text].every((ch) => ch in CHAR_MAP);

  return { display, isSpecial };
}

export default function TokenChip({
  text,
  probability,
  isSelected,
  hasBranches,
  onClick,
}: TokenChipProps) {
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onClick();
    },
    [onClick],
  );

  const colorClasses = getProbabilityColorClasses(probability, isSelected);
  const { display, isSpecial } = describeToken(text);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-sm font-mono leading-snug transition-colors cursor-pointer ${colorClasses} ${isSpecial ? "text-neutral-400 dark:text-neutral-500 italic text-[11px]" : "text-neutral-800 dark:text-neutral-200"}`}
      title={`"${text}" — ${(probability * 100).toFixed(1)}% probability`}
    >
      <span className={isSpecial ? "" : "whitespace-pre"}>{display}</span>
      {hasBranches && (
        <span className="text-[10px] text-blue-500 dark:text-blue-400 ml-0.5">
          &#x2E19;
        </span>
      )}
    </button>
  );
}
