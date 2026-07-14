"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  DemoFootnote,
  DemoHeader,
  DemoPage,
  DemoPanel,
} from "@/components/ui";

import { ArenaDiscrete } from "./components/arena-discrete";
import { EntropyPlot } from "./components/entropy-plot";
import { Leaderboard, type LeaderboardRow } from "./components/leaderboard";
import { WhyPanelDiscrete } from "./components/why-panel";
import { bigramEntropy } from "./entropy";
import type {
  DiscretePrediction,
  DiscreteSymbol,
  DiscreteTrial,
} from "./modes";
import {
  makeAllDiscretePredictors,
  type DiscretePredictor,
} from "./predictors/discrete";
import { scoreDiscrete } from "./scoring";
import { discreteWhy } from "./why";

const KEYS_2 = ["f", "j"];
const KEYS_4 = ["w", "a", "s", "d"];
const LABELS_2 = ["F", "J"];
const LABELS_4 = ["W", "A", "S", "D"];
const SESSION_TARGET = 200;
const ENTROPY_WINDOW = 80;
const WARMUP_TRIALS = 20;

function effectiveOrder(id: string): number {
  if (id.startsWith("markov-")) return parseInt(id.slice(7), 10);
  if (id.startsWith("ppm-")) return Math.min(5, parseInt(id.slice(4), 10));
  return 3;
}

export default function OutguessPage() {
  const [alphabet, setAlphabet] = useState<2 | 4>(2);

  return (
    <DemoPage>
      <DemoHeader
        eyebrow="Prediction Game"
        title="Outguess"
        description="Try to be unpredictable. A tiny AI predicts your next key press and catches humans about 70% of the time."
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <AlphabetPicker alphabet={alphabet} setAlphabet={setAlphabet} />
      </div>

      <Session key={`session-${alphabet}`} alphabet={alphabet} />

      <DemoFootnote align="left">
        <strong>Why this works.</strong> An order-5 Markov chain catches human key-tapping
        ~70% of the time because humans systematically avoid repetition when trying to be
        random. Hide the AI guess to play a fair test of your own randomness, and watch
        the lifetime tally to see how the leading model is doing across the whole session.
      </DemoFootnote>
    </DemoPage>
  );
}

// ============================================================================
// Session - the actual game. Remounts on alphabet change to reset cleanly.
// ============================================================================

function Session({ alphabet }: { alphabet: 2 | 4 }) {
  const [predictors] = useState<DiscretePredictor[]>(() =>
    makeAllDiscretePredictors(alphabet),
  );
  const [trials, setTrials] = useState<DiscreteTrial[]>([]);
  const trialsRef = useRef<DiscreteTrial[]>([]);
  // Synced from `predictedNext` via useEffect so handlePress always reads the
  // value that was visible at press time (without rebuilding the callback on
  // every render - that would churn the keyboard listener).
  const predictedNextRef = useRef<DiscreteSymbol | null>(null);
  const [showHint, setShowHint] = useState(true);

  const symbolLabels = alphabet === 2 ? LABELS_2 : LABELS_4;
  const keyMap = alphabet === 2 ? KEYS_2 : KEYS_4;

  const handlePress = useCallback(
    (symbol: DiscreteSymbol) => {
      const prev = trialsRef.current;
      const history = prev.map((t) => t.symbol);
      const predictions: Record<string, DiscretePrediction> = {};
      for (const p of predictors) {
        predictions[p.meta.id] = p.predict(history);
      }
      for (const p of predictors) {
        p.observe(history, symbol);
      }
      const shownGuess = predictedNextRef.current ?? 0;
      const next = [
        ...prev,
        { t: prev.length, symbol, shownGuess, predictions },
      ];
      trialsRef.current = next;
      setTrials(next);
    },
    [predictors],
  );

  const handleReset = useCallback(() => {
    for (const p of predictors) p.reset();
    trialsRef.current = [];
    setTrials([]);
  }, [predictors]);

  const leaderboardRows = useMemo<LeaderboardRow[]>(() => {
    const base = predictors.map((p) => {
      const s = scoreDiscrete(trials, p.meta.id, alphabet, 50);
      return {
        meta: p.meta,
        primary: s.accuracy,
        primaryLabel: "acc",
        secondary: s.bitsSaved,
        secondaryLabel: "bits",
        isLeader: false,
        warmup: s.trials < WARMUP_TRIALS,
      } satisfies LeaderboardRow;
    });
    const eligible = base.filter((r) => !r.warmup);
    const leader = eligible.reduce<LeaderboardRow | null>(
      (best, r) => (best === null || r.primary > best.primary ? r : best),
      null,
    );
    return base.map((r) => ({
      ...r,
      isLeader: leader !== null && r.meta.id === leader.meta.id,
    }));
  }, [trials, alphabet, predictors]);

  const leaderId = leaderboardRows.find((r) => r.isLeader)?.meta.id ?? null;
  const leaderLabel = leaderboardRows.find((r) => r.isLeader)?.meta.label ?? "-";
  const leaderAcc = leaderboardRows.find((r) => r.isLeader)?.primary ?? 0;

  // The predictor whose guess is shown in the arena. Falls back to first
  // non-random predictor pre-warmup so there is always a guess to show.
  const arenaShownId = useMemo<string | null>(() => {
    if (predictors.length === 0) return null;
    return (
      leaderId ??
      predictors.find((p) => p.meta.id !== "random")?.meta.id ??
      predictors[0].meta.id
    );
  }, [predictors, leaderId]);

  const arenaShownLabel =
    predictors.find((p) => p.meta.id === arenaShownId)?.meta.label ?? "-";

  // Lifetime tally of the AI guess that was visibly shown at each press.
  // Aggregates across leader changes - counts what the user actually saw, not
  // whichever predictor is currently leading.
  const tally = useMemo(() => {
    let right = 0;
    for (const t of trials) {
      if (t.shownGuess === t.symbol) right += 1;
    }
    return { right, total: trials.length };
  }, [trials]);

  // predict() does not mutate - safe to call during render.
  const predictedNext = useMemo<DiscreteSymbol | null>(() => {
    if (!arenaShownId) return null;
    const leader = predictors.find((p) => p.meta.id === arenaShownId);
    if (!leader) return null;
    return leader.predict(trials.map((t) => t.symbol)).argmax;
  }, [predictors, arenaShownId, trials]);

  // Sync the always-fresh predictedNext into a ref handlePress can read.
  useEffect(() => {
    predictedNextRef.current = predictedNext;
  }, [predictedNext]);

  const entropySeries = useMemo(() => {
    const symbols = trials.map((t) => t.symbol);
    const out: number[] = [];
    const stride = Math.max(1, Math.floor(symbols.length / 60));
    for (let i = 10; i <= symbols.length; i += stride) {
      out.push(bigramEntropy(symbols.slice(0, i), alphabet, ENTROPY_WINDOW));
    }
    return out;
  }, [trials, alphabet]);

  const whyData = useMemo(() => {
    if (!leaderId) return null;
    const order = effectiveOrder(leaderId);
    return discreteWhy(trials, Math.max(1, order), alphabet);
  }, [trials, alphabet, leaderId]);

  const lastResult = useMemo(() => {
    if (trials.length === 0) return null;
    const t = trials[trials.length - 1];
    // `index` is the trial number - monotonic, unique per press. Without it,
    // two consecutive presses with the same {symbol, predicted} produce
    // structurally identical objects, and React Compiler can dedupe the
    // memoized result; the arena's pulse effect then sees no change and
    // no pulse fires for that press.
    return {
      index: t.t,
      symbol: t.symbol,
      predicted: t.shownGuess,
    };
  }, [trials]);

  const sessionDone = trials.length >= SESSION_TARGET;
  const tallyPct = tally.total === 0 ? 0 : (tally.right / tally.total) * 100;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleReset}
          className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 font-mono text-xs uppercase tracking-[0.18em] text-neutral-600 transition hover:border-cyan-500/60 dark:text-neutral-400"
        >
          ↺ Reset
        </button>
        <HintToggle showHint={showHint} setShowHint={setShowHint} />
        <div
          className="ml-auto rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 font-mono text-xs"
          title={`Lifetime tally for ${arenaShownLabel}. Jumps when the leader changes.`}
        >
          <span className="uppercase tracking-[0.18em] text-neutral-500">
            AI ({arenaShownLabel})
          </span>{" "}
          <span className="tabular-nums text-neutral-800 dark:text-neutral-200">
            {tally.right} / {tally.total}
          </span>{" "}
          <span className="tabular-nums text-neutral-500">
            ({tallyPct.toFixed(0)}%)
          </span>
        </div>
        <div className="font-mono text-xs text-neutral-500">
          {trials.length} / {SESSION_TARGET} trials
        </div>
      </div>

      {sessionDone && (
        <div className="mb-4 rounded-md border border-cyan-500/40 bg-cyan-500/5 px-4 py-3 font-mono text-xs text-cyan-700 dark:text-cyan-300">
          Session done. Best AI: <strong>{leaderLabel}</strong> at{" "}
          {(leaderAcc * 100).toFixed(0)}% rolling accuracy. Hit reset to play again.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <DemoPanel
          title="Arena"
          description="Each tap is one trial. Predictors guess the next tap before it happens."
        >
          <ArenaDiscrete
            symbolLabels={symbolLabels}
            keyMap={keyMap}
            predictedNext={predictedNext}
            showPrediction={showHint}
            lastResult={lastResult}
            disabled={sessionDone}
            onPress={handlePress}
          />
        </DemoPanel>

        <DemoPanel
          title="Leaderboard"
          description="Rolling 50-trial accuracy. Bits = bits saved per trial vs random."
        >
          <Leaderboard
            rows={leaderboardRows}
            primaryFmt={(v) => `${(v * 100).toFixed(0)}%`}
            secondaryFmt={(v) => v.toFixed(2)}
          />
        </DemoPanel>

        <DemoPanel
          title="Entropy"
          description="Conditional bigram entropy of your input. The lower it goes, the more patterned you are."
        >
          <EntropyPlot
            series={entropySeries}
            max={Math.log2(alphabet)}
            label="bigram H(X|prev)"
            unit="bits"
          />
        </DemoPanel>

        <DemoPanel
          title="Why?"
          description={`Internal state of the leading predictor (${leaderLabel}).`}
        >
          <WhyPanelDiscrete
            why={whyData}
            symbolLabels={symbolLabels}
            predictorLabel={leaderLabel}
          />
        </DemoPanel>
      </div>
    </>
  );
}

// ============================================================================
// Toolbar bits.
// ============================================================================

function HintToggle({
  showHint,
  setShowHint,
}: {
  showHint: boolean;
  setShowHint: (v: boolean) => void;
}) {
  return (
    <div className="inline-flex rounded-md border border-[var(--line)] bg-[var(--surface)] p-0.5">
      <span className="px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
        AI guess
      </span>
      {([true, false] as const).map((v) => (
        <button
          key={String(v)}
          type="button"
          onClick={() => setShowHint(v)}
          className={`rounded px-3 py-1 font-mono text-xs uppercase tracking-[0.18em] transition ${
            showHint === v
              ? "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300"
              : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
          }`}
        >
          {v ? "show" : "hide"}
        </button>
      ))}
    </div>
  );
}

function AlphabetPicker({
  alphabet,
  setAlphabet,
}: {
  alphabet: 2 | 4;
  setAlphabet: (a: 2 | 4) => void;
}) {
  return (
    <div className="inline-flex rounded-md border border-[var(--line)] bg-[var(--surface)] p-0.5">
      {([2, 4] as const).map((a) => (
        <button
          key={a}
          type="button"
          onClick={() => setAlphabet(a)}
          className={`rounded px-3 py-1 font-mono text-xs uppercase tracking-[0.18em] transition ${
            alphabet === a
              ? "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300"
              : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
          }`}
        >
          {a} keys
        </button>
      ))}
    </div>
  );
}
