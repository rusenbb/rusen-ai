"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Direction: 0=up, 1=right, 2=down, 3=left */
type Direction = 0 | 1 | 2 | 3;

interface AntState {
  x: number;
  y: number;
  dir: Direction;
}

interface SimState {
  /** Sparse grid: only stores black cells. Key = "x,y" */
  cells: Set<string>;
  ant: AntState;
  step: number;
  /** Bounding box of all visited cells for viewport calculation */
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

type Phase = "symmetric" | "chaos" | "pre-highway" | "highway";
type SeedPresetId = "blank" | "dot" | "plus" | "ring" | "stairs" | "scatter" | "random";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GRID_SIZE = 200; // logical grid dimension (200x200)
const HIGHWAY_STEP = 10_500; // step threshold for highway detection
const FAST_FORWARD_TARGET = 11_000;

const BG_COLOR = "#f7f3eb"; // warm paper-like white cells
const CELL_COLOR = "#111827"; // deep slate for black cells
const ANT_COLOR = "#ef4444"; // red-500
const GRID_LINE_COLOR = "rgba(17, 24, 39, 0.12)";

const SEED_PRESETS: Array<{
  id: SeedPresetId;
  label: string;
  description: string;
  cells: Array<[number, number]>;
}> = [
  {
    id: "blank",
    label: "Blank",
    description: "Classic empty white plane.",
    cells: [],
  },
  {
    id: "dot",
    label: "Dot",
    description: "A single black cell at the start.",
    cells: [[0, 0]],
  },
  {
    id: "plus",
    label: "Plus",
    description: "Five black cells centered on the ant.",
    cells: [
      [0, 0],
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ],
  },
  {
    id: "ring",
    label: "Ring",
    description: "A small finite loop around the ant.",
    cells: [
      [-1, -1],
      [0, -1],
      [1, -1],
      [-1, 0],
      [1, 0],
      [-1, 1],
      [0, 1],
      [1, 1],
    ],
  },
  {
    id: "stairs",
    label: "Stairs",
    description: "A tiny staircase of black cells.",
    cells: [
      [-1, 0],
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 2],
      [2, 2],
    ],
  },
  {
    id: "scatter",
    label: "Scatter-9",
    description: "A finite scattered seed with nine black cells.",
    cells: [
      [-3, -1],
      [-2, 2],
      [-1, 0],
      [0, -2],
      [0, 1],
      [1, 3],
      [2, -1],
      [3, 1],
      [4, -2],
    ],
  },
  {
    id: "random",
    label: "Random",
    description: "20\u201360 random black cells within a 20\u00d720 area around the ant.",
    cells: [], // generated dynamically
  },
];

/** Direction vectors: [dx, dy] for up, right, down, left */
const DIR_DELTA: [number, number][] = [
  [0, -1], // up
  [1, 0], // right
  [0, 1], // down
  [-1, 0], // left
];

// ---------------------------------------------------------------------------
// Simulation logic
// ---------------------------------------------------------------------------

function generateRandomCells(): Array<[number, number]> {
  const RADIUS = 10;
  const count = 20 + Math.floor(Math.random() * 41); // 20–60
  const used = new Set<string>();
  const result: Array<[number, number]> = [];

  while (result.length < count) {
    const dx = Math.floor(Math.random() * (RADIUS * 2 + 1)) - RADIUS;
    const dy = Math.floor(Math.random() * (RADIUS * 2 + 1)) - RADIUS;
    const key = `${dx},${dy}`;
    if (!used.has(key)) {
      used.add(key);
      result.push([dx, dy]);
    }
  }

  return result;
}

function createInitialState(seedId: SeedPresetId = "blank"): SimState {
  const cx = Math.floor(GRID_SIZE / 2);
  const cy = Math.floor(GRID_SIZE / 2);
  const seed = SEED_PRESETS.find((preset) => preset.id === seedId) ?? SEED_PRESETS[0];
  const seedCells = seedId === "random" ? generateRandomCells() : seed.cells;
  const cells = new Set<string>();
  let minX = cx;
  let maxX = cx;
  let minY = cy;
  let maxY = cy;

  seedCells.forEach(([dx, dy]) => {
    const x = cx + dx;
    const y = cy + dy;
    cells.add(cellKey(x, y));
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  });

  return {
    cells,
    ant: { x: cx, y: cy, dir: 0 as Direction },
    step: 0,
    minX,
    maxX,
    minY,
    maxY,
  };
}

function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}

/** Advance the simulation by one step. Mutates state in place for performance. */
function stepOnce(state: SimState): void {
  const { ant, cells } = state;
  const key = cellKey(ant.x, ant.y);
  const isBlack = cells.has(key);

  if (isBlack) {
    // On black: turn left, flip to white
    ant.dir = ((ant.dir + 3) % 4) as Direction;
    cells.delete(key);
  } else {
    // On white: turn right, flip to black
    ant.dir = ((ant.dir + 1) % 4) as Direction;
    cells.add(key);
  }

  // Move forward
  const [dx, dy] = DIR_DELTA[ant.dir];
  ant.x += dx;
  ant.y += dy;

  // Update bounding box
  if (ant.x < state.minX) state.minX = ant.x;
  if (ant.x > state.maxX) state.maxX = ant.x;
  if (ant.y < state.minY) state.minY = ant.y;
  if (ant.y > state.maxY) state.maxY = ant.y;

  state.step++;
}

/** Run N steps without any rendering. */
function runSteps(state: SimState, n: number): void {
  for (let i = 0; i < n; i++) {
    stepOnce(state);
  }
}

// ---------------------------------------------------------------------------
// Phase detection
// ---------------------------------------------------------------------------

function getPhase(step: number): Phase {
  if (step <= 500) return "symmetric";
  if (step <= HIGHWAY_STEP) return "chaos";
  if (step <= HIGHWAY_STEP + 200) return "pre-highway";
  return "highway";
}

function getPhaseText(phase: Phase): string {
  switch (phase) {
    case "symmetric":
      return "Symmetric patterns...";
    case "chaos":
      return "Chaos. No apparent order.";
    case "pre-highway":
      return "Wait for it...";
    case "highway":
      return "The highway. Every time. Nobody knows why.";
  }
}

// ---------------------------------------------------------------------------
// Rule diagram
// ---------------------------------------------------------------------------

const DIAGRAM_CELL_SIZE = 36;
const DIAGRAM_GAP = 4;
const DIAGRAM_ARROW_LEN = 20;

function RuleDiagramPanel({
  label,
  startColor,
  endColor,
  turnLabel,
  turnDir,
}: {
  label: string;
  startColor: string;
  endColor: string;
  turnLabel: string;
  turnDir: "right" | "left";
}): React.ReactElement {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-xs text-neutral-500 font-mono">{label}</div>
      <div className="flex items-center gap-3">
        {/* Before cell */}
        <div className="flex flex-col items-center gap-1">
          <svg width={DIAGRAM_CELL_SIZE} height={DIAGRAM_CELL_SIZE} aria-hidden="true">
            <rect
              width={DIAGRAM_CELL_SIZE}
              height={DIAGRAM_CELL_SIZE}
              rx={4}
              fill={startColor}
              stroke="#525252"
              strokeWidth={1}
            />
          </svg>
          <div className="text-[10px] text-neutral-600">before</div>
        </div>

        {/* Arrow */}
        <svg
          width={DIAGRAM_ARROW_LEN + DIAGRAM_GAP}
          height={DIAGRAM_CELL_SIZE}
          aria-hidden="true"
          className="text-neutral-500"
        >
          <line
            x1={0}
            y1={DIAGRAM_CELL_SIZE / 2}
            x2={DIAGRAM_ARROW_LEN - 4}
            y2={DIAGRAM_CELL_SIZE / 2}
            stroke="currentColor"
            strokeWidth={1.5}
          />
          <polygon
            points={`${DIAGRAM_ARROW_LEN - 4},${DIAGRAM_CELL_SIZE / 2 - 4} ${DIAGRAM_ARROW_LEN + DIAGRAM_GAP},${DIAGRAM_CELL_SIZE / 2} ${DIAGRAM_ARROW_LEN - 4},${DIAGRAM_CELL_SIZE / 2 + 4}`}
            fill="currentColor"
          />
        </svg>

        {/* After cell */}
        <div className="flex flex-col items-center gap-1">
          <svg width={DIAGRAM_CELL_SIZE} height={DIAGRAM_CELL_SIZE} aria-hidden="true">
            <rect
              width={DIAGRAM_CELL_SIZE}
              height={DIAGRAM_CELL_SIZE}
              rx={4}
              fill={endColor}
              stroke="#525252"
              strokeWidth={1}
            />
          </svg>
          <div className="text-[10px] text-neutral-600">after</div>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <svg
          width={14}
          height={14}
          viewBox="0 0 14 14"
          aria-hidden="true"
          className="text-neutral-400"
        >
          {turnDir === "right" ? (
            <path
              d="M3 7 A4 4 0 0 1 11 7"
              stroke="currentColor"
              fill="none"
              strokeWidth={1.5}
              strokeLinecap="round"
              markerEnd=""
            />
          ) : (
            <path
              d="M11 7 A4 4 0 0 1 3 7"
              stroke="currentColor"
              fill="none"
              strokeWidth={1.5}
              strokeLinecap="round"
            />
          )}
          {turnDir === "right" ? (
            <polygon points="11,4 11,10 13,7" fill="currentColor" />
          ) : (
            <polygon points="3,4 3,10 1,7" fill="currentColor" />
          )}
        </svg>
        <span className="text-xs text-neutral-400 font-mono">{turnLabel}</span>
      </div>
    </div>
  );
}

function RuleDiagram(): React.ReactElement {
  return (
    <div className="flex flex-wrap justify-center gap-8 sm:gap-12 p-4 sm:p-6 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
      <RuleDiagramPanel
        label="White cell"
        startColor={BG_COLOR}
        endColor={CELL_COLOR}
        turnLabel="Turn right 90°"
        turnDir="right"
      />
      <RuleDiagramPanel
        label="Black cell"
        startColor={CELL_COLOR}
        endColor={BG_COLOR}
        turnLabel="Turn left 90°"
        turnDir="left"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function LangtonsAnt(): React.ReactElement {
  // State
  const [selectedSeed, setSelectedSeed] = useState<SeedPresetId>("blank");
  const [stepCount, setStepCount] = useState<number>(0);
  const [playing, setPlaying] = useState<boolean>(false);
  const [stepsPerFrame, setStepsPerFrame] = useState<number>(1);
  const [fastForwarding, setFastForwarding] = useState<boolean>(false);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simRef = useRef<SimState>(createInitialState("blank"));
  const animFrameRef = useRef<number>(0);
  const playingRef = useRef<boolean>(false);
  const stepsPerFrameRef = useRef<number>(1);

  // Keep refs in sync
  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    stepsPerFrameRef.current = stepsPerFrame;
  }, [stepsPerFrame]);

  // -----------------------------------------------------------------------
  // Drawing
  // -----------------------------------------------------------------------

  const drawState = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const sim = simRef.current;
    const dpr = window.devicePixelRatio || 1;
    const displayW = container.clientWidth;
    const displayH = canvas.clientHeight;
    const w = displayW * dpr;
    const h = displayH * dpr;

    // Resize canvas backing store if needed
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Clear
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, displayW, displayH);

    // Compute viewport: fit all visited cells with padding
    const spanX = sim.maxX - sim.minX + 1;
    const spanY = sim.maxY - sim.minY + 1;
    const span = Math.max(spanX, spanY, 20); // minimum zoom level
    const padding = Math.max(10, Math.floor(span * 0.15));
    const totalSpan = span + padding * 2;

    const cellPixelSize = Math.min(displayW, displayH) / totalSpan;

    // Center the viewport on the bounding box center
    const centerX = (sim.minX + sim.maxX) / 2;
    const centerY = (sim.minY + sim.maxY) / 2;
    const offsetX = displayW / 2 - (centerX - sim.minX + padding) * cellPixelSize;
    const offsetY = displayH / 2 - (centerY - sim.minY + padding) * cellPixelSize;

    if (cellPixelSize >= 5) {
      ctx.strokeStyle = GRID_LINE_COLOR;
      ctx.lineWidth = 1;
      ctx.beginPath();

      const startX = ((offsetX % cellPixelSize) + cellPixelSize) % cellPixelSize;
      for (let x = startX; x <= displayW; x += cellPixelSize) {
        ctx.moveTo(Math.round(x) + 0.5, 0);
        ctx.lineTo(Math.round(x) + 0.5, displayH);
      }

      const startY = ((offsetY % cellPixelSize) + cellPixelSize) % cellPixelSize;
      for (let y = startY; y <= displayH; y += cellPixelSize) {
        ctx.moveTo(0, Math.round(y) + 0.5);
        ctx.lineTo(displayW, Math.round(y) + 0.5);
      }

      ctx.stroke();
    }

    // Draw black cells
    ctx.fillStyle = CELL_COLOR;
    for (const key of sim.cells) {
      const commaIdx = key.indexOf(",");
      const cx = parseInt(key.substring(0, commaIdx), 10);
      const cy = parseInt(key.substring(commaIdx + 1), 10);
      const px = offsetX + (cx - sim.minX + padding) * cellPixelSize;
      const py = offsetY + (cy - sim.minY + padding) * cellPixelSize;

      // Cull off-screen cells
      if (
        px + cellPixelSize < 0 ||
        px > displayW ||
        py + cellPixelSize < 0 ||
        py > displayH
      ) {
        continue;
      }

      ctx.fillRect(
        Math.floor(px),
        Math.floor(py),
        Math.ceil(cellPixelSize),
        Math.ceil(cellPixelSize)
      );
    }

    // Draw the ant
    const antPx =
      offsetX + (sim.ant.x - sim.minX + padding) * cellPixelSize;
    const antPy =
      offsetY + (sim.ant.y - sim.minY + padding) * cellPixelSize;
    const antSize = Math.max(cellPixelSize, 3);

    ctx.fillStyle = ANT_COLOR;
    ctx.fillRect(
      Math.floor(antPx - antSize / 2 + cellPixelSize / 2),
      Math.floor(antPy - antSize / 2 + cellPixelSize / 2),
      Math.ceil(antSize),
      Math.ceil(antSize)
    );
  }, []);

  // -----------------------------------------------------------------------
  // Initialize / resize
  // -----------------------------------------------------------------------

  // Mount: initial draw + resize observer
  useEffect(() => {
    drawState();

    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      drawState();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [drawState]);

  // -----------------------------------------------------------------------
  // Step & animation
  // -----------------------------------------------------------------------

  const doStep = useCallback(() => {
    stepOnce(simRef.current);
    setStepCount(simRef.current.step);
    drawState();
  }, [drawState]);

  // Animation loop
  useEffect(() => {
    if (!playing) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = 0;
      }
      return;
    }

    const loop = (): void => {
      if (!playingRef.current) return;

      const n = stepsPerFrameRef.current;
      runSteps(simRef.current, n);
      setStepCount(simRef.current.step);
      drawState();

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = 0;
      }
    };
  }, [playing, drawState]);

  // -----------------------------------------------------------------------
  // Fast-forward
  // -----------------------------------------------------------------------

  const handleFastForward = useCallback(() => {
    setPlaying(false);
    setFastForwarding(true);

    // Use requestAnimationFrame to let the UI update before blocking
    requestAnimationFrame(() => {
      const sim = simRef.current;
      const remaining = FAST_FORWARD_TARGET - sim.step;
      if (remaining > 0) {
        // Run in chunks to avoid blocking for too long
        const chunkSize = 2000;
        let done = 0;

        const runChunk = (): void => {
          const toRun = Math.min(chunkSize, remaining - done);
          runSteps(sim, toRun);
          done += toRun;

          if (done < remaining) {
            setStepCount(sim.step);
            drawState();
            requestAnimationFrame(runChunk);
          } else {
            setStepCount(sim.step);
            drawState();
            setFastForwarding(false);
          }
        };

        requestAnimationFrame(runChunk);
      } else {
        setFastForwarding(false);
      }
    });
  }, [drawState]);

  // -----------------------------------------------------------------------
  // Reset
  // -----------------------------------------------------------------------

  const handleReset = useCallback(() => {
    setPlaying(false);
    setFastForwarding(false);
    simRef.current = createInitialState(selectedSeed);
    setStepCount(0);
    drawState();
  }, [drawState, selectedSeed]);

  const handleSeedChange = useCallback(
    (seedId: SeedPresetId) => {
      setSelectedSeed(seedId);
      setPlaying(false);
      setFastForwarding(false);
      simRef.current = createInitialState(seedId);
      setStepCount(0);
      drawState();
    },
    [drawState],
  );

  // -----------------------------------------------------------------------
  // Derived state
  // -----------------------------------------------------------------------

  const phase = getPhase(stepCount);
  const phaseText = getPhaseText(phase);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {/* Heading */}
      <div>
        <h2 className="font-mono text-2xl sm:text-3xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
          Langton&rsquo;s Ant
        </h2>
        <p className="text-neutral-500 dark:text-neutral-400 text-base sm:text-lg">
          Two rules. One unexplained mystery.
        </p>
      </div>

      {/* Rules explanation */}
      <div className="space-y-4 text-neutral-700 dark:text-neutral-300 text-sm sm:text-base leading-relaxed">
        <p>
          A single ant on an infinite grid. Every cell is either white or black.
          The ant follows two rules, and only two:
        </p>
        <ol className="list-decimal list-inside space-y-1 text-neutral-600 dark:text-neutral-400">
          <li>
            On a <strong className="text-neutral-800 dark:text-neutral-200">white</strong> cell: turn
            90° right, flip the cell to black, move forward.
          </li>
          <li>
            On a <strong className="text-neutral-800 dark:text-neutral-200">black</strong> cell: turn
            90° left, flip the cell to white, move forward.
          </li>
        </ol>

        <p className="text-neutral-600 dark:text-neutral-400">
          The conjecture is stronger than the classic empty-grid story: the
          highway appears to emerge from <strong className="text-neutral-800 dark:text-neutral-200">any finite starting set of black cells</strong>.
          Try a few seeds below and the plane stays finite, but the long-run
          behavior still appears to settle into the same kind of highway.
        </p>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 p-4">
            <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-neutral-500">
              What It Is
            </div>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
              One moving agent that writes to the grid as it walks.
            </p>
          </div>
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 p-4">
            <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-neutral-500">
              Why It Matters
            </div>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
              It is a reminder that deterministic systems can remain opaque long after they stop feeling simple.
            </p>
          </div>
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 p-4">
            <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-neutral-500">
              What To Notice
            </div>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
              The key event is not the early symmetry. It is the abrupt transition from wandering chaos to a stable diagonal highway.
            </p>
          </div>
        </div>

        <RuleDiagram />
      </div>

      {/* Step counter and phase */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6">
        <div className="font-mono text-3xl sm:text-4xl text-neutral-900 dark:text-neutral-100 tabular-nums tracking-tight">
          {stepCount.toLocaleString()}
          <span className="text-sm sm:text-base text-neutral-500 dark:text-neutral-600 ml-2">
            steps
          </span>
        </div>
        <div
          className={`text-sm font-mono transition-all duration-700 ${
            phase === "highway"
              ? "text-red-400"
              : phase === "pre-highway"
                ? "text-amber-400"
                : "text-neutral-500"
          }`}
        >
          {phaseText}
        </div>
      </div>

      {/* Canvas */}
      <div className="space-y-3">
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 p-4 space-y-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-xs font-mono uppercase tracking-[0.2em] text-neutral-500">
                Finite Black Seed
              </div>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                Swap the starting black-cell configuration and reset the ant on the same finite plane.
              </p>
            </div>
            <div className="text-xs font-mono text-neutral-500">
              White grid = infinite background, dark cells = finite seed
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {SEED_PRESETS.map((preset) => {
              const active = preset.id === selectedSeed;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSeedChange(preset.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-mono transition ${
                    active
                      ? "border-cyan-500 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300"
                      : "border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
                  }`}
                  title={preset.description}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-neutral-500">
            {SEED_PRESETS.find((preset) => preset.id === selectedSeed)?.description}
          </p>
        </div>
        <div
          ref={containerRef}
          className="w-full rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden"
          style={{ background: BG_COLOR }}
        >
          <canvas
            ref={canvasRef}
            className="block w-full"
            style={{ height: 480, imageRendering: "pixelated" }}
          />
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Playback controls */}
          <div className="flex gap-1.5">
            <button
              onClick={doStep}
              disabled={playing || fastForwarding}
              className="px-3 py-1.5 text-xs font-mono rounded border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Step
            </button>
            <button
              onClick={() => setPlaying((p) => !p)}
              disabled={fastForwarding}
              className={`px-3 py-1.5 text-xs font-mono rounded border transition disabled:opacity-40 disabled:cursor-not-allowed ${
                playing
                  ? "border-amber-500 dark:border-amber-600 bg-amber-50 dark:bg-amber-600/10 text-amber-700 dark:text-amber-400"
                  : "border-cyan-500 dark:border-cyan-700 bg-cyan-50 dark:bg-cyan-700/10 text-cyan-700 dark:text-cyan-400 hover:border-cyan-400 dark:hover:border-cyan-500"
              }`}
            >
              {playing ? "Pause" : "Play"}
            </button>
            <button
              onClick={handleReset}
              className="px-3 py-1.5 text-xs font-mono rounded border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300 transition"
            >
              Reset
            </button>
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-neutral-200 dark:bg-neutral-800 hidden sm:block" />

          {/* Speed slider */}
          <div className="flex items-center gap-2">
            <label
              className="text-xs text-neutral-500 font-mono"
              htmlFor="ant-speed"
            >
              Steps/frame
            </label>
            <input
              id="ant-speed"
              type="range"
              min={1}
              max={500}
              value={stepsPerFrame}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setStepsPerFrame(parseInt(e.target.value, 10))
              }
              className="w-24 sm:w-32 accent-cyan-500"
            />
            <span className="text-xs text-neutral-500 font-mono w-10 tabular-nums">
              {stepsPerFrame}
            </span>
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-neutral-200 dark:bg-neutral-800 hidden sm:block" />

          {/* Fast-forward button */}
          <button
            onClick={handleFastForward}
            disabled={
              fastForwarding || stepCount >= FAST_FORWARD_TARGET
            }
            className={`px-4 py-1.5 text-xs font-mono rounded border transition ${
              fastForwarding
                ? "border-amber-500 dark:border-amber-600 bg-amber-50 dark:bg-amber-600/10 text-amber-700 dark:text-amber-400 animate-pulse"
                : stepCount >= FAST_FORWARD_TARGET
                  ? "border-neutral-300 dark:border-neutral-800 text-neutral-400 dark:text-neutral-700 cursor-not-allowed"
                  : "border-red-400 dark:border-red-700 bg-red-50 dark:bg-red-700/10 text-red-600 dark:text-red-400 hover:border-red-500 hover:bg-red-100 dark:hover:bg-red-700/20"
            } disabled:cursor-not-allowed`}
          >
            {fastForwarding
              ? "Computing..."
              : `Skip to step ${FAST_FORWARD_TARGET.toLocaleString()}`}
          </button>
        </div>
      </div>

      {/* Takeaway */}
      <div className="text-neutral-700 dark:text-neutral-300 text-sm sm:text-base leading-relaxed space-y-3 border-l-2 border-red-300 dark:border-red-800 pl-4">
        <p>
          After approximately 10,000 steps of seemingly random behavior, the ant
          always builds a diagonal highway. A perfectly regular, repeating
          pattern that extends forever.
        </p>
        <p>
          This has been verified computationally for millions of starting
          configurations. But no one has proven it must always happen.
        </p>
        <p className="text-neutral-500 dark:text-neutral-400">
          Emergence doesn&rsquo;t just mean &ldquo;complex behavior from simple
          rules.&rdquo; Sometimes it means behavior we can observe but cannot
          explain.
        </p>
        <p className="text-neutral-500 dark:text-neutral-400">
          That is why this demo matters: it separates seeing a pattern from understanding why the pattern had to appear.
        </p>
      </div>
    </div>
  );
}
