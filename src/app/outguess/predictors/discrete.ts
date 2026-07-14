import type { DiscretePrediction, DiscreteSymbol, PredictorMeta } from "../modes";

export interface DiscretePredictor {
  meta: PredictorMeta;
  predict: (history: DiscreteSymbol[]) => DiscretePrediction;
  observe: (history: DiscreteSymbol[], next: DiscreteSymbol) => void;
  reset: () => void;
}

const argmax = (pmf: number[]): number => {
  let best = 0;
  for (let i = 1; i < pmf.length; i++) if (pmf[i] > pmf[best]) best = i;
  return best;
};

const uniform = (alphabet: number): number[] =>
  Array.from({ length: alphabet }, () => 1 / alphabet);

const randomSeed = (): number => Math.floor(Math.random() * 0x1_0000_0000);

// Generate a reproducible pseudo-random value for a trial. predict() is used
// both to paint the arena and to snapshot a scored prediction, so it must give
// the same answer for the same point in a session.
const randomUnitForTrial = (seed: number, trial: number): number => {
  let state = (seed + Math.imul(trial + 1, 0x6d2b79f5)) >>> 0;
  state = Math.imul(state ^ (state >>> 15), state | 1);
  state ^= state + Math.imul(state ^ (state >>> 7), state | 61);
  return ((state ^ (state >>> 14)) >>> 0) / 0x1_0000_0000;
};

export function makeRandomPredictor(alphabet: number): DiscretePredictor {
  let seed = randomSeed();

  return {
    meta: { id: "random", label: "Random", blurb: "Coin flip baseline." },
    predict: (history) => {
      const pmf = uniform(alphabet);
      return {
        pmf,
        argmax: Math.min(
          alphabet - 1,
          Math.floor(randomUnitForTrial(seed, history.length) * alphabet),
        ),
      };
    },
    observe: () => {},
    reset: () => {
      seed = randomSeed();
    },
  };
}

export function makeFrequencyPredictor(alphabet: number): DiscretePredictor {
  let counts = new Array(alphabet).fill(1);
  let total = alphabet;
  return {
    meta: {
      id: "frequency",
      label: "Frequency",
      blurb: "Bets on the most-common symbol so far.",
    },
    predict: () => {
      const pmf = counts.map((c) => c / total);
      return { pmf, argmax: argmax(pmf) };
    },
    observe: (_h, next) => {
      counts[next] += 1;
      total += 1;
    },
    reset: () => {
      counts = new Array(alphabet).fill(1);
      total = alphabet;
    },
  };
}

export function makeMarkovPredictor(
  alphabet: number,
  order: number,
): DiscretePredictor {
  const table = new Map<string, number[]>();
  const ctxKey = (h: DiscreteSymbol[]) =>
    h.slice(Math.max(0, h.length - order)).join(",");

  return {
    meta: {
      id: `markov-${order}`,
      label: `Markov-${order}`,
      blurb:
        order === 1
          ? "Looks at your last symbol to guess the next."
          : `Looks at your last ${order} symbols.`,
    },
    predict: (history) => {
      const key = ctxKey(history);
      const counts = table.get(key);
      if (!counts) return { pmf: uniform(alphabet), argmax: 0 };
      const sum = counts.reduce((a, b) => a + b, 0);
      const pmf = counts.map((c) => (c + 0.5) / (sum + 0.5 * alphabet));
      return { pmf, argmax: argmax(pmf) };
    },
    observe: (history, next) => {
      const key = ctxKey(history);
      let counts = table.get(key);
      if (!counts) {
        counts = new Array(alphabet).fill(0);
        table.set(key, counts);
      }
      counts[next] += 1;
    },
    reset: () => table.clear(),
  };
}

export function makePPMPredictor(
  alphabet: number,
  maxOrder: number,
): DiscretePredictor {
  const tables: Map<string, number[]>[] = Array.from(
    { length: maxOrder + 1 },
    () => new Map<string, number[]>(),
  );

  const ctx = (h: DiscreteSymbol[], o: number): string =>
    o === 0 ? "" : h.slice(Math.max(0, h.length - o)).join(",");

  return {
    meta: {
      id: `ppm-${maxOrder}`,
      label: `PPM-${maxOrder}`,
      blurb: `Prediction by Partial Matching, max order ${maxOrder} with escape blending.`,
    },
    predict: (history) => {
      const blended = new Array(alphabet).fill(0);
      let escapeProb = 1;
      const seen = new Set<number>();

      for (let o = Math.min(maxOrder, history.length); o >= 0; o--) {
        const counts = tables[o].get(ctx(history, o));
        if (!counts) continue;
        const novel: number[] = [];
        for (let s = 0; s < alphabet; s++) if (counts[s] > 0) novel.push(s);
        if (novel.length === 0) continue;

        const totalSeen = novel.reduce((a, s) => a + counts[s], 0);
        const novelHere = novel.filter((s) => !seen.has(s));
        const denom = totalSeen + novelHere.length;

        for (const s of novelHere) {
          if (seen.has(s)) continue;
          blended[s] += escapeProb * (counts[s] / denom);
          seen.add(s);
        }
        const escape = novelHere.length / denom;
        escapeProb *= escape;
        if (escapeProb <= 0) break;
      }

      const remaining = alphabet - seen.size;
      if (remaining > 0 && escapeProb > 0) {
        for (let s = 0; s < alphabet; s++) {
          if (!seen.has(s)) blended[s] += escapeProb / remaining;
        }
      }

      const sum = blended.reduce((a, b) => a + b, 0) || 1;
      const pmf = blended.map((p) => p / sum);
      return { pmf, argmax: argmax(pmf) };
    },
    observe: (history, next) => {
      for (let o = 0; o <= Math.min(maxOrder, history.length); o++) {
        const key = ctx(history, o);
        let counts = tables[o].get(key);
        if (!counts) {
          counts = new Array(alphabet).fill(0);
          tables[o].set(key, counts);
        }
        counts[next] += 1;
      }
    },
    reset: () => {
      for (const t of tables) t.clear();
    },
  };
}

export function makeAllDiscretePredictors(alphabet: number): DiscretePredictor[] {
  return [
    makeRandomPredictor(alphabet),
    makeFrequencyPredictor(alphabet),
    makeMarkovPredictor(alphabet, 1),
    makeMarkovPredictor(alphabet, 5),
    makePPMPredictor(alphabet, 8),
  ];
}
