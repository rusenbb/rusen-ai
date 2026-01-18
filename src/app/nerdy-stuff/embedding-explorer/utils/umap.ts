import { UMAP } from "umap-js";

export interface ProjectionResult {
  id: string;
  x: number;
  y: number;
}

// UMAP configuration for semantic embedding visualization
const UMAP_CONFIG = {
  nNeighbors: 15, // Balance between local and global structure
  minDist: 0.1, // How tightly to pack points (lower = tighter clusters)
  nComponents: 2, // Output dimensions
  spread: 1.0, // Effective scale of embedded points
};

/**
 * Reduce high-dimensional embeddings to 2D using UMAP
 *
 * UMAP (Uniform Manifold Approximation and Projection) preserves both
 * local neighborhood structure and global topology better than t-SNE,
 * making it ideal for visualizing semantic clusters.
 */
export async function reduceToTwoDimensions(
  embeddings: { id: string; embedding: number[] }[]
): Promise<ProjectionResult[]> {
  if (embeddings.length < 2) {
    // Can't run UMAP with less than 2 points
    // Return dummy positions for single point
    return embeddings.map((e, i) => ({
      id: e.id,
      x: i * 0.1,
      y: 0,
    }));
  }

  // Adjust nNeighbors if we have fewer points
  const nNeighbors = Math.min(UMAP_CONFIG.nNeighbors, embeddings.length - 1);

  const umap = new UMAP({
    nNeighbors,
    minDist: UMAP_CONFIG.minDist,
    nComponents: UMAP_CONFIG.nComponents,
    spread: UMAP_CONFIG.spread,
  });

  // Extract just the embedding vectors
  const vectors = embeddings.map((e) => e.embedding);

  // Run UMAP - this returns [nSamples, 2] array
  const projections = umap.fit(vectors);

  // Normalize to [-1, 1] range for easier canvas rendering
  const normalized = normalizeProjections(projections);

  // Map back to IDs
  return embeddings.map((e, i) => ({
    id: e.id,
    x: normalized[i][0],
    y: normalized[i][1],
  }));
}

/**
 * Normalize 2D projections to [-1, 1] range
 */
function normalizeProjections(projections: number[][]): number[][] {
  if (projections.length === 0) return [];

  // Find min/max for each dimension
  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;

  for (const [x, y] of projections) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }

  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  // Use same scale for both axes to preserve aspect ratio
  const maxRange = Math.max(rangeX, rangeY);

  return projections.map(([x, y]) => [
    ((x - minX) / maxRange) * 2 - 1,
    ((y - minY) / maxRange) * 2 - 1,
  ]);
}

/**
 * Add a new point to existing projections using nearest neighbor interpolation
 * This is a fast approximation - for accurate results, re-run full UMAP
 */
export function approximateProjection(
  newEmbedding: number[],
  existingEmbeddings: { embedding: number[]; x: number; y: number }[],
  k: number = 5
): { x: number; y: number } {
  if (existingEmbeddings.length === 0) {
    return { x: 0, y: 0 };
  }

  // Find k nearest neighbors by cosine similarity
  const similarities = existingEmbeddings.map((e) => ({
    ...e,
    similarity: cosineSimilarity(newEmbedding, e.embedding),
  }));

  similarities.sort((a, b) => b.similarity - a.similarity);
  const neighbors = similarities.slice(0, Math.min(k, similarities.length));

  // Weighted average of neighbor positions
  let totalWeight = 0;
  let x = 0;
  let y = 0;

  for (const neighbor of neighbors) {
    const weight = Math.max(0, neighbor.similarity);
    x += neighbor.x * weight;
    y += neighbor.y * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) {
    // Fallback: center of neighbors
    return {
      x: neighbors.reduce((sum, n) => sum + n.x, 0) / neighbors.length,
      y: neighbors.reduce((sum, n) => sum + n.y, 0) / neighbors.length,
    };
  }

  return {
    x: x / totalWeight,
    y: y / totalWeight,
  };
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
