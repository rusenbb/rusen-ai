"use client";

import { useReducer, useCallback, useRef, useEffect, useState } from "react";
import {
  createInitialState,
  temperatureReducer,
  EXAMPLE_PROMPTS,
  getAnimationDuration,
  type AnimationSpeed,
  type GeneratedToken,
} from "./types";
import { useLocalLLM } from "./hooks/useLocalLLM";
import SamplingWheel from "./components/SamplingWheel";
import TokenStream from "./components/TokenStream";

// Temperature labels for display
const TEMP_LABELS: Record<number, { label: string; description: string }> = {
  0.0: { label: "Precise", description: "Deterministic, always picks the most likely token" },
  0.3: { label: "Focused", description: "Slight variation, mostly predictable" },
  0.5: { label: "Balanced", description: "Good balance of variety" },
  0.7: { label: "Creative", description: "More diverse, interesting outputs" },
  1.0: { label: "Wild", description: "High randomness, unexpected tokens" },
  1.5: { label: "Chaotic", description: "Very high variance, surprising results" },
};

const MAX_TOKENS = 30; // Keep it short for visualization

export default function TemperaturePlaygroundPage() {
  const [state, dispatch] = useReducer(
    temperatureReducer,
    null,
    createInitialState
  );

  const {
    isModelLoading,
    modelProgress,
    modelError,
    isReady,
    generateTokenByToken,
  } = useLocalLLM();

  // Track which temperature is currently animating its wheel
  const [spinningTemp, setSpinningTemp] = useState<number | null>(null);

  // Abort controllers for each temperature
  const abortControllersRef = useRef<Map<number, AbortController>>(new Map());
  const mountedRef = useRef(true);

  // Sync model state with reducer
  useEffect(() => {
    dispatch({
      type: "SET_MODEL_LOADING",
      isLoading: isModelLoading,
      progress: modelProgress,
    });
  }, [isModelLoading, modelProgress]);

  useEffect(() => {
    if (modelError) {
      dispatch({ type: "SET_MODEL_ERROR", error: modelError });
    }
  }, [modelError]);

  useEffect(() => {
    if (isReady) {
      dispatch({ type: "SET_MODEL_READY" });
    }
  }, [isReady]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      // Abort all generations on unmount
      abortControllersRef.current.forEach((controller) => controller.abort());
    };
  }, []);

  // Generate for all temperatures sequentially (so we can see each wheel)
  const handleGenerate = useCallback(async () => {
    if (!state.prompt.trim()) return;

    dispatch({ type: "START_GENERATION" });

    // Generate for each temperature sequentially
    for (const temp of state.temperatures) {
      if (!mountedRef.current) break;

      const animDuration = getAnimationDuration(state.animationSpeed);

      // Create a promise that resolves when this temperature's generation is complete
      await new Promise<void>((resolve) => {
        const abortController = generateTokenByToken(
          state.prompt,
          { temperature: temp, maxTokens: MAX_TOKENS, topK: 10 },
          {
            onToken: async (token: GeneratedToken) => {
              if (!mountedRef.current) return;

              // Add the token to state
              dispatch({ type: "ADD_TOKEN", temperature: temp, token });

              // Start wheel spinning animation
              setSpinningTemp(temp);

              // Wait for animation to complete
              await new Promise<void>((animResolve) => {
                setTimeout(() => {
                  if (mountedRef.current) {
                    dispatch({ type: "ADVANCE_TOKEN_INDEX", temperature: temp });
                  }
                  setSpinningTemp(null);
                  animResolve();
                }, animDuration);
              });
            },
            onComplete: () => {
              if (mountedRef.current) {
                dispatch({ type: "FINISH_GENERATION", temperature: temp });
              }
              resolve();
            },
            onError: (error) => {
              if (mountedRef.current) {
                dispatch({ type: "SET_ERROR", temperature: temp, error: error.message });
              }
              resolve();
            },
          }
        );

        abortControllersRef.current.set(temp, abortController);
      });
    }
  }, [state.prompt, state.temperatures, state.animationSpeed, generateTokenByToken]);

  const handleClear = useCallback(() => {
    // Abort all ongoing generations
    abortControllersRef.current.forEach((controller) => controller.abort());
    abortControllersRef.current.clear();
    setSpinningTemp(null);
    dispatch({ type: "CLEAR_OUTPUTS" });
  }, []);

  const handleExampleClick = useCallback((prompt: string) => {
    dispatch({ type: "SET_PROMPT", prompt });
  }, []);

  const handleTemperatureToggle = useCallback((temp: number) => {
    const newTemps = state.temperatures.includes(temp)
      ? state.temperatures.filter((t) => t !== temp)
      : [...state.temperatures, temp].sort((a, b) => a - b);

    // Ensure at least one temperature is selected
    if (newTemps.length > 0 && newTemps.length <= 3) {
      dispatch({ type: "SET_TEMPERATURES", temperatures: newTemps });
    }
  }, [state.temperatures]);

  const handleSpeedChange = useCallback((speed: AnimationSpeed) => {
    dispatch({ type: "SET_ANIMATION_SPEED", speed });
  }, []);

  const availableTemps = [0.0, 0.3, 0.5, 0.7, 1.0, 1.5];

  return (
    <div className="max-w-7xl mx-auto px-4 py-16">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">Temperature Playground</h1>
        <p className="text-neutral-600 dark:text-neutral-400 max-w-2xl">
          Watch how temperature affects token selection in real-time. The spinning wheel shows the
          probability distribution—at low temperatures, the model always picks the most likely token.
          At high temperatures, anything can happen!
        </p>
      </div>

      {/* Model Loading State */}
      {state.isModelLoading && (
        <div className="mb-8 p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg bg-neutral-50 dark:bg-neutral-900/50">
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium">Loading DistilGPT-2 model...</span>
            <span className="text-sm text-neutral-500">{state.modelProgress}%</span>
          </div>
          <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
              style={{ width: `${state.modelProgress}%` }}
            />
          </div>
          <p className="text-xs text-neutral-500 mt-2">
            First load downloads ~82MB (cached in browser for future visits)
          </p>
        </div>
      )}

      {/* Model Error */}
      {state.modelError && (
        <div className="mb-8 p-4 border border-red-300 dark:border-red-700 rounded-lg bg-red-50 dark:bg-red-900/20">
          <p className="text-red-600 dark:text-red-400">{state.modelError}</p>
        </div>
      )}

      {/* Model Ready Indicator */}
      {state.isModelReady && !state.isModelLoading && (
        <div className="mb-8 p-3 border border-green-300 dark:border-green-700 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center gap-2">
          <span className="text-green-500">✓</span>
          <span className="text-sm text-green-700 dark:text-green-300">
            DistilGPT-2 model loaded and ready
          </span>
        </div>
      )}

      {/* Educational Panel */}
      <div className="mb-8 p-4 bg-neutral-100 dark:bg-neutral-800/50 rounded-lg border border-neutral-200 dark:border-neutral-700">
        <h3 className="font-semibold mb-2">How Temperature Works</h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          At each step, the model assigns probabilities to all possible next tokens. The{" "}
          <strong>wheel size</strong> of each slice represents that probability. Temperature
          controls how "peaked" this distribution is:
        </p>
        <ul className="text-sm text-neutral-600 dark:text-neutral-400 mt-2 space-y-1 list-disc list-inside">
          <li><strong>T=0:</strong> Always picks the largest slice (deterministic)</li>
          <li><strong>T=0.7:</strong> Usually picks likely tokens, occasionally surprises</li>
          <li><strong>T=1.5:</strong> Small slices have a real chance of being picked</li>
        </ul>
      </div>

      {/* Input Section */}
      <div className="mb-8 p-6 border border-neutral-200 dark:border-neutral-800 rounded-lg">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          {/* Prompt Input */}
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">Prompt</label>
            <input
              type="text"
              value={state.prompt}
              onChange={(e) => dispatch({ type: "SET_PROMPT", prompt: e.target.value })}
              placeholder="Enter a starting text..."
              className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:outline-none"
              disabled={state.isAnyGenerating}
            />
          </div>

          {/* Animation Speed */}
          <div className="md:w-40">
            <label className="block text-sm font-medium mb-2">Animation Speed</label>
            <select
              value={state.animationSpeed}
              onChange={(e) => handleSpeedChange(e.target.value as AnimationSpeed)}
              className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:outline-none"
              disabled={state.isAnyGenerating}
            >
              <option value="slow">Slow (2s)</option>
              <option value="normal">Normal (1s)</option>
              <option value="fast">Fast (0.5s)</option>
            </select>
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
            Compare temperatures (select 1-3):
          </label>
          <div className="flex flex-wrap gap-2">
            {availableTemps.map((temp) => {
              const isSelected = state.temperatures.includes(temp);
              const info = TEMP_LABELS[temp];
              const canSelect = isSelected || state.temperatures.length < 3;
              return (
                <button
                  key={temp}
                  onClick={() => canSelect && handleTemperatureToggle(temp)}
                  disabled={state.isAnyGenerating || !canSelect}
                  className={`px-4 py-2 rounded-lg border transition ${
                    isSelected
                      ? "border-neutral-900 dark:border-white bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
                      : canSelect
                      ? "border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600"
                      : "border-neutral-200 dark:border-neutral-800 opacity-40 cursor-not-allowed"
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
            disabled={!state.prompt.trim() || state.isAnyGenerating || state.temperatures.length === 0 || !state.isModelReady}
            className="px-6 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg font-medium hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {state.isAnyGenerating ? "Generating..." : state.isModelReady ? "Generate" : "Loading Model..."}
          </button>
          <button
            onClick={handleClear}
            className="px-6 py-3 border border-neutral-300 dark:border-neutral-700 rounded-lg font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Output Grid with Wheels and Token Streams */}
      <div className="space-y-6">
        {state.temperatures.map((temp) => {
          const output = state.outputs.get(temp);
          const info = TEMP_LABELS[temp] || { label: "Custom", description: "" };
          const currentToken = output?.tokens[output.tokens.length - 1];
          const isCurrentlySpinning = spinningTemp === temp;

          return (
            <div
              key={temp}
              className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden"
            >
              {/* Temperature Header */}
              <div className="px-4 py-3 bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono text-2xl font-bold">T = {temp.toFixed(1)}</span>
                    <span className="ml-3 text-neutral-500">{info.label}</span>
                  </div>
                  {output?.isGenerating && (
                    <span className="flex items-center gap-2 text-sm text-neutral-500">
                      <span className="animate-pulse text-blue-500">●</span>
                      Token {output.tokens.length} / {MAX_TOKENS}
                    </span>
                  )}
                </div>
                <p className="text-sm text-neutral-500 mt-1">{info.description}</p>
              </div>

              {/* Wheel + Token Stream */}
              <div className="p-4">
                {output?.error ? (
                  <p className="text-red-500 dark:text-red-400">{output.error}</p>
                ) : output?.tokens && output.tokens.length > 0 ? (
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Wheel */}
                    <div className="flex-shrink-0 w-full lg:w-64 h-64 flex items-center justify-center">
                      <SamplingWheel
                        probabilities={currentToken?.topProbabilities || []}
                        selectedTokenId={currentToken?.tokenId || 0}
                        animationDuration={getAnimationDuration(state.animationSpeed)}
                        onAnimationComplete={() => {}}
                        isSpinning={isCurrentlySpinning}
                      />
                    </div>

                    {/* Token Stream */}
                    <div className="flex-1 min-w-0">
                      <TokenStream
                        tokens={output.tokens}
                        currentIndex={output.currentTokenIndex}
                        showProbabilities={true}
                      />
                    </div>
                  </div>
                ) : output?.isGenerating ? (
                  <div className="flex items-center justify-center h-48 text-neutral-400">
                    <span className="animate-spin mr-2">⟳</span>
                    Preparing generation...
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-48 text-neutral-400 italic">
                    Output will appear here after generation
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Visual Temperature Scale */}
      <div className="mt-12 p-6 border border-neutral-200 dark:border-neutral-800 rounded-lg">
        <h3 className="font-semibold mb-4">Temperature Scale Reference</h3>
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
