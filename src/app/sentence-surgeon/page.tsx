"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFillMask, type FillMaskPrediction } from "./hooks/useFillMask";
import { EXAMPLES, type SentenceExample } from "./data/examples";

const MASK_TOKEN = "[MASK]";

type SentenceState = {
  words: string[];
  /** Index into `words` whose word is hidden behind a mask. -1 = no mask. */
  maskedIndex: number;
};

function exampleToState(ex: SentenceExample): SentenceState {
  return { words: ex.sentence.split(/\s+/), maskedIndex: ex.defaultMaskIndex };
}

function buildMaskedSentence(state: SentenceState): string | null {
  if (state.maskedIndex < 0) return null;
  return state.words
    .map((w, i) => (i === state.maskedIndex ? MASK_TOKEN : w))
    .join(" ");
}

function stateToText(state: SentenceState): string {
  return buildMaskedSentence(state) ?? state.words.join(" ");
}

function textToState(text: string): SentenceState {
  const words = text.split(/\s+/).filter(Boolean);
  const maskedIndex = words.findIndex((w) => w.includes(MASK_TOKEN));
  return { words, maskedIndex };
}

export default function SentenceSurgeonPage() {
  const fillMask = useFillMask();
  const [activeExampleIdx, setActiveExampleIdx] = useState(0);
  const [state, setState] = useState<SentenceState>(() => exampleToState(EXAMPLES[0]));
  const [editMode, setEditMode] = useState(false);
  const [rawText, setRawText] = useState(() => stateToText(exampleToState(EXAMPLES[0])));
  const [predictions, setPredictions] = useState<FillMaskPrediction[]>([]);
  const [busy, setBusy] = useState(false);
  const [predictError, setPredictError] = useState<string | null>(null);
  const reqIdRef = useRef(0);

  // The single source of truth the model sees. In chip mode it's derived from
  // `state`; in edit mode it's the textarea string (only if it contains [MASK]).
  const maskedSentence = useMemo<string | null>(() => {
    if (editMode) {
      return rawText.includes(MASK_TOKEN) ? rawText : null;
    }
    return buildMaskedSentence(state);
  }, [editMode, rawText, state]);

  // Run prediction whenever the masked sentence changes (and model is ready).
  // All setState calls live inside the promise chain so the effect itself
  // doesn't update state synchronously.
  useEffect(() => {
    if (!maskedSentence || fillMask.status !== "ready") {
      return;
    }
    const id = ++reqIdRef.current;
    let cancelled = false;
    const isStale = () => cancelled || id !== reqIdRef.current;

    Promise.resolve()
      .then(() => {
        if (isStale()) return null;
        setBusy(true);
        setPredictError(null);
        return fillMask.predict(maskedSentence, 6);
      })
      .then((preds) => {
        if (isStale() || !preds) return;
        setPredictions(preds);
      })
      .catch((err) => {
        if (isStale()) return;
        setPredictError(err instanceof Error ? err.message : "Prediction failed");
        setPredictions([]);
      })
      .finally(() => {
        if (isStale()) return;
        setBusy(false);
      });

    return () => {
      cancelled = true;
    };
  }, [maskedSentence, fillMask]);

  const pickExample = useCallback((i: number) => {
    setActiveExampleIdx(i);
    const next = exampleToState(EXAMPLES[i]);
    setState(next);
    setRawText(stateToText(next));
  }, []);

  const handleWordClick = useCallback((i: number) => {
    setState((prev) => ({
      words: prev.words,
      maskedIndex: prev.maskedIndex === i ? -1 : i,
    }));
  }, []);

  const handlePredictionPick = useCallback(
    (token: string) => {
      const cleanedToken = token.replace(/^##/, "");
      if (editMode) {
        setRawText((prev) => prev.replace(MASK_TOKEN, cleanedToken));
        return;
      }
      setState((prev) => {
        if (prev.maskedIndex < 0) return prev;
        const original = prev.words[prev.maskedIndex];
        const trailing = original.match(/[.,!?;:]+$/)?.[0] ?? "";
        const newWords = [...prev.words];
        newWords[prev.maskedIndex] = cleanedToken + trailing;
        return { words: newWords, maskedIndex: -1 };
      });
    },
    [editMode],
  );

  const handleReset = useCallback(() => {
    const fresh = exampleToState(EXAMPLES[activeExampleIdx]);
    setState(fresh);
    setRawText(stateToText(fresh));
  }, [activeExampleIdx]);

  const toggleEditMode = useCallback(() => {
    setEditMode((prev) => {
      if (!prev) {
        setRawText(stateToText(state));
        return true;
      }
      setState(textToState(rawText));
      return false;
    });
  }, [state, rawText]);

  const handleRawTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRawText(e.target.value);
  }, []);

  const insertMaskAtCursor = useCallback(() => {
    setRawText((prev) => (prev.includes(MASK_TOKEN) ? prev : prev.trimEnd() + " " + MASK_TOKEN));
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
      <div className="mb-6">
        <p className="text-xs font-mono tracking-[0.18em] text-neutral-500 dark:text-neutral-500 mb-2">
          NLP / MASKED LANGUAGE MODELING
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">Sentence Surgeon</h1>
        <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 max-w-2xl text-pretty">
          Click any word to remove it. A small BERT predicts what should fill the gap. Click a
          prediction to graft it in. Everything runs locally on WASM, no audio or text leaves your browser.
        </p>
      </div>

      {/* Status strip */}
      <div className="mb-4 text-xs font-mono">
        {fillMask.status === "loading" && (
          <span className="text-neutral-500">Loading DistilBERT… {fillMask.progress}%</span>
        )}
        {fillMask.status === "ready" && !busy && (
          <span className="text-green-600 dark:text-green-400">
            Model ready · {editMode ? "type a sentence with [MASK]" : "click a word"}
          </span>
        )}
        {fillMask.status === "ready" && busy && (
          <span className="text-cyan-600 dark:text-cyan-400">Predicting…</span>
        )}
        {fillMask.error && <span className="text-red-500">{fillMask.error}</span>}
        {predictError && <span className="text-red-500 ml-3">{predictError}</span>}
      </div>

      {/* Example chips */}
      <div className="flex flex-wrap gap-2 mb-5">
        {EXAMPLES.map((ex, i) => {
          const active = i === activeExampleIdx;
          return (
            <button
              key={ex.sentence}
              type="button"
              onClick={() => pickExample(i)}
              className={`rounded-full border px-3 py-1 text-xs font-mono transition ${
                active
                  ? "border-cyan-500 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300"
                  : "border-neutral-300 dark:border-neutral-700 text-neutral-500 hover:border-neutral-500"
              }`}
              title={ex.sentence}
            >
              {ex.sentence.length > 38 ? ex.sentence.slice(0, 38) + "…" : ex.sentence}
            </button>
          );
        })}
      </div>

      {/* Sentence editor */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-5 sm:p-7 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-neutral-500">
            Sentence
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleEditMode}
              className={`text-[10px] font-mono uppercase tracking-[0.18em] transition ${
                editMode
                  ? "text-cyan-600 dark:text-cyan-400"
                  : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
              }`}
              title={editMode ? "Switch back to click-to-mask chips" : "Type any sentence with [MASK]"}
            >
              {editMode ? "▤ Chip mode" : "✎ Edit text"}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="text-[10px] font-mono uppercase tracking-[0.18em] text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200 transition"
            >
              ↺ Reset
            </button>
          </div>
        </div>

        {editMode ? (
          <>
            <textarea
              value={rawText}
              onChange={handleRawTextChange}
              spellCheck={false}
              rows={3}
              className="w-full resize-y rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-base sm:text-lg font-mono leading-relaxed text-neutral-800 dark:text-neutral-200 focus:outline-none focus:border-cyan-500"
              placeholder="Type any sentence and put [MASK] where you want a prediction…"
            />
            <div className="flex items-center justify-between mt-2 gap-3 flex-wrap">
              <p className="text-xs text-neutral-500">
                Use the literal token <code className="font-mono text-cyan-600 dark:text-cyan-400">[MASK]</code> to mark the gap.
              </p>
              {!rawText.includes(MASK_TOKEN) && (
                <button
                  type="button"
                  onClick={insertMaskAtCursor}
                  className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-400 hover:underline"
                >
                  + Append [MASK]
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 leading-relaxed">
              {state.words.map((w, i) => {
                const isMasked = i === state.maskedIndex;
                return (
                  <button
                    key={`${i}-${w}`}
                    type="button"
                    onClick={() => handleWordClick(i)}
                    className={`px-3 py-1.5 rounded-md text-base sm:text-lg font-medium transition border ${
                      isMasked
                        ? "border-cyan-500 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 font-mono"
                        : "border-transparent hover:border-neutral-300 dark:hover:border-neutral-700 text-neutral-800 dark:text-neutral-200"
                    }`}
                  >
                    {isMasked ? "▒▒▒" : w}
                  </button>
                );
              })}
            </div>
            {state.maskedIndex < 0 && (
              <p className="text-xs text-neutral-500 mt-3 italic">
                No mask. Click a word to mask it again.
              </p>
            )}
          </>
        )}
      </div>

      {/* Predictions */}
      {maskedSentence !== null && (
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-5">
          <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-400 mb-3">
            Top predictions
          </div>
          {predictions.length === 0 && busy && (
            <p className="text-sm text-neutral-500">Computing…</p>
          )}
          {predictions.length === 0 && !busy && fillMask.status === "ready" && (
            <p className="text-sm text-neutral-500">No predictions yet.</p>
          )}
          <ul className="space-y-2">
            {predictions.map((p, i) => {
              const isTop = i === 0;
              const pct = p.score * 100;
              return (
                <li key={p.token}>
                  <button
                    type="button"
                    onClick={() => handlePredictionPick(p.token)}
                    className="w-full text-left group"
                  >
                    <div className="flex items-baseline justify-between gap-3 mb-1">
                      <span
                        className={`font-mono text-sm sm:text-base ${
                          isTop
                            ? "text-cyan-700 dark:text-cyan-300 font-semibold"
                            : "text-neutral-700 dark:text-neutral-300"
                        }`}
                      >
                        {p.token}
                      </span>
                      <span className="text-xs font-mono tabular-nums text-neutral-500">
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 bg-neutral-200 dark:bg-neutral-800 rounded-sm overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          isTop ? "bg-cyan-500" : "bg-neutral-500"
                        } group-hover:opacity-80`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-neutral-500 mt-4 leading-relaxed">
            Click a prediction to graft it into the sentence. Probabilities sum across the model&apos;s
            entire vocabulary, so even the top guess often sits below 50%.
          </p>
        </div>
      )}

      {/* Method note */}
      <div className="mt-10 text-xs text-neutral-500 leading-relaxed max-w-2xl">
        <p>
          The model is <code className="font-mono text-[11px]">distilbert-base-uncased</code> (~66 MB), a
          distilled BERT that predicts what word is missing from a sentence. It was trained on English
          Wikipedia and BookCorpus, so its world model and biases reflect that. Predictions are lowercased
          because the model is uncased; click a result anyway and the trailing punctuation is preserved.
        </p>
      </div>
    </div>
  );
}
