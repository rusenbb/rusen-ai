import type {
  DiscretePrediction,
  DiscreteSymbol,
  DiscreteTrial,
} from "./modes";

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

export function emptyDiscretePrediction(alphabet: number): DiscretePrediction {
  return {
    pmf: Array.from({ length: alphabet }, () => 1 / alphabet),
    argmax: 0,
  };
}

export function lastSymbol(trials: DiscreteTrial[]): DiscreteSymbol | null {
  return trials.length === 0 ? null : trials[trials.length - 1].symbol;
}
