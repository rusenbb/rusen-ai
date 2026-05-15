import type { DiscreteSymbol } from "./modes";

export function shannonEntropy(
  symbols: DiscreteSymbol[],
  alphabet: number,
  windowSize = 50,
): number {
  const slice = symbols.slice(-windowSize);
  if (slice.length === 0) return 0;
  const counts = new Array(alphabet).fill(0);
  for (const s of slice) counts[s] += 1;
  const n = slice.length;
  let h = 0;
  for (const c of counts) {
    if (c === 0) continue;
    const p = c / n;
    h -= p * Math.log2(p);
  }
  return h;
}

export function bigramEntropy(
  symbols: DiscreteSymbol[],
  alphabet: number,
  windowSize = 80,
): number {
  const slice = symbols.slice(-windowSize);
  if (slice.length < 2) return 0;
  const ctxCounts = new Map<DiscreteSymbol, number[]>();
  for (let i = 1; i < slice.length; i++) {
    const ctx = slice[i - 1];
    const next = slice[i];
    let row = ctxCounts.get(ctx);
    if (!row) {
      row = new Array(alphabet).fill(0);
      ctxCounts.set(ctx, row);
    }
    row[next] += 1;
  }
  let h = 0;
  let total = 0;
  for (const [, row] of ctxCounts) {
    const sum = row.reduce((a, b) => a + b, 0);
    let rowH = 0;
    for (const c of row) {
      if (c === 0) continue;
      const p = c / sum;
      rowH -= p * Math.log2(p);
    }
    h += sum * rowH;
    total += sum;
  }
  return total === 0 ? 0 : h / total;
}
