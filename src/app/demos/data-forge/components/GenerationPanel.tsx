"use client";

import type { Schema, GenerationProgress } from "../types";
import { MODEL_OPTIONS, DEFAULT_MODEL_ID } from "../types";

interface GenerationPanelProps {
  schema: Schema;
  progress: GenerationProgress;
  isModelReady: boolean;
  isModelLoading: boolean;
  modelLoadProgress: number;
  loadedModelId: string | null;
  selectedModelId: string;
  onModelSelect: (modelId: string) => void;
  onGenerate: () => void;
  onLoadModel: () => void;
}

export default function GenerationPanel({
  schema,
  progress,
  isModelReady,
  isModelLoading,
  modelLoadProgress,
  loadedModelId,
  selectedModelId,
  onModelSelect,
  onGenerate,
  onLoadModel,
}: GenerationPanelProps) {
  const canGenerate = schema.tables.length > 0 && isModelReady && progress.status !== "generating";
  const isGenerating = progress.status === "generating";
  const totalRows = schema.tables.reduce((sum, t) => sum + t.rowCount, 0);
  const selectedModel = MODEL_OPTIONS.find((m) => m.id === selectedModelId);
  const loadedModel = MODEL_OPTIONS.find((m) => m.id === loadedModelId);

  return (
    <div className="mb-8 p-6 border border-neutral-200 dark:border-neutral-800 rounded-lg">
      {/* Model Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-3">Select AI Model</label>
        <div className="grid md:grid-cols-3 gap-3">
          {MODEL_OPTIONS.map((model) => (
            <button
              key={model.id}
              onClick={() => onModelSelect(model.id)}
              disabled={isModelLoading || isGenerating}
              className={`p-4 rounded-lg border text-left transition ${
                selectedModelId === model.id
                  ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                  : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500"
              } ${(isModelLoading || isGenerating) ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium">{model.name}</span>
                {loadedModelId === model.id && (
                  <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded">
                    Loaded
                  </span>
                )}
              </div>
              <div className="text-xs text-neutral-500 space-y-0.5">
                <div>{model.size} download</div>
                <div>{model.vramRequired} VRAM required</div>
                <div className="text-neutral-400">{model.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Model status */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              isModelReady && loadedModelId === selectedModelId
                ? "bg-green-500"
                : isModelLoading
                ? "bg-yellow-500 animate-pulse"
                : "bg-neutral-300 dark:bg-neutral-600"
            }`}
          />
          <span className="text-sm">
            {isModelReady && loadedModelId === selectedModelId
              ? `${loadedModel?.name} ready`
              : isModelLoading
              ? `Loading ${selectedModel?.name}...`
              : loadedModelId && loadedModelId !== selectedModelId
              ? `${loadedModel?.name} loaded (switch to ${selectedModel?.name}?)`
              : "No model loaded"}
          </span>
        </div>

        {!isModelLoading && (!isModelReady || loadedModelId !== selectedModelId) && (
          <button
            onClick={onLoadModel}
            className="px-3 py-1.5 text-sm bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-lg hover:opacity-80 transition"
          >
            {loadedModelId && loadedModelId !== selectedModelId
              ? `Switch to ${selectedModel?.name}`
              : `Load ${selectedModel?.name}`}
          </button>
        )}
      </div>

      {/* Model loading progress */}
      {isModelLoading && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm text-neutral-500 mb-1">
            <span>Downloading {selectedModel?.name} ({selectedModel?.size})</span>
            <span>{Math.round(modelLoadProgress * 100)}%</span>
          </div>
          <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-yellow-500 transition-all duration-300"
              style={{ width: `${modelLoadProgress * 100}%` }}
            />
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            This only needs to be done once per model. Models are cached locally.
          </p>
        </div>
      )}

      {/* Generation progress */}
      {isGenerating && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm text-neutral-500 mb-1">
            <span>
              Generating {progress.currentTable}...
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
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
          {progress.error}
        </div>
      )}

      {/* Generate button */}
      <div className="flex items-center gap-4">
        <button
          onClick={onGenerate}
          disabled={!canGenerate || loadedModelId !== selectedModelId}
          className={`px-6 py-2.5 rounded-lg font-medium transition ${
            canGenerate && loadedModelId === selectedModelId
              ? "bg-green-600 hover:bg-green-700 text-white"
              : "bg-neutral-200 dark:bg-neutral-700 text-neutral-400 cursor-not-allowed"
          }`}
        >
          {isGenerating ? (
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
              Generating...
            </span>
          ) : (
            "Generate Data"
          )}
        </button>

        {schema.tables.length > 0 && (
          <span className="text-sm text-neutral-500">
            {schema.tables.length} table{schema.tables.length !== 1 ? "s" : ""},{" "}
            {totalRows} rows total
          </span>
        )}
      </div>

      {/* Help text */}
      {!isModelReady && schema.tables.length > 0 && (
        <p className="mt-3 text-sm text-neutral-500">
          Select and load an AI model to generate data. All models run entirely in your browser.
        </p>
      )}
    </div>
  );
}
