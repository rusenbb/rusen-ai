import type { Glyph, GlyphMap } from "./glyphs";

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

/**
 * Write the '1' cells of `glyph` into `grid` starting at (originCol, originRow).
 * When `scale` > 1, each glyph cell paints a `scale x scale` block of grid cells
 * — useful for making the bloom large enough to compete with the chaos field
 * for visual presence. Cells outside grid bounds are silently skipped (no wrap).
 */
export function stampGlyph(
  grid: Uint8Array,
  cols: number,
  glyph: Glyph,
  originCol: number,
  originRow: number,
  scale: number = 1
): void {
  const w = glyph[0]?.length ?? 0;
  const h = glyph.length;
  for (let r = 0; r < h; r++) {
    const row = glyph[r];
    for (let c = 0; c < w; c++) {
      if (row[c] !== "1") continue;
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const gr = originRow + r * scale + dy;
          const gc = originCol + c * scale + dx;
          if (gr < 0 || gc < 0) continue;
          const idx = gr * cols + gc;
          if (idx >= grid.length) continue;
          grid[idx] = 1;
        }
      }
    }
  }
}

/** Stamp a single glyph centered horizontally and vertically. */
export function stampSingleCentered(
  grid: Uint8Array,
  cols: number,
  rows: number,
  glyph: Glyph,
  scale: number = 1
): void {
  const w = (glyph[0]?.length ?? 0) * scale;
  const h = glyph.length * scale;
  const startCol = Math.floor((cols - w) / 2);
  const startRow = Math.floor((rows - h) / 2);
  stampGlyph(grid, cols, glyph, startCol, startRow, scale);
}

/**
 * Stamp `text` (one glyph per character, looked up in `glyphs`) centered on
 * the grid. Glyphs are placed left-to-right with `gap` empty *glyph-cells*
 * between (so the gap also scales). Vertical centering uses the tallest
 * glyph's height; all glyphs share the same top row.
 */
export function stampText(
  grid: Uint8Array,
  cols: number,
  rows: number,
  text: string,
  glyphs: GlyphMap,
  gap: number = 1,
  scale: number = 1
): void {
  let totalWidth = 0;
  let maxHeight = 0;
  for (const ch of text) {
    const g = glyphs[ch];
    if (!g) continue;
    totalWidth += ((g[0]?.length ?? 0) + gap) * scale;
    if (g.length * scale > maxHeight) maxHeight = g.length * scale;
  }
  if (totalWidth > 0) totalWidth -= gap * scale;

  const startCol = Math.floor((cols - totalWidth) / 2);
  const startRow = Math.floor((rows - maxHeight) / 2);

  let col = startCol;
  for (const ch of text) {
    const g = glyphs[ch];
    if (!g) continue;
    stampGlyph(grid, cols, g, col, startRow, scale);
    col += ((g[0]?.length ?? 0) + gap) * scale;
  }
}
