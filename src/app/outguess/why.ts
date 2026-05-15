import type { DiscreteSymbol, DiscreteTrial } from "./modes";

export type DiscreteWhy = {
  context: DiscreteSymbol[];
  counts: number[];
  total: number;
};

export function discreteWhy(
  trials: DiscreteTrial[],
  order: number,
  alphabet: number,
): DiscreteWhy | null {
  if (trials.length < order) return null;
  const symbols = trials.map((t) => t.symbol);
  const context = symbols.slice(symbols.length - order);
  const counts = new Array(alphabet).fill(0);
  let total = 0;
  for (let i = order; i < symbols.length; i++) {
    let match = true;
    for (let j = 0; j < order; j++) {
      if (symbols[i - order + j] !== context[j]) {
        match = false;
        break;
      }
    }
    if (match) {
      counts[symbols[i]] += 1;
      total += 1;
    }
  }
  if (total === 0) return null;
  return { context, counts, total };
}
