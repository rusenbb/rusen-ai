"use client";

import { useEffect, useRef, useState } from "react";
import { GLYPHS, type Glyph, type GlyphMap } from "./glyphs";

const BG = "#0a0a0f";
const FG_PINK = "#f9a8d4";
const FG_HEART = "#ffffff";

const SPEED_MIN = 0.3;
const SPEED_MAX = 2.5;
const SPEED_STEP = 0.1;
const SPEED_DEFAULT = 1;
const SPEED_BASE_MULTIPLIER = 1.5;
const STEP_MS = 170; // particle step cadence — deliberately slow so formation
                     // reads as a state transition rather than a sprint
const GEN_MS = 400; // generation cadence — chaos roles advance one generation

const CHAOS_MS = 7000;
const BLOOM_MS = 10500;
const BLOOM_CLEAR_RADIUS_CELLS = 3;

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

/**
 * Each particle has a permanent identity. The chaos role determines what
 * scripted Conway-like behavior the particle plays when no glyph claims
 * it. Roles never change during the experience.
 *
 * Pair/triple walkers carry a *shared* mutable group reference so all
 * particles in the same convoy advance together when the group moves.
 */
type WalkerGroup = {
  cx: number;
  cy: number;
  dx: number; // current direction
  dy: number;
  cooldown: number; // gens until direction reroll
};

type ChaosRole =
  | { type: "blinker"; cx: number; cy: number; slot: 0 | 1 | 2 } // 3 cells, period 2
  | { type: "block"; cx: number; cy: number; slot: 0 | 1 | 2 | 3 } // 4 cells, static
  | { type: "beehive"; cx: number; cy: number; slot: 0 | 1 | 2 | 3 | 4 | 5 } // 6 cells, static
  | { type: "pair"; group: WalkerGroup; slot: 0 | 1 } // 2 cells, walks together
  | { type: "triple"; group: WalkerGroup; slot: 0 | 1 | 2 } // 3 cells, walks together
  | { type: "drifter"; px: number; py: number }; // 1 cell, random walk

type Particle = {
  id: number;
  x: number;
  y: number;
  tx: number;
  ty: number;
  red: boolean;
  /** Skip rendering this frame. During blooms, non-symbol particles remain
   *  visible only outside the active symbol's padded quiet zone. */
  visible: boolean;
  /** Where this particle lives during each bloom — null if it has no role
   *  in that bloom (in which case it stays in its chaos role). */
  rusenHome: [number, number] | null;
  heartHome: [number, number] | null;
  beyzaHome: [number, number] | null;
  chaos: ChaosRole;
};

/** Inclusive grid bounds within which all chaos motion is constrained.
 *  Computed from the bounding box of every glyph plus a margin, so
 *  particles cluster around the center where the blooms will appear. */
type ChaosRegion = {
  minCol: number;
  maxCol: number;
  minRow: number;
  maxRow: number;
};

type CellBounds = {
  minCol: number;
  maxCol: number;
  minRow: number;
  maxRow: number;
};

function getCellSize(): number {
  if (typeof window === "undefined") return 16;
  const target = Math.floor((window.innerWidth * 0.6) / 29);
  return Math.max(8, Math.min(48, target));
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

/** Compute the (col, row) a particle should occupy during chaos at the given
 *  generation, based on its scripted role. Pure function of role + gen. */
function chaosCellOf(role: ChaosRole, gen: number): [number, number] {
  switch (role.type) {
    case "blinker": {
      // Period 2: horizontal on even gens, vertical on odd.
      if (gen % 2 === 0) {
        return [role.cx - 1 + role.slot, role.cy];
      }
      return [role.cx, role.cy - 1 + role.slot];
    }
    case "block": {
      const offsets: Array<[number, number]> = [
        [0, 0], [1, 0], [0, 1], [1, 1],
      ];
      const [dx, dy] = offsets[role.slot];
      return [role.cx + dx, role.cy + dy];
    }
    case "beehive": {
      // .XX.
      // X..X
      // .XX.
      const offsets: Array<[number, number]> = [
        [1, 0], [2, 0],
        [0, 1], [3, 1],
        [1, 2], [2, 2],
      ];
      const [dx, dy] = offsets[role.slot];
      return [role.cx + dx, role.cy + dy];
    }
    case "pair":
      // Two cells side-by-side, both reading from the shared group center.
      return [role.group.cx + role.slot, role.group.cy];
    case "triple":
      // Three cells in a row.
      return [role.group.cx + role.slot, role.group.cy];
    case "drifter":
      return [role.px, role.py];
  }
}

/** Random direction vector, including diagonals. */
const WALKER_DIRS: Array<[number, number]> = [
  [-1, 0], [1, 0], [0, -1], [0, 1],
  [-1, -1], [1, 1], [-1, 1], [1, -1],
];

/** Pick a fresh random direction for a walker group, biased away from the
 *  nearest region wall when one is close — so groups don't keep hammering
 *  against the edge they just hit. */
function pickWalkerDir(
  g: WalkerGroup,
  groupWidth: number,
  region: ChaosRegion
): [number, number] {
  const margin = 2;
  let allowed = WALKER_DIRS.slice();
  if (g.cx <= region.minCol + margin) allowed = allowed.filter(([dx]) => dx >= 0);
  if (g.cx + groupWidth >= region.maxCol - margin) allowed = allowed.filter(([dx]) => dx <= 0);
  if (g.cy <= region.minRow + margin) allowed = allowed.filter(([, dy]) => dy >= 0);
  if (g.cy >= region.maxRow - margin) allowed = allowed.filter(([, dy]) => dy <= 0);
  if (allowed.length === 0) allowed = WALKER_DIRS;
  return allowed[Math.floor(Math.random() * allowed.length)];
}

/** Advance all chaos roles by one generation: drifters wander, walker groups
 *  move along their current direction (and occasionally reroll it). Group
 *  references are shared, so all members of a pair/triple stay in formation.
 *
 *  All motion is clamped/bounced inside the chaos region — particles never
 *  travel out to the canvas edges, they stay clustered around the center
 *  where the blooms appear. Both drifters and walkers also pause some
 *  fraction of generations so the motion feels like idle wandering. */
function advanceChaos(particles: Particle[], region: ChaosRegion): void {
  const dirs9: Array<[number, number]> = [
    [0, 0], [-1, 0], [1, 0], [0, -1], [0, 1],
    [-1, -1], [1, 1], [-1, 1], [1, -1],
  ];

  // Drifters: pause half the time, then take a 1-cell random step.
  for (const p of particles) {
    if (p.chaos.type !== "drifter") continue;
    if (Math.random() < 0.55) continue;
    const [dx, dy] = dirs9[Math.floor(Math.random() * dirs9.length)];
    p.chaos.px = Math.max(region.minCol, Math.min(region.maxCol, p.chaos.px + dx));
    p.chaos.py = Math.max(region.minRow, Math.min(region.maxRow, p.chaos.py + dy));
  }

  // Advance walker groups exactly once per group (dedup via Set).
  const seen = new Set<WalkerGroup>();
  for (const p of particles) {
    if (p.chaos.type !== "pair" && p.chaos.type !== "triple") continue;
    const g = p.chaos.group;
    if (seen.has(g)) continue;
    seen.add(g);

    if (Math.random() < 0.35) continue;

    const groupWidth = p.chaos.type === "pair" ? 2 : 3;
    const nx = g.cx + g.dx;
    const ny = g.cy + g.dy;

    // If we'd cross a region boundary, clamp + pick a fresh direction
    // biased away from that wall. Soft turn rather than reflection.
    if (
      nx < region.minCol ||
      nx + groupWidth > region.maxCol ||
      ny < region.minRow ||
      ny > region.maxRow
    ) {
      g.cx = Math.max(region.minCol, Math.min(region.maxCol - groupWidth, g.cx));
      g.cy = Math.max(region.minRow, Math.min(region.maxRow, g.cy));
      const [dx, dy] = pickWalkerDir(g, groupWidth, region);
      g.dx = dx;
      g.dy = dy;
      g.cooldown = 4 + Math.floor(Math.random() * 5);
      continue;
    }

    g.cx = nx;
    g.cy = ny;

    g.cooldown--;
    if (g.cooldown <= 0) {
      const [dx, dy] = pickWalkerDir(g, groupWidth, region);
      g.dx = dx;
      g.dy = dy;
      g.cooldown = 4 + Math.floor(Math.random() * 5);
    }
  }
}

/** Build the fixed pool of particles at session start. Each particle gets:
 *  - a permanent chaos role (blinker / block / beehive / drifter)
 *  - a permanent home in each bloom (or null if no role for that bloom)
 *  - an initial position from its chaos role
 */
function buildParticles(
  cols: number,
  rows: number
): { particles: Particle[]; chaosRegion: ChaosRegion } {
  const rusenCells = getTextCells("RUŞEN", GLYPHS, cols, rows);
  const heartCells = getSingleCenteredCells(GLYPHS.HEART, cols, rows);
  const beyzaCells = getTextCells("BEYZA", GLYPHS, cols, rows);

  // Compute the chaos region — the bounding box of every glyph plus a
  // margin. All chaos roles live inside this region, so particles never
  // wander to the canvas edges and the chaos→bloom transit stays short.
  const allCells = [...rusenCells, ...heartCells, ...beyzaCells];
  let minCol = cols, maxCol = 0, minRow = rows, maxRow = 0;
  for (const [c, r] of allCells) {
    if (c < minCol) minCol = c;
    if (c > maxCol) maxCol = c;
    if (r < minRow) minRow = r;
    if (r > maxRow) maxRow = r;
  }
  const marginH = Math.max(6, Math.floor(cols * 0.08));
  const marginV = Math.max(8, Math.floor(rows * 0.12));
  const chaosRegion: ChaosRegion = {
    minCol: Math.max(1, minCol - marginH),
    maxCol: Math.min(cols - 2, maxCol + marginH),
    minRow: Math.max(1, minRow - marginV),
    maxRow: Math.min(rows - 2, maxRow + marginV),
  };

  // Decide pool size. We want enough particles for the largest glyph plus a
  // small amount of "atmosphere" — but not so much that the bloom looks
  // surrounded by noise dots. Solo drifters get hidden during blooms anyway.
  const isPhone = typeof window !== "undefined" && window.innerWidth < 768;
  const targetN = Math.max(rusenCells.length, beyzaCells.length) + (isPhone ? 12 : 20);
  const N = Math.max(targetN, heartCells.length);

  // Distribution of chaos roles (rough proportions — fill remainder with drifters).
  // Walking groups (pair/triple) are intentionally sparse: a few per scene
  // is enough to feel "alive" without making the field feel restless.
  const numBlinkers = isPhone ? 5 : 8;
  const numBlocks = isPhone ? 3 : 5;
  const numBeehives = isPhone ? 2 : 3;
  const numPairs = isPhone ? 2 : 4;
  const numTriples = isPhone ? 2 : 3;

  const roles: ChaosRole[] = [];

  // Random col/row helpers anchored to the chaos region (not the canvas).
  const regionCols = Math.max(1, chaosRegion.maxCol - chaosRegion.minCol - 3);
  const regionRows = Math.max(1, chaosRegion.maxRow - chaosRegion.minRow - 3);
  const randCol = () => chaosRegion.minCol + Math.floor(Math.random() * regionCols);
  const randRow = () => chaosRegion.minRow + Math.floor(Math.random() * regionRows);
  const randDir = (): [number, number] =>
    WALKER_DIRS[Math.floor(Math.random() * WALKER_DIRS.length)];

  for (let i = 0; i < numBlinkers; i++) {
    const cx = randCol();
    const cy = randRow();
    for (let s = 0; s < 3; s++) {
      roles.push({ type: "blinker", cx, cy, slot: s as 0 | 1 | 2 });
    }
  }
  for (let i = 0; i < numBlocks; i++) {
    const cx = randCol();
    const cy = randRow();
    for (let s = 0; s < 4; s++) {
      roles.push({ type: "block", cx, cy, slot: s as 0 | 1 | 2 | 3 });
    }
  }
  for (let i = 0; i < numBeehives; i++) {
    const cx = randCol();
    const cy = randRow();
    for (let s = 0; s < 6; s++) {
      roles.push({
        type: "beehive",
        cx, cy,
        slot: s as 0 | 1 | 2 | 3 | 4 | 5,
      });
    }
  }
  // Walker groups start with extra margin from the chaos-region walls so
  // they don't begin life slamming into a boundary.
  const walkerInset = 3;
  const walkerCols = Math.max(1, regionCols - walkerInset * 2);
  const walkerRows = Math.max(1, regionRows - walkerInset * 2);
  const safeCol = () =>
    chaosRegion.minCol + walkerInset + Math.floor(Math.random() * walkerCols);
  const safeRow = () =>
    chaosRegion.minRow + walkerInset + Math.floor(Math.random() * walkerRows);

  for (let i = 0; i < numPairs; i++) {
    const [dx, dy] = randDir();
    const group: WalkerGroup = {
      cx: safeCol(),
      cy: safeRow(),
      dx,
      dy,
      cooldown: 4 + Math.floor(Math.random() * 5),
    };
    for (let s = 0; s < 2; s++) {
      roles.push({ type: "pair", group, slot: s as 0 | 1 });
    }
  }
  for (let i = 0; i < numTriples; i++) {
    const [dx, dy] = randDir();
    const group: WalkerGroup = {
      cx: safeCol(),
      cy: safeRow(),
      dx,
      dy,
      cooldown: 4 + Math.floor(Math.random() * 5),
    };
    for (let s = 0; s < 3; s++) {
      roles.push({ type: "triple", group, slot: s as 0 | 1 | 2 });
    }
  }
  // Pad with drifters until we hit N.
  while (roles.length < N) {
    roles.push({
      type: "drifter",
      px: Math.floor(Math.random() * cols),
      py: Math.floor(Math.random() * rows),
    });
  }
  // Shuffle so glyph-home assignment doesn't put all blinkers at the start of
  // the glyph (which would make blinker oscillation visible during blooms).
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }

  // Assign glyph homes by ID. Particle id i gets the i-th cell of each glyph
  // (or null if i is past the glyph's cell count).
  const particles: Particle[] = [];
  for (let id = 0; id < roles.length; id++) {
    const role = roles[id];
    const initial = chaosCellOf(role, 0);
    particles.push({
      id,
      x: initial[0],
      y: initial[1],
      tx: initial[0],
      ty: initial[1],
      red: false,
      visible: true,
      rusenHome: id < rusenCells.length ? rusenCells[id] : null,
      heartHome: id < heartCells.length ? heartCells[id] : null,
      beyzaHome: id < beyzaCells.length ? beyzaCells[id] : null,
      chaos: role,
    });
  }
  return { particles, chaosRegion };
}

/** Compute targets for every particle based on the phase. Particles with a
 *  glyph home for the current phase target their home; everyone else (and
 *  every particle during chaos) targets their chaos role at this generation. */
function refreshTargets(
  particles: Particle[],
  phase: PhaseName,
  generation: number
): void {
  const isBloom = phase !== "chaos";
  const bloomBounds = isBloom
    ? getBloomBounds(particles, phase, BLOOM_CLEAR_RADIUS_CELLS)
    : null;

  for (const p of particles) {
    let home: [number, number] | null = null;
    let red = false;
    if (phase === "rusen") {
      home = p.rusenHome;
    } else if (phase === "heart") {
      home = p.heartHome;
      if (home) red = true;
    } else if (phase === "beyza") {
      home = p.beyzaHome;
    }
    if (home) {
      p.tx = home[0];
      p.ty = home[1];
      p.red = red;
      p.visible = true;
    } else {
      const [cx, cy] = chaosCellOf(p.chaos, generation);
      p.tx = cx;
      p.ty = cy;
      p.red = false;
      // Keep the atmosphere during blooms, but carve a padded quiet zone
      // around the active symbol so stray cells don't muddy the letterforms.
      p.visible =
        !isBloom ||
        !bloomBounds ||
        (!containsCell(bloomBounds, p.x, p.y) &&
          !containsCell(bloomBounds, cx, cy));
    }
  }
}

function getBloomBounds(
  particles: Particle[],
  phase: Exclude<PhaseName, "chaos">,
  radius: number
): CellBounds {
  let minCol = Infinity;
  let maxCol = -Infinity;
  let minRow = Infinity;
  let maxRow = -Infinity;

  for (const p of particles) {
    const home =
      phase === "rusen"
        ? p.rusenHome
        : phase === "heart"
          ? p.heartHome
          : p.beyzaHome;

    if (!home) continue;
    const [col, row] = home;
    minCol = Math.min(minCol, col);
    maxCol = Math.max(maxCol, col);
    minRow = Math.min(minRow, row);
    maxRow = Math.max(maxRow, row);
  }

  return {
    minCol: minCol - radius,
    maxCol: maxCol + radius,
    minRow: minRow - radius,
    maxRow: maxRow + radius,
  };
}

function containsCell(bounds: CellBounds, col: number, row: number): boolean {
  return (
    col >= bounds.minCol &&
    col <= bounds.maxCol &&
    row >= bounds.minRow &&
    row <= bounds.maxRow
  );
}

/** Manhattan king-step toward target (one cell per axis per call). */
function stepParticle(p: Particle): void {
  if (p.x < p.tx) p.x++;
  else if (p.x > p.tx) p.x--;
  if (p.y < p.ty) p.y++;
  else if (p.y > p.ty) p.y--;
}

export default function Garden() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [speed, setSpeed] = useState<number>(SPEED_DEFAULT);
  const [paused, setPaused] = useState<boolean>(false);
  // The slider stays human-scaled (1.0x is "normal"), while the simulation
  // gets a slightly quicker base tempo so the opening pace feels livelier.
  // Refs keep the controls responsive without rebuilding particles.
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

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

    const { particles, chaosRegion } = buildParticles(cols, rows);

    let generation = 0;
    let phaseStartGen = 0;
    const phaseNameRef = { current: PHASES[0].name as PhaseName };
    let phaseIndex = 0;

    refreshTargets(particles, PHASES[0].name, generation);

    // Two recursive setTimeouts. Each reads speed and pause state off refs
    // every iteration, so the slider/pause controls are responsive without
    // tearing down and rebuilding the whole simulation.
    //
    // Phase advancement is folded into the generation tick (counting gens
    // instead of milliseconds), which means a single `paused` check freezes
    // everything cleanly: particles don't step, generations don't advance,
    // phases don't advance. Resume picks up exactly where pause left off.

    let stepTimeout: ReturnType<typeof setTimeout>;
    const stepTick = () => {
      if (!pausedRef.current) {
        for (const p of particles) stepParticle(p);
      }
      stepTimeout = setTimeout(
        stepTick,
        STEP_MS / (speedRef.current * SPEED_BASE_MULTIPLIER)
      );
    };
    stepTimeout = setTimeout(
      stepTick,
      STEP_MS / (speedRef.current * SPEED_BASE_MULTIPLIER)
    );

    let genTimeout: ReturnType<typeof setTimeout>;
    const genTick = () => {
      if (!pausedRef.current) {
        generation++;
        advanceChaos(particles, chaosRegion);

        // Time to advance phase? Compare elapsed gens against the phase's
        // configured duration converted to gens.
        const phaseGens = Math.max(
          1,
          Math.ceil(PHASES[phaseIndex].durationMs / GEN_MS)
        );
        if (generation - phaseStartGen >= phaseGens) {
          phaseIndex = (phaseIndex + 1) % PHASES.length;
          phaseNameRef.current = PHASES[phaseIndex].name;
          phaseStartGen = generation;
        }

        refreshTargets(particles, phaseNameRef.current, generation);
      }
      genTimeout = setTimeout(
        genTick,
        GEN_MS / (speedRef.current * SPEED_BASE_MULTIPLIER)
      );
    };
    genTimeout = setTimeout(
      genTick,
      GEN_MS / (speedRef.current * SPEED_BASE_MULTIPLIER)
    );

    let rafHandle = 0;
    const draw = () => {
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, cols * cellSize, rows * cellSize);

      ctx.fillStyle = FG_PINK;
      ctx.shadowColor = FG_PINK;
      ctx.shadowBlur = 3;
      for (const p of particles) {
        if (!p.visible || p.red) continue;
        ctx.fillRect(p.x * cellSize, p.y * cellSize, cellSize, cellSize);
      }

      ctx.fillStyle = FG_HEART;
      ctx.shadowColor = FG_HEART;
      ctx.shadowBlur = 5;
      for (const p of particles) {
        if (!p.visible || !p.red) continue;
        ctx.fillRect(p.x * cellSize, p.y * cellSize, cellSize, cellSize);
      }

      rafHandle = requestAnimationFrame(draw);
    };
    rafHandle = requestAnimationFrame(draw);

    return () => {
      clearTimeout(genTimeout);
      clearTimeout(stepTimeout);
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
      <div
        style={{
          position: "fixed",
          bottom: 16,
          right: 16,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 12px",
          background: "rgba(255, 255, 255, 0.06)",
          backdropFilter: "blur(6px)",
          borderRadius: 10,
          color: "rgba(255, 255, 255, 0.85)",
          fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
          fontSize: 12,
          letterSpacing: "0.05em",
          userSelect: "none",
        }}
      >
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-label={paused ? "Resume" : "Pause"}
          style={{
            border: 0,
            background: "rgba(255, 255, 255, 0.1)",
            color: "white",
            width: 28,
            height: 24,
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 11,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {paused ? "▶" : "❚❚"}
        </button>
        <span style={{ opacity: 0.7 }}>speed</span>
        <input
          type="range"
          min={SPEED_MIN}
          max={SPEED_MAX}
          step={SPEED_STEP}
          value={speed}
          onChange={(e) => setSpeed(parseFloat(e.target.value))}
          style={{ width: 110, accentColor: FG_PINK }}
          aria-label="Animation speed"
        />
        <span
          style={{
            minWidth: 36,
            textAlign: "right",
            fontVariantNumeric: "tabular-nums",
            opacity: 0.85,
          }}
        >
          {speed.toFixed(1)}×
        </span>
      </div>
    </main>
  );
}
