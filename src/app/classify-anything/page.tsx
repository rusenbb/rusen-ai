"use client";

import { useCallback, useReducer, useState, type FormEvent } from "react";
import { useClassifier } from "./hooks/useClassifier";
import ResultsPanel from "./components/ResultsPanel";
import { classifyReducer, initialState } from "./types";
import { EXAMPLES } from "./utils/examples";
import { Button, Chip, DemoHeader, DemoPage, Details } from "@/components/ui";

const MIN_LABELS = 2;

export default function ClassifyAnythingPage() {
  const [state, dispatch] = useReducer(classifyReducer, initialState);
  const [multiLabel, setMultiLabel] = useState(false);
  const [draftLabel, setDraftLabel] = useState("");
  const { classify, isModelReady, loadProgress, modelStatus, error: modelError } = useClassifier();
  const busy = state.isClassifying;

  const handleClassify = useCallback(async () => {
    if (!state.inputText.trim() || state.labels.length < MIN_LABELS) return;
    dispatch({ type: "SET_CLASSIFYING", isClassifying: true });
    try {
      const results = await classify(state.inputText, state.labels, multiLabel);
      dispatch({ type: "SET_RESULTS", results });
    } catch (err) {
      dispatch({ type: "SET_ERROR", error: err instanceof Error ? err.message : "Classification failed" });
    }
  }, [classify, state.inputText, state.labels, multiLabel]);

  const addLabel = (event: FormEvent) => {
    event.preventDefault();
    const label = draftLabel.trim().toLowerCase();
    if (label && !state.labels.includes(label)) dispatch({ type: "ADD_LABEL", label });
    setDraftLabel("");
  };

  return (
    <DemoPage>
      <DemoHeader
        eyebrow="Zero-shot text classification"
        title="Classify Anything"
        description="Write any text, invent the categories, and a small model in your browser picks the best fit."
      />

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="min-w-0 space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[0.7rem] uppercase tracking-[0.08em] text-[var(--sub)]">Examples</span>
            {EXAMPLES.map((example) => (
              <Chip
                key={example.name}
                selected={state.inputText === example.text}
                disabled={busy}
                onClick={() => {
                  dispatch({ type: "SET_INPUT_TEXT", text: example.text });
                  dispatch({ type: "SET_LABELS", labels: [...example.labels] });
                }}
              >
                {example.name}
              </Chip>
            ))}
          </div>

          <div>
            <label htmlFor="classify-text-input" className="sr-only">
              Text to Classify
            </label>
            <textarea
              id="classify-text-input"
              value={state.inputText}
              onChange={(event) => dispatch({ type: "SET_INPUT_TEXT", text: event.target.value })}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault();
                  if (!busy) handleClassify();
                }
              }}
              placeholder="Write or paste English text…"
              disabled={busy}
              rows={5}
              className="w-full resize-none border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-base leading-relaxed focus:border-[var(--line-strong)] focus:outline-none disabled:opacity-50"
            />
            {state.inputText && (
              <button
                type="button"
                onClick={() => dispatch({ type: "SET_INPUT_TEXT", text: "" })}
                disabled={busy}
                className="mt-1 font-mono text-[0.7rem] uppercase tracking-[0.08em] text-[var(--sub)] hover:text-[var(--foreground)] disabled:opacity-50"
              >
                Clear
              </button>
            )}
          </div>

          <div>
            <div className="mb-2 font-mono text-[0.7rem] uppercase tracking-[0.08em] text-[var(--sub)]">
              Categories
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {state.labels.map((label, index) => (
                <Chip
                  key={label}
                  onRemove={() => dispatch({ type: "REMOVE_LABEL", index })}
                  disabled={busy || state.labels.length <= MIN_LABELS}
                >
                  {label}
                </Chip>
              ))}
              <form onSubmit={addLabel} className="flex">
                <input
                  aria-label="New category"
                  value={draftLabel}
                  onChange={(event) => setDraftLabel(event.target.value)}
                  placeholder="+ add your own"
                  disabled={busy}
                  className="w-36 border-b border-dashed border-[var(--line-strong)] bg-transparent px-1 py-1 font-mono text-[0.75rem] focus:outline-none disabled:opacity-50"
                />
              </form>
            </div>
          </div>

          <Button
            variant="primary"
            size="lg"
            onClick={handleClassify}
            loading={busy}
            disabled={!state.inputText.trim() || state.labels.length < MIN_LABELS}
          >
            {busy ? (isModelReady ? "Classifying" : "Loading model") : "Classify"}
          </Button>
        </div>

        <div className="min-w-0">
          <ResultsPanel
            results={state.results}
            isClassifying={busy}
            modelStatus={modelStatus}
            loadProgress={loadProgress}
            error={state.error || modelError}
          />
          <Details summary="Options and model" className="mt-6">
            <label className="mb-3 flex items-center gap-2 text-[var(--foreground)]">
              <input
                type="checkbox"
                checked={multiLabel}
                disabled={busy}
                onChange={(event) => {
                  setMultiLabel(event.target.checked);
                  dispatch({ type: "SET_LABELS", labels: state.labels });
                }}
              />
              Let several categories match
            </label>
            <p>
              MobileBERT trained on natural-language inference, run with Transformers.js on WebAssembly. Each category
              is tested as a statement about the text, and the scores compare those statements. Text past 512 tokens
              is cut. Nothing you type leaves the browser.
            </p>
          </Details>
        </div>
      </div>
    </DemoPage>
  );
}
