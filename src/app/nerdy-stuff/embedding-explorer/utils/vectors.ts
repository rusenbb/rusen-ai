// Simple vector operations for embedding visualization

import type { EmbeddingCache } from "../types";

// Add two vectors
export function add(a: number[], b: number[]): number[] {
  return a.map((v, i) => v + b[i]);
}

// Subtract vectors: a - b
export function subtract(a: number[], b: number[]): number[] {
  return a.map((v, i) => v - b[i]);
}

// Normalize vector to unit length
export function normalize(v: number[]): number[] {
  const magnitude = Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
  if (magnitude === 0) return v;
  return v.map((x) => x / magnitude);
}

// Dot product
export function dot(a: number[], b: number[]): number {
  return a.reduce((sum, v, i) => sum + v * b[i], 0);
}

// Cosine similarity
export function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = dot(a, b);
  const magnitudeA = Math.sqrt(dot(a, a));
  const magnitudeB = Math.sqrt(dot(b, b));
  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  return dotProduct / (magnitudeA * magnitudeB);
}

// Compute axis vector from positive - negative
export function computeAxis(
  cache: EmbeddingCache,
  positive: string,
  negative: string
): number[] | null {
  const posVec = cache.get(positive.toLowerCase());
  const negVec = cache.get(negative.toLowerCase());
  if (!posVec || !negVec) return null;
  return normalize(subtract(posVec, negVec));
}

// Project vector onto axis (returns scalar)
export function project(vector: number[], axis: number[]): number {
  return dot(vector, axis);
}

// Vector arithmetic: a - b + c
export function arithmetic(a: number[], b: number[], c: number[]): number[] {
  return add(subtract(a, b), c);
}

// Find k nearest neighbors by cosine similarity
export function findNearest(
  query: number[],
  cache: EmbeddingCache,
  k: number = 10,
  exclude: Set<string> = new Set()
): { word: string; similarity: number }[] {
  const results: { word: string; similarity: number }[] = [];

  cache.forEach((vector, word) => {
    if (exclude.has(word)) return;
    const sim = cosineSimilarity(query, vector);
    results.push({ word, similarity: sim });
  });

  return results.sort((a, b) => b.similarity - a.similarity).slice(0, k);
}

// Project all words onto 2D space defined by x and y axes
export function projectTo2D(
  words: string[],
  cache: EmbeddingCache,
  xAxis: number[],
  yAxis: number[]
): { word: string; x: number; y: number }[] {
  const points: { word: string; x: number; y: number }[] = [];

  for (const word of words) {
    const vector = cache.get(word.toLowerCase());
    if (!vector) continue;

    points.push({
      word,
      x: project(vector, xAxis),
      y: project(vector, yAxis),
    });
  }

  return points;
}

// Normalize points to [-1, 1] range for visualization
export function normalizePoints(
  points: { word: string; x: number; y: number }[]
): { word: string; x: number; y: number }[] {
  if (points.length === 0) return [];

  const xValues = points.map((p) => p.x);
  const yValues = points.map((p) => p.y);

  const xMin = Math.min(...xValues);
  const xMax = Math.max(...xValues);
  const yMin = Math.min(...yValues);
  const yMax = Math.max(...yValues);

  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;

  return points.map((p) => ({
    word: p.word,
    x: ((p.x - xMin) / xRange) * 2 - 1,
    y: ((p.y - yMin) / yRange) * 2 - 1,
  }));
}
