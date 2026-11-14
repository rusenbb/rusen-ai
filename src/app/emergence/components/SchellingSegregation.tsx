"use client";

import { useSimulation } from "./SimulationFrame";
import { Button, Slider } from "@/components/ui";
import { mix, usePalette } from "../theme";

import { useMemo, useRef, useState, useCallback, useEffect } from "react";

// --- Types ---

const EMPTY = -1;
const BLUE = 0;
const ORANGE = 1;
type CellType = -1 | 0 | 1;

interface Stats {
  happyPercent: number;
  avgSimilarity: number;
}

// --- Constants ---

const GRID_SIZE = 50;
const CELL_COUNT = GRID_SIZE * GRID_SIZE;
const BLUE_FRAC = 0.45;
const ORANGE_FRAC = 0.45;

const NEIGHBOR_OFFSETS: [number, number][] = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

// --- Grid helpers ---

function createRandomGrid(random: () => number): Int8Array {
  const grid = new Int8Array(CELL_COUNT);
  const blueCount = Math.floor(CELL_COUNT * BLUE_FRAC);
  const orangeCount = Math.floor(CELL_COUNT * ORANGE_FRAC);

  // Fill deterministically then shuffle
  let idx = 0;
  for (let i = 0; i < blueCount; i++) grid[idx++] = BLUE;
  for (let i = 0; i < orangeCount; i++) grid[idx++] = ORANGE;
  while (idx < CELL_COUNT) grid[idx++] = EMPTY;

  // Fisher-Yates shuffle
  for (let i = CELL_COUNT - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const tmp = grid[i];
    grid[i] = grid[j];
    grid[j] = tmp;
  }

  return grid;
}

function getSimilarityRatio(
  grid: Int8Array,
  row: number,
  col: number
): { sameCount: number; totalNeighbors: number } {
  const cell = grid[row * GRID_SIZE + col] as CellType;
  if (cell === EMPTY) return { sameCount: 0, totalNeighbors: 0 };

  let sameCount = 0;
  let totalNeighbors = 0;

  for (const [dr, dc] of NEIGHBOR_OFFSETS) {
    const nr = row + dr;
    const nc = col + dc;
    if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) continue;
    const neighbor = grid[nr * GRID_SIZE + nc] as CellType;
    if (neighbor === EMPTY) continue;
    totalNeighbors++;
    if (neighbor === cell) sameCount++;
  }

  return { sameCount, totalNeighbors };
}

function isHappy(
  grid: Int8Array,
  row: number,
  col: number,
  threshold: number
): boolean {
  const cell = grid[row * GRID_SIZE + col] as CellType;
  if (cell === EMPTY) return true;

  const { sameCount, totalNeighbors } = getSimilarityRatio(grid, row, col);
  if (totalNeighbors === 0) return true; // No neighbors = satisfied
  return sameCount / totalNeighbors >= threshold;
}

function computeStats(grid: Int8Array, threshold: number): Stats {
  let totalAgents = 0;
  let happyAgents = 0;
  let totalSimilarity = 0;

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const cell = grid[r * GRID_SIZE + c] as CellType;
      if (cell === EMPTY) continue;
      totalAgents++;

      const { sameCount, totalNeighbors } = getSimilarityRatio(grid, r, c);
      const ratio = totalNeighbors === 0 ? 1 : sameCount / totalNeighbors;
      totalSimilarity += ratio;

      if (isHappy(grid, r, c, threshold)) {
        happyAgents++;
      }
    }
  }

  return {
    happyPercent: totalAgents === 0 ? 100 : (happyAgents / totalAgents) * 100,
    avgSimilarity:
      totalAgents === 0 ? 0 : (totalSimilarity / totalAgents) * 100,
  };
}

function stepGrid(grid: Int8Array, threshold: number, random: () => number): Int8Array {
  const next = new Int8Array(grid);

  // Collect unhappy agents and empty cells
  const unhappy: number[] = [];
  const emptyCells: number[] = [];

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const idx = r * GRID_SIZE + c;
      const cell = grid[idx] as CellType;
      if (cell === EMPTY) {
        emptyCells.push(idx);
      } else if (!isHappy(grid, r, c, threshold)) {
        unhappy.push(idx);
      }
    }
  }

  // Shuffle unhappy agents
  for (let i = unhappy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const tmp = unhappy[i];
    unhappy[i] = unhappy[j];
    unhappy[j] = tmp;
  }

  // Move each unhappy agent to a random empty cell
  for (const agentIdx of unhappy) {
    if (emptyCells.length === 0) break;
    const emptyPick = Math.floor(random() * emptyCells.length);
    const emptyIdx = emptyCells[emptyPick];

    next[emptyIdx] = next[agentIdx];
    next[agentIdx] = EMPTY;

    // The agent's old position is now empty, the target is now occupied
    emptyCells[emptyPick] = agentIdx;
  }

  return next;
}

// --- Neighbor diagram component ---

function NeighborDiagram({ threshold }: { threshold: number }) {
  // A 3x3 grid showing a center agent and its neighbors
  // Center is blue, some neighbors are blue, some orange
  const layout: CellType[][] = [
    [ORANGE, BLUE, EMPTY],
    [ORANGE, BLUE, BLUE],
    [EMPTY, ORANGE, ORANGE],
  ];

  // Count for the center cell (1,1)
  let same = 0;
  let total = 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = 1 + dr;
      const nc = 1 + dc;
      const val = layout[nr][nc];
      if (val === EMPTY) continue;
      total++;
      if (val === BLUE) same++;
    }
  }
  const ratio = total === 0 ? 0 : same / total;
  const happy = ratio >= threshold;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="grid grid-cols-3 gap-1">
        {layout.flat().map((cell, i) => {
          const isCenter = i === 4;
          return (
            <div
              key={i}
              className={`w-8 h-8 rounded-sm flex items-center justify-center text-[10px] font-mono ${
                isCenter ? "ring-2 ring-line" : ""
              }`}
              style={{
                backgroundColor:
                  cell === BLUE
                    ? "var(--accent)"
                    : cell === ORANGE
                      ? "var(--accent-2)"
                      : "color-mix(in srgb, var(--foreground) 8%, transparent)",
                opacity: cell === EMPTY ? 0.4 : 1,
              }}
            >
              {isCenter ? "me" : cell === EMPTY ? "" : ""}
            </div>
          );
        })}
      </div>
      <div className="text-xs text-muted text-center font-mono">
        {same}/{total} similar neighbors ({Math.round(ratio * 100)}%)
        <br />
        <span
          className={`font-semibold ${happy ? "text-accent-4" : "text-danger"}`}
        >
          {happy ? "Happy" : "Unhappy"} at {Math.round(threshold * 100)}%
          threshold
        </span>
      </div>
    </div>
  );
}

// --- Main component ---

export default function SchellingSegregation() {
  const { active, random } = useSimulation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const palette = usePalette();
  const initialGrid = useMemo(() => createRandomGrid(random), [random]);
  const gridRef = useRef<Int8Array>(initialGrid);
  const happyMapRef = useRef<Uint8Array>(new Uint8Array(CELL_COUNT));
  const [threshold, setThreshold] = useState(0.33);
  const [stats, setStats] = useState<Stats>({ happyPercent: 0, avgSimilarity: 0 });
  const [running, setRunning] = useState(false);
  const [stepCount, setStepCount] = useState(0);
  const [speed, setSpeed] = useState(80); // ms between rounds
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const thresholdRef = useRef(threshold);
  const speedRef = useRef(speed);

  // Keep refs in sync
  useEffect(() => {
    thresholdRef.current = threshold;
  }, [threshold]);
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  // --- Rendering ---

  const drawGrid = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const displayW = canvas.clientWidth;
    const displayH = canvas.clientHeight;
    const pixelW = Math.round(displayW * dpr);
    const pixelH = Math.round(displayH * dpr);

    if (canvas.width !== pixelW || canvas.height !== pixelH) {
      canvas.width = pixelW;
      canvas.height = pixelH;
    }

    ctx.fillStyle = palette.surface;
    ctx.fillRect(0, 0, pixelW, pixelH);

    const grid = gridRef.current;
    const happyMap = happyMapRef.current;
    const cellW = pixelW / GRID_SIZE;
    const cellH = pixelH / GRID_SIZE;
    const gap = Math.max(0.5, cellW * 0.06);

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const idx = r * GRID_SIZE + c;
        const cell = grid[idx] as CellType;
        const x = c * cellW + gap;
        const y = r * cellH + gap;
        const w = cellW - gap * 2;
        const h = cellH - gap * 2;

        if (cell === EMPTY) {
          ctx.fillStyle = mix(palette.foreground, 8);
          ctx.fillRect(x, y, w, h);
          continue;
        }

        const happy = happyMap[idx] === 1;

        if (cell === BLUE) {
          ctx.fillStyle = palette.accent;
        } else {
          ctx.fillStyle = palette.accent2;
        }

        ctx.globalAlpha = happy ? 1.0 : 0.6;
        ctx.fillRect(x, y, w, h);

        // Subtle stress indicator for unhappy agents
        if (!happy) {
          ctx.strokeStyle = mix(palette.foreground, 40);
          ctx.lineWidth = Math.max(1, cellW * 0.08);
          ctx.strokeRect(x, y, w, h);
        }

        ctx.globalAlpha = 1.0;
      }
    }
  }, [palette]);

  const updateHappyMap = useCallback(() => {
    const grid = gridRef.current;
    const happyMap = happyMapRef.current;
    const th = thresholdRef.current;
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        happyMap[r * GRID_SIZE + c] = isHappy(grid, r, c, th) ? 1 : 0;
      }
    }
  }, []);

  const refreshDisplay = useCallback(() => {
    updateHappyMap();
    setStats(computeStats(gridRef.current, thresholdRef.current));
    drawGrid();
  }, [drawGrid, updateHappyMap]);

  // Initial draw + redraw on threshold change
  useEffect(() => {
    refreshDisplay();
  }, [refreshDisplay, threshold]);

  // Handle window resize
  useEffect(() => {
    const onResize = () => drawGrid();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [drawGrid]);

  // --- Simulation step ---

  const doStep = useCallback(() => {
    gridRef.current = stepGrid(gridRef.current, thresholdRef.current, random);
    setStepCount((s) => s + 1);
    refreshDisplay();
  }, [random, refreshDisplay]);

  // --- Auto-run loop ---

  useEffect(() => {
    if (!running || !active) {
      if (intervalRef.current !== null) {
        clearTimeout(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const tick = () => {
      doStep();
      intervalRef.current = setTimeout(tick, speedRef.current);
    };
    intervalRef.current = setTimeout(tick, speedRef.current);

    return () => {
      if (intervalRef.current !== null) {
        clearTimeout(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [running, active, doStep]);

  // --- Controls ---

  const handleReset = useCallback(() => {
    setRunning(false);
    gridRef.current = createRandomGrid(random);
    setStepCount(0);
    refreshDisplay();
  }, [random, refreshDisplay]);

  const handleThresholdChange = useCallback(
    (newThreshold: number) => {
      setThreshold(newThreshold);
      thresholdRef.current = newThreshold;
      // Reset and auto-run to show the effect
      gridRef.current = createRandomGrid(random);
      setStepCount(0);
      setRunning(true);
    },
    [random]
  );

  return (
    <section className="w-full max-w-4xl mx-auto">
      {/* Heading */}
      <div className="mb-8">
        <h2 className="text-2xl sm:text-3xl font-mono font-bold text-foreground mb-2">
          Schelling&apos;s Segregation
        </h2>
        <p className="text-base sm:text-lg text-muted">
          Mild preferences. Extreme outcomes.
        </p>
      </div>

      {/* Rules */}
      <div className="mb-8 space-y-4">
        <p className="text-sm sm:text-base text-foreground leading-relaxed">
          A grid of agents, two types. Each agent has a{" "}
          <strong className="text-foreground">
            tolerance threshold
          </strong>
          : &ldquo;I&apos;m happy if at least X% of my neighbors are like
          me.&rdquo; Unhappy agents move to a random empty cell.
        </p>
        <p className="text-sm sm:text-base text-foreground leading-relaxed">
          That&apos;s it. No bias, no hostility. Just a mild preference
          for similarity.
        </p>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="border border-line bg-surface/50 p-4">
            <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-sub">
              What It Is
            </div>
            <p className="mt-2 text-sm text-foreground">
              A relocation model where unhappy agents move until their neighborhood feels acceptable.
            </p>
          </div>
          <div className="border border-line bg-surface/50 p-4">
            <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-sub">
              Why It Matters
            </div>
            <p className="mt-2 text-sm text-foreground">
              It shows how systems can become polarized without any single agent aiming for a polarized outcome.
            </p>
          </div>
          <div className="border border-line bg-surface/50 p-4">
            <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-sub">
              What To Notice
            </div>
            <p className="mt-2 text-sm text-foreground">
              Raise the threshold only a little and watch global clustering appear much faster than intuition says it should.
            </p>
          </div>
        </div>

        {/* Neighbor explanation */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 p-4 border border-line bg-surface/50">
          <NeighborDiagram threshold={threshold} />
          <div className="text-xs sm:text-sm text-muted leading-relaxed">
            Each agent checks its 8 surrounding neighbors. If the fraction of
            same-type neighbors falls below the threshold, the agent is unhappy
            and will relocate.
            <br />
            <span className="text-muted">
              Edge and corner cells have fewer neighbors (5 or 3).
            </span>
          </div>
        </div>
      </div>

      {/* Interactive demo */}
      <div className="space-y-4">
        {/* Threshold slider - the star */}
        <div className="p-4 border border-line bg-surface/50">
          <Slider
            label="Tolerance threshold"
            value={Math.round(threshold * 100)}
            min={0}
            max={75}
            step={1}
            display={<span className="text-2xl sm:text-3xl font-bold">{Math.round(threshold * 100)}%</span>}
            onChange={(value) => handleThresholdChange(value / 100)}
          />
          <div className="flex justify-between text-[10px] font-mono text-sub mt-1">
            <span>0% (no preference)</span>
            <span>33%</span>
            <span>50%</span>
            <span>75% (extreme)</span>
          </div>
        </div>

        {/* Canvas */}
        <div className="overflow-hidden border border-line">
          <canvas
            ref={canvasRef}
            className="w-full block"
            style={{ height: 400, imageRendering: "pixelated" }}
            role="img"
            aria-label={`Schelling segregation grid after ${stepCount} steps. ${stats.happyPercent.toFixed(1)} percent of agents are satisfied; average neighborhood similarity is ${stats.avgSimilarity.toFixed(1)} percent.`}
          />
        </div>

        {/* Controls + Stats row */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" onClick={doStep} disabled={running}>
              Step
            </Button>
            <Button size="sm" variant={running ? "danger" : "success"} onClick={() => setRunning((r) => !r)}>
              {running ? "Pause" : "Play"}
            </Button>
            <Button size="sm" onClick={handleReset}>
              Reset
            </Button>

            {/* Speed slider */}
            <Slider
              className="ml-2 w-32"
              label="Speed"
              min={10}
              max={300}
              step={10}
              value={310 - speed}
              display=""
              onChange={(value) => setSpeed(310 - value)}
            />
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 sm:ml-auto text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-sub">Round</span>
              <span className="text-foreground tabular-nums font-semibold">
                {stepCount}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sub">Happy</span>
              <span
                className={`tabular-nums font-semibold ${
                  stats.happyPercent > 90
                    ? "text-accent-4"
                    : stats.happyPercent > 60
                      ? "text-accent-2"
                      : "text-danger"
                }`}
              >
                {stats.happyPercent.toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sub">Avg similarity</span>
              <span className="text-foreground tabular-nums font-semibold">
                {stats.avgSimilarity.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Takeaway */}
      <div className="mt-10 space-y-4 text-sm sm:text-base text-foreground leading-relaxed">
        <p>
          Nobody wanted segregation. Every agent just wanted 1 in 3 neighbors to
          be similar.
        </p>
        <p className="text-muted">
          Thomas Schelling shared the 2005 Nobel Prize in Economics for his
          game-theoretic analysis of conflict and cooperation.
        </p>
        <p>
          Emergence isn&apos;t always beautiful. Sometimes simple rules produce
          outcomes nobody intended.
        </p>
        <p className="text-muted">
          The important shift is from motives to outcomes: local comfort can still generate global separation.
        </p>
      </div>
    </section>
  );
}
