"use client";

import { useReducer, useCallback, useRef, useEffect, useState } from "react";
import {
  createInitialState,
  temperatureReducer,
  EXAMPLE_PROMPTS,
  type GeneratedToken,
} from "./types";
import { useLocalLLM } from "./hooks/useLocalLLM";
import ProbabilityTable from "./components/ProbabilityTable";
import TokenStream from "./components/TokenStream";
import BranchTreeCanvas from "./components/BranchTreeCanvas";

const TEMP_LABELS: Record<number, { label: string; description: string }> = {
  0.0: { label: "Precise", description: "Deterministic, always picks the most likely token" },
  0.3: { label: "Focused", description: "Slight variation, mostly predictable" },
  0.5: { label: "Balanced", description: "Good balance of variety" },
  0.7: { label: "Creative", description: "More diverse, interesting outputs" },
  1.0: { label: "Wild", description: "High randomness, unexpected tokens" },
  1.5: { label: "Chaotic", description: "Very high variance, surprising results" },
};

const MAX_TOKENS = 40;
const AVAILABLE_TEMPS = [0.0, 0.3, 0.5, 0.7, 1.0, 1.5];

type PlaygroundMode = "compare" | "explore";

type ExploreRun = {
  id: number;
  parentId: number | null;
  parentForkTokenIndex: number;
  depth: number;
  tokens: GeneratedToken[];
  content: string;
  peakPerplexity: number;
  isGenerating: boolean;
  error: string | null;
};


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
    modelName,
    backend,
    generateTokenByToken,
    generateWithBranching,
  } = useLocalLLM();

  const [mode, setMode] = useState<PlaygroundMode>("compare");

  const [selectedTokens, setSelectedTokens] = useState<Map<number, number>>(new Map());
  const abortControllersRef = useRef<Map<number, AbortController>>(new Map());

  const [exploreTemperature, setExploreTemperature] = useState(0.7);
  const [exploreMaxNodes, setExploreMaxNodes] = useState(12);
  const [exploreCheckpointEvery, setExploreCheckpointEvery] = useState(5);
  const [explorePerplexityThreshold, setExplorePerplexityThreshold] = useState(18);
  const [exploreRuns, setExploreRuns] = useState<ExploreRun[]>([]);
  const [isExploreGenerating, setIsExploreGenerating] = useState(false);
  const [activeExploreRunId, setActiveExploreRunId] = useState<number | null>(null);
  const [exploreSelectedTokens, setExploreSelectedTokens] = useState<Map<number, number>>(new Map());
  const exploreAbortControllersRef = useRef<Map<number, AbortController>>(new Map());

  const mountedRef = useRef(true);

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
    const compareControllers = abortControllersRef.current;
    const exploreControllers = exploreAbortControllersRef.current;

    return () => {
      mountedRef.current = false;
      compareControllers.forEach((controller) => controller.abort());
      exploreControllers.forEach((controller) => controller.abort());
    };
  }, []);

  const handleCompareGenerate = useCallback(async () => {
    if (!state.prompt.trim()) return;

    dispatch({ type: "START_GENERATION" });
    setSelectedTokens(new Map());

    const promises = state.temperatures.map((temp) => {
      return new Promise<void>((resolve) => {
        const abortController = generateTokenByToken(
          state.prompt,
          { temperature: temp, maxTokens: MAX_TOKENS, topK: 100 },
          {
            onToken: (token: GeneratedToken) => {
              if (!mountedRef.current) return;
              dispatch({ type: "ADD_TOKEN", temperature: temp, token });
            },
            onComplete: () => {
              if (mountedRef.current) {
                dispatch({ type: "FINISH_GENERATION", temperature: temp });
                setSelectedTokens((prev) => new Map(prev).set(temp, 0));
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
    });

    await Promise.allSettled(promises);
  }, [state.prompt, state.temperatures, generateTokenByToken]);

  const handleCompareStop = useCallback(() => {
    abortControllersRef.current.forEach((controller) => controller.abort());
    abortControllersRef.current.clear();
  }, []);

  const handleCompareClear = useCallback(() => {
    handleCompareStop();
    setSelectedTokens(new Map());
    dispatch({ type: "CLEAR_OUTPUTS" });
  }, [handleCompareStop]);

  const handleExampleClick = useCallback((prompt: string) => {
    dispatch({ type: "SET_PROMPT", prompt });
  }, []);

  const handleTemperatureToggle = useCallback((temp: number) => {
    const newTemps = state.temperatures.includes(temp)
      ? state.temperatures.filter((t) => t !== temp)
      : [...state.temperatures, temp].sort((a, b) => a - b);

    if (newTemps.length > 0 && newTemps.length <= 3) {
      dispatch({ type: "SET_TEMPERATURES", temperatures: newTemps });
    }
  }, [state.temperatures]);

  const handleTokenSelect = useCallback((temp: number, tokenIndex: number) => {
    setSelectedTokens((prev) => new Map(prev).set(temp, tokenIndex));
  }, []);

  const handleExploreTokenSelect = useCallback((runId: number, tokenIndex: number) => {
    setExploreSelectedTokens((prev) => new Map(prev).set(runId, tokenIndex));
  }, []);

  const updateExploreRun = useCallback((runId: number, updater: (run: ExploreRun) => ExploreRun) => {
    setExploreRuns((prev) => prev.map((run) => (run.id === runId ? updater(run) : run)));
  }, []);

  const handleExploreGenerate = useCallback(async () => {
    if (!state.prompt.trim()) return;

    exploreAbortControllersRef.current.forEach((controller) => controller.abort());
    exploreAbortControllersRef.current.clear();
    setIsExploreGenerating(true);
    setExploreSelectedTokens(new Map());
    setExploreRuns([]);
    setActiveExploreRunId(null);

    const abortController = generateWithBranching(
      state.prompt,
      {
        temperature: exploreTemperature,
        maxTokens: MAX_TOKENS,
        checkpointEvery: exploreCheckpointEvery,
        perplexityThreshold: explorePerplexityThreshold,
        maxNodes: exploreMaxNodes,
        topK: 50,
      },
      {
        onBranchCreated: (branchId, parentId, depth, parentForkTokenIndex) => {
          if (!mountedRef.current) return;
          setExploreRuns((prev) => [
            ...prev,
            {
              id: branchId,
              parentId,
              parentForkTokenIndex,
              depth,
              tokens: [],
              content: "",
              peakPerplexity: 0,
              isGenerating: true,
              error: null,
            },
          ]);
          setActiveExploreRunId((prev) => prev ?? branchId);
        },
        onToken: (branchId, token) => {
          if (!mountedRef.current) return;
          updateExploreRun(branchId, (current) => {
            const tokens = [...current.tokens, token];
            return {
              ...current,
              tokens,
              content: tokens.map((t) => t.token).join(""),
            };
          });
          setExploreSelectedTokens((prev) => {
            if (prev.has(branchId)) return prev;
            return new Map(prev).set(branchId, 0);
          });
        },
        onBranchMetric: (branchId, perplexity) => {
          if (!mountedRef.current) return;
          updateExploreRun(branchId, (current) => ({
            ...current,
            peakPerplexity: Math.max(current.peakPerplexity, perplexity),
          }));
        },
        onBranchFinished: (branchId) => {
          if (!mountedRef.current) return;
          updateExploreRun(branchId, (current) => ({ ...current, isGenerating: false }));
        },
        onComplete: () => {
          if (!mountedRef.current) return;
          setIsExploreGenerating(false);
        },
        onError: (error) => {
          if (!mountedRef.current) return;
          setIsExploreGenerating(false);
          setExploreRuns((prev) =>
            prev.map((run) =>
              run.isGenerating ? { ...run, isGenerating: false, error: error.message } : run
            )
          );
        },
      }
    );

    exploreAbortControllersRef.current.set(0, abortController);
  }, [
    state.prompt,
    exploreTemperature,
    exploreCheckpointEvery,
    explorePerplexityThreshold,
    exploreMaxNodes,
    generateWithBranching,
    updateExploreRun,
  ]);

  const handleExploreStop = useCallback(() => {
    exploreAbortControllersRef.current.forEach((controller) => controller.abort());
    exploreAbortControllersRef.current.clear();
    setIsExploreGenerating(false);
    setExploreRuns((prev) => prev.map((run) => (run.isGenerating ? { ...run, isGenerating: false } : run)));
  }, []);

  const handleExploreClear = useCallback(() => {
    handleExploreStop();
    setActiveExploreRunId(null);
    setExploreSelectedTokens(new Map());
    setExploreRuns([]);
  }, [handleExploreStop]);


  return (
    <div className="max-w-7xl mx-auto px-4 py-10 sm:py-12 md:py-16">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4">Temperature Playground</h1>
        <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 max-w-3xl text-pretty">
          Compare sampling behavior across temperatures, or stream a branching tree that expands when
          perplexity crosses your threshold.
        </p>
      </div>

      {state.isModelLoading && (
        <div className="mb-8 p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg bg-neutral-50 dark:bg-neutral-900/50">
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium">Loading {modelName}...</span>
            <span className="text-sm text-neutral-500">{state.modelProgress}%</span>
          </div>
          <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-300"
              style={{ width: `${state.modelProgress}%` }}
            />
          </div>
          <p className="text-xs text-neutral-500 mt-2">
            First load downloads ~270MB (cached in browser for future visits)
          </p>
        </div>
      )}

      {state.modelError && (
        <div className="mb-8 p-4 border border-red-300 dark:border-red-700 rounded-lg bg-red-50 dark:bg-red-900/20">
          <p className="text-red-600 dark:text-red-400">{state.modelError}</p>
        </div>
      )}

      {state.isModelReady && !state.isModelLoading && (
        <div className="mb-8 p-3 border border-green-300 dark:border-green-700 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center gap-2">
          <span className="text-green-500">✓</span>
          <span className="text-sm text-green-700 dark:text-green-300">
            {modelName} loaded and ready ({backend.toUpperCase()})
          </span>
        </div>
      )}

      <div className="mb-8 p-4 sm:p-6 border border-neutral-200 dark:border-neutral-800 rounded-lg">
        <div className="mb-5">
          <label className="block text-sm font-medium mb-2">Mode</label>
          <div className="grid sm:grid-cols-2 gap-2">
            <button
              onClick={() => setMode("compare")}
              disabled={state.isAnyGenerating || isExploreGenerating}
              className={`text-left rounded-lg border p-3 transition ${
                mode === "compare"
                  ? "border-neutral-900 dark:border-white bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
                  : "border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600"
              } disabled:opacity-50`}
            >
              <div className="font-semibold">Compare Outputs</div>
              <div className="text-xs opacity-80 mt-1">One sample per temperature for direct side-by-side comparison.</div>
            </button>
            <button
              onClick={() => setMode("explore")}
              disabled={state.isAnyGenerating || isExploreGenerating}
              className={`text-left rounded-lg border p-3 transition ${
                mode === "explore"
                  ? "border-neutral-900 dark:border-white bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
                  : "border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600"
              } disabled:opacity-50`}
            >
              <div className="font-semibold">Explore Branch Tree</div>
              <div className="text-xs opacity-80 mt-1">Stream one tree and branch when uncertainty is high.</div>
            </button>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Prompt</label>
          <textarea
            value={state.prompt}
            onChange={(e) => dispatch({ type: "SET_PROMPT", prompt: e.target.value })}
            placeholder="Enter a starting text..."
            rows={3}
            className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:outline-none resize-y"
            disabled={state.isAnyGenerating || isExploreGenerating}
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Try an example:</label>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_PROMPTS.map((example) => (
              <button
                key={example.label}
                onClick={() => handleExampleClick(example.prompt)}
                disabled={state.isAnyGenerating || isExploreGenerating}
                className="px-3 py-1.5 text-sm bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-full transition disabled:opacity-50"
              >
                {example.label}
              </button>
            ))}
          </div>
        </div>

        {mode === "compare" ? (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Compare temperatures (select 1-3):</label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_TEMPS.map((temp) => {
                const isSelected = state.temperatures.includes(temp);
                const info = TEMP_LABELS[temp];
                const canSelect = isSelected || state.temperatures.length < 3;
                return (
                  <button
                    key={temp}
                    onClick={() => canSelect && handleTemperatureToggle(temp)}
                    disabled={state.isAnyGenerating || isExploreGenerating || !canSelect}
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
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Temperature (single)</label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_TEMPS.map((temp) => {
                  const isSelected = temp === exploreTemperature;
                  return (
                    <button
                      key={temp}
                      onClick={() => setExploreTemperature(temp)}
                      disabled={state.isAnyGenerating || isExploreGenerating}
                      className={`px-3 py-1.5 rounded-lg border transition ${
                        isSelected
                          ? "border-neutral-900 dark:border-white bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
                          : "border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600"
                      } disabled:opacity-50`}
                    >
                      <span className="font-mono">{temp.toFixed(1)}</span>
                      <span className="ml-1 text-xs opacity-70">({TEMP_LABELS[temp]?.label})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label htmlFor="max-nodes" className="block text-sm font-medium mb-2">
                Max branches
              </label>
              <select
                id="max-nodes"
                value={exploreMaxNodes}
                onChange={(e) => setExploreMaxNodes(Number(e.target.value))}
                disabled={state.isAnyGenerating || isExploreGenerating}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
              >
                {[6, 8, 12, 16, 20, 24].map((count) => (
                  <option key={count} value={count}>
                    {count} nodes
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="checkpoint" className="block text-sm font-medium mb-2">
                Checkpoint every
              </label>
              <select
                id="checkpoint"
                value={exploreCheckpointEvery}
                onChange={(e) => setExploreCheckpointEvery(Number(e.target.value))}
                disabled={state.isAnyGenerating || isExploreGenerating}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
              >
                {[3, 4, 5, 6, 8, 10].map((value) => (
                  <option key={value} value={value}>
                    {value} tokens
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="perplexity-threshold" className="block text-sm font-medium mb-2">
                Perplexity threshold
              </label>
              <input
                id="perplexity-threshold"
                type="number"
                min={2}
                max={60}
                step={1}
                value={explorePerplexityThreshold}
                onChange={(e) => setExplorePerplexityThreshold(Number(e.target.value))}
                disabled={state.isAnyGenerating || isExploreGenerating}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
              />
            </div>
          </div>
        )}

        <div className="flex gap-3 flex-wrap">
          {mode === "compare" ? (
            <>
              <button
                onClick={handleCompareGenerate}
                disabled={!state.prompt.trim() || state.isAnyGenerating || state.temperatures.length === 0 || !state.isModelReady || isExploreGenerating}
                className="px-6 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg font-medium hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {state.isAnyGenerating ? "Generating..." : state.isModelReady ? "Generate" : "Loading Model..."}
              </button>
              <button
                onClick={handleCompareStop}
                disabled={!state.isAnyGenerating}
                className="px-6 py-3 border border-neutral-300 dark:border-neutral-700 rounded-lg font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Stop
              </button>
              <button
                onClick={handleCompareClear}
                className="px-6 py-3 border border-neutral-300 dark:border-neutral-700 rounded-lg font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
              >
                Clear
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleExploreGenerate}
                disabled={!state.prompt.trim() || isExploreGenerating || !state.isModelReady || state.isAnyGenerating}
                className="px-6 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg font-medium hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExploreGenerating ? "Branching..." : state.isModelReady ? "Start Branching" : "Loading Model..."}
              </button>
              <button
                onClick={handleExploreStop}
                disabled={!isExploreGenerating}
                className="px-6 py-3 border border-neutral-300 dark:border-neutral-700 rounded-lg font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Stop
              </button>
              <button
                onClick={handleExploreClear}
                className="px-6 py-3 border border-neutral-300 dark:border-neutral-700 rounded-lg font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
              >
                Clear
              </button>
            </>
          )}
        </div>
      </div>

      {mode === "compare" ? (
        <div className="space-y-6">
          {state.temperatures.map((temp) => {
            const output = state.outputs.get(temp);
            const info = TEMP_LABELS[temp] || { label: "Custom", description: "" };
            const selectedIndex = selectedTokens.get(temp) ?? -1;
            const selectedToken = selectedIndex >= 0 ? output?.tokens[selectedIndex] : null;

            return (
              <div
                key={temp}
                className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden"
              >
                <div className="px-4 py-3 bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono text-2xl font-bold">T = {temp.toFixed(1)}</span>
                      <span className="ml-3 text-neutral-500">{info.label}</span>
                    </div>
                    {output?.isGenerating && (
                      <span className="flex items-center gap-2 text-sm text-neutral-500">
                        <span className="animate-pulse text-blue-500">●</span>
                        Generating... ({output.tokens.length} tokens)
                      </span>
                    )}
                    {!output?.isGenerating && output?.tokens && output.tokens.length > 0 && (
                      <span className="text-sm text-neutral-500">
                        {output.tokens.length} tokens generated
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-neutral-500 mt-1">{info.description}</p>
                </div>

                <div className="p-4">
                  {output?.error ? (
                    <p className="text-red-500 dark:text-red-400">{output.error}</p>
                  ) : output?.tokens && output.tokens.length > 0 ? (
                    <div className="flex flex-col lg:flex-row gap-6">
                      <div className="flex-shrink-0 w-full lg:w-80">
                        {selectedToken && (
                          <div className="mb-2 p-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                            <span className="text-xs text-neutral-500">
                              Token {selectedIndex + 1}:
                            </span>
                            <span className="ml-1 font-mono text-sm font-bold">
                              &quot;{selectedToken.token.trim() || "\\n"}&quot;
                            </span>
                            <span className="ml-1 text-xs text-neutral-500">
                              ({(selectedToken.selectedProbability * 100).toFixed(1)}%)
                            </span>
                          </div>
                        )}
                        <div className="h-[360px] border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-900/50 p-3">
                          {selectedToken ? (
                            <ProbabilityTable
                              probabilities={selectedToken.topProbabilities}
                              selectedTokenId={selectedToken.tokenId}
                            />
                          ) : (
                            <div className="h-full flex items-center justify-center text-neutral-400 text-sm">
                              Click a token to see probabilities
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <TokenStream
                          tokens={output.tokens}
                          currentIndex={selectedIndex}
                          showProbabilities={true}
                          onTokenClick={(index) => handleTokenSelect(temp, index)}
                        />
                      </div>
                    </div>
                  ) : output?.isGenerating ? (
                    <div className="flex items-center justify-center h-48 text-neutral-400">
                      <span className="animate-spin mr-2">⟳</span>
                      Generating...
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
      ) : (
        <BranchTreeCanvas
          runs={exploreRuns}
          prompt={state.prompt}
          selectedRunId={activeExploreRunId}
          selectedTokenIndex={
            activeExploreRunId !== null
              ? (exploreSelectedTokens.get(activeExploreRunId) ?? -1)
              : -1
          }
          onTokenSelect={(runId, tokenIndex) => {
            setActiveExploreRunId(runId);
            setExploreSelectedTokens((prev) =>
              new Map(prev).set(runId, tokenIndex)
            );
          }}
        />
      )}
    </div>
  );
}
