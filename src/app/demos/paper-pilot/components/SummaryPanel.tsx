"use client";

import { useState } from "react";
import type { Summary, SummaryType, GenerationProgress } from "../types";
import { SUMMARY_LABELS } from "../types";

interface SummaryPanelProps {
  summaries: Summary[];
  isModelReady: boolean;
  isGenerating: boolean;
  progress: GenerationProgress;
  onGenerateSummary: (type: SummaryType) => Promise<void>;
}

const SUMMARY_TYPES: SummaryType[] = ["tldr", "technical", "eli5", "keyFindings"];

export default function SummaryPanel({
  summaries,
  isModelReady,
  isGenerating,
  progress,
  onGenerateSummary,
}: SummaryPanelProps) {
  const [generatingType, setGeneratingType] = useState<SummaryType | null>(null);

  const handleGenerate = async (type: SummaryType) => {
    setGeneratingType(type);
    try {
      await onGenerateSummary(type);
    } finally {
      setGeneratingType(null);
    }
  };

  const getSummary = (type: SummaryType): Summary | undefined => {
    return summaries.find((s) => s.type === type);
  };

  return (
    <div className="mb-8">
      <h3 className="font-medium mb-4">AI Summaries</h3>

      {!isModelReady && (
        <p className="text-sm text-neutral-500 mb-4">
          Load an AI model above to generate summaries.
        </p>
      )}

      {progress.status === "error" && progress.error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
          {progress.error}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {SUMMARY_TYPES.map((type) => {
          const summary = getSummary(type);
          const label = SUMMARY_LABELS[type];
          const isThisGenerating = generatingType === type;

          return (
            <div
              key={type}
              className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg"
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 className="font-medium">{label.label}</h4>
                  <p className="text-xs text-neutral-500">{label.description}</p>
                </div>
                {!summary && (
                  <button
                    onClick={() => handleGenerate(type)}
                    disabled={!isModelReady || isGenerating}
                    className={`px-3 py-1.5 text-sm rounded-lg transition ${
                      isModelReady && !isGenerating
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "bg-neutral-200 dark:bg-neutral-700 text-neutral-400 cursor-not-allowed"
                    }`}
                  >
                    {isThisGenerating ? (
                      <span className="flex items-center gap-2">
                        <svg
                          className="w-4 h-4 animate-spin"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Generating
                      </span>
                    ) : (
                      "Generate"
                    )}
                  </button>
                )}
              </div>

              {summary ? (
                <div className="mt-3">
                  <div className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed">
                    {summary.content}
                  </div>
                  <p className="text-xs text-neutral-400 mt-2">
                    Generated at {summary.generatedAt.toLocaleTimeString()}
                  </p>
                </div>
              ) : (
                <div className="mt-3 text-sm text-neutral-400 italic">
                  Not generated yet
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
