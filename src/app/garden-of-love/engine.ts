/**
 * Advance the grid by one Conway generation (B3/S23, toroidal edges).
 * Reads from `current`, writes into `next`. Both must be the same length.
 */
export function step(
  current: Uint8Array,
  next: Uint8Array,
  cols: number,
  rows: number
): void {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let n = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const rr = (r + dr + rows) % rows;
          const cc = (c + dc + cols) % cols;
          n += current[rr * cols + cc];
        }
      }
      const i = r * cols + c;
      const alive = current[i];
      next[i] = alive ? (n === 2 || n === 3 ? 1 : 0) : n === 3 ? 1 : 0;
    }
  }
}

/** Set every cell in the grid to 0. */
export function clearGrid(grid: Uint8Array): void {
  grid.fill(0);
}

/**
 * Fill the grid with random live cells at the given density (0..1).
 * RNG is injectable for deterministic tests.
 */
export function seedRandom(
  grid: Uint8Array,
  density: number,
  rng: () => number = Math.random
): void {
  for (let i = 0; i < grid.length; i++) {
    grid[i] = rng() < density ? 1 : 0;
  }
}
