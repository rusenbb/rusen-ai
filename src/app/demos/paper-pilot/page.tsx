"use client";

import { useReducer, useCallback, useState, useRef, useEffect } from "react";
import { useAPILLM } from "./hooks/useAPILLM";
import DOIInput from "./components/DOIInput";
import PaperDisplay from "./components/PaperDisplay";
import ModelPanel from "./components/ModelPanel";
import SummaryPanel from "./components/SummaryPanel";
import QAPanel from "./components/QAPanel";
import { fetchPaper } from "./utils/paperFetcher";
import { buildSummaryPrompt, buildQAPrompt } from "./utils/prompts";
import { getSelectedModel, saveSelectedModel } from "./utils/storage";
import {
  initialState,
  generateId,
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
      // Replace existing summary of the same type (for regeneration)
      const existingIndex = state.summaries.findIndex(s => s.type === action.summary.type);
      if (existingIndex >= 0) {
        const newSummaries = [...state.summaries];
        newSummaries[existingIndex] = action.summary;
        return { ...state, summaries: newSummaries };
      }
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
  const [streamingContent, setStreamingContent] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("auto");
  const stepsCompletedRef = useRef<string[]>([]);

  // Load saved model preference on mount
  useEffect(() => {
    const saved = getSelectedModel();
    if (saved) {
      setSelectedModel(saved);
    }
  }, []);

  // Save model preference when changed
  const handleModelChange = useCallback((modelId: string) => {
    setSelectedModel(modelId);
    saveSelectedModel(modelId);
  }, []);

  // Cloud-based LLM (API)
  const {
    isGenerating,
    error,
    rateLimitRemaining,
    lastModelUsed,
    generate,
  } = useAPILLM(selectedModel);

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

  const handleClearSummaries = useCallback(() => {
    dispatch({ type: "CLEAR_SUMMARIES" });
  }, []);

  const handleClearQA = useCallback(() => {
    dispatch({ type: "CLEAR_QA" });
  }, []);

  const [generateAllProgress, setGenerateAllProgress] = useState<{ current: number; total: number } | null>(null);
  const [currentGeneratingType, setCurrentGeneratingType] = useState<SummaryType | null>(null);

  const handleGenerateAll = useCallback(async () => {
    if (!state.paper) return;

    const types: SummaryType[] = ["tldr", "technical", "eli5", "keyFindings"];
    const missingTypes = types.filter(type => !state.summaries.find(s => s.type === type));

    if (missingTypes.length === 0) return;

    setGenerateAllProgress({ current: 0, total: missingTypes.length });

    for (let i = 0; i < missingTypes.length; i++) {
      const currentType = missingTypes[i];
      setGenerateAllProgress({ current: i + 1, total: missingTypes.length });
      setCurrentGeneratingType(currentType);

      setStreamingContent("");
      dispatch({
        type: "SET_GENERATION_PROGRESS",
        progress: { status: "generating", currentTask: `Generating ${currentType} summary (${i + 1}/${missingTypes.length})` },
      });

      try {
        const { systemPrompt, userPrompt } = buildSummaryPrompt(state.paper, currentType);
        const content = await generate(systemPrompt, userPrompt, (text) => {
          setStreamingContent(text);
        });

        setStreamingContent("");
        dispatch({
          type: "ADD_SUMMARY",
          summary: { type: currentType, content, generatedAt: new Date() },
        });
      } catch (err) {
        setStreamingContent("");
        setCurrentGeneratingType(null);
        dispatch({
          type: "SET_GENERATION_PROGRESS",
          progress: {
            status: "error",
            error: err instanceof Error ? err.message : "Generation failed",
          },
        });
        setGenerateAllProgress(null);
        return;
      }
    }

    setCurrentGeneratingType(null);
    dispatch({
      type: "SET_GENERATION_PROGRESS",
      progress: { status: "complete" },
    });
    setGenerateAllProgress(null);
  }, [state.paper, state.summaries, generate]);

  const handleGenerateSummary = useCallback(
    async (type: SummaryType) => {
      if (!state.paper) return;

      // Reset streaming content and set current type
      setStreamingContent("");
      setCurrentGeneratingType(type);

      dispatch({
        type: "SET_GENERATION_PROGRESS",
        progress: { status: "generating", currentTask: `Generating ${type} summary` },
      });

      try {
        const { systemPrompt, userPrompt } = buildSummaryPrompt(state.paper, type);

        const content = await generate(systemPrompt, userPrompt, (text) => {
          setStreamingContent(text);
        });

        // Clear streaming content and add final summary
        setStreamingContent("");
        setCurrentGeneratingType(null);

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
        setCurrentGeneratingType(null);
        dispatch({
          type: "SET_GENERATION_PROGRESS",
          progress: {
            status: "error",
            error: err instanceof Error ? err.message : "Generation failed",
          },
        });
      }
    },
    [state.paper, generate]
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
        const { systemPrompt, userPrompt } = buildQAPrompt(state.paper, question);

        const answer = await generate(systemPrompt, userPrompt, (text) => {
          setStreamingContent(text);
        });

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
    [state.paper, generate]
  );

  const isGeneratingState = state.generationProgress.status === "generating";

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle when paper is loaded and not generating
      if (!state.paper || isGeneratingState || isGenerating) return;

      // Cmd/Ctrl + number for summaries
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
        const summaryTypes: SummaryType[] = ["tldr", "technical", "eli5", "keyFindings"];
        const keyNum = parseInt(e.key);

        if (keyNum >= 1 && keyNum <= 4) {
          e.preventDefault();
          const type = summaryTypes[keyNum - 1];
          // Only generate if not already generated
          if (!state.summaries.find(s => s.type === type)) {
            handleGenerateSummary(type);
          }
        }

        // Cmd/Ctrl + G for Generate All
        if (e.key === "g" || e.key === "G") {
          e.preventDefault();
          const missingTypes = summaryTypes.filter(t => !state.summaries.find(s => s.type === t));
          if (missingTypes.length > 0) {
            handleGenerateAll();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state.paper, state.summaries, isGeneratingState, isGenerating, handleGenerateSummary, handleGenerateAll]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      {/* Header */}
      <h1 className="text-4xl font-bold mb-4">Paper Pilot</h1>
      <p className="text-neutral-600 dark:text-neutral-400 mb-8 max-w-2xl">
        Enter a DOI or arXiv ID to fetch any academic paper, then let AI summarize and explain it.
        Powered by Gemini 2.0 Flash with 128k+ context for analyzing full papers.
      </p>

      {/* Error display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
          {error}
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
            isGenerating={isGeneratingState || isGenerating}
            rateLimitRemaining={rateLimitRemaining}
            lastModelUsed={lastModelUsed}
            selectedModel={selectedModel}
            onModelChange={handleModelChange}
            paperTitle={state.paper?.title}
            paperSubjects={state.paper?.subjects}
          />

          {/* Summary Panel */}
          <SummaryPanel
            summaries={state.summaries}
            isModelReady={true}
            isGenerating={isGeneratingState || isGenerating}
            progress={state.generationProgress}
            streamingContent={streamingContent}
            onGenerateSummary={handleGenerateSummary}
            onClearSummaries={handleClearSummaries}
            lastModelUsed={lastModelUsed}
            onGenerateAll={handleGenerateAll}
            generateAllProgress={generateAllProgress}
            hasFullText={state.paper?.hasFullText}
            wordCount={state.paper?.wordCount}
            currentGeneratingType={currentGeneratingType}
          />

          {/* Q&A Panel */}
          <QAPanel
            qaHistory={state.qaHistory}
            isModelReady={true}
            isGenerating={isGeneratingState || isGenerating}
            streamingContent={streamingContent}
            onAskQuestion={handleAskQuestion}
            onClearQA={handleClearQA}
          />
        </>
      )}

      {/* About section */}
      <div className="mt-12 text-sm text-neutral-500">
        <h3 className="font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
          About Paper Pilot
        </h3>
        <p className="mb-2">
          Uses Gemini 2.0 Flash via OpenRouter API with 128k+ context window,
          allowing analysis of full papers including methodology, results, and detailed sections.
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
