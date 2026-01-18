"use client";

import { useState } from "react";

export const AVAILABLE_MODELS = [
  { id: "auto", name: "Auto (Recommended)", description: "Picks best available model with fallback" },
  { id: "google/gemini-2.0-flash-exp:free", name: "Gemini 2.0 Flash", description: "1M context, fast responses" },
  { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B", description: "131K context, reliable" },
  { id: "google/gemma-3-27b-it:free", name: "Gemma 3 27B", description: "131K context, multimodal" },
  { id: "deepseek/deepseek-r1-0528:free", name: "DeepSeek R1", description: "164K context, reasoning model" },
  { id: "qwen/qwen3-coder:free", name: "Qwen3 Coder 480B", description: "262K context, coding optimized" },
];

interface ModelPanelProps {
  isGenerating: boolean;
  rateLimitRemaining: number | null;
  lastModelUsed: string | null;
  selectedModel: string;
  onModelChange: (modelId: string) => void;
}

export default function ModelPanel({
  isGenerating,
  rateLimitRemaining,
  lastModelUsed,
  selectedModel,
  onModelChange,
}: ModelPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const currentModel = AVAILABLE_MODELS.find(m => m.id === selectedModel) || AVAILABLE_MODELS[0];
  const usedModel = lastModelUsed ? AVAILABLE_MODELS.find(m => m.id === lastModelUsed) : null;

  return (
    <div className="mb-6 p-6 border border-neutral-200 dark:border-neutral-800 rounded-lg">
      <h3 className="font-medium mb-4">AI Model</h3>

      {/* Model Selector */}
      <div className="relative mb-4">
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={isGenerating}
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
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {/* Dropdown */}
        {isOpen && !isGenerating && (
          <div className="absolute z-10 w-full mt-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg overflow-hidden">
            {AVAILABLE_MODELS.map((model) => (
              <button
                key={model.id}
                onClick={() => {
                  onModelChange(model.id);
                  setIsOpen(false);
                }}
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
      <div className="text-xs text-neutral-500 space-y-1">
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
  );
}
