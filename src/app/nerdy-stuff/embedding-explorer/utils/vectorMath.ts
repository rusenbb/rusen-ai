/**
 * Vector math utilities for semantic axis projections and vector arithmetic.
 *
 * These operations enable:
 * - Defining semantic axes via contrastive word pairs
 * - Projecting embeddings onto user-defined axes
 * - Performing vector arithmetic (A - B + C)
 */

/**
 * Add two vectors element-wise.
 */
export function addVectors(a: number[], b: number[]): number[] {
  const result = new Array(a.length);
  for (let i = 0; i < a.length; i++) {
    result[i] = a[i] + b[i];
  }
  return result;
}

/**
 * Subtract vector b from vector a element-wise.
 */
export function subtractVectors(a: number[], b: number[]): number[] {
  const result = new Array(a.length);
  for (let i = 0; i < a.length; i++) {
    result[i] = a[i] - b[i];
  }
  return result;
}

/**
 * Multiply vector by scalar.
 */
export function scaleVector(v: number[], scalar: number): number[] {
  const result = new Array(v.length);
  for (let i = 0; i < v.length; i++) {
    result[i] = v[i] * scalar;
  }
  return result;
}

/**
 * Compute dot product of two vectors.
 */
export function dotProduct(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

/**
 * Compute L2 norm (magnitude) of a vector.
 */
export function vectorNorm(v: number[]): number {
  let sumSquares = 0;
  for (let i = 0; i < v.length; i++) {
    sumSquares += v[i] * v[i];
  }
  return Math.sqrt(sumSquares);
}

/**
 * Normalize vector to unit length.
 * Returns zero vector if input has zero norm.
 */
export function normalizeVector(v: number[]): number[] {
  const norm = vectorNorm(v);
  if (norm === 0) {
    return new Array(v.length).fill(0);
  }
  return scaleVector(v, 1 / norm);
}

/**
 * Compute cosine similarity between two vectors.
 * Returns value in [-1, 1] range.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  const normA = vectorNorm(a);
  const normB = vectorNorm(b);
  if (normA === 0 || normB === 0) {
    return 0;
  }
  return dotProduct(a, b) / (normA * normB);
}

/**
 * Compute centroid (mean) of multiple vectors.
 */
export function computeCentroid(vectors: number[][]): number[] {
  if (vectors.length === 0) {
    return [];
  }
  const dim = vectors[0].length;
  const centroid = new Array(dim).fill(0);

  for (const v of vectors) {
    for (let i = 0; i < dim; i++) {
      centroid[i] += v[i];
    }
  }

  const n = vectors.length;
  for (let i = 0; i < dim; i++) {
    centroid[i] /= n;
  }

  return centroid;
}

/**
 * Compute a semantic axis vector from positive and negative example embeddings.
 *
 * The axis is defined as: normalized(centroid(positive) - centroid(negative))
 *
 * This creates a direction in embedding space that points from negative concepts
 * toward positive concepts. For example, for a "gender" axis:
 * - positive: embeddings of ["woman", "girl", "mother", ...]
 * - negative: embeddings of ["man", "boy", "father", ...]
 * - result: a direction where positive values = more "female", negative = more "male"
 */
export function computeAxisVector(
  positiveEmbeddings: number[][],
  negativeEmbeddings: number[][]
): { positiveCentroid: number[]; negativeCentroid: number[]; axisVector: number[] } {
  const positiveCentroid = computeCentroid(positiveEmbeddings);
  const negativeCentroid = computeCentroid(negativeEmbeddings);
  const diff = subtractVectors(positiveCentroid, negativeCentroid);
  const axisVector = normalizeVector(diff);

  return {
    positiveCentroid,
    negativeCentroid,
    axisVector,
  };
}

/**
 * Project an embedding onto a semantic axis.
 *
 * Returns a scalar value representing where the embedding falls along the axis.
 * Positive values = closer to positive pole, negative = closer to negative pole.
 *
 * The projection is computed as: dot(embedding, axisVector)
 * Since axisVector is normalized, this gives the signed distance along the axis.
 */
export function projectOntoAxis(embedding: number[], axisVector: number[]): number {
  return dotProduct(embedding, axisVector);
}

/**
 * Project all embeddings onto three semantic axes, producing 3D coordinates.
 *
 * Returns normalized coordinates in [-1, 1] range for visualization.
 */
export function projectToSemanticAxes(
  embeddings: { id: string; embedding: number[] }[],
  xAxis: number[] | null,
  yAxis: number[] | null,
  zAxis: number[] | null
): Map<string, { x: number; y: number; z: number }> {
  const projections = new Map<string, { x: number; y: number; z: number }>();

  if (embeddings.length === 0) {
    return projections;
  }

  // Project all embeddings onto each axis
  const rawProjections: { id: string; x: number; y: number; z: number }[] = [];

  for (const { id, embedding } of embeddings) {
    const x = xAxis ? projectOntoAxis(embedding, xAxis) : 0;
    const y = yAxis ? projectOntoAxis(embedding, yAxis) : 0;
    const z = zAxis ? projectOntoAxis(embedding, zAxis) : 0;
    rawProjections.push({ id, x, y, z });
  }

  // Find min/max for normalization
  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;
  let minZ = Infinity,
    maxZ = -Infinity;

  for (const p of rawProjections) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
    minZ = Math.min(minZ, p.z);
    maxZ = Math.max(maxZ, p.z);
  }

  // Use uniform scaling to preserve relative distances
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const rangeZ = maxZ - minZ || 1;
  const maxRange = Math.max(rangeX, rangeY, rangeZ);

  // Normalize to [-1, 1] with uniform scaling
  for (const p of rawProjections) {
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const centerZ = (minZ + maxZ) / 2;

    projections.set(p.id, {
      x: ((p.x - centerX) / maxRange) * 2,
      y: ((p.y - centerY) / maxRange) * 2,
      z: ((p.z - centerZ) / maxRange) * 2,
    });
  }

  return projections;
}

/**
 * Project a single embedding onto semantic axes (for arithmetic results).
 * Uses the same normalization parameters as a reference set.
 */
export function projectSingleToSemanticAxes(
  embedding: number[],
  xAxis: number[] | null,
  yAxis: number[] | null,
  zAxis: number[] | null,
  normalization: {
    centerX: number;
    centerY: number;
    centerZ: number;
    maxRange: number;
  }
): { x: number; y: number; z: number } {
  const rawX = xAxis ? projectOntoAxis(embedding, xAxis) : 0;
  const rawY = yAxis ? projectOntoAxis(embedding, yAxis) : 0;
  const rawZ = zAxis ? projectOntoAxis(embedding, zAxis) : 0;

  return {
    x: ((rawX - normalization.centerX) / normalization.maxRange) * 2,
    y: ((rawY - normalization.centerY) / normalization.maxRange) * 2,
    z: ((rawZ - normalization.centerZ) / normalization.maxRange) * 2,
  };
}

/**
 * Compute normalization parameters from a set of embeddings and axes.
 * Used to project new points (like arithmetic results) into the same space.
 */
export function computeNormalizationParams(
  embeddings: { embedding: number[] }[],
  xAxis: number[] | null,
  yAxis: number[] | null,
  zAxis: number[] | null
): { centerX: number; centerY: number; centerZ: number; maxRange: number } {
  if (embeddings.length === 0) {
    return { centerX: 0, centerY: 0, centerZ: 0, maxRange: 1 };
  }

  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;
  let minZ = Infinity,
    maxZ = -Infinity;

  for (const { embedding } of embeddings) {
    const x = xAxis ? projectOntoAxis(embedding, xAxis) : 0;
    const y = yAxis ? projectOntoAxis(embedding, yAxis) : 0;
    const z = zAxis ? projectOntoAxis(embedding, zAxis) : 0;

    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  }

  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const rangeZ = maxZ - minZ || 1;

  return {
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    centerZ: (minZ + maxZ) / 2,
    maxRange: Math.max(rangeX, rangeY, rangeZ),
  };
}

/**
 * Perform vector arithmetic: A - B + C
 *
 * This is the classic word embedding analogy operation.
 * Example: king - man + woman ≈ queen
 *
 * The idea: subtract one concept, add another, find what's similar.
 */
export function vectorArithmetic(a: number[], b: number[], c: number[]): number[] {
  // A - B + C
  const diff = subtractVectors(a, b);
  return addVectors(diff, c);
}

/**
 * Find k nearest neighbors to a query embedding by cosine similarity.
 */
export function findNearestNeighbors(
  queryEmbedding: number[],
  candidates: { text: string; embedding: number[] }[],
  k: number
): { text: string; similarity: number }[] {
  const similarities = candidates.map((c) => ({
    text: c.text,
    similarity: cosineSimilarity(queryEmbedding, c.embedding),
  }));

  // Sort by similarity descending
  similarities.sort((a, b) => b.similarity - a.similarity);

  // Return top k
  return similarities.slice(0, k);
}
