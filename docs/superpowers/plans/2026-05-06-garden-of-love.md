# Garden of Love Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a private, hidden page at `rusen.ai/garden-of-love` that runs Conway's Game of Life and cycles forever through three blooms — `RUŞEN`, ❤, `BEYZA` — with the option for the visitor to tap during chaos phases to plant live cells.

**Architecture:** A new self-contained route folder under `src/app/garden-of-love/`. The pure GoL engine and glyph data are extracted into testable modules (`engine.ts`, `glyphs.ts`). The React component `Garden.tsx` wraps the engine with a `<canvas>`, a fixed-cadence tick interval, an RAF render loop, and a phase scheduler. A `Dedication` card is shown first; a `useState` flag swap reveals the garden when the user taps it. Privacy is achieved by three layers: `noindex` metadata, omission from the projects registry, and the absence of links from any other page.

**Tech Stack:** Next.js 16 (App Router, static export), React 19, TypeScript 5.9, Vitest 4 + jsdom, Canvas 2D API. No new dependencies.

**Spec:** [docs/superpowers/specs/2026-05-06-garden-of-love-design.md](../specs/2026-05-06-garden-of-love-design.md) — read first.

---

## File structure

**Create (8 files, all under one new folder):**

| Path | Responsibility |
|------|----------------|
| `src/app/garden-of-love/layout.tsx` | Next.js layout with `noindex,nofollow` metadata |
| `src/app/garden-of-love/page.tsx` | Composes `Dedication + Garden`, manages `entered` state |
| `src/app/garden-of-love/Dedication.tsx` | Opening Turkish dedication card |
| `src/app/garden-of-love/Garden.tsx` | Canvas + tick interval + scheduler integration |
| `src/app/garden-of-love/glyphs.ts` | `GLYPHS` map (R, U, Ş, E, N, B, Y, Z, A, HEART) |
| `src/app/garden-of-love/engine.ts` | Pure functions: `step`, `seedRandom`, `clearGrid`, `stampGlyph`, `stampText`, `stampSingleCentered` |
| `src/app/garden-of-love/__tests__/engine.test.ts` | Conway correctness + glyph stamping tests |
| `src/app/garden-of-love/__tests__/glyphs.test.ts` | Glyph data shape validation |

**Modify:** nothing outside this folder. The projects registry (`src/lib/projects.ts`), site chrome (`src/app/layout.tsx`), and all existing routes remain untouched.

---

## Conventions to follow

- TypeScript strict (already enabled in `tsconfig.json`).
- Path alias `@/` → `./src/*` (defined in `tsconfig.json` and `vitest.config.ts`).
- Vitest with globals enabled — `describe / it / expect` are available without import.
- Test files live next to source under `__tests__/` siblings, matching existing patterns (`src/lib/optimization/__tests__/`, `src/app/embedding-explorer/__tests__/`, etc.).
- Components that use state, effects, refs, browser APIs, or event handlers need `"use client"` at the top of the file. Pure layouts that only export `metadata` do not.
- Commits: short imperative messages matching the repo style (`Add X`, `Fix Y`). No `Co-Authored-By` or AI attribution.

---

## Task 1: Bootstrap the route with a noindex layout

**Goal:** Get a placeholder page serving at `/garden-of-love` with the privacy plumbing already in place. No GoL yet.

**Files:**
- Create: `src/app/garden-of-love/layout.tsx`
- Create: `src/app/garden-of-love/page.tsx`

- [ ] **Step 1: Create the layout with noindex metadata**

Write `src/app/garden-of-love/layout.tsx`:

```tsx
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "·",
  description: "—",
  robots: { index: false, follow: false },
};

export default function GardenOfLoveLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
```

- [ ] **Step 2: Create a placeholder page**

Write `src/app/garden-of-love/page.tsx`:

```tsx
export default function GardenOfLovePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0a0a0f",
        color: "#f9a8d4",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-geist-sans)",
      }}
    >
      <p>Garden of Love — work in progress</p>
    </main>
  );
}
```

- [ ] **Step 3: Smoke test the dev server**

Run: `npm run dev`

Open `http://localhost:3000/garden-of-love` in a browser.

Expected: a dark screen with the pink "Garden of Love — work in progress" text.

Then view source on the page and verify the `<head>` contains:
```html
<meta name="robots" content="noindex,nofollow" />
```

Stop the dev server (Ctrl+C).

- [ ] **Step 4: Commit**

```bash
git add src/app/garden-of-love/layout.tsx src/app/garden-of-love/page.tsx
git commit -m "Bootstrap garden-of-love route with noindex layout"
```

---

## Task 2: Glyph data with shape tests

**Goal:** Define the pixel font for `R U Ş E N B Y Z A HEART`. Validate that every glyph has the expected dimensions.

**Files:**
- Create: `src/app/garden-of-love/glyphs.ts`
- Create: `src/app/garden-of-love/__tests__/glyphs.test.ts`

- [ ] **Step 1: Write failing tests for the glyph map shape**

Write `src/app/garden-of-love/__tests__/glyphs.test.ts`:

```ts
import { GLYPHS } from "../glyphs";

describe("GLYPHS map", () => {
  const REQUIRED = ["R", "U", "Ş", "E", "N", "B", "Y", "Z", "A", "HEART"];

  it.each(REQUIRED)("contains glyph %s", (key) => {
    expect(GLYPHS).toHaveProperty(key);
  });

  it("each letter glyph is 5 cells wide", () => {
    const letters = ["R", "U", "Ş", "E", "N", "B", "Y", "Z", "A"];
    for (const key of letters) {
      const glyph = GLYPHS[key];
      for (const row of glyph) {
        expect(row.length).toBe(5);
      }
    }
  });

  it("most letters are 7 rows tall", () => {
    const sevenRow = ["R", "U", "E", "N", "B", "Y", "Z", "A"];
    for (const key of sevenRow) {
      expect(GLYPHS[key].length).toBe(7);
    }
  });

  it("Ş is 8 rows tall (extra row for cedilla)", () => {
    expect(GLYPHS["Ş"].length).toBe(8);
  });

  it("HEART is 8 wide x 7 tall", () => {
    const h = GLYPHS["HEART"];
    expect(h.length).toBe(7);
    for (const row of h) {
      expect(row.length).toBe(8);
    }
  });

  it("every row uses only '0' and '1' characters", () => {
    for (const key of Object.keys(GLYPHS)) {
      for (const row of GLYPHS[key]) {
        expect(row).toMatch(/^[01]+$/);
      }
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:run -- src/app/garden-of-love/__tests__/glyphs.test.ts`

Expected: tests fail with "Cannot find module '../glyphs'".

- [ ] **Step 3: Create the glyphs module**

Write `src/app/garden-of-love/glyphs.ts`:

```ts
export type Glyph = string[];
export type GlyphMap = Record<string, Glyph>;

export const GLYPHS: GlyphMap = {
  R: [
    "11110",
    "10001",
    "10001",
    "11110",
    "10100",
    "10010",
    "10001",
  ],
  U: [
    "10001",
    "10001",
    "10001",
    "10001",
    "10001",
    "10001",
    "01110",
  ],
  // S with cedilla — 8 rows total (last row is the cedilla cell)
  Ş: [
    "01111",
    "10000",
    "10000",
    "01110",
    "00001",
    "00001",
    "11110",
    "00100",
  ],
  E: [
    "11111",
    "10000",
    "10000",
    "11110",
    "10000",
    "10000",
    "11111",
  ],
  N: [
    "10001",
    "11001",
    "10101",
    "10101",
    "10101",
    "10011",
    "10001",
  ],
  B: [
    "11110",
    "10001",
    "10001",
    "11110",
    "10001",
    "10001",
    "11110",
  ],
  Y: [
    "10001",
    "10001",
    "01010",
    "00100",
    "00100",
    "00100",
    "00100",
  ],
  Z: [
    "11111",
    "00001",
    "00010",
    "00100",
    "01000",
    "10000",
    "11111",
  ],
  A: [
    "01110",
    "10001",
    "10001",
    "11111",
    "10001",
    "10001",
    "10001",
  ],
  HEART: [
    "01100110",
    "11111111",
    "11111111",
    "11111111",
    "01111110",
    "00111100",
    "00011000",
  ],
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:run -- src/app/garden-of-love/__tests__/glyphs.test.ts`

Expected: all 6 test groups pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/garden-of-love/glyphs.ts src/app/garden-of-love/__tests__/glyphs.test.ts
git commit -m "Add pixel-font glyphs for garden of love"
```

---

## Task 3: Pure engine — Conway step + toroidal wrap

**Goal:** Implement `step()` (one Conway generation, B3/S23, toroidal edges) as a pure function. Validate with known patterns.

**Files:**
- Create: `src/app/garden-of-love/engine.ts`
- Create: `src/app/garden-of-love/__tests__/engine.test.ts`

- [ ] **Step 1: Write failing tests for Conway correctness**

Write `src/app/garden-of-love/__tests__/engine.test.ts`:

```ts
import { step } from "../engine";

function makeGrid(rows: string[]): { grid: Uint8Array; cols: number; rows: number } {
  const cols = rows[0].length;
  const grid = new Uint8Array(cols * rows.length);
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < cols; c++) {
      grid[r * cols + c] = rows[r][c] === "1" ? 1 : 0;
    }
  }
  return { grid, cols, rows: rows.length };
}

function toString(grid: Uint8Array, cols: number, rows: number): string {
  const lines: string[] = [];
  for (let r = 0; r < rows; r++) {
    let line = "";
    for (let c = 0; c < cols; c++) line += grid[r * cols + c] ? "1" : "0";
    lines.push(line);
  }
  return lines.join("\n");
}

describe("Conway step", () => {
  it("a block (2x2) is stable", () => {
    const { grid, cols, rows } = makeGrid([
      "00000",
      "00000",
      "00110",
      "00110",
      "00000",
    ]);
    const next = new Uint8Array(grid.length);
    step(grid, next, cols, rows);
    expect(toString(next, cols, rows)).toBe(toString(grid, cols, rows));
  });

  it("a horizontal blinker oscillates to vertical after one step", () => {
    const { grid, cols, rows } = makeGrid([
      "00000",
      "00000",
      "01110",
      "00000",
      "00000",
    ]);
    const next = new Uint8Array(grid.length);
    step(grid, next, cols, rows);
    expect(toString(next, cols, rows)).toBe(
      [
        "00000",
        "00100",
        "00100",
        "00100",
        "00000",
      ].join("\n")
    );
  });

  it("a blinker returns to its original orientation after two steps", () => {
    const { grid, cols, rows } = makeGrid([
      "00000",
      "00000",
      "01110",
      "00000",
      "00000",
    ]);
    const a = new Uint8Array(grid.length);
    const b = new Uint8Array(grid.length);
    step(grid, a, cols, rows);
    step(a, b, cols, rows);
    expect(toString(b, cols, rows)).toBe(toString(grid, cols, rows));
  });

  it("toroidal wrap: a live cell on the right edge can have neighbors on the left edge", () => {
    // A vertical blinker straddling the right edge would die without wrap;
    // with wrap, the three rightmost cells in column 4 should oscillate.
    const { grid, cols, rows } = makeGrid([
      "00001",
      "00001",
      "00001",
      "00000",
      "00000",
    ]);
    const next = new Uint8Array(grid.length);
    step(grid, next, cols, rows);
    // Middle cell stays alive (2 vertical neighbors)
    expect(next[1 * cols + 4]).toBe(1);
    // Top and bottom cells of the blinker die (only 1 neighbor each)
    expect(next[0 * cols + 4]).toBe(0);
    expect(next[2 * cols + 4]).toBe(0);
    // New cells born to the left of the middle (3 neighbors via wrap)
    // Note: with toroidal wrap, cell (1,3) has neighbors (0,4), (1,4), (2,4) = 3 → alive
    expect(next[1 * cols + 3]).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:run -- src/app/garden-of-love/__tests__/engine.test.ts`

Expected: failure with "Cannot find module '../engine'".

- [ ] **Step 3: Implement the step function**

Write `src/app/garden-of-love/engine.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:run -- src/app/garden-of-love/__tests__/engine.test.ts`

Expected: all 4 Conway tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/garden-of-love/engine.ts src/app/garden-of-love/__tests__/engine.test.ts
git commit -m "Add Conway step with toroidal wrap"
```

---

## Task 4: Pure engine — random seed and clear

**Goal:** Add `seedRandom(grid, density, rng?)` and `clearGrid(grid)`. Use injected `rng` for deterministic tests.

**Files:**
- Modify: `src/app/garden-of-love/engine.ts`
- Modify: `src/app/garden-of-love/__tests__/engine.test.ts`

- [ ] **Step 1: Append failing tests**

Append to `src/app/garden-of-love/__tests__/engine.test.ts`:

```ts
import { clearGrid, seedRandom } from "../engine";

describe("clearGrid", () => {
  it("zeroes every cell", () => {
    const grid = new Uint8Array([1, 0, 1, 1, 0]);
    clearGrid(grid);
    expect(Array.from(grid)).toEqual([0, 0, 0, 0, 0]);
  });
});

describe("seedRandom", () => {
  it("respects density via injected RNG: density 1 fills entirely", () => {
    const grid = new Uint8Array(20);
    seedRandom(grid, 1, () => 0); // every rng() < 1 → true
    expect(Array.from(grid).every((c) => c === 1)).toBe(true);
  });

  it("respects density via injected RNG: density 0 leaves grid empty", () => {
    const grid = new Uint8Array(20);
    seedRandom(grid, 0, () => 0); // 0 < 0 is false
    expect(Array.from(grid).every((c) => c === 0)).toBe(true);
  });

  it("density 0.5 with alternating RNG produces alternating cells", () => {
    const grid = new Uint8Array(6);
    let i = 0;
    const rng = () => (i++ % 2 === 0 ? 0 : 0.9);
    seedRandom(grid, 0.5, rng);
    expect(Array.from(grid)).toEqual([1, 0, 1, 0, 1, 0]);
  });
});
```

Update the import at the top of the file from `import { step }` to `import { step, clearGrid, seedRandom }`. (Or add a second import line — pick whichever is cleaner.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:run -- src/app/garden-of-love/__tests__/engine.test.ts`

Expected: failures on the new `clearGrid` and `seedRandom` blocks.

- [ ] **Step 3: Add the implementations**

Append to `src/app/garden-of-love/engine.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:run -- src/app/garden-of-love/__tests__/engine.test.ts`

Expected: all tests pass (Conway + clearGrid + seedRandom).

- [ ] **Step 5: Commit**

```bash
git add src/app/garden-of-love/engine.ts src/app/garden-of-love/__tests__/engine.test.ts
git commit -m "Add seedRandom and clearGrid helpers"
```

---

## Task 5: Pure engine — glyph stamping

**Goal:** Add three stamp functions: `stampGlyph` (raw position), `stampSingleCentered` (one glyph, centered), `stampText` (multi-glyph with gaps, centered).

**Files:**
- Modify: `src/app/garden-of-love/engine.ts`
- Modify: `src/app/garden-of-love/__tests__/engine.test.ts`

- [ ] **Step 1: Append failing tests**

Append to `src/app/garden-of-love/__tests__/engine.test.ts`:

```ts
import { stampGlyph, stampSingleCentered, stampText } from "../engine";
import { GLYPHS } from "../glyphs";

describe("stampGlyph", () => {
  it("writes 1s where the glyph specifies and leaves other cells alone", () => {
    const cols = 6;
    const rows = 3;
    const grid = new Uint8Array(cols * rows);
    grid[0] = 1; // pre-existing cell, must remain
    const glyph = ["010", "101", "010"];
    stampGlyph(grid, cols, glyph, 1, 0);
    // Expected layout (cols=6, rows=3):
    // 1 0 1 0 0 0
    // 0 1 0 1 0 0
    // 0 0 1 0 0 0
    expect(Array.from(grid)).toEqual([
      1, 0, 1, 0, 0, 0,
      0, 1, 0, 1, 0, 0,
      0, 0, 1, 0, 0, 0,
    ]);
  });
});

describe("stampSingleCentered", () => {
  it("centers a 3x3 glyph in a 5x5 grid", () => {
    const cols = 5;
    const rows = 5;
    const grid = new Uint8Array(cols * rows);
    const glyph = ["111", "111", "111"];
    stampSingleCentered(grid, cols, rows, glyph);
    // Centered: startCol=1, startRow=1; the 3x3 block sits in the middle.
    expect(grid[0 * cols + 0]).toBe(0);
    expect(grid[1 * cols + 1]).toBe(1);
    expect(grid[3 * cols + 3]).toBe(1);
    expect(grid[4 * cols + 4]).toBe(0);
  });
});

describe("stampText", () => {
  it("centers RUSEN horizontally and vertically with 1-cell gaps", () => {
    // 5 letters * 5 wide + 4 gaps of 1 = 29 wide
    const cols = 40;
    const rows = 20;
    const grid = new Uint8Array(cols * rows);
    stampText(grid, cols, rows, "RUSEN", GLYPHS);
    // Expected start col: floor((40 - 29) / 2) = 5
    // Expected start row: floor((20 - 7) / 2) = 6
    // R's top-left has cells matching its pattern: row 0 of R is "11110".
    expect(grid[6 * cols + 5]).toBe(1);
    expect(grid[6 * cols + 6]).toBe(1);
    expect(grid[6 * cols + 7]).toBe(1);
    expect(grid[6 * cols + 8]).toBe(1);
    expect(grid[6 * cols + 9]).toBe(0);
  });

  it("handles Ş (8-row glyph) by using its actual height for vertical centering", () => {
    const cols = 30;
    const rows = 20;
    const grid = new Uint8Array(cols * rows);
    stampText(grid, cols, rows, "Ş", GLYPHS);
    // Ş is 5 wide, 8 tall.
    // startRow = floor((20 - 8) / 2) = 6
    // The cedilla cell is at row 7 of the glyph → grid row 13.
    // Ş cedilla pattern row is "00100", so middle cell of row 13 is 1.
    const startCol = Math.floor((cols - 5) / 2);
    expect(grid[13 * cols + (startCol + 2)]).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:run -- src/app/garden-of-love/__tests__/engine.test.ts`

Expected: failures on the new stamp blocks.

- [ ] **Step 3: Add the implementations**

Append to `src/app/garden-of-love/engine.ts`:

```ts
import type { Glyph, GlyphMap } from "./glyphs";

/**
 * Write the '1' cells of `glyph` into `grid` starting at (originCol, originRow).
 * Cells outside the grid bounds are silently skipped (no wrap).
 */
export function stampGlyph(
  grid: Uint8Array,
  cols: number,
  glyph: Glyph,
  originCol: number,
  originRow: number
): void {
  const w = glyph[0]?.length ?? 0;
  const h = glyph.length;
  for (let r = 0; r < h; r++) {
    const row = glyph[r];
    for (let c = 0; c < w; c++) {
      if (row[c] !== "1") continue;
      const gr = originRow + r;
      const gc = originCol + c;
      if (gr < 0 || gc < 0) continue;
      const idx = gr * cols + gc;
      if (idx >= grid.length) continue;
      grid[idx] = 1;
    }
  }
}

/** Stamp a single glyph centered horizontally and vertically. */
export function stampSingleCentered(
  grid: Uint8Array,
  cols: number,
  rows: number,
  glyph: Glyph
): void {
  const w = glyph[0]?.length ?? 0;
  const h = glyph.length;
  const startCol = Math.floor((cols - w) / 2);
  const startRow = Math.floor((rows - h) / 2);
  stampGlyph(grid, cols, glyph, startCol, startRow);
}

/**
 * Stamp `text` (one glyph per character, looked up in `glyphs`) centered on
 * the grid. Glyphs are placed left-to-right with `gap` empty cells between.
 * Vertical centering uses the tallest glyph's height; all glyphs share the
 * same top row.
 */
export function stampText(
  grid: Uint8Array,
  cols: number,
  rows: number,
  text: string,
  glyphs: GlyphMap,
  gap: number = 1
): void {
  let totalWidth = 0;
  let maxHeight = 0;
  for (const ch of text) {
    const g = glyphs[ch];
    if (!g) continue;
    totalWidth += (g[0]?.length ?? 0) + gap;
    if (g.length > maxHeight) maxHeight = g.length;
  }
  if (totalWidth > 0) totalWidth -= gap;

  const startCol = Math.floor((cols - totalWidth) / 2);
  const startRow = Math.floor((rows - maxHeight) / 2);

  let col = startCol;
  for (const ch of text) {
    const g = glyphs[ch];
    if (!g) continue;
    stampGlyph(grid, cols, g, col, startRow);
    col += (g[0]?.length ?? 0) + gap;
  }
}
```

Update the `Glyph` and `GlyphMap` exports in `glyphs.ts` if they aren't already exported as types (they are, per Task 2). The `import type` line above relies on those exports.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:run -- src/app/garden-of-love/__tests__/engine.test.ts`

Expected: all tests pass (Conway + helpers + stamp).

- [ ] **Step 5: Commit**

```bash
git add src/app/garden-of-love/engine.ts src/app/garden-of-love/__tests__/engine.test.ts
git commit -m "Add glyph stamping helpers"
```

---

## Task 6: Garden component skeleton — static stamped frame

**Goal:** Replace the placeholder page with a real `Garden.tsx` that mounts a canvas, computes grid dimensions from the viewport, stamps `RUŞEN` once, and renders. No animation yet — just a single static frame proves the rendering pipeline works.

**Files:**
- Create: `src/app/garden-of-love/Garden.tsx`
- Modify: `src/app/garden-of-love/page.tsx`

- [ ] **Step 1: Write `Garden.tsx` with a static stamped frame**

Write `src/app/garden-of-love/Garden.tsx`:

```tsx
"use client";

import { useEffect, useRef } from "react";
import { clearGrid, stampText } from "./engine";
import { GLYPHS } from "./glyphs";

const BG = "#0a0a0f";
const FG = "#f9a8d4";

function getCellSize(): number {
  if (typeof window === "undefined") return 10;
  return window.innerWidth < 768 ? 8 : 10;
}

export default function Garden() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const cellSize = getCellSize();
    const cols = Math.floor(window.innerWidth / cellSize);
    const rows = Math.floor(window.innerHeight / cellSize);

    canvas.width = cols * cellSize * dpr;
    canvas.height = rows * cellSize * dpr;
    canvas.style.width = `${cols * cellSize}px`;
    canvas.style.height = `${rows * cellSize}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const grid = new Uint8Array(cols * rows);
    clearGrid(grid);
    stampText(grid, cols, rows, "RUŞEN", GLYPHS);

    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, cols * cellSize, rows * cellSize);

    ctx.fillStyle = FG;
    ctx.shadowColor = FG;
    ctx.shadowBlur = 3;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r * cols + c]) {
          ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
        }
      }
    }
  }, []);

  return (
    <main
      style={{
        margin: 0,
        padding: 0,
        background: BG,
        minHeight: "100vh",
        overflow: "hidden",
      }}
    >
      <canvas ref={canvasRef} style={{ display: "block" }} />
    </main>
  );
}
```

- [ ] **Step 2: Wire `Garden` into the page**

Replace `src/app/garden-of-love/page.tsx` with:

```tsx
import Garden from "./Garden";

export default function GardenOfLovePage() {
  return <Garden />;
}
```

- [ ] **Step 3: Visual smoke test**

Run: `npm run dev`

Open `http://localhost:3000/garden-of-love`.

Expected: a dark page with the word `RUŞEN` rendered in pink chunky pixels, centered. The `Ş` cedilla should be visible as a pink dot below the `Ş`.

Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add src/app/garden-of-love/Garden.tsx src/app/garden-of-love/page.tsx
git commit -m "Render initial RUŞEN stamp on canvas"
```

---

## Task 7: Animation loop — Conway tick at 10 fps

**Goal:** Add a tick interval (10 generations / second) and an RAF render loop. From the static `RUŞEN` seed, the text should now decay naturally according to Conway's rules.

**Files:**
- Modify: `src/app/garden-of-love/Garden.tsx`

- [ ] **Step 1: Replace the static-frame body with a render loop**

Update `src/app/garden-of-love/Garden.tsx` — replace the `useEffect` body with this version (which keeps the setup and adds animation):

```tsx
"use client";

import { useEffect, useRef } from "react";
import { clearGrid, stampText, step } from "./engine";
import { GLYPHS } from "./glyphs";

const BG = "#0a0a0f";
const FG = "#f9a8d4";
const TICK_MS = 100; // 10 generations / second

function getCellSize(): number {
  if (typeof window === "undefined") return 10;
  return window.innerWidth < 768 ? 8 : 10;
}

export default function Garden() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const cellSize = getCellSize();
    const cols = Math.floor(window.innerWidth / cellSize);
    const rows = Math.floor(window.innerHeight / cellSize);

    canvas.width = cols * cellSize * dpr;
    canvas.height = rows * cellSize * dpr;
    canvas.style.width = `${cols * cellSize}px`;
    canvas.style.height = `${rows * cellSize}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    let current = new Uint8Array(cols * rows);
    let next = new Uint8Array(cols * rows);
    clearGrid(current);
    stampText(current, cols, rows, "RUŞEN", GLYPHS);

    const tickHandle = setInterval(() => {
      step(current, next, cols, rows);
      const tmp = current;
      current = next;
      next = tmp;
    }, TICK_MS);

    let rafHandle = 0;
    const draw = () => {
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, cols * cellSize, rows * cellSize);
      ctx.fillStyle = FG;
      ctx.shadowColor = FG;
      ctx.shadowBlur = 3;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (current[r * cols + c]) {
            ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
          }
        }
      }
      rafHandle = requestAnimationFrame(draw);
    };
    rafHandle = requestAnimationFrame(draw);

    return () => {
      clearInterval(tickHandle);
      cancelAnimationFrame(rafHandle);
    };
  }, []);

  return (
    <main
      style={{
        margin: 0,
        padding: 0,
        background: BG,
        minHeight: "100vh",
        overflow: "hidden",
      }}
    >
      <canvas ref={canvasRef} style={{ display: "block" }} />
    </main>
  );
}
```

- [ ] **Step 2: Visual smoke test**

Run: `npm run dev`

Open `http://localhost:3000/garden-of-love`.

Expected:
1. The `RUŞEN` text appears, centered, in pink.
2. After ~1 second the letters start fragmenting per Conway's rules: parts of letters die from over/undercrowding, some pieces form gliders that travel diagonally, others form blinkers/blocks that persist.
3. After ~10 seconds the field is mostly chaos with twinkling oscillators and traveling gliders.

If you see the text but it doesn't move: the tick interval isn't running.
If you see nothing: check the canvas size in dev tools — `getCellSize()` should pick a reasonable value.
If gliders die at the right edge: the toroidal wrap isn't kicking in — recheck `step()`.

Stop the dev server.

- [ ] **Step 3: Commit**

```bash
git add src/app/garden-of-love/Garden.tsx
git commit -m "Animate Garden with Conway tick at 10 fps"
```

---

## Task 8: Phase scheduler — full bloom cycle

**Goal:** Replace the one-time `RUŞEN` seed with a repeating cycle: chaos → RUŞEN → chaos → ❤ → chaos → BEYZA → loop. Heart cells render in red.

**Files:**
- Modify: `src/app/garden-of-love/Garden.tsx`

- [ ] **Step 1: Add phase definitions and a tracking buffer**

Update `src/app/garden-of-love/Garden.tsx` so the file looks like this in full:

```tsx
"use client";

import { useEffect, useRef } from "react";
import {
  clearGrid,
  seedRandom,
  stampSingleCentered,
  stampText,
  step,
} from "./engine";
import { GLYPHS } from "./glyphs";

const BG = "#0a0a0f";
const FG_PINK = "#f9a8d4";
const FG_RED = "#ef4444";
const TICK_MS = 100; // 10 generations / second
const CHAOS_MS = 6000;
const BLOOM_MS = 5000;
const CHAOS_DENSITY = 0.18;

type PhaseName = "chaos" | "rusen" | "heart" | "beyza";

type Phase = {
  name: PhaseName;
  durationMs: number;
};

const PHASES: Phase[] = [
  { name: "chaos", durationMs: CHAOS_MS },
  { name: "rusen", durationMs: BLOOM_MS },
  { name: "chaos", durationMs: CHAOS_MS },
  { name: "heart", durationMs: BLOOM_MS },
  { name: "chaos", durationMs: CHAOS_MS },
  { name: "beyza", durationMs: BLOOM_MS },
];

function getCellSize(): number {
  if (typeof window === "undefined") return 10;
  return window.innerWidth < 768 ? 8 : 10;
}

function enterPhase(
  name: PhaseName,
  grid: Uint8Array,
  heartMask: Uint8Array,
  cols: number,
  rows: number
): void {
  // Clear heart mask on every phase entry; only the heart phase repopulates it.
  heartMask.fill(0);

  if (name === "chaos") {
    seedRandom(grid, CHAOS_DENSITY);
    return;
  }

  clearGrid(grid);
  if (name === "rusen") {
    stampText(grid, cols, rows, "RUŞEN", GLYPHS);
  } else if (name === "beyza") {
    stampText(grid, cols, rows, "BEYZA", GLYPHS);
  } else if (name === "heart") {
    stampSingleCentered(grid, cols, rows, GLYPHS.HEART);
    // Mark every cell that was just stamped as a heart cell so the renderer
    // can color it red. The mask persists through the decay phase that follows.
    for (let i = 0; i < grid.length; i++) {
      heartMask[i] = grid[i];
    }
  }
}

export default function Garden() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const cellSize = getCellSize();
    const cols = Math.floor(window.innerWidth / cellSize);
    const rows = Math.floor(window.innerHeight / cellSize);

    canvas.width = cols * cellSize * dpr;
    canvas.height = rows * cellSize * dpr;
    canvas.style.width = `${cols * cellSize}px`;
    canvas.style.height = `${rows * cellSize}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    let current = new Uint8Array(cols * rows);
    let next = new Uint8Array(cols * rows);
    const heartMask = new Uint8Array(cols * rows);

    let phaseIndex = 0;
    enterPhase(PHASES[0].name, current, heartMask, cols, rows);

    const tickHandle = setInterval(() => {
      step(current, next, cols, rows);
      const tmp = current;
      current = next;
      next = tmp;
    }, TICK_MS);

    let phaseTimeout: ReturnType<typeof setTimeout>;
    const advancePhase = () => {
      phaseIndex = (phaseIndex + 1) % PHASES.length;
      enterPhase(PHASES[phaseIndex].name, current, heartMask, cols, rows);
      phaseTimeout = setTimeout(advancePhase, PHASES[phaseIndex].durationMs);
    };
    phaseTimeout = setTimeout(advancePhase, PHASES[0].durationMs);

    let rafHandle = 0;
    const draw = () => {
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, cols * cellSize, rows * cellSize);

      // Pink pass (non-heart cells)
      ctx.fillStyle = FG_PINK;
      ctx.shadowColor = FG_PINK;
      ctx.shadowBlur = 3;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c;
          if (current[i] && !heartMask[i]) {
            ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
          }
        }
      }

      // Red pass (heart cells)
      ctx.fillStyle = FG_RED;
      ctx.shadowColor = FG_RED;
      ctx.shadowBlur = 4;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c;
          if (current[i] && heartMask[i]) {
            ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
          }
        }
      }

      rafHandle = requestAnimationFrame(draw);
    };
    rafHandle = requestAnimationFrame(draw);

    return () => {
      clearInterval(tickHandle);
      clearTimeout(phaseTimeout);
      cancelAnimationFrame(rafHandle);
    };
  }, []);

  return (
    <main
      style={{
        margin: 0,
        padding: 0,
        background: BG,
        minHeight: "100vh",
        overflow: "hidden",
      }}
    >
      <canvas ref={canvasRef} style={{ display: "block" }} />
    </main>
  );
}
```

Note on the heart mask: when the heart phase enters, we copy the stamped pattern into `heartMask`. As Conway evolves, cells from that pattern may die or new cells may be born. The mask only marks the *originally stamped* heart cells, so as red cells die during decay, the heart fades in red while any new births are pink. This produces a visually striking "the heart is dying back into life" effect.

- [ ] **Step 2: Visual smoke test of the full cycle**

Run: `npm run dev`

Open `http://localhost:3000/garden-of-love`.

Watch for ~33 seconds and verify the full cycle plays:

- 0–6 s: random chaos
- 6–11 s: `RUŞEN` blooms in pink, then decays
- 11–17 s: chaos
- 17–22 s: ❤ blooms in red, then decays (red cells fade as the heart dies; surviving cells flip to pink)
- 22–28 s: chaos
- 28–33 s: `BEYZA` blooms in pink, then decays
- 33+ s: cycle repeats

Stop the dev server.

- [ ] **Step 3: Commit**

```bash
git add src/app/garden-of-love/Garden.tsx
git commit -m "Add bloom cycle scheduler for RUŞEN ❤ BEYZA"
```

---

## Task 9: Touch input — plant cells during chaos

**Goal:** Tapping the canvas during a chaos phase plants a live cell at the tap position. Drag paints a line. Bloom phases ignore taps.

**Files:**
- Modify: `src/app/garden-of-love/Garden.tsx`

- [ ] **Step 1: Add pointer event handling**

In `src/app/garden-of-love/Garden.tsx`, modify the `useEffect` body to:

1. Track the current phase name in a ref:

   ```tsx
   const phaseNameRef = { current: PHASES[0].name as PhaseName };
   ```

   Place this declaration right after the `heartMask` allocation. Update `advancePhase` to also update `phaseNameRef.current = PHASES[phaseIndex].name;` immediately after `phaseIndex = (phaseIndex + 1) % PHASES.length`.

2. Add pointer handlers that gate on `phaseNameRef.current === "chaos"`:

   ```tsx
   const cellAt = (clientX: number, clientY: number): number | null => {
     const rect = canvas.getBoundingClientRect();
     const x = clientX - rect.left;
     const y = clientY - rect.top;
     const c = Math.floor(x / cellSize);
     const r = Math.floor(y / cellSize);
     if (r < 0 || r >= rows || c < 0 || c >= cols) return null;
     return r * cols + c;
   };

   let pressed = false;
   const onDown = (e: PointerEvent) => {
     if (phaseNameRef.current !== "chaos") return;
     pressed = true;
     const idx = cellAt(e.clientX, e.clientY);
     if (idx !== null) current[idx] = 1;
   };
   const onMove = (e: PointerEvent) => {
     if (!pressed) return;
     if (phaseNameRef.current !== "chaos") return;
     const idx = cellAt(e.clientX, e.clientY);
     if (idx !== null) current[idx] = 1;
   };
   const onUp = () => {
     pressed = false;
   };

   canvas.addEventListener("pointerdown", onDown);
   canvas.addEventListener("pointermove", onMove);
   canvas.addEventListener("pointerup", onUp);
   canvas.addEventListener("pointerleave", onUp);
   canvas.addEventListener("pointercancel", onUp);
   ```

   Add these listeners after the RAF setup, before `return`.

3. Update the cleanup return to remove the listeners:

   ```tsx
   return () => {
     clearInterval(tickHandle);
     clearTimeout(phaseTimeout);
     cancelAnimationFrame(rafHandle);
     canvas.removeEventListener("pointerdown", onDown);
     canvas.removeEventListener("pointermove", onMove);
     canvas.removeEventListener("pointerup", onUp);
     canvas.removeEventListener("pointerleave", onUp);
     canvas.removeEventListener("pointercancel", onUp);
   };
   ```

If you find this hard to merge by hand, replace the entire `useEffect` block with the consolidated version below:

```tsx
useEffect(() => {
  const canvas = canvasRef.current;
  if (!canvas) return;

  const dpr = window.devicePixelRatio || 1;
  const cellSize = getCellSize();
  const cols = Math.floor(window.innerWidth / cellSize);
  const rows = Math.floor(window.innerHeight / cellSize);

  canvas.width = cols * cellSize * dpr;
  canvas.height = rows * cellSize * dpr;
  canvas.style.width = `${cols * cellSize}px`;
  canvas.style.height = `${rows * cellSize}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(dpr, dpr);

  let current = new Uint8Array(cols * rows);
  let next = new Uint8Array(cols * rows);
  const heartMask = new Uint8Array(cols * rows);

  const phaseNameRef = { current: PHASES[0].name as PhaseName };
  let phaseIndex = 0;
  enterPhase(PHASES[0].name, current, heartMask, cols, rows);

  const tickHandle = setInterval(() => {
    step(current, next, cols, rows);
    const tmp = current;
    current = next;
    next = tmp;
  }, TICK_MS);

  let phaseTimeout: ReturnType<typeof setTimeout>;
  const advancePhase = () => {
    phaseIndex = (phaseIndex + 1) % PHASES.length;
    phaseNameRef.current = PHASES[phaseIndex].name;
    enterPhase(PHASES[phaseIndex].name, current, heartMask, cols, rows);
    phaseTimeout = setTimeout(advancePhase, PHASES[phaseIndex].durationMs);
  };
  phaseTimeout = setTimeout(advancePhase, PHASES[0].durationMs);

  let rafHandle = 0;
  const draw = () => {
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, cols * cellSize, rows * cellSize);
    ctx.fillStyle = FG_PINK;
    ctx.shadowColor = FG_PINK;
    ctx.shadowBlur = 3;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        if (current[i] && !heartMask[i]) {
          ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
        }
      }
    }
    ctx.fillStyle = FG_RED;
    ctx.shadowColor = FG_RED;
    ctx.shadowBlur = 4;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        if (current[i] && heartMask[i]) {
          ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
        }
      }
    }
    rafHandle = requestAnimationFrame(draw);
  };
  rafHandle = requestAnimationFrame(draw);

  const cellAt = (clientX: number, clientY: number): number | null => {
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const c = Math.floor(x / cellSize);
    const r = Math.floor(y / cellSize);
    if (r < 0 || r >= rows || c < 0 || c >= cols) return null;
    return r * cols + c;
  };

  let pressed = false;
  const onDown = (e: PointerEvent) => {
    if (phaseNameRef.current !== "chaos") return;
    pressed = true;
    const idx = cellAt(e.clientX, e.clientY);
    if (idx !== null) current[idx] = 1;
  };
  const onMove = (e: PointerEvent) => {
    if (!pressed || phaseNameRef.current !== "chaos") return;
    const idx = cellAt(e.clientX, e.clientY);
    if (idx !== null) current[idx] = 1;
  };
  const onUp = () => {
    pressed = false;
  };

  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointerleave", onUp);
  canvas.addEventListener("pointercancel", onUp);

  return () => {
    clearInterval(tickHandle);
    clearTimeout(phaseTimeout);
    cancelAnimationFrame(rafHandle);
    canvas.removeEventListener("pointerdown", onDown);
    canvas.removeEventListener("pointermove", onMove);
    canvas.removeEventListener("pointerup", onUp);
    canvas.removeEventListener("pointerleave", onUp);
    canvas.removeEventListener("pointercancel", onUp);
  };
}, []);
```

- [ ] **Step 2: Manual phone-like verification**

Run: `npm run dev`

Open `http://localhost:3000/garden-of-love` in a browser. Use Chrome DevTools' device emulation (Cmd/Ctrl + Shift + M) to simulate a phone.

Verify:
1. During a **chaos** phase, dragging across the canvas paints a trail of live cells that immediately participate in the simulation.
2. During a **bloom** phase (the 5 seconds where text/heart is visible), tapping has no effect — the seeded glyph is preserved.
3. During the post-bloom decay (the seconds after a bloom while the text is dying — this is technically still the "rusen"/"heart"/"beyza" phase by name), tapping is also gated off. This is intentional per the spec.

Stop the dev server.

- [ ] **Step 3: Commit**

```bash
git add src/app/garden-of-love/Garden.tsx
git commit -m "Add tap-to-plant during chaos phases"
```

---

## Task 10: Dedication card and entry transition

**Goal:** Add an opening dedication card. Tapping it fades out the card and reveals the garden.

**Files:**
- Create: `src/app/garden-of-love/Dedication.tsx`
- Modify: `src/app/garden-of-love/page.tsx`

- [ ] **Step 1: Write the dedication component**

Write `src/app/garden-of-love/Dedication.tsx`:

```tsx
"use client";

type Props = {
  onEnter: () => void;
};

export default function Dedication({ onEnter }: Props) {
  return (
    <button
      type="button"
      onClick={onEnter}
      style={{
        all: "unset",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        width: "100vw",
        background: "#0a0a0f",
        color: "white",
        fontFamily: "var(--font-geist-sans)",
        textAlign: "center",
        padding: "0 24px",
      }}
      aria-label="Bahçeyi aç"
    >
      <div style={{ maxWidth: 320 }}>
        <p
          style={{
            fontSize: 22,
            fontWeight: 600,
            margin: 0,
            lineHeight: 1.3,
          }}
        >
          Beyza için.
        </p>
        <p
          style={{
            fontSize: 16,
            opacity: 0.85,
            margin: "16px 0 0",
            lineHeight: 1.6,
          }}
        >
          Sana küçük bir bahçe yaptım.
        </p>
        <p
          style={{
            fontSize: 11,
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            opacity: 0.55,
            margin: "48px 0 0",
          }}
        >
          açmak için dokun
        </p>
      </div>
    </button>
  );
}
```

The copy is a starting point — Rusen will replace the lines with the final wording before launch.

- [ ] **Step 2: Wire the page to swap dedication → garden**

Replace `src/app/garden-of-love/page.tsx` with:

```tsx
"use client";

import { useState } from "react";
import Dedication from "./Dedication";
import Garden from "./Garden";

export default function GardenOfLovePage() {
  const [entered, setEntered] = useState(false);

  return (
    <div
      style={{
        position: "relative",
        background: "#0a0a0f",
        minHeight: "100vh",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: entered ? 0 : 1,
          pointerEvents: entered ? "none" : "auto",
          transition: "opacity 400ms ease",
          zIndex: 2,
        }}
      >
        <Dedication onEnter={() => setEntered(true)} />
      </div>
      {entered && <Garden />}
    </div>
  );
}
```

The `Garden` only mounts after the user enters, so the canvas's RAF/tick loop doesn't run while she is still on the dedication screen.

- [ ] **Step 3: Visual smoke test**

Run: `npm run dev`

Open `http://localhost:3000/garden-of-love`.

Verify:
1. The dedication card is visible on load.
2. Tapping or clicking anywhere on the card triggers a 400 ms fade.
3. After the fade, the garden cycle begins from the chaos phase.
4. The dedication card cannot be triggered again (the underlying button is no longer interactive).

Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add src/app/garden-of-love/Dedication.tsx src/app/garden-of-love/page.tsx
git commit -m "Add dedication card and entry transition"
```

---

## Task 11: Privacy verification + final manual QA

**Goal:** Confirm privacy plumbing holds end-to-end, then run the manual QA checklist on phone and laptop.

**Files:** None modified — this is a verification task.

- [ ] **Step 1: Verify the route is not in the projects registry**

Run: `grep -n "garden-of-love" src/lib/projects.ts`

Expected: no matches.

- [ ] **Step 2: Verify the route is not linked from any other page**

Run: `grep -rEn "garden-of-love" src --exclude-dir=__tests__`

Expected: matches only inside `src/app/garden-of-love/` itself (the route's own files referencing themselves). No matches under `src/app/components/`, `src/app/page.tsx`, `src/app/layout.tsx`, `src/lib/`, or any other route folder.

- [ ] **Step 3: Verify the noindex meta tag renders**

Run: `npm run dev`

Open `http://localhost:3000/garden-of-love`. Open DevTools → Elements. In the `<head>`, find:

```html
<meta name="robots" content="noindex,nofollow" />
```

If absent, recheck `src/app/garden-of-love/layout.tsx` — `metadata.robots` must be `{ index: false, follow: false }`.

- [ ] **Step 4: Verify the build succeeds**

Stop the dev server. Run:

```bash
npm run build
```

Expected: build completes. The static export should include `out/garden-of-love/index.html`. Verify:

```bash
ls out/garden-of-love/
```

Expected: `index.html` exists.

- [ ] **Step 5: Run the lint and test suites**

Run:

```bash
npm run lint
```

Expected: no errors related to the new files. Address any that surface.

Run:

```bash
npm run test:run
```

Expected: all tests pass, including the existing project tests and the new `engine.test.ts` and `glyphs.test.ts`.

- [ ] **Step 6: Manual visual QA — laptop**

Run: `npm run dev`

Open `http://localhost:3000/garden-of-love` on the laptop browser. Walk through:

1. ✓ Dedication card is centered and readable.
2. ✓ Tapping the card fades it out smoothly (~400 ms).
3. ✓ Garden begins with chaos.
4. ✓ `RUŞEN` blooms with the cedilla on the Ş clearly visible.
5. ✓ The bloom decays into Conway gliders/oscillators/sparks before the next chaos.
6. ✓ ❤ blooms in red.
7. ✓ As the heart decays, surviving heart cells stay red while newly-born neighbors render in pink.
8. ✓ `BEYZA` blooms.
9. ✓ Cycle repeats from chaos.
10. ✓ Dragging across the field during chaos plants live cells.
11. ✓ Tapping during a bloom does not disrupt the seeded pattern.

- [ ] **Step 7: Manual visual QA — phone**

Either:
- Use Chrome DevTools' device emulation (iPhone SE — the smallest target) and verify the layout reads correctly, **or**
- Connect a phone to the dev server via your local IP (`npm run dev -- -H 0.0.0.0`, then visit `http://<your-laptop-ip>:3000/garden-of-love` from the phone).

Verify:
1. ✓ The dedication card is readable in portrait orientation.
2. ✓ The garden fills the viewport without scroll bars.
3. ✓ Glyphs are readable (each cell ≥ 8 px on phones, so `RUŞEN` is ~40 px tall — visible but not overwhelming).
4. ✓ Tapping during chaos plants cells where the finger lands.

- [ ] **Step 8: Final commit (if any tweaks were needed)**

If steps 1–7 surfaced any small fixes (color tweak, spacing, copy edit), commit them now:

```bash
git add -A
git commit -m "Polish garden-of-love after manual QA"
```

If nothing was needed, skip this step.

- [ ] **Step 9: Stop here**

The garden is ready to deploy. Deployment to Cloudflare Pages is out of scope for this plan — it follows the existing site's deploy process (`npm run build && npm run deploy`).

Before sending Beyza the URL, Rusen should:
- Replace the placeholder Turkish copy in `Dedication.tsx` with the final wording.
- Decide on the final slug (the spec uses `/garden-of-love`; if a last-minute change is wanted, the route folder can be renamed in one commit).

---

## Self-review

**Spec coverage:**

| Spec section | Covered by |
|---|---|
| §1 Goal | Tasks 1, 6–10 |
| §2 User journey | Tasks 6–10 (rendering, sequence, touch, dedication) |
| §3 The single bend | Tasks 5, 7, 8 (stamping done at phase entry; Conway runs everywhere else) |
| §4 Architecture (route, layout, components) | Tasks 1, 6, 8, 10 |
| §5 GoL engine | Tasks 3, 4, 5, 6, 7 |
| §6 Glyphs (incl. Ş, HEART) | Task 2 |
| §7 Sequence scheduler | Task 8 |
| §8 Aesthetic (colors, dedication card) | Tasks 6, 7, 8, 10 |
| §9 Privacy plumbing | Tasks 1, 11 |
| §10 Testing | Tasks 2, 3, 4, 5 (unit); Task 11 (manual QA + lint + build) |
| §11 Out of scope | Honored throughout — no analytics, no audio, no controls, no all-together bloom |
| §12 Risks | Verified during Task 11 |
| §13 Success criteria | Task 11 step 6 + 7 walks the success-criteria list |

No gaps.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `add error handling`, or `similar to Task N` — every step has its own concrete code or command. The Turkish dedication copy is explicitly marked as a placeholder Rusen will replace before launch (Task 10 step 1, Task 11 step 9).

**Type consistency:** `Glyph`, `GlyphMap` exported from `glyphs.ts` (Task 2), imported by `engine.ts` (Task 5). `step`, `seedRandom`, `clearGrid`, `stampGlyph`, `stampSingleCentered`, `stampText` exported from `engine.ts` (Tasks 3–5), imported by `Garden.tsx` (Tasks 6–9). `PhaseName`, `Phase`, `PHASES`, `enterPhase` defined in `Garden.tsx` (Task 8) and used in Task 9. Function signatures referenced consistently across tasks.
