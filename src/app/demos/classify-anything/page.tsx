"use client";

import { useReducer, useCallback } from "react";
import { useClassifier } from "./hooks/useClassifier";
import ClassInput from "./components/ClassInput";
import TextInput from "./components/TextInput";
import ResultsPanel from "./components/ResultsPanel";
import { classifyReducer, initialState } from "./types";

export default function ClassifyAnythingPage() {
  const [state, dispatch] = useReducer(classifyReducer, initialState);
  const { classify, isModelReady, loadProgress, modelStatus, error: modelError } = useClassifier();

  const handleClassify = useCallback(async () => {
    if (!state.inputText.trim() || state.labels.length < 2) {
      return;
    }

    dispatch({ type: "SET_CLASSIFYING", isClassifying: true });
    dispatch({ type: "SET_ERROR", error: null });

    try {
      const results = await classify(state.inputText, state.labels);
      dispatch({ type: "SET_RESULTS", results });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Classification failed";
      dispatch({ type: "SET_ERROR", error: message });
    }
  }, [classify, state.inputText, state.labels]);

  const handleAddLabel = useCallback((label: string) => {
    dispatch({ type: "ADD_LABEL", label });
  }, []);

  const handleRemoveLabel = useCallback((index: number) => {
    dispatch({ type: "REMOVE_LABEL", index });
  }, []);

  const handleSetLabels = useCallback((labels: string[]) => {
    dispatch({ type: "SET_LABELS", labels });
  }, []);

  const handleSetInputText = useCallback((text: string) => {
    dispatch({ type: "SET_INPUT_TEXT", text });
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Classify Anything</h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Zero-shot text classification. Define your own classes, paste any text, get predictions.
          All processing happens locally in your browser.
        </p>
      </div>

      {/* Main content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left column - Labels */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6">
            <ClassInput
              labels={state.labels}
              onAddLabel={handleAddLabel}
              onRemoveLabel={handleRemoveLabel}
              onSetLabels={handleSetLabels}
              disabled={state.isClassifying}
            />
          </div>
        </div>

        {/* Middle column - Input */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6">
            <TextInput
              value={state.inputText}
              onChange={handleSetInputText}
              onClassify={handleClassify}
              isClassifying={state.isClassifying}
              isModelReady={isModelReady}
              disabled={state.isClassifying}
            />
          </div>
        </div>

        {/* Right column - Results */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6">
            <ResultsPanel
              results={state.results}
              isClassifying={state.isClassifying}
              modelStatus={modelStatus}
              loadProgress={loadProgress}
              error={state.error || modelError}
            />
          </div>
        </div>
      </div>

      {/* Info section */}
      <div className="mt-8 p-6 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
        <h2 className="text-lg font-semibold mb-3">How it works</h2>
        <div className="grid md:grid-cols-3 gap-4 text-sm text-neutral-600 dark:text-neutral-400">
          <div>
            <h3 className="font-medium text-neutral-900 dark:text-neutral-100 mb-1">
              1. Define Classes
            </h3>
            <p>
              Add the labels you want to classify text into. Use presets for common tasks
              like sentiment analysis or topic classification.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-neutral-900 dark:text-neutral-100 mb-1">
              2. Enter Text
            </h3>
            <p>
              Paste or type any text you want to classify. The model works with sentences,
              paragraphs, or longer documents.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-neutral-900 dark:text-neutral-100 mb-1">
              3. Get Predictions
            </h3>
            <p>
              The model predicts which class best matches your text, with confidence scores
              for each label. No data leaves your browser.
            </p>
          </div>
        </div>
      </div>

      {/* Technical details */}
      <div className="mt-4 text-xs text-neutral-500 dark:text-neutral-400 text-center">
        Using MobileBERT-uncased-MNLI via Transformers.js. Model runs entirely in your browser using WebAssembly.
      </div>
    </div>
  );
}
