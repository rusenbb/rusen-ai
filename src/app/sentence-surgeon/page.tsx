"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Chip, DemoHeader, DemoPage } from "@/components/ui";
import { useFillMask, type FillMaskPrediction } from "./hooks/useFillMask";
import { EXAMPLES } from "./data/examples";
import { replaceSpan, wordPieceSpans } from "./spans";

const MASK_TOKEN = "[MASK]";

export default function SentenceSurgeonPage() {
  const fillMask = useFillMask();
  const [text, setText] = useState<string>(EXAMPLES[0]);
  const tokens = useMemo(() => fillMask.status === "ready" ? fillMask.tokenize(text) : [], [text, fillMask]);
  const spans = useMemo(() => wordPieceSpans(text, tokens), [text, tokens]);
  const [maskedIdx, setMaskedIdx] = useState<number | null>(null);
  const [predictions, setPredictions] = useState<FillMaskPrediction[]>([]);
  const [busy, setBusy] = useState(false);
  const [predictError, setPredictError] = useState<string | null>(null);
  const reqIdRef = useRef(0);

  const maskedSentence = maskedIdx !== null && spans[maskedIdx]
    ? replaceSpan(text, spans[maskedIdx], MASK_TOKEN) : null;

  const clearPrediction = useCallback(() => {
    reqIdRef.current++;
    setPredictions([]);
    setBusy(false);
    setPredictError(null);
  }, []);

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
    clearPrediction();
    setMaskedIdx((prev) => (prev === i ? null : i));
  }, [clearPrediction]);

  const handlePredictionPick = useCallback(
    (token: string) => {
      if (maskedIdx === null || !spans[maskedIdx]) return;
      setText(replaceSpan(text, spans[maskedIdx], token));
      setMaskedIdx(null);
      clearPrediction();
    },
    [maskedIdx, spans, text, clearPrediction],
  );

  const handleExample = useCallback((s: string) => {
    setText(s);
    setMaskedIdx(null);
    clearPrediction();
  }, [clearPrediction]);

  const handleClear = useCallback(() => {
    setText("");
    setMaskedIdx(null);
    clearPrediction();
  }, [clearPrediction]);

  const tokenStrip = useMemo(() => {
    if (tokens.length === 0) {
      return (
        <p className="text-xs italic text-sub">
          {fillMask.status === "ready"
            ? "Type something to see how the model tokenises it."
            : "Load DistilBERT to inspect its WordPiece tokens."}
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
              disabled={!spans[i]}
              title={isSub ? `subword: ##${display}` : `token: ${display}`}
              className={`px-2.5 py-1 text-sm font-mono transition border ${
                isMasked
                  ? "border-accent bg-accent/10 text-accent"
                  : isSub
                    ? "border-accent-2/40 bg-accent-2/5 text-accent-2 hover:border-accent-2"
                  : "border-line text-foreground hover:border-accent"
              }`}
            >
              {isSub && <span className="text-[10px] opacity-60 mr-0.5">##</span>}
              {isMasked ? "▒▒▒" : display}
            </button>
          );
        })}
      </div>
    );
  }, [tokens, spans, maskedIdx, fillMask.status, handleChipClick]);

  return (
    <DemoPage width="lg">
      <DemoHeader
        eyebrow="NLP / MASKED LANGUAGE MODELING"
        title="Sentence Surgeon"
        description="Type any sentence. DistilBERT's WordPiece tokeniser splits it into the actual subword units the model sees. Click a token to mask it and watch the model predict what fills the gap."
      />

      <p className="mb-4 text-xs text-sub">Click a token to predict a replacement. Unknown tokens cannot be aligned safely and are disabled; your original casing, punctuation and spacing are preserved.</p>
      {/* Status strip */}
      <div className="mb-4 text-xs font-mono">
        {fillMask.status === "idle" && (
          <Button size="sm" onClick={() => void fillMask.loadModel()}>
            Load DistilBERT
          </Button>
        )}
        {fillMask.status === "loading" && (
          <span className="text-sub">Loading DistilBERT… {fillMask.progress}%</span>
        )}
        {fillMask.status === "ready" && !busy && (
          <span className="text-signal">
            Model ready · {tokens.length} tokens
          </span>
        )}
        {fillMask.status === "ready" && busy && (
          <span className="text-accent">Predicting…</span>
        )}
        {fillMask.error && <span className="text-danger">{fillMask.error}</span>}
        {fillMask.status === "error" && (
          <Button variant="ghost" size="sm" className="ml-3" onClick={() => void fillMask.loadModel()}>
            Try again
          </Button>
        )}
        {predictError && <span className="text-danger ml-3">{predictError}</span>}
      </div>

      {/* Example chips */}
      <div className="flex flex-wrap gap-2 mb-5">
        {EXAMPLES.map((s) => (
          <Chip key={s} selected={s === text} onClick={() => handleExample(s)} title={s} className="normal-case tracking-normal">
            {s.length > 38 ? s.slice(0, 38) + "…" : s}
          </Chip>
        ))}
      </div>

      {/* Editor */}
      <Card padding="lg" className="mb-6">
        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-sub">
            Sentence
          </span>
          <div className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-[0.18em]">
            <Button variant="ghost" size="sm" onClick={handleClear}>
              ↺ Clear
            </Button>
          </div>
        </div>

        <textarea
          aria-label="Sentence"
          value={text}
          onChange={(e) => { setText(e.target.value); setMaskedIdx(null); clearPrediction(); }}
          spellCheck={false}
          rows={2}
          placeholder="Type a sentence and click a token below to mask it…"
          className="w-full resize-y border border-line bg-transparent px-3 py-2 text-base sm:text-lg leading-relaxed text-foreground focus:outline-none focus:border-accent"
        />

        {/* Token strip */}
        <div className="mt-4">
          <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-sub mb-2">
            Tokens - click one to mask it
          </div>
          {tokenStrip}
          {tokens.some((t) => t.startsWith("##")) && (
            <p className="text-[10px] text-sub mt-2">
              <span className="text-accent-2 font-mono">highlighted</span> tokens are
              WordPiece subwords (start with <code className="font-mono">##</code>). They glue to
              the previous token and represent how the model actually sees the word.
            </p>
          )}
        </div>
      </Card>

      {/* Predictions */}
      {maskedSentence !== null && (
        <div className="border border-accent/30 bg-accent/5 p-5">
          <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-accent mb-3 flex items-center gap-2">
            <span>Top predictions</span>
            <span className="text-sub normal-case tracking-normal">
              what fills the gap
            </span>
          </div>
          {predictions.length === 0 && busy && (
            <p className="text-sm text-sub">Computing…</p>
          )}
          {predictions.length === 0 && !busy && fillMask.status === "ready" && (
            <p className="text-sm text-sub">No predictions yet.</p>
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
                            ? "text-accent font-semibold"
                            : "text-muted"
                        }`}
                      >
                        {p.token}
                      </span>
                      <span className="text-xs font-mono tabular-nums text-sub">
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 bg-line overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          isTop ? "bg-accent" : "bg-sub"
                        } group-hover:opacity-80`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-sub mt-4 leading-relaxed">
            Click a prediction to graft it in. Probabilities sum across the model&apos;s
            entire 30k vocabulary, so even the top guess often sits below 50%.
          </p>
        </div>
      )}

      {/* Method note */}
      <div className="mt-10 text-xs text-sub leading-relaxed max-w-2xl">
        <p>
          The model is <code className="font-mono text-[11px]">distilbert-base-uncased</code> (~66 MB),
          a distilled BERT trained on English Wikipedia and BookCorpus, so its world model and biases
          reflect that. WordPiece is uncased, which is why predictions come back lowercased - and why
          rare words split into multiple <code className="font-mono">##</code>-prefixed subwords.
        </p>
      </div>
    </DemoPage>
  );
}
