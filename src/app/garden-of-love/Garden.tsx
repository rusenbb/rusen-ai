"use client";

import { useEffect, useRef } from "react";
import { GLYPHS, type Glyph, type GlyphMap } from "./glyphs";

const BG = "#0a0a0f";
const FG_PINK = "#f9a8d4";
const FG_RED = "#ef4444";
const TICK_MS = 60; // step cadence — particles step one cell per axis per tick
const FADE_IN_MS = 400;

const CHAOS_MS = 5000;
const BLOOM_MS = 5000;
const CHAOS_DRIFT_MS = 2000; // re-randomize chaos targets at this cadence

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

type Particle = {
  x: number;
  y: number;
  tx: number;
  ty: number;
  red: boolean;
};

/** Cell size: target the bloom (29 glyph-cells wide) at ~60% of viewport. */
function getCellSize(): number {
  if (typeof window === "undefined") return 16;
  const target = Math.floor((window.innerWidth * 0.6) / 29);
  return Math.max(8, Math.min(48, target));
}

/** Particle count — enough to fill the largest glyph (RUŞEN ≈ 75 cells)
 * plus a comfortable chaos cloud, without becoming visually overwhelming. */
function getParticleCount(): number {
  if (typeof window === "undefined") return 150;
  return window.innerWidth < 768 ? 110 : 160;
}

/** Return all (col, row) cells lit by a single glyph, centered on the grid. */
function getSingleCenteredCells(
  glyph: Glyph,
  cols: number,
  rows: number
): Array<[number, number]> {
  const w = glyph[0]?.length ?? 0;
  const h = glyph.length;
  const startCol = Math.floor((cols - w) / 2);
  const startRow = Math.floor((rows - h) / 2);
  const cells: Array<[number, number]> = [];
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      if (glyph[r][c] === "1") cells.push([startCol + c, startRow + r]);
    }
  }
  return cells;
}

/** Return all (col, row) cells lit by a multi-glyph text, centered on the grid. */
function getTextCells(
  text: string,
  glyphs: GlyphMap,
  cols: number,
  rows: number,
  gap: number = 1
): Array<[number, number]> {
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

  const cells: Array<[number, number]> = [];
  let col = startCol;
  for (const ch of text) {
    const g = glyphs[ch];
    if (!g) continue;
    const w = g[0]?.length ?? 0;
    for (let r = 0; r < g.length; r++) {
      for (let c = 0; c < w; c++) {
        if (g[r][c] === "1") cells.push([col + c, startRow + r]);
      }
    }
    col += w + gap;
  }
  return cells;
}

/**
 * Assign each particle a target. The first `cells.length` particles get
 * exact glyph cells (in red if `red` is true). Particles beyond that scatter
 * randomly across the grid as ambient atmosphere.
 *
 * The cells array is shuffled lightly so the same particle doesn't always
 * occupy the top-left of the glyph — gives a nicer wandering feel.
 */
function assignGlyphTargets(
  particles: Particle[],
  cells: Array<[number, number]>,
  cols: number,
  rows: number,
  red: boolean
): void {
  // Light Fisher-Yates partial shuffle — assigning the first N is enough.
  const shuffled = cells.slice();
  for (let i = 0; i < shuffled.length; i++) {
    const j = i + Math.floor(Math.random() * (shuffled.length - i));
    const tmp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = tmp;
  }

  const N = particles.length;
  const M = Math.min(N, shuffled.length);
  for (let i = 0; i < M; i++) {
    particles[i].tx = shuffled[i][0];
    particles[i].ty = shuffled[i][1];
    particles[i].red = red;
  }
  for (let i = M; i < N; i++) {
    particles[i].tx = Math.floor(Math.random() * cols);
    particles[i].ty = Math.floor(Math.random() * rows);
    particles[i].red = false;
  }
}

/** Random scatter for the chaos phase. */
function assignChaosTargets(
  particles: Particle[],
  cols: number,
  rows: number
): void {
  for (const p of particles) {
    p.tx = Math.floor(Math.random() * cols);
    p.ty = Math.floor(Math.random() * rows);
    p.red = false;
  }
}

/** Move a particle one cell per axis toward its target (Manhattan king-step).
 * Integer positions only — particles always sit on a grid cell. */
function stepParticle(p: Particle): void {
  if (p.x < p.tx) p.x++;
  else if (p.x > p.tx) p.x--;
  if (p.y < p.ty) p.y++;
  else if (p.y > p.ty) p.y--;
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

    // Initialize particles at random *grid cells* — integer positions.
    const N = getParticleCount();
    const particles: Particle[] = [];
    for (let i = 0; i < N; i++) {
      particles.push({
        x: Math.floor(Math.random() * cols),
        y: Math.floor(Math.random() * rows),
        tx: Math.floor(Math.random() * cols),
        ty: Math.floor(Math.random() * rows),
        red: false,
      });
    }

    const phaseNameRef = { current: PHASES[0].name as PhaseName };
    const phaseStartRef = { current: performance.now() };
    let phaseIndex = 0;

    const enterPhase = (name: PhaseName) => {
      switch (name) {
        case "chaos":
          assignChaosTargets(particles, cols, rows);
          return;
        case "rusen":
          assignGlyphTargets(
            particles,
            getTextCells("RUŞEN", GLYPHS, cols, rows),
            cols,
            rows,
            false
          );
          return;
        case "heart":
          assignGlyphTargets(
            particles,
            getSingleCenteredCells(GLYPHS.HEART, cols, rows),
            cols,
            rows,
            true
          );
          return;
        case "beyza":
          assignGlyphTargets(
            particles,
            getTextCells("BEYZA", GLYPHS, cols, rows),
            cols,
            rows,
            false
          );
          return;
      }
    };

    enterPhase(PHASES[0].name);

    // Re-randomize chaos targets periodically so particles wander rather than
    // settle. Only fires when the current phase is chaos.
    const driftHandle = setInterval(() => {
      if (phaseNameRef.current === "chaos") {
        assignChaosTargets(particles, cols, rows);
      }
    }, CHAOS_DRIFT_MS);

    // Motion tick — each particle steps one cell per axis toward its target.
    const tickHandle = setInterval(() => {
      for (const p of particles) stepParticle(p);
    }, TICK_MS);

    let phaseTimeout: ReturnType<typeof setTimeout>;
    const advancePhase = () => {
      phaseIndex = (phaseIndex + 1) % PHASES.length;
      phaseNameRef.current = PHASES[phaseIndex].name;
      phaseStartRef.current = performance.now();
      enterPhase(PHASES[phaseIndex].name);
      phaseTimeout = setTimeout(advancePhase, PHASES[phaseIndex].durationMs);
    };
    phaseTimeout = setTimeout(advancePhase, PHASES[0].durationMs);

    let rafHandle = 0;
    const draw = () => {
      const elapsed = performance.now() - phaseStartRef.current;
      const fadeAlpha =
        elapsed < FADE_IN_MS ? Math.max(0, elapsed / FADE_IN_MS) : 1;

      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, cols * cellSize, rows * cellSize);

      ctx.globalAlpha = fadeAlpha;

      // Two passes for cheaper state changes (one shadow setup per color).
      ctx.fillStyle = FG_PINK;
      ctx.shadowColor = FG_PINK;
      ctx.shadowBlur = 3;
      for (const p of particles) {
        if (!p.red) {
          ctx.fillRect(p.x * cellSize, p.y * cellSize, cellSize, cellSize);
        }
      }

      ctx.fillStyle = FG_RED;
      ctx.shadowColor = FG_RED;
      ctx.shadowBlur = 4;
      for (const p of particles) {
        if (p.red) {
          ctx.fillRect(p.x * cellSize, p.y * cellSize, cellSize, cellSize);
        }
      }

      ctx.globalAlpha = 1;
      rafHandle = requestAnimationFrame(draw);
    };
    rafHandle = requestAnimationFrame(draw);

    return () => {
      clearInterval(driftHandle);
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
