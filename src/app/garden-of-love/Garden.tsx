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
const CHAOS_DENSITY = 0.18;
const FADE_IN_MS = 400; // alpha 0 → 1 on phase entry

// Phase timing — every "bloom" gets a long hold (Conway paused) so the glyph
// is readable, followed by a shorter decay (Conway runs and eats the glyph).
const CHAOS_MS = 6000;
const BLOOM_HOLD_MS = 3000;
const BLOOM_DECAY_MS = 2000;

type PhaseName =
  | "chaos"
  | "rusen-hold"
  | "rusen-decay"
  | "heart-hold"
  | "heart-decay"
  | "beyza-hold"
  | "beyza-decay";

type Phase = {
  name: PhaseName;
  durationMs: number;
};

const PHASES: Phase[] = [
  { name: "chaos",        durationMs: CHAOS_MS },
  { name: "rusen-hold",   durationMs: BLOOM_HOLD_MS },
  { name: "rusen-decay",  durationMs: BLOOM_DECAY_MS },
  { name: "chaos",        durationMs: CHAOS_MS },
  { name: "heart-hold",   durationMs: BLOOM_HOLD_MS },
  { name: "heart-decay",  durationMs: BLOOM_DECAY_MS },
  { name: "chaos",        durationMs: CHAOS_MS },
  { name: "beyza-hold",   durationMs: BLOOM_HOLD_MS },
  { name: "beyza-decay",  durationMs: BLOOM_DECAY_MS },
];

function getCellSize(): number {
  if (typeof window === "undefined") return 10;
  return window.innerWidth < 768 ? 8 : 10;
}

/** Conway evolution is paused during hold phases so the glyph remains crisp. */
function isPaused(name: PhaseName): boolean {
  return name.endsWith("-hold");
}

/** Touch input is allowed only during chaos phases. */
function isChaos(name: PhaseName): boolean {
  return name === "chaos";
}

function enterPhase(
  name: PhaseName,
  grid: Uint8Array,
  heartMask: Uint8Array,
  cols: number,
  rows: number
): void {
  // Reset heart mask on every phase entry; only heart-hold repopulates it.
  heartMask.fill(0);

  switch (name) {
    case "chaos":
      seedRandom(grid, CHAOS_DENSITY);
      return;

    case "rusen-hold":
      clearGrid(grid);
      stampText(grid, cols, rows, "RUŞEN", GLYPHS);
      return;

    case "beyza-hold":
      clearGrid(grid);
      stampText(grid, cols, rows, "BEYZA", GLYPHS);
      return;

    case "heart-hold":
      clearGrid(grid);
      stampSingleCentered(grid, cols, rows, GLYPHS.HEART);
      // Mark every just-stamped cell as a heart cell so it renders red.
      // The mask persists into the decay phase so heart cells fade red as
      // they die, while any neighbors born during decay render in pink.
      for (let i = 0; i < grid.length; i++) {
        heartMask[i] = grid[i];
      }
      return;

    case "rusen-decay":
    case "heart-decay":
    case "beyza-decay":
      // No-op: let Conway evolve from the seeded grid.
      return;
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

    const phaseNameRef = { current: PHASES[0].name as PhaseName };
    const phaseStartRef = { current: performance.now() };
    let phaseIndex = 0;
    enterPhase(PHASES[0].name, current, heartMask, cols, rows);

    const tickHandle = setInterval(() => {
      // Skip Conway evolution during hold phases.
      if (isPaused(phaseNameRef.current)) return;
      step(current, next, cols, rows);
      const tmp = current;
      current = next;
      next = tmp;
    }, TICK_MS);

    let phaseTimeout: ReturnType<typeof setTimeout>;
    const advancePhase = () => {
      phaseIndex = (phaseIndex + 1) % PHASES.length;
      phaseNameRef.current = PHASES[phaseIndex].name;
      phaseStartRef.current = performance.now();
      enterPhase(PHASES[phaseIndex].name, current, heartMask, cols, rows);
      phaseTimeout = setTimeout(advancePhase, PHASES[phaseIndex].durationMs);
    };
    phaseTimeout = setTimeout(advancePhase, PHASES[0].durationMs);

    let rafHandle = 0;
    const draw = () => {
      // Compute fade-in alpha at the start of every phase. This smooths the
      // transition from chaos → bloom (and the reverse) so phases don't snap.
      const elapsed = performance.now() - phaseStartRef.current;
      const fadeAlpha =
        elapsed < FADE_IN_MS ? Math.max(0, elapsed / FADE_IN_MS) : 1;

      // Background — always fully opaque.
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, cols * cellSize, rows * cellSize);

      ctx.globalAlpha = fadeAlpha;

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

      ctx.globalAlpha = 1;
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
      if (!isChaos(phaseNameRef.current)) return;
      pressed = true;
      const idx = cellAt(e.clientX, e.clientY);
      if (idx !== null) current[idx] = 1;
    };
    const onMove = (e: PointerEvent) => {
      if (!pressed || !isChaos(phaseNameRef.current)) return;
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
