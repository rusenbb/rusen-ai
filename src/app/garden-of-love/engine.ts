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
