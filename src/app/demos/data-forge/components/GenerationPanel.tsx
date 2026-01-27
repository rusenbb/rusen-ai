"use client";

import { useState } from "react";
import { AVAILABLE_MODELS } from "@/lib/config";
import { Button, Alert } from "@/components/ui";
import type { Schema, GenerationProgress } from "../types";

interface GenerationPanelProps {
  schema: Schema;
  progress: GenerationProgress;
  isGenerating: boolean;
  rateLimitRemaining: number | null;
  lastModelUsed: string | null;
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  onGenerate: () => void;
  onPreview: () => void;
}

export default function GenerationPanel({
  schema,
  progress,
  isGenerating,
  rateLimitRemaining,
  lastModelUsed,
  selectedModel,
  onModelChange,
  onGenerate,
  onPreview,
}: GenerationPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  // Consider both hook state and progress status for generation check
  const isCurrentlyGenerating = isGenerating || progress.status === "generating";
  const canGenerate = schema.tables.length > 0 && !isCurrentlyGenerating;
  const totalRows = schema.tables.reduce((sum, t) => sum + t.rowCount, 0);
  const currentModel = AVAILABLE_MODELS.find(m => m.id === selectedModel) || AVAILABLE_MODELS[0];
  const usedModel = lastModelUsed ? AVAILABLE_MODELS.find(m => m.id === lastModelUsed) : null;

  return (
    <div className="mb-8 p-6 border border-neutral-200 dark:border-neutral-800 rounded-lg">
      {/* Model Selector */}
      <div className="mb-6">
        <h3 className="font-medium mb-3">AI Model</h3>
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            disabled={isCurrentlyGenerating}
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-label={`Select AI model. Current: ${currentModel.name}`}
            className={`w-full p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg text-left transition ${
              isCurrentlyGenerating ? "opacity-50 cursor-not-allowed" : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${isCurrentlyGenerating ? "bg-yellow-500 animate-pulse" : "bg-green-500"}`} />
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
          {isOpen && !isCurrentlyGenerating && (
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

        {/* Model info */}
        <div className="mt-3 text-xs text-neutral-500 space-y-1">
          {usedModel && (
            <p className="text-green-600 dark:text-green-400">
              Last used: {usedModel.name}
            </p>
          )}
          {rateLimitRemaining !== null && (
            <p>Rate limit: {rateLimitRemaining} requests remaining this minute</p>
          )}
          <p>All models are free via OpenRouter</p>
        </div>
      </div>

      {/* Generation progress */}
      {isCurrentlyGenerating && (
        <div className="mb-4" aria-live="polite" aria-busy="true" role="status">
          <div className="flex items-center justify-between text-sm text-neutral-500 mb-1">
            <span>
              {progress.isPreview ? "Previewing" : "Generating"} {progress.currentTable}...
            </span>
            <span>
              {progress.tablesCompleted}/{progress.totalTables} tables
            </span>
          </div>
          <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-300"
              style={{
                width: `${(progress.tablesCompleted / progress.totalTables) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Error state */}
      {progress.status === "error" && progress.error && (
        <Alert variant="error" className="mb-4">
          {progress.error}
        </Alert>
      )}

      {/* Generate buttons */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={onPreview}
            disabled={!canGenerate}
            className={`px-4 py-2.5 rounded-lg font-medium transition border ${
              canGenerate
                ? "border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                : "border-neutral-300 dark:border-neutral-700 text-neutral-400 cursor-not-allowed"
            }`}
            title="Generate 3 rows per table for quick preview"
          >
            Preview (3 rows)
          </button>

          <Button
            variant="success"
            onClick={onGenerate}
            disabled={!canGenerate}
            loading={isCurrentlyGenerating}
          >
            {isCurrentlyGenerating
              ? progress.isPreview ? "Previewing..." : "Generating..."
              : "Generate Data"}
          </Button>
        </div>

        {schema.tables.length > 0 && (
          <span className="text-sm text-neutral-500">
            {schema.tables.length} table{schema.tables.length !== 1 ? "s" : ""},{" "}
            {totalRows} rows total
          </span>
        )}
      </div>

      {/* Help text */}
      {schema.tables.length === 0 && (
        <p className="mt-3 text-sm text-neutral-500">
          Add tables to your schema to start generating data.
        </p>
      )}
    </div>
  );
}
