"use client";

import { useReducer, useCallback, useState, useRef } from "react";
import { useWebLLM } from "./hooks/useWebLLM";
import { useAPILLM } from "./hooks/useAPILLM";
import DOIInput from "./components/DOIInput";
import PaperDisplay from "./components/PaperDisplay";
import ModelPanel from "./components/ModelPanel";
import SummaryPanel from "./components/SummaryPanel";
import QAPanel from "./components/QAPanel";
import { fetchPaper } from "./utils/paperFetcher";
import { buildSummaryPrompt, buildQAPrompt } from "./utils/prompts";
import {
  initialState,
  generateId,
  DEFAULT_MODEL_ID,
  type PaperPilotState,
  type PaperPilotAction,
  type SummaryType,
  type FetchProgress,
  type AIMode,
} from "./types";

function paperPilotReducer(state: PaperPilotState, action: PaperPilotAction): PaperPilotState {
  switch (action.type) {
    case "SET_PAPER":
      return {
        ...state,
        paper: action.paper,
        summaries: [],
        qaHistory: [],
        fetchProgress: { status: "complete", stepsCompleted: [] },
      };

    case "CLEAR_PAPER":
      return {
        ...state,
        paper: null,
        summaries: [],
        qaHistory: [],
        fetchProgress: { status: "idle", stepsCompleted: [] },
      };

    case "ADD_SUMMARY":
      return {
        ...state,
        summaries: [...state.summaries, action.summary],
      };

    case "CLEAR_SUMMARIES":
      return {
        ...state,
        summaries: [],
      };

    case "ADD_QA":
      return {
        ...state,
        qaHistory: [action.qa, ...state.qaHistory],
      };

    case "CLEAR_QA":
      return {
        ...state,
        qaHistory: [],
      };

    case "SET_GENERATION_PROGRESS":
      return {
        ...state,
        generationProgress: {
          ...state.generationProgress,
          ...action.progress,
        },
      };

    case "SET_FETCH_PROGRESS":
      return {
        ...state,
        fetchProgress: {
          ...state.fetchProgress,
          ...action.progress,
        } as FetchProgress,
      };

    case "RESET":
      return initialState;

    default:
      return state;
  }
}

export default function PaperPilotPage() {
  const [state, dispatch] = useReducer(paperPilotReducer, initialState);
  const [aiMode, setAIMode] = useState<AIMode>("cloud"); // Default to cloud for better UX
  const [selectedModelId, setSelectedModelId] = useState(DEFAULT_MODEL_ID);
  const [streamingContent, setStreamingContent] = useState<string>("");
  const stepsCompletedRef = useRef<string[]>([]);

  // Browser-based LLM (WebLLM)
  const {
    isReady: isWebLLMReady,
    isLoading: isWebLLMLoading,
    loadProgress,
    error: webLLMError,
    isSupported,
    loadedModelId,
    loadModel,
    generate: webLLMGenerate,
  } = useWebLLM();

  // Cloud-based LLM (API)
  const {
    isGenerating: isAPIGenerating,
    error: apiError,
    rateLimitRemaining,
    generate: apiGenerate,
  } = useAPILLM();

  const handleLoadModel = useCallback(() => {
    loadModel(selectedModelId);
  }, [loadModel, selectedModelId]);

  const handleFetchPaper = useCallback(async (input: string) => {
    stepsCompletedRef.current = [];

    dispatch({
      type: "SET_FETCH_PROGRESS",
      progress: { status: "fetching", currentStep: "Starting...", stepsCompleted: [] },
    });

    try {
      const paper = await fetchPaper(input, (step) => {
        // Track completed steps
        if (stepsCompletedRef.current.length > 0) {
          const lastStep = stepsCompletedRef.current[stepsCompletedRef.current.length - 1];
          if (lastStep !== step) {
            stepsCompletedRef.current = [...stepsCompletedRef.current, step.replace("...", "")];
          }
        } else {
          stepsCompletedRef.current = [step.replace("...", "")];
        }

        dispatch({
          type: "SET_FETCH_PROGRESS",
          progress: {
            currentStep: step,
            stepsCompleted: stepsCompletedRef.current.slice(0, -1),
          },
        });
      });

      dispatch({ type: "SET_PAPER", paper });
    } catch (err) {
      dispatch({
        type: "SET_FETCH_PROGRESS",
        progress: {
          status: "error",
          error: err instanceof Error ? err.message : "Failed to fetch paper",
          stepsCompleted: stepsCompletedRef.current,
        },
      });
    }
  }, []);

  const handleClearPaper = useCallback(() => {
    dispatch({ type: "CLEAR_PAPER" });
  }, []);

  const handleGenerateSummary = useCallback(
    async (type: SummaryType) => {
      if (!state.paper) return;

      // Reset streaming content
      setStreamingContent("");

      dispatch({
        type: "SET_GENERATION_PROGRESS",
        progress: { status: "generating", currentTask: `Generating ${type} summary` },
      });

      try {
        const useCloudContext = aiMode === "cloud";
        const { systemPrompt, userPrompt } = buildSummaryPrompt(state.paper, type, useCloudContext);
        let content: string;

        if (aiMode === "browser") {
          // Ensure model is loaded for browser mode
          if (!isWebLLMReady || loadedModelId !== selectedModelId) {
            await loadModel(selectedModelId);
          }

          content = await webLLMGenerate(systemPrompt, userPrompt, (text) => {
            setStreamingContent(text);
          });
        } else {
          // Cloud mode
          content = await apiGenerate(systemPrompt, userPrompt, (text) => {
            setStreamingContent(text);
          });
        }

        // Clear streaming content and add final summary
        setStreamingContent("");

        dispatch({
          type: "ADD_SUMMARY",
          summary: {
            type,
            content,
            generatedAt: new Date(),
          },
        });

        dispatch({
          type: "SET_GENERATION_PROGRESS",
          progress: { status: "complete" },
        });
      } catch (err) {
        setStreamingContent("");
        dispatch({
          type: "SET_GENERATION_PROGRESS",
          progress: {
            status: "error",
            error: err instanceof Error ? err.message : "Generation failed",
          },
        });
      }
    },
    [state.paper, aiMode, isWebLLMReady, loadedModelId, selectedModelId, loadModel, webLLMGenerate, apiGenerate]
  );

  const handleAskQuestion = useCallback(
    async (question: string) => {
      if (!state.paper) return;

      // Reset streaming content
      setStreamingContent("");

      dispatch({
        type: "SET_GENERATION_PROGRESS",
        progress: { status: "generating", currentTask: "Answering question" },
      });

      try {
        const useCloudContext = aiMode === "cloud";
        const { systemPrompt, userPrompt } = buildQAPrompt(state.paper, question, useCloudContext);
        let answer: string;

        if (aiMode === "browser") {
          // Ensure model is loaded for browser mode
          if (!isWebLLMReady || loadedModelId !== selectedModelId) {
            await loadModel(selectedModelId);
          }

          answer = await webLLMGenerate(systemPrompt, userPrompt, (text) => {
            setStreamingContent(text);
          });
        } else {
          // Cloud mode
          answer = await apiGenerate(systemPrompt, userPrompt, (text) => {
            setStreamingContent(text);
          });
        }

        // Clear streaming content and add final answer
        setStreamingContent("");

        dispatch({
          type: "ADD_QA",
          qa: {
            id: generateId(),
            question,
            answer,
            timestamp: new Date(),
          },
        });

        dispatch({
          type: "SET_GENERATION_PROGRESS",
          progress: { status: "complete" },
        });
      } catch (err) {
        setStreamingContent("");
        dispatch({
          type: "SET_GENERATION_PROGRESS",
          progress: {
            status: "error",
            error: err instanceof Error ? err.message : "Failed to answer question",
          },
        });
      }
    },
    [state.paper, aiMode, isWebLLMReady, loadedModelId, selectedModelId, loadModel, webLLMGenerate, apiGenerate]
  );

  const isGenerating = state.generationProgress.status === "generating";
  const currentError = aiMode === "browser" ? webLLMError : apiError;

  // Determine if model is ready based on mode
  const isModelReady = aiMode === "browser"
    ? (isWebLLMReady && loadedModelId === selectedModelId)
    : true; // Cloud mode is always "ready"

  // WebGPU not supported warning for browser mode
  const showWebGPUWarning = aiMode === "browser" && isSupported === false;

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      {/* Header */}
      <h1 className="text-4xl font-bold mb-4">Paper Pilot</h1>
      <p className="text-neutral-600 dark:text-neutral-400 mb-8 max-w-2xl">
        Enter a DOI or arXiv ID to fetch any academic paper, then let AI summarize and explain it.
        Choose between <strong>Browser AI</strong> (private, limited context) or{" "}
        <strong>Cloud AI</strong> (full context, rate limited).
      </p>

      {/* Error display */}
      {currentError && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
          {currentError}
        </div>
      )}

      {/* WebGPU warning */}
      {showWebGPUWarning && (
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-yellow-700 dark:text-yellow-400">
          <p className="font-medium mb-1">WebGPU not supported</p>
          <p className="text-sm">
            Browser AI requires WebGPU (Chrome 113+ or Edge 113+).
            Switch to Cloud AI mode for full functionality.
          </p>
        </div>
      )}

      {/* DOI Input */}
      {!state.paper && (
        <DOIInput
          onSubmit={handleFetchPaper}
          fetchProgress={state.fetchProgress}
        />
      )}

      {/* Paper Display */}
      {state.paper && (
        <>
          <PaperDisplay paper={state.paper} onClear={handleClearPaper} />

          {/* Model Panel */}
          <ModelPanel
            aiMode={aiMode}
            selectedModelId={selectedModelId}
            loadedModelId={loadedModelId}
            isModelLoading={isWebLLMLoading}
            isGenerating={isGenerating || isAPIGenerating}
            modelLoadProgress={loadProgress}
            rateLimitRemaining={rateLimitRemaining}
            onAIModeChange={setAIMode}
            onModelSelect={setSelectedModelId}
            onLoadModel={handleLoadModel}
          />

          {/* Summary Panel */}
          <SummaryPanel
            summaries={state.summaries}
            isModelReady={isModelReady}
            isGenerating={isGenerating || isAPIGenerating}
            progress={state.generationProgress}
            streamingContent={streamingContent}
            onGenerateSummary={handleGenerateSummary}
          />

          {/* Q&A Panel */}
          <QAPanel
            qaHistory={state.qaHistory}
            isModelReady={isModelReady}
            isGenerating={isGenerating || isAPIGenerating}
            streamingContent={streamingContent}
            onAskQuestion={handleAskQuestion}
          />
        </>
      )}

      {/* About section */}
      <div className="mt-12 text-sm text-neutral-500">
        <h3 className="font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
          About Paper Pilot
        </h3>
        <p className="mb-2">
          <strong>Browser AI:</strong> Uses Qwen3 models running entirely in your browser via WebLLM.
          Private (no data leaves your device) but limited to ~4k token context.
        </p>
        <p className="mb-2">
          <strong>Cloud AI:</strong> Uses Gemini 2.0 Flash via OpenRouter API.
          128k+ context for analyzing full papers, rate limited to prevent abuse.
        </p>
        <p className="mb-2">
          <strong>Data Sources:</strong> Paper metadata is fetched from CrossRef (for DOIs) and
          arXiv (for preprints). Semantic Scholar provides additional data. Unpaywall helps find
          open-access PDFs.
        </p>
      </div>
    </div>
  );
}
