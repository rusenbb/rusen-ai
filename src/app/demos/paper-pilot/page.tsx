"use client";

import { useReducer, useCallback, useState, useRef } from "react";
import { useWebLLM } from "./hooks/useWebLLM";
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
  const [selectedModelId, setSelectedModelId] = useState(DEFAULT_MODEL_ID);
  const stepsCompletedRef = useRef<string[]>([]);

  const {
    isReady,
    isLoading,
    loadProgress,
    error: modelError,
    isSupported,
    loadedModelId,
    loadModel,
    generate,
  } = useWebLLM();

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

      // Ensure model is loaded
      if (!isReady || loadedModelId !== selectedModelId) {
        await loadModel(selectedModelId);
      }

      dispatch({
        type: "SET_GENERATION_PROGRESS",
        progress: { status: "generating", currentTask: `Generating ${type} summary` },
      });

      try {
        const { systemPrompt, userPrompt } = buildSummaryPrompt(state.paper, type);
        const content = await generate(systemPrompt, userPrompt);

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
        dispatch({
          type: "SET_GENERATION_PROGRESS",
          progress: {
            status: "error",
            error: err instanceof Error ? err.message : "Generation failed",
          },
        });
      }
    },
    [state.paper, isReady, loadedModelId, selectedModelId, loadModel, generate]
  );

  const handleAskQuestion = useCallback(
    async (question: string) => {
      if (!state.paper) return;

      // Ensure model is loaded
      if (!isReady || loadedModelId !== selectedModelId) {
        await loadModel(selectedModelId);
      }

      dispatch({
        type: "SET_GENERATION_PROGRESS",
        progress: { status: "generating", currentTask: "Answering question" },
      });

      try {
        const { systemPrompt, userPrompt } = buildQAPrompt(state.paper, question);
        const answer = await generate(systemPrompt, userPrompt);

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
        dispatch({
          type: "SET_GENERATION_PROGRESS",
          progress: {
            status: "error",
            error: err instanceof Error ? err.message : "Failed to answer question",
          },
        });
      }
    },
    [state.paper, isReady, loadedModelId, selectedModelId, loadModel, generate]
  );

  const isGenerating = state.generationProgress.status === "generating";

  // WebGPU not supported error
  if (isSupported === false) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-4">Paper Pilot</h1>
        <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <h2 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">
            WebGPU Not Supported
          </h2>
          <p className="text-red-600 dark:text-red-400 mb-4">
            Paper Pilot requires WebGPU to run the AI model in your browser.
          </p>
          <div className="text-sm text-red-500 dark:text-red-400">
            <p className="font-medium mb-1">To use Paper Pilot, try:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Chrome 113+ or Edge 113+ (recommended)</li>
              <li>Enable WebGPU in browser flags if disabled</li>
              <li>Make sure your device has a compatible GPU</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      {/* Header */}
      <h1 className="text-4xl font-bold mb-4">Paper Pilot</h1>
      <p className="text-neutral-600 dark:text-neutral-400 mb-8 max-w-2xl">
        Enter a DOI or arXiv ID to fetch any academic paper, then let AI summarize and explain it.
        Paper Pilot searches <strong>CrossRef</strong>, <strong>Semantic Scholar</strong>,{" "}
        <strong>Unpaywall</strong>, and <strong>arXiv</strong> to find metadata and open-access PDFs.
        Everything runs in your browser &mdash; no data leaves your device.
      </p>

      {/* Model error display */}
      {modelError && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
          {modelError}
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
            selectedModelId={selectedModelId}
            loadedModelId={loadedModelId}
            isModelLoading={isLoading}
            isGenerating={isGenerating}
            modelLoadProgress={loadProgress}
            onModelSelect={setSelectedModelId}
            onLoadModel={handleLoadModel}
          />

          {/* Summary Panel */}
          <SummaryPanel
            summaries={state.summaries}
            isModelReady={isReady && loadedModelId === selectedModelId}
            isGenerating={isGenerating}
            progress={state.generationProgress}
            onGenerateSummary={handleGenerateSummary}
          />

          {/* Q&A Panel */}
          <QAPanel
            qaHistory={state.qaHistory}
            isModelReady={isReady && loadedModelId === selectedModelId}
            isGenerating={isGenerating}
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
          Paper Pilot uses Qwen3 AI models running entirely in your browser via WebLLM.
          Choose from three model sizes based on your device capabilities. Models are
          downloaded once and cached locally for future use.
        </p>
        <p className="mb-2">
          <strong>Data Sources:</strong> Paper metadata is fetched from CrossRef (for DOIs) and
          arXiv (for preprints). Semantic Scholar provides additional data like fields of study.
          Unpaywall helps find open-access PDFs. When available, full paper text is extracted
          from PDFs for more accurate summaries.
        </p>
        <p>
          <strong>Privacy:</strong> All AI processing happens locally in your browser. Paper metadata
          is fetched from public APIs, but your summaries and questions are never sent to any server.
        </p>
      </div>
    </div>
  );
}
