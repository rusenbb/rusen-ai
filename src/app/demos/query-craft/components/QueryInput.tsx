"use client";

import { useRef, useEffect } from "react";
import { Button } from "@/components/ui";
import { EXAMPLE_QUERIES } from "../utils/prompts";

interface QueryInputProps {
  query: string;
  onQueryChange: (query: string) => void;
  onSubmit: () => void;
  isGenerating: boolean;
  hasSchema: boolean;
  rateLimitRemaining: number | null;
  lastModelUsed: string | null;
  currentPreset: string | null;
  autoFocusKey?: number;
  onExampleClick?: (example: string) => void;
  includeExplanation?: boolean;
  onIncludeExplanationChange?: (value: boolean) => void;
}

export default function QueryInput({
  query,
  onQueryChange,
  onSubmit,
  isGenerating,
  hasSchema,
  rateLimitRemaining,
  lastModelUsed,
  currentPreset,
  autoFocusKey,
  onExampleClick,
  includeExplanation,
  onIncludeExplanationChange,
}: QueryInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus textarea when autoFocusKey changes (preset loaded)
  useEffect(() => {
    if (autoFocusKey && autoFocusKey > 0) {
      textareaRef.current?.focus();
    }
  }, [autoFocusKey]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (hasSchema && query.trim() && !isGenerating) {
        onSubmit();
      }
    }
  };

  const examples = currentPreset ? EXAMPLE_QUERIES[currentPreset] : null;

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold mb-3">Natural Language Query</h2>

      {/* Query textarea */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            hasSchema
              ? "Describe what data you want to retrieve... (e.g., 'Find all customers who placed orders in the last month')"
              : "Define a schema first to start querying"
          }
          disabled={!hasSchema || isGenerating}
          rows={3}
          className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      {/* Example queries */}
      {examples && examples.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-neutral-500 mb-2">Try an example (click to run):</p>
          <div className="flex flex-wrap gap-2">
            {examples.slice(0, 4).map((example, idx) => (
              <button
                key={idx}
                onClick={() => {
                  onQueryChange(example);
                  onExampleClick?.(example);
                }}
                disabled={isGenerating}
                className="px-2.5 py-1 text-xs border border-neutral-200 dark:border-neutral-700 rounded-full hover:border-neutral-400 dark:hover:border-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Controls row */}
      <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {/* Model used indicator */}
          {lastModelUsed && (
            <span className="text-xs text-neutral-500">
              Model: {lastModelUsed.split("/").pop()?.split(":")[0]}
            </span>
          )}

          {/* Explanation toggle */}
          {onIncludeExplanationChange && (
            <label className="flex items-center gap-1.5 cursor-pointer text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 transition">
              <input
                type="checkbox"
                checked={includeExplanation}
                onChange={(e) => onIncludeExplanationChange(e.target.checked)}
                className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-600 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              Explain query
            </label>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Rate limit indicator */}
          {rateLimitRemaining !== null && (
            <span className="text-xs text-neutral-500">
              {rateLimitRemaining} requests/min
            </span>
          )}

          {/* Generate button */}
          <Button
            variant="primary"
            onClick={onSubmit}
            disabled={!hasSchema || !query.trim()}
            loading={isGenerating}
            title="Press Enter to generate (Shift+Enter for new line)"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
          >
            {isGenerating ? "Generating..." : "Generate SQL"}
          </Button>
          <span className="text-xs text-neutral-400 hidden sm:inline">
            or press Enter
          </span>
        </div>
      </div>
    </div>
  );
}
