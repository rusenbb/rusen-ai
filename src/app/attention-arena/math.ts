export type MemoryColor = "red" | "blue";
export type MemoryShape = "circle" | "square";

export interface AttributeQuery {
  color: MemoryColor;
  shape: MemoryShape;
}

export interface MemoryCard extends AttributeQuery {
  id: string;
  value: number;
}

export interface AttentionLookup {
  query: AttributeQuery;
  queryVector: readonly number[];
  scores: number[];
  weights: number[];
  contributions: number[];
  output: number;
}

export const MEMORY_CARDS: readonly MemoryCard[] = [
  { id: "red-circle", color: "red", shape: "circle", value: 8 },
  { id: "red-square", color: "red", shape: "square", value: 2 },
  { id: "blue-circle", color: "blue", shape: "circle", value: 6 },
  { id: "blue-square", color: "blue", shape: "square", value: 4 },
];

export function encodeAttributes(attributes: AttributeQuery): readonly [number, number, number, number] {
  return [
    attributes.color === "red" ? 1 : 0,
    attributes.color === "blue" ? 1 : 0,
    attributes.shape === "circle" ? 1 : 0,
    attributes.shape === "square" ? 1 : 0,
  ];
}

export function dot(left: readonly number[], right: readonly number[]): number {
  return left.reduce((sum, value, index) => sum + value * (right[index] ?? 0), 0);
}

export function softmax(scores: readonly number[], focus: number): number[] {
  const safeFocus = Math.max(focus, 0.01);
  const scaled = scores.map((score) => score * safeFocus);
  const maximum = Math.max(...scaled);
  const exponentials = scaled.map((score) => Math.exp(score - maximum));
  const total = exponentials.reduce((sum, value) => sum + value, 0);
  return exponentials.map((value) => value / total);
}

/**
 * A transparent content-addressed lookup. The four binary attributes play the
 * role of toy query/key vectors; the card number is its value payload.
 */
export function computeAttentionLookup(
  query: AttributeQuery,
  focus: number,
  cards: readonly MemoryCard[] = MEMORY_CARDS,
): AttentionLookup {
  const queryVector = encodeAttributes(query);
  const scores = cards.map((card) => dot(queryVector, encodeAttributes(card)));
  const weights = softmax(scores, focus);
  const contributions = weights.map((weight, index) => weight * cards[index].value);
  const output = contributions.reduce((sum, value) => sum + value, 0);
  return { query, queryVector, scores, weights, contributions, output };
}
