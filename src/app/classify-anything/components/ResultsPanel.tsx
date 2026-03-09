"use client";

import { Spinner, Alert } from "@/components/ui";
import type { ClassificationResult, ModelStatus } from "../types";

interface ResultsPanelProps {
  results: ClassificationResult[] | null;
  isClassifying: boolean;
  modelStatus: ModelStatus;
  loadProgress: number;
  error: string | null;
}

export default function ResultsPanel({
  results,
  isClassifying,
  modelStatus,
  loadProgress,
  error,
}: ResultsPanelProps) {
  // Model loading state
  if (modelStatus === "loading") {
    return (
      <div className="p-6 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg" aria-live="polite" aria-busy="true">
        <div className="flex items-center gap-3 mb-4" role="status">
          <Spinner size="md" color="indigo" />
          <span className="text-sm font-medium">Loading classification model...</span>
        </div>
        <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
          <div
            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${loadProgress}%` }}
          />
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
          {loadProgress}% - First load downloads ~100MB model
        </p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert variant="error">
        {error}
      </Alert>
    );
  }

  // Classifying state
  if (isClassifying) {
    return (
      <div className="p-6 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg" aria-live="polite" aria-busy="true">
        <div className="flex items-center gap-3" role="status">
          <Spinner size="md" color="indigo" />
          <span className="text-sm font-medium">Analyzing text...</span>
        </div>
      </div>
    );
  }

  // No results yet
  if (!results) {
    return (
      <div className="p-6 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg text-center">
        <svg
          className="w-12 h-12 mx-auto mb-3 text-neutral-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Enter text and click Classify to see predictions
        </p>
      </div>
    );
  }

  // Results
  const topResult = results[0];
  const maxScore = topResult?.score || 1;

  return (
    <div className="space-y-4" aria-live="polite">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Classification Results</h3>
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          Sorted by confidence
        </span>
      </div>

      <div className="space-y-3">
        {results.map((result, index) => {
          const isTop = index === 0;
          const percentage = Math.round(result.score * 100);
          const barWidth = (result.score / maxScore) * 100;

          return (
            <div
              key={result.label}
              className={`p-3 rounded-lg ${
                isTop
                  ? "bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800"
                  : "bg-neutral-50 dark:bg-neutral-800/50"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`font-medium capitalize ${
                    isTop
                      ? "text-indigo-700 dark:text-indigo-300"
                      : "text-neutral-700 dark:text-neutral-300"
                  }`}
                >
                  {result.label}
                  {isTop && (
                    <span className="ml-2 text-xs bg-indigo-200 dark:bg-indigo-800 px-2 py-0.5 rounded-full">
                      Best match
                    </span>
                  )}
                </span>
                <span
                  className={`text-sm font-mono ${
                    isTop
                      ? "text-indigo-600 dark:text-indigo-400"
                      : "text-neutral-500 dark:text-neutral-400"
                  }`}
                >
                  {percentage}%
                </span>
              </div>
              <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    isTop
                      ? "bg-indigo-600"
                      : "bg-neutral-400 dark:bg-neutral-500"
                  }`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center">
        Powered by MobileBERT NLI model running locally in your browser
      </p>
    </div>
  );
}
