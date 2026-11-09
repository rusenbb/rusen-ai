"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button, DemoHeader, DemoPage, Details, Segmented } from "@/components/ui";

import { AccuracyChart } from "./components/accuracy-chart";
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
import { chanceOfAtLeast, scoreDiscrete } from "./scoring";

const KEYS_2 = ["f", "j"];
const KEYS_4 = ["w", "a", "s", "d"];
const LABELS_2 = ["F", "J"];
const LABELS_4 = ["W", "A", "S", "D"];
const SESSION_TARGET = 200;
const ENTROPY_WINDOW = 80;
const WARMUP_TRIALS = 20;
const SCORE_WINDOW = 50;
/** Verdict threshold: chance of scoring this well by pure guessing. */
const CLEAR_P = 0.05;

export default function OutguessPage() {
  const [alphabet, setAlphabet] = useState<2 | 4>(2);

  return (
    <DemoPage>
      <DemoHeader
        eyebrow="Prediction game"
        title="Outguess"
        description="Tap the pads or press their keys, and try to be unpredictable. A small model guesses each press before you make it."
      />
      <Session key={`session-${alphabet}`} alphabet={alphabet} setAlphabet={setAlphabet} />
    </DemoPage>
  );
}

// ============================================================================
// Session - the actual game. Remounts on alphabet change to reset cleanly.
// ============================================================================

function Session({ alphabet, setAlphabet }: { alphabet: 2 | 4; setAlphabet: (alphabet: 2 | 4) => void }) {
  const [predictors] = useState<DiscretePredictor[]>(() =>
    makeAllDiscretePredictors(alphabet),
  );
  const [trials, setTrials] = useState<DiscreteTrial[]>([]);
  const trialsRef = useRef<DiscreteTrial[]>([]);
  // Synced from `predictedNext` via useEffect so handlePress always reads the
  // value that was visible at press time (without rebuilding the callback on
  // every render - that would churn the keyboard listener).
  const predictedNextRef = useRef<DiscreteSymbol | null>(null);
  const [showHint, setShowHint] = useState(false);
  const scoredTrials = useMemo(() => trials.filter((trial) => trial.hintShown === showHint), [trials, showHint]);

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
        { t: prev.length, symbol, shownGuess, predictions, hintShown: showHint },
      ];
      trialsRef.current = next;
      setTrials(next);
    },
    [predictors, showHint],
  );

  const handleReset = useCallback(() => {
    for (const p of predictors) p.reset();
    trialsRef.current = [];
    setTrials([]);
  }, [predictors]);

  const leaderboardRows = useMemo<LeaderboardRow[]>(() => {
    const base = predictors.map((p) => {
      const score = scoreDiscrete(scoredTrials, p.meta.id, alphabet, SCORE_WINDOW);
      return { meta: p.meta, accuracy: score.accuracy, bitsSaved: score.bitsSaved, eligible: score.trials >= WARMUP_TRIALS };
    });
    // A predictor can lead only after WARMUP_TRIALS scored presses.
    const leader = base
      .filter((row) => row.eligible)
      .reduce<(typeof base)[number] | null>((best, row) => (best === null || row.accuracy > best.accuracy ? row : best), null);
    return base.map(({ meta, accuracy, bitsSaved }) => ({ meta, accuracy, bitsSaved, isLeader: leader?.meta.id === meta.id }));
  }, [scoredTrials, alphabet, predictors]);

  const leaderId = leaderboardRows.find((r) => r.isLeader)?.meta.id ?? null;
  const leaderLabel = leaderboardRows.find((r) => r.isLeader)?.meta.label ?? "-";

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


  // Lifetime tally of the AI guess that was visibly shown at each press.
  // Aggregates across leader changes - counts what the user actually saw, not
  // whichever predictor is currently leading.
  const tally = useMemo(() => {
    let right = 0;
    for (const t of scoredTrials) {
      if (t.shownGuess === t.symbol) right += 1;
    }
    return { right, total: scoredTrials.length };
  }, [scoredTrials]);

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
    return predictors.find((predictor) => predictor.meta.id === leaderId)?.inspect(trials.map((trial) => trial.symbol)) ?? null;
  }, [trials, predictors, leaderId]);

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
  const chance = 1 / alphabet;
  const chanceName = alphabet === 2 ? "Coin flip" : "Random guess";
  const enoughForVerdict = tally.total >= WARMUP_TRIALS;
  const beatsChance = enoughForVerdict && chanceOfAtLeast(tally.right, tally.total, chance) < CLEAR_P;
  const verdict = !enoughForVerdict
    ? `After ${WARMUP_TRIALS} presses this says whether the AI beats chance.`
    : beatsChance
      ? "Clearly better than chance. The AI has found a pattern in your presses."
      : "Not clearly better than chance. So far you look unpredictable.";
  const hitSeries = useMemo(() => scoredTrials.map((trial) => trial.shownGuess === trial.symbol), [scoredTrials]);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Segmented
          label="Number of keys"
          options={[
            { value: "2", label: "2 keys" },
            { value: "4", label: "4 keys" },
          ]}
          value={String(alphabet) as "2" | "4"}
          onChange={(value) => setAlphabet(value === "4" ? 4 : 2)}
        />
        <Segmented
          label="AI guess"
          options={[
            { value: "hidden", label: "AI guess hidden" },
            { value: "shown", label: "AI guess shown" },
          ]}
          value={showHint ? "shown" : "hidden"}
          onChange={(value) => setShowHint(value === "shown")}
        />
        <Button size="sm" variant="ghost" onClick={handleReset} disabled={trials.length === 0}>
          Reset
        </Button>
        <span className="ml-auto font-mono text-[0.7rem] uppercase tracking-[0.08em] tabular-nums text-[var(--sub)]">
          {trials.length} / {SESSION_TARGET} presses
        </span>
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)]">
        <div className="min-w-0">
          <ArenaDiscrete
            symbolLabels={symbolLabels}
            keyMap={keyMap}
            predictedNext={predictedNext}
            showPrediction={showHint}
            lastResult={lastResult}
            disabled={sessionDone}
            onPress={handlePress}
          />
          <div className="mt-4" aria-live="polite">
            <p className="text-2xl font-semibold sm:text-3xl">
              {tally.total === 0 ? (
                "Your move"
              ) : (
                <>
                  The AI guessed <span className="tabular-nums">{tally.right}</span> of your{" "}
                  <span className="tabular-nums">{tally.total}</span> presses
                </>
              )}
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {tally.total === 0
                ? `A ${chanceName.toLowerCase()} would guess ${alphabet === 2 ? "half" : "a quarter"} of your presses. Can the AI do better?`
                : `${chanceName}: about ${Math.round(tally.total * chance)}. ${
                    showHint ? "The guess is shown, so dodging it is easy and this is not a fair test." : verdict
                  }`}
            </p>
            {sessionDone ? <p className="mt-2 text-sm">{SESSION_TARGET} presses done. Reset to play again.</p> : null}
          </div>
        </div>

        <div className="min-w-0">
          <AccuracyChart hits={hitSeries} chance={chance} chanceLabel={chanceName} />
          <p className="mt-3 text-sm text-[var(--muted)]">
            {leaderId ? (
              <>
                Guessing with <span className="font-mono text-[var(--foreground)]">{leaderLabel}</span>, the best of{" "}
                {predictors.length} predictors over your last {SCORE_WINDOW} presses.
              </>
            ) : (
              `${predictors.length} predictors compete. The best one takes over after ${WARMUP_TRIALS} presses.`
            )}
          </p>
          <Details summary="How it reads you" className="mt-4">
            <div className="space-y-6">
              <WhyPanelDiscrete why={whyData} symbolLabels={symbolLabels} predictorLabel={leaderLabel} />
              <Leaderboard rows={leaderboardRows} window={SCORE_WINDOW} />
              <EntropyPlot series={entropySeries} max={Math.log2(alphabet)} label="Your randomness, bigram entropy" unit="bits" />
              <p className="text-xs">
                Scores count only presses made with the current guess setting. &quot;Clearly better than chance&quot; means pure
                guessing would score this high less than {CLEAR_P * 100}% of the time (one-sided binomial test). The bigram entropy
                is lower when your next press depends on your last one.
              </p>
            </div>
          </Details>
        </div>
      </div>
    </>
  );
}
