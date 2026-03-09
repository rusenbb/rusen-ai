"use client";

import { useState, useEffect } from "react";
import { Spinner, Alert } from "@/components/ui";
import type { Summary, SummaryType, GenerationProgress } from "../types";
import { SUMMARY_LABELS } from "../types";

interface SummaryPanelProps {
  summaries: Summary[];
  isModelReady: boolean;
  isGenerating: boolean;
  progress: GenerationProgress;
  streamingContent: string;
  onGenerateSummary: (type: SummaryType) => Promise<void>;
  onClearSummaries?: () => void;
  lastModelUsed?: string | null;
  onGenerateAll?: () => Promise<void>;
  generateAllProgress?: { current: number; total: number } | null;
  hasFullText?: boolean;
  wordCount?: number;
  currentGeneratingType?: SummaryType | null;
}

const SUMMARY_TYPES: SummaryType[] = ["tldr", "technical", "eli5", "keyFindings"];

export default function SummaryPanel({
  summaries,
  isModelReady,
  isGenerating,
  progress,
  streamingContent,
  onGenerateSummary,
  onClearSummaries,
  lastModelUsed,
  onGenerateAll,
  generateAllProgress,
  hasFullText,
  wordCount,
  currentGeneratingType,
}: SummaryPanelProps) {
  const [copiedType, setCopiedType] = useState<SummaryType | null>(null);
  const [waitingStage, setWaitingStage] = useState<"connecting" | "waiting" | null>(null);

  // Track generation stages for better feedback
  useEffect(() => {
    if (currentGeneratingType && !streamingContent) {
      setWaitingStage("connecting");
      const timer = setTimeout(() => {
        setWaitingStage("waiting");
      }, 1500);
      return () => clearTimeout(timer);
    } else {
      setWaitingStage(null);
    }
  }, [currentGeneratingType, streamingContent]);

  const handleCopy = async (type: SummaryType, content: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleGenerate = async (type: SummaryType) => {
    // Parent component (page.tsx) manages currentGeneratingType state
    await onGenerateSummary(type);
  };

  const getSummary = (type: SummaryType): Summary | undefined => {
    return summaries.find((s) => s.type === type);
  };

  const missingSummaries = SUMMARY_TYPES.filter(type => !summaries.find(s => s.type === type));
  const canGenerateAll = isModelReady && !isGenerating && missingSummaries.length > 0;

  return (
    <div className="mb-8" aria-live="polite" aria-busy={isGenerating}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium">AI Summaries</h3>
        <div className="flex items-center gap-2">
          {/* Generate All button */}
          {onGenerateAll && missingSummaries.length > 0 && (
            <button
              onClick={onGenerateAll}
              disabled={!canGenerateAll}
              className={`px-3 py-1.5 text-sm rounded-lg transition flex items-center gap-2 ${
                canGenerateAll
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-neutral-200 dark:bg-neutral-700 text-neutral-400 cursor-not-allowed"
              }`}
            >
              {generateAllProgress ? (
                <>
                  <Spinner size="sm" color="white" />
                  {generateAllProgress.current}/{generateAllProgress.total}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Generate All
                </>
              )}
            </button>
          )}
          {/* Clear button */}
          {summaries.length > 0 && onClearSummaries && (
            <button
              onClick={onClearSummaries}
              disabled={isGenerating}
              className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition disabled:opacity-50"
              aria-label="Clear all summaries"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {!isModelReady && (
        <p className="text-sm text-neutral-500 mb-4">
          Load an AI model above to generate summaries.
        </p>
      )}

      {/* Abstract-only warning */}
      {hasFullText === false && summaries.length === 0 && (
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-400">
          <strong>Limited context:</strong> Only {wordCount?.toLocaleString() || 0} words available (abstract only).
          Summaries will be less comprehensive than with full text.
        </div>
      )}

      {progress.status === "error" && progress.error && (
        <Alert variant="error" className="mb-4">
          {progress.error}
        </Alert>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {SUMMARY_TYPES.map((type) => {
          const summary = getSummary(type);
          const label = SUMMARY_LABELS[type];
          const isThisGenerating = currentGeneratingType === type;

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
                {!summary && !isThisGenerating && (
                  <button
                    onClick={() => handleGenerate(type)}
                    disabled={!isModelReady || isGenerating}
                    className={`px-3 py-1.5 text-sm rounded-lg transition ${
                      isModelReady && !isGenerating
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "bg-neutral-200 dark:bg-neutral-700 text-neutral-400 cursor-not-allowed"
                    }`}
                  >
                    Generate
                  </button>
                )}
              </div>

              {/* Show streaming content while generating */}
              {isThisGenerating && streamingContent && (
                <div className="mt-3">
                  <div className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed">
                    {streamingContent}
                    <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-1" />
                  </div>
                  <p className="text-xs text-blue-500 mt-2 flex items-center gap-1" role="status">
                    <Spinner size="sm" color="blue" />
                    Generating...
                  </p>
                </div>
              )}

              {/* Show generating placeholder if no streaming content yet */}
              {isThisGenerating && !streamingContent && (
                <div className="mt-3 flex items-center gap-2 text-sm text-neutral-500" role="status">
                  <Spinner size="sm" color="neutral" />
                  {waitingStage === "connecting" ? "Connecting to model..." : "Waiting for response..."}
                </div>
              )}

              {/* Show completed summary */}
              {summary && !isThisGenerating && (
                <div className="mt-3 transition-opacity duration-300">
                  <div className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed">
                    {summary.content}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-neutral-400">
                      Generated at {summary.generatedAt.toLocaleTimeString()}
                      {lastModelUsed && ` · via ${lastModelUsed === "openrouter/free" ? "OpenRouter" : lastModelUsed.split("/").pop()?.replace(":free", "")}`}
                    </p>
                    <div className="flex items-center gap-1">
                      {/* Copy button */}
                      <button
                        onClick={() => handleCopy(type, summary.content)}
                        className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition"
                        aria-label={copiedType === type ? "Copied!" : `Copy ${label.label} summary`}
                      >
                        {copiedType === type ? (
                          <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                      </button>
                      {/* Regenerate button */}
                      <button
                        onClick={() => handleGenerate(type)}
                        disabled={!isModelReady || isGenerating}
                        className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label={`Regenerate ${label.label} summary`}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Not generated yet placeholder */}
              {!summary && !isThisGenerating && (
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
