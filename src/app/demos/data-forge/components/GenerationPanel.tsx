"use client";

import { Button, Alert } from "@/components/ui";
import type { Schema, GenerationProgress } from "../types";

interface GenerationPanelProps {
  schema: Schema;
  progress: GenerationProgress;
  isGenerating: boolean;
  rateLimitRemaining: number | null;
  lastModelUsed: string | null;
  onGenerate: () => void;
  onPreview: () => void;
}

// Extract model name from full model ID
function formatModelName(modelId: string | null): string {
  if (!modelId) return "AI";
  if (modelId === "openrouter/free") return "OpenRouter Auto";
  const name = modelId.split("/").pop() || modelId;
  return name
    .replace(/:free$/, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());
}

export default function GenerationPanel({
  schema,
  progress,
  isGenerating,
  rateLimitRemaining,
  lastModelUsed,
  onGenerate,
  onPreview,
}: GenerationPanelProps) {
  // Consider both hook state and progress status for generation check
  const isCurrentlyGenerating = isGenerating || progress.status === "generating";
  const canGenerate = schema.tables.length > 0 && !isCurrentlyGenerating;
  const totalRows = schema.tables.reduce((sum, t) => sum + t.rowCount, 0);

  return (
    <div className="mb-8 p-6 border border-neutral-200 dark:border-neutral-800 rounded-lg">
      {/* AI Status */}
      <div className="mb-6">
        <h3 className="font-medium mb-3">AI Model</h3>
        <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${isCurrentlyGenerating ? "bg-yellow-500 animate-pulse" : "bg-green-500"}`} />
            <div>
              <div className="font-medium text-sm">
                {isCurrentlyGenerating ? "Generating..." : "Ready"}
              </div>
              <div className="text-xs text-neutral-500">
                Using OpenRouter free models (auto-selected)
              </div>
            </div>
          </div>
        </div>

        {/* Status info */}
        <div className="mt-3 text-xs text-neutral-500 space-y-1">
          {lastModelUsed && (
            <p className="text-green-600 dark:text-green-400">
              Last used: {formatModelName(lastModelUsed)}
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
