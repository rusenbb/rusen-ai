"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFillMask, type FillMaskPrediction } from "./hooks/useFillMask";
import { EXAMPLES } from "./data/examples";

const MASK_TOKEN = "[MASK]";

/**
 * Stitch a WordPiece token list back into a sentence string.
 * Subword tokens are prefixed with "##" — these glue to the previous
 * token without a space; everything else gets a leading space.
 * If `maskIdx` is set, that token is replaced with [MASK]
 * (and the leading space is preserved so the model sees a clean gap).
 */
function tokensToSentence(tokens: string[], maskIdx: number | null): string {
  let out = "";
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const isSub = t.startsWith("##");
    const display = i === maskIdx ? MASK_TOKEN : isSub ? t.slice(2) : t;
    if (i === 0) {
      out += display;
    } else if (isSub && i !== maskIdx) {
      // Subword stays glued. If the masked token is a subword we still want
      // a space before [MASK] so the model treats it as a normal word slot.
      out += display;
    } else {
      out += " " + display;
    }
  }
  return out;
}

export default function SentenceSurgeonPage() {
  const fillMask = useFillMask();
  const [text, setText] = useState<string>(EXAMPLES[0]);
  const [tokens, setTokens] = useState<string[]>([]);
  const [maskedIdx, setMaskedIdx] = useState<number | null>(null);
  const [predictions, setPredictions] = useState<FillMaskPrediction[]>([]);
  const [busy, setBusy] = useState(false);
  const [predictError, setPredictError] = useState<string | null>(null);
  const reqIdRef = useRef(0);

  // Re-tokenize whenever text or model readiness changes.
  useEffect(() => {
    if (fillMask.status !== "ready") return;
    const next = fillMask.tokenize(text);
    setTokens(next);
    // If the previously-masked index is now out of range, drop it.
    setMaskedIdx((prev) => (prev !== null && prev < next.length ? prev : null));
  }, [text, fillMask, fillMask.status]);

  // Pick a sensible default mask once tokens land.
  useEffect(() => {
    if (tokens.length === 0) {
      setMaskedIdx(null);
      return;
    }
    setMaskedIdx((prev) => {
      if (prev !== null && prev < tokens.length) return prev;
      // Default: the last "word-ish" token (skip punctuation tokens).
      for (let i = tokens.length - 1; i >= 0; i--) {
        if (/^[a-z0-9##]/i.test(tokens[i])) return i;
      }
      return tokens.length - 1;
    });
  }, [tokens]);

  // The exact string the model sees, derived from tokens. Memoised so the
  // prediction effect doesn't fire on every keystroke before tokens land.
  const maskedSentence = useMemo<string | null>(() => {
    if (tokens.length === 0 || maskedIdx === null) return null;
    return tokensToSentence(tokens, maskedIdx);
  }, [tokens, maskedIdx]);

  // Run prediction whenever the masked sentence changes (and model is ready).
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

  const handleChipClick = useCallback((i: number) => {
    setMaskedIdx((prev) => (prev === i ? null : i));
  }, []);

  const handlePredictionPick = useCallback(
    (token: string) => {
      const cleaned = token.replace(/^##/, "");
      if (maskedIdx === null) return;
      // Stitch the new token list back into a sentence and use that as the
      // new textarea contents. WordPiece is uncased, so we preserve the
      // user's original casing where possible by only replacing the masked
      // span with the lowercased prediction.
      const newTokens = [...tokens];
      // Re-prefix with "##" if the original token was a subword, so the
      // glue-to-previous behavior is preserved when we re-render.
      const wasSub = newTokens[maskedIdx].startsWith("##");
      newTokens[maskedIdx] = wasSub ? "##" + cleaned : cleaned;
      const next = tokensToSentence(newTokens, null);
      setText(next);
      setMaskedIdx(null);
    },
    [maskedIdx, tokens],
  );

  const handleExample = useCallback((s: string) => {
    setText(s);
    setMaskedIdx(null);
    setPredictions([]);
  }, []);

  const handleClear = useCallback(() => {
    setText("");
    setMaskedIdx(null);
    setPredictions([]);
  }, []);

  const tokenStrip = useMemo(() => {
    if (tokens.length === 0) {
      return (
        <p className="text-xs italic text-neutral-500">
          {fillMask.status === "ready"
            ? "Type something to see how the model tokenises it."
            : "Tokens will appear once DistilBERT finishes loading."}
        </p>
      );
    }
    return (
      <div className="flex flex-wrap gap-1.5 leading-relaxed">
        {tokens.map((t, i) => {
          const isSub = t.startsWith("##");
          const display = isSub ? t.slice(2) : t;
          const isMasked = i === maskedIdx;
          return (
            <button
              key={`${i}-${t}`}
              type="button"
              onClick={() => handleChipClick(i)}
              title={isSub ? `subword: ##${display}` : `token: ${display}`}
              className={`px-2.5 py-1 rounded-md text-sm font-mono transition border ${
                isMasked
                  ? "border-cyan-500 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300"
                  : isSub
                    ? "border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-300 hover:border-amber-500"
                  : "border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 hover:border-cyan-500"
              }`}
            >
              {isSub && <span className="text-[10px] opacity-60 mr-0.5">##</span>}
              {isMasked ? "▒▒▒" : display}
            </button>
          );
        })}
      </div>
    );
  }, [tokens, maskedIdx, fillMask.status, handleChipClick]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
      <div className="mb-6">
        <p className="text-xs font-mono tracking-[0.18em] text-neutral-500 dark:text-neutral-500 mb-2">
          NLP / MASKED LANGUAGE MODELING
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">Sentence Surgeon</h1>
        <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 max-w-2xl text-pretty">
          Type any sentence. DistilBERT&apos;s WordPiece tokeniser splits it into the
          actual subword units the model sees. Click a token to mask it and watch the
          model predict what fills the gap.
        </p>
      </div>

      {/* Status strip */}
      <div className="mb-4 text-xs font-mono">
        {fillMask.status === "loading" && (
          <span className="text-neutral-500">Loading DistilBERT… {fillMask.progress}%</span>
        )}
        {fillMask.status === "ready" && !busy && (
          <span className="text-green-600 dark:text-green-400">
            Model ready · {tokens.length} tokens
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
        {EXAMPLES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => handleExample(s)}
            className={`rounded-full border px-3 py-1 text-xs font-mono transition ${
              s === text
                ? "border-cyan-500 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300"
                : "border-neutral-300 dark:border-neutral-700 text-neutral-500 hover:border-neutral-500"
            }`}
            title={s}
          >
            {s.length > 38 ? s.slice(0, 38) + "…" : s}
          </button>
        ))}
      </div>

      {/* Editor */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-5 sm:p-7 mb-6">
        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-neutral-500">
            Sentence
          </span>
          <div className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-[0.18em]">
            <button
              type="button"
              onClick={handleClear}
              className="text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200 transition"
            >
              ↺ Clear
            </button>
          </div>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          rows={2}
          placeholder="Type a sentence and click a token below to mask it…"
          className="w-full resize-y rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-base sm:text-lg leading-relaxed text-neutral-800 dark:text-neutral-200 focus:outline-none focus:border-cyan-500"
        />

        {/* Token strip */}
        <div className="mt-4">
          <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-neutral-500 mb-2">
            Tokens — click one to mask it
          </div>
          {tokenStrip}
          {tokens.some((t) => t.startsWith("##")) && (
            <p className="text-[10px] text-neutral-500 mt-2">
              <span className="text-amber-600 dark:text-amber-400 font-mono">amber</span> tokens are
              WordPiece subwords (start with <code className="font-mono">##</code>). They glue to
              the previous token and represent how the model actually sees the word.
            </p>
          )}
        </div>
      </div>

      {/* Predictions */}
      {maskedSentence !== null && (
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-5">
          <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-400 mb-3 flex items-center gap-2">
            <span>Top predictions</span>
            <span className="text-neutral-500 normal-case tracking-normal">
              what fills the gap
            </span>
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
                <li key={p.token + i}>
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
            Click a prediction to graft it in. Probabilities sum across the model&apos;s
            entire 30k vocabulary, so even the top guess often sits below 50%.
          </p>
        </div>
      )}

      {/* Method note */}
      <div className="mt-10 text-xs text-neutral-500 leading-relaxed max-w-2xl">
        <p>
          The model is <code className="font-mono text-[11px]">distilbert-base-uncased</code> (~66 MB),
          a distilled BERT trained on English Wikipedia and BookCorpus, so its world model and biases
          reflect that. WordPiece is uncased, which is why predictions come back lowercased — and why
          rare words split into multiple <code className="font-mono">##</code>-prefixed subwords.
        </p>
      </div>
    </div>
  );
}
