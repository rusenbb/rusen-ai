# Garden of Love — Design

- **Date:** 2026-05-06
- **Author:** Rusen
- **Status:** Approved (brainstorm → design); pending implementation plan
- **Route:** `rusen.ai/garden-of-love` (hidden)

## 1. Goal

A private, unlisted page on rusen.ai for Beyza. She types the URL, sees a brief Turkish dedication, taps to enter, and watches a Conway's Game of Life field cycle endlessly through three blooms — `RUŞEN`, a heart, and `BEYZA` — each appearing alone, decaying naturally back into Conway chaos before the next bloom. She can tap during the chaos phases to plant her own live cells and participate in the simulation.

The page is **discoverable only by typing the URL**: not in the projects registry, not linked from any other page, and search-engine-excluded via `<meta name="robots">`.

## 2. User journey

1. Beyza opens `rusen.ai/garden-of-love` on her phone or laptop.
2. A dark page loads. A short Turkish dedication card sits centered:
   > **Beyza için.**
   > Sana küçük bir bahçe yaptım.
   > *[ açmak için dokun ]*
   *(Final copy is for Rusen to write before launch — placeholder above.)*
3. She taps the card. The card fades out (~400 ms).
4. The viewport fills with a Conway's Game of Life canvas. The sequence begins immediately:

   | # | Phase   | Duration | What happens                                                      |
   |---|---------|----------|-------------------------------------------------------------------|
   | 1 | chaos   | 6 s      | Random seed (~18% density), real Conway evolution                 |
   | 2 | bloom   | 5 s      | Grid replaced with `RUŞEN` glyph stamp, then real Conway resumes  |
   | 3 | chaos   | 6 s      | Re-seed random, real Conway                                        |
   | 4 | bloom   | 5 s      | Grid replaced with `❤` heart stamp, then real Conway              |
   | 5 | chaos   | 6 s      | …                                                                  |
   | 6 | bloom   | 5 s      | Grid replaced with `BEYZA` glyph stamp, then real Conway          |

   Total cycle: **33 s**. After phase 6, returns to phase 1. Loops forever.

5. **During chaos phases only**, Beyza can tap/click anywhere on the canvas to set the cell at that position to live. Drag paints a small line. Taps during bloom phases are ignored (they would visually disrupt the seeded glyph for no gain).

## 3. The single bend

Conway's Game of Life cannot be reverse-engineered to evolve into arbitrary text — that is NP-hard. So this design **scripts exactly one moment per bloom**: the transition into a bloom phase replaces the grid state with a pre-rasterized glyph pattern. Every other moment — the chaos evolution, the decay of glyphs back into life, the gliders that fly off and the oscillators that twinkle — is **real Conway** with rules B3/S23.

The decay phase is the design's most romantic moment: the structured glyph fragments into Conway primitives (gliders escaping, blinkers settling, sparks twinkling) before the next chaos phase begins. We earned that moment with the seed, then we let physics take over.

## 4. Architecture

### Route layout

```
src/app/garden-of-love/
├── page.tsx              # composes Dedication + Garden
├── layout.tsx            # noindex metadata + page title/description
├── Dedication.tsx        # opening card with enter affordance
├── Garden.tsx            # canvas + GoL engine + sequencer (the heart of it)
└── __tests__/
    └── garden.test.ts    # engine + scheduler + glyph stamping
```

No files are modified outside this folder. The projects registry (`src/lib/projects.ts`), the home page, the `/demos` index, and the `/nerdy-stuff` index are all untouched.

### Component composition

```
<GardenOfLovePage>
  <Dedication onEnter={() => setEntered(true)} />        # while !entered
  <Garden />                                             # once entered
</GardenOfLovePage>
```

A single `useState<boolean>('entered')` in `page.tsx` governs the swap. No router push, no animation library — a CSS opacity transition on the dedication wrapper handles the fade.

## 5. The GoL engine (`Garden.tsx`)

### Cell storage

Two `Uint8Array`s, double-buffered: `current` and `next`. Length = `cols × rows`. `0` = dead, `1` = alive. Swap pointers at end of each tick instead of allocating.

### Grid sizing

Computed from viewport on mount and on `resize`:
- Target cell size: **8 px** when `window.innerWidth < 768`, **10 px** otherwise. DPR-aware (cells scale with `window.devicePixelRatio` for crisp render on retina displays).
- Cols and rows: `floor(viewport.width / cellSize)` and `floor(viewport.height / cellSize)`.
- Typical: ~120 × 60 on a desktop, ~50 × 90 on a portrait phone.

### Conway tick

Standard B3/S23 rules. **Toroidal wrap** at edges (left/right and top/bottom) so gliders born during decay can travel across the field instead of dying at the boundary — this preserves the "alive" feel.

Tick cadence: **10 generations per second**. Decoupled from render: a `setInterval` (or RAF-throttled fixed-step loop) advances the simulation; render uses RAF and always paints the current buffer.

### Render

`<canvas>` 2D context. Each generation:
1. Clear the canvas to the background color.
2. For each live cell, fill a rectangle of `cellSize × cellSize` at `(col × cellSize, row × cellSize)`.
3. Apply `shadowBlur` (~3 px) for a subtle glow on live cells.

Heart-phase cells render in red (`#ef4444`); all other live cells in pink (`#f9a8d4`). The "is this a heart cell" flag is a separate `Uint8Array` set during the heart bloom and otherwise empty (cleared at every other phase transition).

### Bloom (glyph stamping)

A `stamp(grid, glyph, originCol, originRow)` function writes the glyph's `1` cells into the grid (and zeroes the rest of the bloom area, so we don't carry over chaos behind the text). Centered horizontally and vertically in the grid.

### Touch / pointer input

Standard `pointerdown` / `pointermove` listeners on the canvas. On `pointerdown` during chaos, set the cell at the pointer position to live. On `pointermove` while pressed (drag), set each cell along the path. Bloom and decay phases ignore input.

## 6. Glyphs

5×7 chunky pixel font, defined as an in-file `GLYPHS: Record<string, string[]>` map. Each glyph is an array of 7 strings of `1`s and `0`s. Example:

```ts
const GLYPHS = {
  R: ["11110","10001","10001","11110","10100","10010","10001"],
  // …
}
```

Required glyphs: **R, U, Ş, E, N, B, Y, Z, A, ❤**.

**Ş (S with cedilla):**  the standard `S` shape with one extra row beneath (the cedilla tail), giving Ş an 8-row glyph. The stamp function accommodates variable glyph heights.

**❤ (heart):** an 8-wide × 7-tall glyph (wider than letters) for visual weight:

```
01100110
11111111
11111111
11111111
01111110
00111100
00011000
```

All glyphs render in **uppercase only** (legibility at low resolution).

## 7. Sequence scheduler

A small array-driven state machine inside `Garden.tsx`:

```ts
type Phase = {
  name: 'chaos' | 'bloom';
  durMs: number;
  enter: (grid: Uint8Array) => void; // mutates grid at phase entry
};

const PHASES: Phase[] = [
  { name: 'chaos', durMs: 6000, enter: seedRandom(0.18) },
  { name: 'bloom', durMs: 5000, enter: stampText('RUŞEN') },
  { name: 'chaos', durMs: 6000, enter: seedRandom(0.18) },
  { name: 'bloom', durMs: 5000, enter: stampHeart() },
  { name: 'chaos', durMs: 6000, enter: seedRandom(0.18) },
  { name: 'bloom', durMs: 5000, enter: stampText('BEYZA') },
];
```

A `useEffect` schedules the next phase transition with `setTimeout(durMs)`. On each transition: increment index `(i + 1) % PHASES.length`, call `phase.enter(grid)`, repeat. On unmount: clear timeout. Conway evolution continues independently between transitions.

## 8. Aesthetic

- **Background:** `#0a0a0f` (deep night)
- **Live cells (default):** `#f9a8d4` (warm pink) with `shadowBlur: 3`
- **Heart bloom cells:** `#ef4444` (red) with `shadowBlur: 4`
- **Dedication card:** centered, serif (Geist Sans is fine), max-width 320 px, white text on the same `#0a0a0f` background, generous letter-spacing on the "açmak için dokun" line.
- **Mobile-first:** sized to viewport; works in portrait and landscape.

## 9. Privacy plumbing

Three layers, all trivial:

1. **Not in the projects registry.** `src/lib/projects.ts` is untouched. The route does not appear on `/`, `/demos`, or `/nerdy-stuff`.
2. **Noindex meta.** `layout.tsx` exports `metadata` with:
   ```ts
   export const metadata: Metadata = {
     robots: { index: false, follow: false },
     title: "·",
     description: "—",
   };
   ```
   Next.js renders the corresponding `<meta name="robots" content="noindex,nofollow" />` tag.
3. **Not linked.** No `<Link href="/garden-of-love">` anywhere in the codebase. Verified by grep before launch.

The page is still served as a normal static asset — anyone with the URL can load it. We are accepting privacy-by-obscurity as the model. No auth, no token, no rate limit. This is consistent with what Rusen asked for ("hidden, just discoverable if typed explicitly").

## 10. Testing

`vitest` unit tests in `__tests__/garden.test.ts`:

- **Conway correctness:** known patterns evolve as expected — blinker oscillates with period 2, glider translates by (1,1) every 4 generations, block remains stable.
- **Toroidal wrap:** a glider exiting the right edge re-enters from the left.
- **Glyph stamping:** `stamp(grid, GLYPHS.R, 0, 0)` sets exactly the cells described by the `R` glyph and zeros the rest of the stamp footprint.
- **Scheduler order:** advancing the scheduler 6 times produces the expected `chaos / bloom / chaos / bloom / chaos / bloom` sequence with the right `enter` actions called in order.
- **Touch gating:** `handlePointerDown(x, y, phase: 'chaos')` sets a cell live; `handlePointerDown(x, y, phase: 'bloom')` is a no-op.

No integration tests, no E2E. **Visual QA is manual** on a phone and a laptop before sending Beyza the URL.

## 11. Out of scope (intentionally)

These are explicitly **not** included; flag if any should be added:

- No backend, analytics, telemetry, or auth.
- No sound or music.
- No final "Ruşen ❤ Beyza" all-together bloom — the sequence is three separate blooms, as Rusen specified.
- No control UI (no pause, no speed slider, no rule editor).
- No daily messages, calendar awareness, or external time signals — pure intra-page sequence.
- No content beyond the three blooms and the dedication card.
- No accessibility audit beyond the basics (alt text on the dedication card if any imagery; respecting `prefers-reduced-motion` is a stretch goal).

## 12. Risks and known constraints

- **`prefers-reduced-motion`:** the bloom-decay loop is motion-heavy and could be unpleasant for users with vestibular sensitivities. Beyza is the only intended audience, so this is accepted unless Rusen flags it.
- **Battery on phones:** continuous canvas animation drains battery. Acceptable for a few minutes of viewing; flagging in case Beyza leaves the tab open.
- **Cloudflare Pages sitemap:** if a sitemap is auto-generated (not currently configured per `next.config.ts` — verify during implementation), the route would need explicit exclusion. The `noindex` meta provides a fallback.
- **Glyph readability at small viewports:** on a narrow portrait phone (e.g. iPhone SE), 5×7 glyphs of 8 px cells = 40 px text height. Should be readable, but verify on the smallest target device.

## 13. Success criteria

- The page loads at `rusen.ai/garden-of-love` after deploy.
- The dedication card appears, taps fade it out, the garden runs.
- The full cycle (chaos → RUŞEN → decay → chaos → ❤ → decay → chaos → BEYZA → decay → loop) plays correctly.
- Glyphs are clearly readable on a phone in portrait and a laptop in landscape.
- Tapping during chaos phases plants live cells; tapping during bloom phases does nothing.
- Search engines do not index the page (verifiable via `site:rusen.ai/garden-of-love` after a few weeks).
- The page does not appear on the home, `/demos`, or `/nerdy-stuff` indexes.
- Beyza opens the URL and smiles.
