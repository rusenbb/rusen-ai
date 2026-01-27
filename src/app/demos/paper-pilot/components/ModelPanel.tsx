"use client";

import { useState, useEffect } from "react";
import { AVAILABLE_MODELS } from "@/lib/config";

interface ModelPanelProps {
  isGenerating: boolean;
  rateLimitRemaining: number | null;
  lastModelUsed: string | null;
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  paperSubjects?: string[];
  paperTitle?: string;
}

// Simple heuristics for model suggestion
function suggestModel(title?: string, subjects?: string[]): { modelId: string; reason: string } | null {
  if (!title && (!subjects || subjects.length === 0)) return null;

  const content = `${title || ""} ${(subjects || []).join(" ")}`.toLowerCase();

  // Check for code/ML/technical papers
  const codeTerms = ["code", "programming", "software", "algorithm", "implementation", "github", "benchmark"];
  if (codeTerms.some(term => content.includes(term))) {
    return { modelId: "qwen/qwen3-coder:free", reason: "Code-related paper detected" };
  }

  // Check for reasoning/math papers
  const reasoningTerms = ["proof", "theorem", "mathematical", "logic", "reasoning", "formal"];
  if (reasoningTerms.some(term => content.includes(term))) {
    return { modelId: "deepseek/deepseek-r1-0528:free", reason: "Reasoning-heavy paper detected" };
  }

  // Default to fast model for general papers
  return null;
}

export default function ModelPanel({
  isGenerating,
  rateLimitRemaining,
  lastModelUsed,
  selectedModel,
  onModelChange,
  paperSubjects,
  paperTitle,
}: ModelPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const currentModel = AVAILABLE_MODELS.find(m => m.id === selectedModel) || AVAILABLE_MODELS[0];
  const usedModel = lastModelUsed ? AVAILABLE_MODELS.find(m => m.id === lastModelUsed) : null;
  const suggestion = suggestModel(paperTitle, paperSubjects);
  const suggestedModel = suggestion ? AVAILABLE_MODELS.find(m => m.id === suggestion.modelId) : null;

  // Start countdown when rate limit hits 0
  useEffect(() => {
    if (rateLimitRemaining === 0 && countdown === null) {
      setCountdown(60);
    } else if (rateLimitRemaining !== null && rateLimitRemaining > 0) {
      setCountdown(null);
    }
  }, [rateLimitRemaining, countdown]);

  // Countdown timer
  useEffect(() => {
    if (countdown === null || countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown(prev => (prev !== null && prev > 0 ? prev - 1 : null));
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  return (
    <div className="mb-6 p-6 border border-neutral-200 dark:border-neutral-800 rounded-lg">
      <h3 className="font-medium mb-4">AI Model</h3>

      {/* Model Selector */}
      <div className="relative mb-4">
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={isGenerating}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-label={`Select AI model. Current: ${currentModel.name}`}
          className={`w-full p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg text-left transition ${
            isGenerating ? "opacity-50 cursor-not-allowed" : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full ${isGenerating ? "bg-yellow-500 animate-pulse" : "bg-green-500"}`} />
              <div>
                <div className="font-medium text-sm">{currentModel.name}</div>
                <div className="text-xs text-neutral-500">{currentModel.description}</div>
              </div>
            </div>
            <svg
              className={`w-5 h-5 text-neutral-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {/* Dropdown */}
        {isOpen && !isGenerating && (
          <div className="absolute z-10 w-full mt-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg overflow-hidden" role="listbox">
            {AVAILABLE_MODELS.map((model) => (
              <button
                key={model.id}
                onClick={() => {
                  onModelChange(model.id);
                  setIsOpen(false);
                }}
                role="option"
                aria-selected={selectedModel === model.id}
                className={`w-full p-3 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 transition ${
                  selectedModel === model.id ? "bg-green-50 dark:bg-green-900/20" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    selectedModel === model.id ? "bg-green-500" : "bg-neutral-300 dark:bg-neutral-600"
                  }`} />
                  <div>
                    <div className="font-medium text-sm">{model.name}</div>
                    <div className="text-xs text-neutral-500">{model.description}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Model suggestion */}
      {suggestion && suggestedModel && selectedModel === "auto" && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <strong>Suggestion:</strong> {suggestion.reason}
          </p>
          <button
            onClick={() => onModelChange(suggestion.modelId)}
            disabled={isGenerating}
            className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
          >
            Switch to {suggestedModel.name} →
          </button>
        </div>
      )}

      {/* Model info */}
      <div className="text-xs text-neutral-500 space-y-1">
        {usedModel && (
          <p className="text-green-600 dark:text-green-400">
            Last used: {usedModel.name}
          </p>
        )}
        {countdown !== null && countdown > 0 ? (
          <p className="text-amber-600 dark:text-amber-400">
            Rate limited · Try again in {countdown}s
          </p>
        ) : rateLimitRemaining !== null ? (
          <p className={rateLimitRemaining <= 5 ? "text-amber-600 dark:text-amber-400" : ""}>
            Rate limit: {rateLimitRemaining} requests remaining this minute
          </p>
        ) : null}
        <p>All models are free via OpenRouter</p>
      </div>
    </div>
  );
}
