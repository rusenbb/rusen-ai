"use client";

import { useRef, useEffect } from "react";
import type { GeneratedToken } from "../types";

interface TokenStreamProps {
  tokens: GeneratedToken[];
  currentIndex: number;
  showProbabilities: boolean;
  onTokenClick?: (index: number) => void;
}

// Get background color based on probability
function getProbabilityColor(probability: number, isSelected: boolean): string {
  if (isSelected) return "bg-blue-200 dark:bg-blue-800";
  if (probability > 0.5) return "bg-green-100 dark:bg-green-900/40";
  if (probability > 0.2) return "bg-emerald-100 dark:bg-emerald-900/40";
  if (probability > 0.1) return "bg-yellow-100 dark:bg-yellow-900/40";
  if (probability > 0.05) return "bg-orange-100 dark:bg-orange-900/40";
  return "bg-red-100 dark:bg-red-900/40";
}

// Get border color based on probability
function getProbabilityBorder(probability: number, isSelected: boolean): string {
  if (isSelected) return "border-blue-500 dark:border-blue-400";
  if (probability > 0.5) return "border-green-400 dark:border-green-600";
  if (probability > 0.2) return "border-emerald-400 dark:border-emerald-600";
  if (probability > 0.1) return "border-yellow-400 dark:border-yellow-600";
  if (probability > 0.05) return "border-orange-400 dark:border-orange-600";
  return "border-red-400 dark:border-red-600";
}

export default function TokenStream({
  tokens,
  currentIndex,
  showProbabilities,
  onTokenClick,
}: TokenStreamProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to keep selected token visible
  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [currentIndex]);

  if (tokens.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-neutral-400 text-sm">
        Tokens will appear here...
      </div>
    );
  }

  // Combine tokens into full text for display
  const fullText = tokens.map((t) => t.token).join("");

  const handlePrev = () => {
    if (onTokenClick && currentIndex > 0) {
      onTokenClick(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (onTokenClick && currentIndex < tokens.length - 1) {
      onTokenClick(currentIndex + 1);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Full text preview */}
      <div className="mb-3 p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
        <div className="text-xs text-neutral-500 mb-1">Generated text:</div>
        <div className="font-mono text-sm text-neutral-900 dark:text-neutral-100 whitespace-pre-wrap">
          {fullText}
        </div>
      </div>

      {/* Navigation controls */}
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={handlePrev}
          disabled={currentIndex <= 0}
          className="px-3 py-1 text-sm border border-neutral-300 dark:border-neutral-600 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ← Prev
        </button>
        <span className="text-sm text-neutral-500">
          Token {currentIndex + 1} of {tokens.length}
        </span>
        <button
          onClick={handleNext}
          disabled={currentIndex >= tokens.length - 1}
          className="px-3 py-1 text-sm border border-neutral-300 dark:border-neutral-600 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Next →
        </button>
      </div>

      {/* Token stream - clickable tokens */}
      <div
        ref={containerRef}
        className="flex flex-wrap gap-1 max-h-[150px] overflow-y-auto p-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900"
      >
        {tokens.map((token, idx) => {
          const isSelected = idx === currentIndex;
          const displayToken = token.token.replace(/\n/g, "↵").replace(/\t/g, "→");

          return (
            <div
              key={idx}
              ref={isSelected ? selectedRef : null}
              data-token
              onClick={() => onTokenClick?.(idx)}
              className={`
                px-1.5 py-0.5 rounded text-xs font-mono cursor-pointer
                border-2 transition-all
                ${getProbabilityColor(token.selectedProbability, isSelected)}
                ${getProbabilityBorder(token.selectedProbability, isSelected)}
                ${isSelected ? "ring-2 ring-offset-1 ring-blue-500 scale-110 z-10" : ""}
                hover:scale-105 hover:z-10
              `}
            >
              <span>{displayToken.trim() || "⎵"}</span>
              {showProbabilities && (
                <span className="ml-1 text-[10px] opacity-60">
                  {(token.selectedProbability * 100).toFixed(0)}%
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-neutral-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-green-100 dark:bg-green-900/40 border border-green-400" />
          &gt;50%
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-yellow-100 dark:bg-yellow-900/40 border border-yellow-400" />
          10-20%
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-red-100 dark:bg-red-900/40 border border-red-400" />
          &lt;5%
        </span>
        <span className="ml-auto text-neutral-400">Click any token or use ← →</span>
      </div>
    </div>
  );
}
