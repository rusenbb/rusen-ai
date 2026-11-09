import type { DiscreteTrial } from "./modes";

export type DiscreteScore = {
  hits: number;
  trials: number;
  accuracy: number;
  bitsSaved: number;
};

export function scoreDiscrete(
  trials: DiscreteTrial[],
  predictorId: string,
  alphabet: number,
  windowSize = 50,
): DiscreteScore {
  const slice = trials.slice(-windowSize);
  let hits = 0;
  let bits = 0;
  const baseline = -Math.log2(1 / alphabet);
  for (const trial of slice) {
    const pred = trial.predictions[predictorId];
    if (!pred) continue;
    if (pred.argmax === trial.symbol) hits += 1;
    const p = Math.max(pred.pmf[trial.symbol], 1e-9);
    bits += baseline + Math.log2(p);
  }
  const trials_ = slice.length;
  return {
    hits,
    trials: trials_,
    accuracy: trials_ === 0 ? 0 : hits / trials_,
    bitsSaved: trials_ === 0 ? 0 : bits / trials_,
  };
}

/**
 * One-sided binomial tail: the chance that pure guessing (hit rate `p`) gets at least `hits`
 * right out of `trials`. Small values mean the AI is beating chance.
 */
export function chanceOfAtLeast(hits: number, trials: number, p: number): number {
  if (hits <= 0) return 1;
  if (hits > trials) return 0;
  let term = Math.pow(1 - p, trials);
  let tail = 0;
  for (let i = 0; i <= trials; i++) {
    if (i >= hits) tail += term;
    term *= ((trials - i) / (i + 1)) * (p / (1 - p));
  }
  return Math.min(1, tail);
}
