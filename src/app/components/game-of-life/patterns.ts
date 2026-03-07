// Gosper Glider Gun — the classic pattern that continuously emits gliders
export const GOSPER_GLIDER_GUN: ReadonlyArray<[number, number]> = [
  // Left block
  [0, 4], [0, 5], [1, 4], [1, 5],
  // Left structure
  [10, 4], [10, 5], [10, 6],
  [11, 3], [11, 7],
  [12, 2], [12, 8],
  [13, 2], [13, 8],
  [14, 5],
  [15, 3], [15, 7],
  [16, 4], [16, 5], [16, 6],
  [17, 5],
  // Right structure
  [20, 2], [20, 3], [20, 4],
  [21, 2], [21, 3], [21, 4],
  [22, 1], [22, 5],
  [24, 0], [24, 1], [24, 5], [24, 6],
  // Right block
  [34, 2], [34, 3], [35, 2], [35, 3],
];

// Simple deterministic PRNG (mulberry32)
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateRandomSoup(
  centerX: number,
  centerY: number,
  size: number,
  density: number
): Array<[number, number]> {
  const rng = mulberry32(centerX * 7919 + centerY * 6271);
  const cells: Array<[number, number]> = [];
  const half = Math.floor(size / 2);

  for (let dy = -half; dy <= half; dy++) {
    for (let dx = -half; dx <= half; dx++) {
      if (rng() < density) {
        cells.push([centerX + dx, centerY + dy]);
      }
    }
  }

  return cells;
}

export function createInitialSeed(viewportCenterX: number, viewportCenterY: number): Array<[number, number]> {
  const cells: Array<[number, number]> = [];

  // Glider gun centered in viewport
  const gunOffsetX = viewportCenterX - 17;
  const gunOffsetY = viewportCenterY - 4;
  for (const [x, y] of GOSPER_GLIDER_GUN) {
    cells.push([gunOffsetX + x, gunOffsetY + y]);
  }

  // Random soup patches spread around the viewport
  const soupPositions: Array<[number, number]> = [
    [viewportCenterX - 30, viewportCenterY - 20],
    [viewportCenterX + 25, viewportCenterY + 15],
    [viewportCenterX + 30, viewportCenterY - 18],
    [viewportCenterX - 25, viewportCenterY + 20],
  ];

  for (const [sx, sy] of soupPositions) {
    cells.push(...generateRandomSoup(sx, sy, 6, 0.35));
  }

  return cells;
}
