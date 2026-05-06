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
