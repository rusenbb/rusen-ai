"use client";

import { MODEL_OPTIONS, AI_MODE_INFO, type AIMode } from "../types";

interface ModelPanelProps {
  aiMode: AIMode;
  selectedModelId: string;
  loadedModelId: string | null;
  isModelLoading: boolean;
  isGenerating: boolean;
  modelLoadProgress: number;
  rateLimitRemaining: number | null;
  onAIModeChange: (mode: AIMode) => void;
  onModelSelect: (modelId: string) => void;
  onLoadModel: () => void;
}

export default function ModelPanel({
  aiMode,
  selectedModelId,
  loadedModelId,
  isModelLoading,
  isGenerating,
  modelLoadProgress,
  rateLimitRemaining,
  onAIModeChange,
  onModelSelect,
  onLoadModel,
}: ModelPanelProps) {
  const selectedModel = MODEL_OPTIONS.find((m) => m.id === selectedModelId);
  const loadedModel = MODEL_OPTIONS.find((m) => m.id === loadedModelId);
  const isDisabled = isModelLoading || isGenerating;

  return (
    <div className="mb-6 p-6 border border-neutral-200 dark:border-neutral-800 rounded-lg">
      {/* AI Mode Selection */}
      <h3 className="font-medium mb-4">AI Mode</h3>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {(["browser", "cloud"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => onAIModeChange(mode)}
            disabled={isDisabled}
            className={`p-4 rounded-lg border text-left transition ${
              aiMode === mode
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500"
            } ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <div className="font-medium mb-1">{AI_MODE_INFO[mode].label}</div>
            <div className="text-xs text-neutral-500">
              {AI_MODE_INFO[mode].description}
            </div>
          </button>
        ))}
      </div>

      {/* Browser Mode - Model Selection */}
      {aiMode === "browser" && (
        <>
          <h4 className="font-medium mb-3 text-sm text-neutral-600 dark:text-neutral-400">
            Select Browser Model
          </h4>
          <div className="grid md:grid-cols-3 gap-3 mb-4">
            {MODEL_OPTIONS.map((model) => (
              <button
                key={model.id}
                onClick={() => onModelSelect(model.id)}
                disabled={isDisabled}
                className={`p-4 rounded-lg border text-left transition ${
                  selectedModelId === model.id
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500"
                } ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
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

          {/* Model status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  loadedModelId === selectedModelId
                    ? "bg-green-500"
                    : isModelLoading
                    ? "bg-yellow-500 animate-pulse"
                    : "bg-neutral-300 dark:bg-neutral-600"
                }`}
              />
              <span className="text-sm">
                {loadedModelId === selectedModelId
                  ? `${loadedModel?.name} ready`
                  : isModelLoading
                  ? `Loading ${selectedModel?.name}...`
                  : loadedModelId && loadedModelId !== selectedModelId
                  ? `${loadedModel?.name} loaded (switch to ${selectedModel?.name}?)`
                  : "No model loaded"}
              </span>
            </div>

            {!isModelLoading && loadedModelId !== selectedModelId && (
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
            <div className="mt-4">
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
        </>
      )}

      {/* Cloud Mode - API Info */}
      {aiMode === "cloud" && (
        <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <span className="text-sm font-medium">Gemini 2.0 Flash (via OpenRouter)</span>
          </div>
          <div className="text-xs text-neutral-500 space-y-1">
            <p>128k context window - can analyze full papers</p>
            <p>Powered by Google&apos;s Gemini API</p>
            {rateLimitRemaining !== null && (
              <p className="text-neutral-400">
                Rate limit: {rateLimitRemaining} requests remaining this minute
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
