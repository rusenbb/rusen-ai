"use client";

import { useEffect, useRef } from "react";
import { GLYPHS, type Glyph, type GlyphMap } from "./glyphs";

const BG = "#0a0a0f";
const FG_PINK = "#f9a8d4";
const FG_RED = "#ef4444";
const STEP_MS = 170; // particle step cadence — deliberately slow so formation
                     // reads as a state transition rather than a sprint
const GEN_MS = 400; // generation cadence — chaos roles advance one generation

const CHAOS_MS = 7000;
const BLOOM_MS = 10500;

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
  /** Where this particle lives during each bloom — null if it has no role
   *  in that bloom (in which case it stays in its chaos role). */
  rusenHome: [number, number] | null;
  heartHome: [number, number] | null;
  beyzaHome: [number, number] | null;
  chaos: ChaosRole;
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
 *  nearest wall when one is close — so groups don't keep hammering against
 *  the edge they just hit. */
function pickWalkerDir(
  g: WalkerGroup,
  groupWidth: number,
  cols: number,
  rows: number
): [number, number] {
  const margin = 2;
  let allowed = WALKER_DIRS.slice();
  if (g.cx <= margin) allowed = allowed.filter(([dx]) => dx >= 0);
  if (g.cx + groupWidth >= cols - margin) allowed = allowed.filter(([dx]) => dx <= 0);
  if (g.cy <= margin) allowed = allowed.filter(([, dy]) => dy >= 0);
  if (g.cy >= rows - margin) allowed = allowed.filter(([, dy]) => dy <= 0);
  if (allowed.length === 0) allowed = WALKER_DIRS;
  return allowed[Math.floor(Math.random() * allowed.length)];
}

/** Advance all chaos roles by one generation: drifters wander, walker groups
 *  move along their current direction (and occasionally reroll it). Group
 *  references are shared, so all members of a pair/triple stay in formation.
 *
 *  Both drifters and walkers have a chance to *pause* each generation, so the
 *  motion feels like idle wandering instead of relentless travel. */
function advanceChaos(particles: Particle[], cols: number, rows: number): void {
  const dirs9: Array<[number, number]> = [
    [0, 0], [-1, 0], [1, 0], [0, -1], [0, 1],
    [-1, -1], [1, 1], [-1, 1], [1, -1],
  ];

  // Drifters: pause half the time, then take a 1-cell random step. The
  // pause makes the motion feel like a slow wander instead of jittering.
  for (const p of particles) {
    if (p.chaos.type !== "drifter") continue;
    if (Math.random() < 0.55) continue;
    const [dx, dy] = dirs9[Math.floor(Math.random() * dirs9.length)];
    p.chaos.px = Math.max(0, Math.min(cols - 1, p.chaos.px + dx));
    p.chaos.py = Math.max(0, Math.min(rows - 1, p.chaos.py + dy));
  }

  // Advance walker groups exactly once per group (dedup via Set).
  const seen = new Set<WalkerGroup>();
  for (const p of particles) {
    if (p.chaos.type !== "pair" && p.chaos.type !== "triple") continue;
    const g = p.chaos.group;
    if (seen.has(g)) continue;
    seen.add(g);

    // Walkers also pause sometimes — gives the field a calmer cadence.
    if (Math.random() < 0.35) continue;

    const groupWidth = p.chaos.type === "pair" ? 2 : 3;
    let nx = g.cx + g.dx;
    let ny = g.cy + g.dy;

    // If we'd cross an edge, don't bounce sharply — clamp position and pick
    // a fresh random direction biased *away* from the wall. Feels like a
    // soft turn rather than an immediate reflection.
    if (nx < 0 || nx + groupWidth > cols || ny < 0 || ny >= rows) {
      g.cx = Math.max(0, Math.min(cols - groupWidth, g.cx));
      g.cy = Math.max(0, Math.min(rows - 1, g.cy));
      const [dx, dy] = pickWalkerDir(g, groupWidth, cols, rows);
      g.dx = dx;
      g.dy = dy;
      g.cooldown = 4 + Math.floor(Math.random() * 5);
      continue;
    }

    g.cx = nx;
    g.cy = ny;

    // Periodically reroll direction for natural meandering.
    g.cooldown--;
    if (g.cooldown <= 0) {
      const [dx, dy] = pickWalkerDir(g, groupWidth, cols, rows);
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
function buildParticles(cols: number, rows: number): Particle[] {
  const rusenCells = getTextCells("RUŞEN", GLYPHS, cols, rows);
  const heartCells = getSingleCenteredCells(GLYPHS.HEART, cols, rows);
  const beyzaCells = getTextCells("BEYZA", GLYPHS, cols, rows);

  // Decide pool size and how many of each chaos role we want.
  // Aim for largest glyph + atmosphere; phones get fewer particles.
  const isPhone = typeof window !== "undefined" && window.innerWidth < 768;
  const targetN = Math.max(rusenCells.length, beyzaCells.length) + (isPhone ? 30 : 50);
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

  const randCol = () => 2 + Math.floor(Math.random() * Math.max(1, cols - 5));
  const randRow = () => 2 + Math.floor(Math.random() * Math.max(1, rows - 5));
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
  // Walker groups start with a margin from the edges so they don't begin
  // their lives slamming into a wall.
  const safeCol = () =>
    5 + Math.floor(Math.random() * Math.max(1, cols - 11));
  const safeRow = () =>
    5 + Math.floor(Math.random() * Math.max(1, rows - 11));

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
      rusenHome: id < rusenCells.length ? rusenCells[id] : null,
      heartHome: id < heartCells.length ? heartCells[id] : null,
      beyzaHome: id < beyzaCells.length ? beyzaCells[id] : null,
      chaos: role,
    });
  }
  return particles;
}

/** Compute targets for every particle based on the phase. Particles with a
 *  glyph home for the current phase target their home; everyone else (and
 *  every particle during chaos) targets their chaos role at this generation. */
function refreshTargets(
  particles: Particle[],
  phase: PhaseName,
  generation: number
): void {
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
    } else {
      const [cx, cy] = chaosCellOf(p.chaos, generation);
      p.tx = cx;
      p.ty = cy;
      p.red = false;
    }
  }
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

    const particles = buildParticles(cols, rows);

    let generation = 0;
    const phaseNameRef = { current: PHASES[0].name as PhaseName };
    let phaseIndex = 0;

    refreshTargets(particles, PHASES[0].name, generation);

    // Generation tick: advance chaos roles (blinkers flip, drifters drift,
    // walker groups translate) and recompute targets for every particle
    // that's in chaos / has no home for the current bloom. Glyph-home
    // particles ignore generation changes during a bloom.
    const genHandle = setInterval(() => {
      generation++;
      advanceChaos(particles, cols, rows);
      refreshTargets(particles, phaseNameRef.current, generation);
    }, GEN_MS);

    // Step tick: each particle moves one cell per axis toward its target.
    const stepHandle = setInterval(() => {
      for (const p of particles) stepParticle(p);
    }, STEP_MS);

    let phaseTimeout: ReturnType<typeof setTimeout>;
    const advancePhase = () => {
      phaseIndex = (phaseIndex + 1) % PHASES.length;
      phaseNameRef.current = PHASES[phaseIndex].name;
      refreshTargets(particles, phaseNameRef.current, generation);
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
      for (const p of particles) {
        if (!p.red) ctx.fillRect(p.x * cellSize, p.y * cellSize, cellSize, cellSize);
      }

      ctx.fillStyle = FG_RED;
      ctx.shadowColor = FG_RED;
      ctx.shadowBlur = 4;
      for (const p of particles) {
        if (p.red) ctx.fillRect(p.x * cellSize, p.y * cellSize, cellSize, cellSize);
      }

      rafHandle = requestAnimationFrame(draw);
    };
    rafHandle = requestAnimationFrame(draw);

    return () => {
      clearInterval(genHandle);
      clearInterval(stepHandle);
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
