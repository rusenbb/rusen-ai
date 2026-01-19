"use client";

import { useRef, useEffect, useState } from "react";
import type { GeneratedToken } from "../types";

interface TokenStreamProps {
  tokens: GeneratedToken[];
  currentIndex: number;
  showProbabilities: boolean;
}

// Get background color based on probability
function getProbabilityColor(probability: number): string {
  if (probability > 0.5) return "bg-green-100 dark:bg-green-900/40";
  if (probability > 0.2) return "bg-blue-100 dark:bg-blue-900/40";
  if (probability > 0.1) return "bg-purple-100 dark:bg-purple-900/40";
  if (probability > 0.05) return "bg-orange-100 dark:bg-orange-900/40";
  return "bg-red-100 dark:bg-red-900/40";
}

// Get border color based on probability
function getProbabilityBorder(probability: number): string {
  if (probability > 0.5) return "border-green-300 dark:border-green-700";
  if (probability > 0.2) return "border-blue-300 dark:border-blue-700";
  if (probability > 0.1) return "border-purple-300 dark:border-purple-700";
  if (probability > 0.05) return "border-orange-300 dark:border-orange-700";
  return "border-red-300 dark:border-red-700";
}

interface TokenPopoverProps {
  token: GeneratedToken;
  onClose: () => void;
}

function TokenPopover({ token, onClose }: TokenPopoverProps) {
  return (
    <div className="absolute z-20 top-full left-0 mt-1 p-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-xl min-w-[200px]">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-medium text-neutral-500">
          Token probabilities
        </span>
        <button
          onClick={onClose}
          className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <div className="space-y-1.5">
        {token.topProbabilities.slice(0, 6).map((prob, idx) => {
          const isSelected = prob.tokenId === token.tokenId;
          return (
            <div key={idx} className="flex items-center gap-2">
              <span
                className={`w-16 text-xs font-mono truncate text-right ${
                  isSelected
                    ? "text-green-600 dark:text-green-400 font-bold"
                    : "text-neutral-600 dark:text-neutral-400"
                }`}
              >
                {prob.token.trim() || "⏎"}
              </span>
              <div className="flex-1 h-3 bg-neutral-200 dark:bg-neutral-700 rounded overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    isSelected
                      ? "bg-green-500"
                      : "bg-neutral-400 dark:bg-neutral-500"
                  }`}
                  style={{ width: `${prob.probability * 100}%` }}
                />
              </div>
              <span className="w-12 text-xs text-right text-neutral-500">
                {(prob.probability * 100).toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function TokenStream({
  tokens,
  currentIndex,
  showProbabilities,
}: TokenStreamProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [expandedTokenIdx, setExpandedTokenIdx] = useState<number | null>(null);

  // Auto-scroll to keep current token visible
  useEffect(() => {
    if (containerRef.current && currentIndex >= 0) {
      const container = containerRef.current;
      const tokenElements = container.querySelectorAll("[data-token]");
      const currentElement = tokenElements[currentIndex] as HTMLElement;

      if (currentElement) {
        currentElement.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "nearest",
        });
      }
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

  return (
    <div className="flex-1 flex flex-col">
      {/* Full text preview */}
      <div className="mb-3 p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
        <div className="text-xs text-neutral-500 mb-1">Generated text:</div>
        <div className="font-mono text-sm text-neutral-900 dark:text-neutral-100 whitespace-pre-wrap">
          {fullText}
        </div>
      </div>

      {/* Token stream with probabilities */}
      <div
        ref={containerRef}
        className="flex flex-wrap gap-1 max-h-[200px] overflow-y-auto p-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900"
      >
        {tokens.map((token, idx) => {
          const isCurrent = idx === currentIndex;
          const isPast = idx < currentIndex;
          const displayToken = token.token.replace(/\n/g, "↵");

          return (
            <div
              key={idx}
              data-token
              className="relative"
              onClick={() =>
                setExpandedTokenIdx(expandedTokenIdx === idx ? null : idx)
              }
            >
              <div
                className={`
                  px-1.5 py-0.5 rounded text-xs font-mono cursor-pointer
                  border transition-all
                  ${getProbabilityColor(token.selectedProbability)}
                  ${getProbabilityBorder(token.selectedProbability)}
                  ${isCurrent ? "ring-2 ring-offset-1 ring-blue-500 scale-110" : ""}
                  ${isPast ? "opacity-70" : ""}
                  hover:opacity-100 hover:scale-105
                `}
              >
                <span>{displayToken.trim() || "⎵"}</span>
                {showProbabilities && (
                  <span className="ml-1 text-[10px] opacity-60">
                    {(token.selectedProbability * 100).toFixed(0)}%
                  </span>
                )}
              </div>

              {/* Expanded popover */}
              {expandedTokenIdx === idx && (
                <TokenPopover
                  token={token}
                  onClose={() => setExpandedTokenIdx(null)}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-neutral-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-green-100 dark:bg-green-900/40 border border-green-300 dark:border-green-700" />
          &gt;50%
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-blue-100 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-700" />
          20-50%
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-purple-100 dark:bg-purple-900/40 border border-purple-300 dark:border-purple-700" />
          10-20%
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-700" />
          &lt;5%
        </span>
        <span className="ml-auto italic">Click tokens for details</span>
      </div>
    </div>
  );
}
