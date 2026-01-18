"use client";

import { useReducer, useCallback, useRef, useState } from "react";
import {
  TemperaturePlaygroundState,
  TemperaturePlaygroundAction,
  createInitialState,
  temperatureReducer,
  AVAILABLE_MODELS,
  EXAMPLE_PROMPTS,
  DEFAULT_TEMPERATURES,
} from "./types";
import { useAPILLM } from "./hooks/useAPILLM";
import ProbabilityVisualization from "./components/ProbabilityVisualization";
import TokenExplorer from "./components/TokenExplorer";

// System prompt for consistent responses
const SYSTEM_PROMPT = `You are a helpful assistant. Respond concisely to the user's request.
Keep your response under 200 words unless more detail is specifically requested.
Be creative and varied in your responses based on your temperature setting.`;

// Temperature labels for display
const TEMP_LABELS: Record<number, { label: string; description: string }> = {
  0.0: { label: "Precise", description: "Deterministic, most likely tokens" },
  0.3: { label: "Balanced", description: "Slight variation, mostly focused" },
  0.5: { label: "Moderate", description: "Good balance of variety" },
  0.7: { label: "Creative", description: "More diverse outputs" },
  1.0: { label: "Wild", description: "High randomness, unexpected results" },
  1.5: { label: "Chaotic", description: "Very high variance" },
};

type ViewMode = "compare" | "explore";

export default function TemperaturePlaygroundPage() {
  const [state, dispatch] = useReducer(
    temperatureReducer,
    null,
    createInitialState
  );
  const [viewMode, setViewMode] = useState<ViewMode>("compare");

  const { generate, abort } = useAPILLM(state.selectedModel);
  const mountedRef = useRef(true);

  const handleGenerate = useCallback(async () => {
    if (!state.prompt.trim()) return;

    dispatch({ type: "START_GENERATION" });

    // Generate for all temperatures in parallel
    const promises = state.temperatures.map(async (temp) => {
      try {
        const result = await generate({
          systemPrompt: SYSTEM_PROMPT,
          userPrompt: state.prompt,
          temperature: temp,
          onStream: (content) => {
            if (mountedRef.current) {
              dispatch({ type: "UPDATE_OUTPUT", temperature: temp, content });
            }
          },
        });

        if (mountedRef.current) {
          dispatch({
            type: "FINISH_GENERATION",
            temperature: temp,
            modelUsed: result.modelUsed,
          });
          if (result.rateLimitRemaining !== null) {
            dispatch({ type: "SET_RATE_LIMIT", remaining: result.rateLimitRemaining });
          }
        }
      } catch (err) {
        if (mountedRef.current) {
          const message = err instanceof Error ? err.message : "Generation failed";
          dispatch({ type: "SET_ERROR", temperature: temp, error: message });
        }
      }
    });

    await Promise.allSettled(promises);
  }, [state.prompt, state.temperatures, generate]);

  const handleClear = useCallback(() => {
    abort();
    dispatch({ type: "CLEAR_OUTPUTS" });
  }, [abort]);

  const handleExampleClick = useCallback((prompt: string) => {
    dispatch({ type: "SET_PROMPT", prompt });
  }, []);

  const handleTemperatureToggle = useCallback((temp: number) => {
    const newTemps = state.temperatures.includes(temp)
      ? state.temperatures.filter((t) => t !== temp)
      : [...state.temperatures, temp].sort((a, b) => a - b);

    // Ensure at least one temperature is selected
    if (newTemps.length > 0) {
      dispatch({ type: "SET_TEMPERATURES", temperatures: newTemps });
    }
  }, [state.temperatures]);

  const availableTemps = [0.0, 0.3, 0.5, 0.7, 1.0, 1.5];

  return (
    <div className="max-w-7xl mx-auto px-4 py-16">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">Temperature Playground</h1>
        <p className="text-neutral-600 dark:text-neutral-400 max-w-2xl">
          See how temperature affects LLM output. Same prompt, different temperatures—watch
          as responses range from deterministic to creative to chaotic.
        </p>
      </div>

      {/* View Mode Tabs */}
      <div className="mb-8 flex gap-2">
        <button
          onClick={() => setViewMode("compare")}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            viewMode === "compare"
              ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
              : "bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700"
          }`}
        >
          Compare Outputs
        </button>
        <button
          onClick={() => setViewMode("explore")}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            viewMode === "explore"
              ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
              : "bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700"
          }`}
        >
          Token Explorer
        </button>
      </div>

      {/* Educational Panel */}
      <div className="mb-8 p-4 bg-neutral-100 dark:bg-neutral-800/50 rounded-lg border border-neutral-200 dark:border-neutral-700">
        <h3 className="font-semibold mb-2">What is Temperature?</h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Temperature controls the randomness in token selection. At <strong>0.0</strong>, the model
          always picks the most likely next token (greedy decoding). At higher values like <strong>1.0+</strong>,
          lower-probability tokens have a better chance of being selected, creating more varied and
          sometimes surprising outputs. Think of it as a creativity dial.
        </p>
      </div>

      {/* Probability Visualization - always visible for education */}
      <ProbabilityVisualization temperatures={state.temperatures} />

      {/* Token Explorer Mode */}
      {viewMode === "explore" && (
        <div className="mt-8">
          <TokenExplorer disabled={state.isAnyGenerating} />
        </div>
      )}

      {/* Compare Mode - Input Section */}
      {viewMode === "compare" && (
        <>
      {/* Input Section */}
      <div className="mt-8 mb-8 p-6 border border-neutral-200 dark:border-neutral-800 rounded-lg">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          {/* Prompt Input */}
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">Prompt</label>
            <textarea
              value={state.prompt}
              onChange={(e) => dispatch({ type: "SET_PROMPT", prompt: e.target.value })}
              placeholder="Enter your prompt here..."
              className="w-full h-24 px-4 py-3 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:outline-none resize-none"
              disabled={state.isAnyGenerating}
            />
          </div>

          {/* Model Selector */}
          <div className="md:w-48">
            <label className="block text-sm font-medium mb-2">Model</label>
            <select
              value={state.selectedModel}
              onChange={(e) => dispatch({ type: "SET_MODEL", model: e.target.value })}
              className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:outline-none"
              disabled={state.isAnyGenerating}
            >
              {AVAILABLE_MODELS.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
            {state.rateLimitRemaining !== null && (
              <p className="mt-1 text-xs text-neutral-500">
                {state.rateLimitRemaining} requests remaining
              </p>
            )}
          </div>
        </div>

        {/* Example Prompts */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Try an example:</label>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_PROMPTS.map((example) => (
              <button
                key={example.label}
                onClick={() => handleExampleClick(example.prompt)}
                disabled={state.isAnyGenerating}
                className="px-3 py-1.5 text-sm bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-full transition disabled:opacity-50"
              >
                {example.label}
              </button>
            ))}
          </div>
        </div>

        {/* Temperature Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Temperatures to compare ({state.temperatures.length} selected):
          </label>
          <div className="flex flex-wrap gap-2">
            {availableTemps.map((temp) => {
              const isSelected = state.temperatures.includes(temp);
              const info = TEMP_LABELS[temp];
              return (
                <button
                  key={temp}
                  onClick={() => handleTemperatureToggle(temp)}
                  disabled={state.isAnyGenerating}
                  className={`px-4 py-2 rounded-lg border transition ${
                    isSelected
                      ? "border-neutral-900 dark:border-white bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
                      : "border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600"
                  } disabled:opacity-50`}
                  title={info?.description}
                >
                  <span className="font-mono">{temp.toFixed(1)}</span>
                  {info && <span className="ml-1 text-xs opacity-70">({info.label})</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleGenerate}
            disabled={!state.prompt.trim() || state.isAnyGenerating || state.temperatures.length === 0}
            className="px-6 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg font-medium hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {state.isAnyGenerating ? "Generating..." : "Generate All"}
          </button>
          <button
            onClick={handleClear}
            disabled={state.isAnyGenerating && false} // Allow clearing during generation
            className="px-6 py-3 border border-neutral-300 dark:border-neutral-700 rounded-lg font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Outputs Grid */}
      <div className={`grid gap-4 ${
        state.temperatures.length === 1 ? "grid-cols-1" :
        state.temperatures.length === 2 ? "grid-cols-1 md:grid-cols-2" :
        state.temperatures.length === 3 ? "grid-cols-1 md:grid-cols-3" :
        "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
      }`}>
        {state.temperatures.map((temp) => {
          const output = state.outputs.get(temp);
          const info = TEMP_LABELS[temp] || { label: "Custom", description: "" };

          return (
            <div
              key={temp}
              className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden"
            >
              {/* Temperature Header */}
              <div className="px-4 py-3 bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono text-lg font-bold">{temp.toFixed(1)}</span>
                    <span className="ml-2 text-sm text-neutral-500">{info.label}</span>
                  </div>
                  {output?.isGenerating && (
                    <span className="flex items-center gap-1 text-xs text-neutral-500">
                      <span className="animate-pulse">●</span> Generating
                    </span>
                  )}
                  {output?.modelUsed && !output?.isGenerating && (
                    <span className="text-xs text-neutral-400 truncate max-w-[120px]" title={output.modelUsed}>
                      {output.modelUsed.split("/").pop()?.replace(":free", "")}
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-500 mt-0.5">{info.description}</p>
              </div>

              {/* Output Content */}
              <div className="p-4 min-h-[200px] max-h-[400px] overflow-y-auto">
                {output?.error ? (
                  <p className="text-red-500 dark:text-red-400">{output.error}</p>
                ) : output?.content ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{output.content}</p>
                ) : output?.isGenerating ? (
                  <div className="flex items-center gap-2 text-neutral-400">
                    <span className="animate-spin">⟳</span>
                    <span>Generating...</span>
                  </div>
                ) : (
                  <p className="text-neutral-400 italic">
                    Output will appear here after generation
                  </p>
                )}
              </div>

              {/* Copy Button */}
              {output?.content && !output?.isGenerating && (
                <div className="px-4 py-2 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
                  <button
                    onClick={() => navigator.clipboard.writeText(output.content)}
                    className="text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition"
                  >
                    Copy to clipboard
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
        </>
      )}

      {/* Visual Temperature Scale */}
      <div className="mt-12 p-6 border border-neutral-200 dark:border-neutral-800 rounded-lg">
        <h3 className="font-semibold mb-4">Understanding the Temperature Scale</h3>
        <div className="relative h-12 bg-gradient-to-r from-blue-500 via-purple-500 to-red-500 rounded-lg">
          {/* Scale markers */}
          <div className="absolute inset-0 flex justify-between px-2 items-end pb-1">
            {[0, 0.5, 1.0, 1.5, 2.0].map((val) => (
              <div key={val} className="text-center">
                <div className="w-0.5 h-3 bg-white/50 mx-auto mb-1"></div>
                <span className="text-xs text-white font-mono">{val.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-between mt-2 text-xs text-neutral-500">
          <span>Deterministic / Focused</span>
          <span>Balanced</span>
          <span>Creative / Random</span>
        </div>
      </div>
    </div>
  );
}
