// Simple types for the word2viz-style embedding explorer

// A word with its embedding (computed on-demand via transformer model)
export interface Word {
  text: string;
  vector: number[];
}

// Embedding cache - maps text to embedding vector
export type EmbeddingCache = Map<string, number[]>;

// Point in the 2D visualization
export interface Point {
  word: string;
  x: number;
  y: number;
  isHighlighted?: boolean;
  isArithmeticResult?: boolean;
}

// Axis defined by word difference
export interface Axis {
  positive: string; // e.g., "woman"
  negative: string; // e.g., "man"
  vector: number[] | null;
}

// Vector arithmetic result
export interface ArithmeticResult {
  a: string;
  b: string;
  c: string;
  result: number[];
  nearest: { word: string; similarity: number }[];
}

// Simple color palette for visualization
export const COLORS = {
  default: "#6366f1",
  highlighted: "#f59e0b",
  arithmeticResult: "#ef4444",
  axis: "#10b981",
};
