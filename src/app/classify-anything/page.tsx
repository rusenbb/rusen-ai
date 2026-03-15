"use client";

import { useReducer, useCallback } from "react";
import { useClassifier } from "./hooks/useClassifier";
import ClassInput from "./components/ClassInput";
import TextInput from "./components/TextInput";
import ResultsPanel from "./components/ResultsPanel";
import { classifyReducer, initialState } from "./types";
import { DemoFootnote, DemoHeader, DemoMutedSection, DemoPage, DemoPanel } from "@/components/ui";

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
    <DemoPage>
      <DemoHeader
        eyebrow="NLP / Zero-Shot Classification"
        title="Classify Anything"
        description={
          <>
          Zero-shot text classification. Define your own classes, paste any text, get predictions.
          All processing happens locally in your browser.
          </>
        }
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <DemoPanel title="Labels" description="Create the classes your prompt should be sorted into.">
            <ClassInput
              labels={state.labels}
              onAddLabel={handleAddLabel}
              onRemoveLabel={handleRemoveLabel}
              onSetLabels={handleSetLabels}
              disabled={state.isClassifying}
            />
          </DemoPanel>
        </div>

        <div className="lg:col-span-1">
          <DemoPanel title="Input Text" description="Paste any sentence, paragraph, or document excerpt.">
            <TextInput
              value={state.inputText}
              onChange={handleSetInputText}
              onClassify={handleClassify}
              isClassifying={state.isClassifying}
              isModelReady={isModelReady}
              disabled={state.isClassifying}
            />
          </DemoPanel>
        </div>

        <div className="lg:col-span-1">
          <DemoPanel title="Results" description="Review the predicted label distribution and model status.">
            <ResultsPanel
              results={state.results}
              isClassifying={state.isClassifying}
              modelStatus={modelStatus}
              loadProgress={loadProgress}
              error={state.error || modelError}
            />
          </DemoPanel>
        </div>
      </div>

      <DemoMutedSection className="mt-8" title="How it works">
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
      </DemoMutedSection>

      <DemoFootnote>
        Using MobileBERT-uncased-MNLI via Transformers.js. Model runs entirely in your browser using WebAssembly.
      </DemoFootnote>
    </DemoPage>
  );
}
