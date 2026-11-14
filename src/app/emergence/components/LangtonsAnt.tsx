"use client";

import { useSimulation } from "./SimulationFrame";
import { Button, Chip, Slider } from "@/components/ui";
import { readPalette, mix, usePalette } from "../theme";

import {
  useMemo,
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
  /** Sparse grid: only stores filled cells. Key = "x,y" */
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
type EditTool = "draw" | "erase" | "pan";

/**
 * Manual viewport override. While set, the viewport keeps a fixed cell size
 * and stays centered on (centerX, centerY) regardless of how the bounding
 * box of visited cells grows. Cleared by Reset, by seed change, and by the
 * Fit button - at which point the viewport returns to auto-fit.
 */
type ViewLock = { cellSize: number; centerX: number; centerY: number };

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GRID_SIZE = 200; // logical grid dimension (200x200)
const HIGHWAY_STEP = 10_500; // step threshold for highway detection
const FAST_FORWARD_TARGET = 11_000;


const SEED_PRESETS: Array<{
  id: SeedPresetId;
  label: string;
  description: string;
  cells: Array<[number, number]>;
}> = [
  {
    id: "blank",
    label: "Blank",
    description: "Classic empty plane.",
    cells: [],
  },
  {
    id: "dot",
    label: "Dot",
    description: "A single filled cell at the start.",
    cells: [[0, 0]],
  },
  {
    id: "plus",
    label: "Plus",
    description: "Five filled cells centered on the ant.",
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
    description: "A tiny staircase of filled cells.",
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
    description: "A finite scattered seed with nine filled cells.",
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
    description: "20\u201360 random filled cells within a 20\u00d720 area around the ant.",
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

function generateRandomCells(random: () => number): Array<[number, number]> {
  const RADIUS = 10;
  const count = 20 + Math.floor(random() * 41); // 20–60
  const used = new Set<string>();
  const result: Array<[number, number]> = [];

  while (result.length < count) {
    const dx = Math.floor(random() * (RADIUS * 2 + 1)) - RADIUS;
    const dy = Math.floor(random() * (RADIUS * 2 + 1)) - RADIUS;
    const key = `${dx},${dy}`;
    if (!used.has(key)) {
      used.add(key);
      result.push([dx, dy]);
    }
  }

  return result;
}

function createInitialState(seedId: SeedPresetId = "blank", random: () => number = Math.random): SimState {
  const cx = Math.floor(GRID_SIZE / 2);
  const cy = Math.floor(GRID_SIZE / 2);
  const seed = SEED_PRESETS.find((preset) => preset.id === seedId) ?? SEED_PRESETS[0];
  const seedCells = seedId === "random" ? generateRandomCells(random) : seed.cells;
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

function parseCellKey(key: string): [number, number] {
  const commaIdx = key.indexOf(",");
  return [
    parseInt(key.substring(0, commaIdx), 10),
    parseInt(key.substring(commaIdx + 1), 10),
  ];
}

function recomputeBounds(state: SimState): void {
  let minX = state.ant.x;
  let maxX = state.ant.x;
  let minY = state.ant.y;
  let maxY = state.ant.y;

  for (const key of state.cells) {
    const [x, y] = parseCellKey(key);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  state.minX = minX;
  state.maxX = maxX;
  state.minY = minY;
  state.maxY = maxY;
}

function updateBoundsForCell(state: SimState, x: number, y: number): void {
  if (x < state.minX) state.minX = x;
  if (x > state.maxX) state.maxX = x;
  if (y < state.minY) state.minY = y;
  if (y > state.maxY) state.maxY = y;
}

type ViewportTransform = {
  cellPixelSize: number;
  padding: number;
  offsetX: number;
  offsetY: number;
};

function computeViewport(
  sim: SimState,
  displayW: number,
  displayH: number,
  lock: ViewLock | null = null,
): ViewportTransform {
  if (lock) {
    const cellPixelSize = lock.cellSize;
    const padding = 0;
    const offsetX = displayW / 2 - (lock.centerX - sim.minX) * cellPixelSize;
    const offsetY = displayH / 2 - (lock.centerY - sim.minY) * cellPixelSize;
    return { cellPixelSize, padding, offsetX, offsetY };
  }

  const spanX = sim.maxX - sim.minX + 1;
  const spanY = sim.maxY - sim.minY + 1;
  const span = Math.max(spanX, spanY, 20);
  const padding = Math.max(10, Math.floor(span * 0.15));
  const totalSpan = span + padding * 2;
  const cellPixelSize = Math.min(displayW, displayH) / totalSpan;
  const centerX = (sim.minX + sim.maxX) / 2;
  const centerY = (sim.minY + sim.maxY) / 2;
  const offsetX =
    displayW / 2 - (centerX - sim.minX + padding) * cellPixelSize;
  const offsetY =
    displayH / 2 - (centerY - sim.minY + padding) * cellPixelSize;

  return { cellPixelSize, padding, offsetX, offsetY };
}

function rasterizeLine(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): Array<[number, number]> {
  const cells: Array<[number, number]> = [];
  let currentX = x0;
  let currentY = y0;
  const dx = Math.abs(x1 - x0);
  const sx = x0 < x1 ? 1 : -1;
  const dy = -Math.abs(y1 - y0);
  const sy = y0 < y1 ? 1 : -1;
  let error = dx + dy;

  while (true) {
    cells.push([currentX, currentY]);
    if (currentX === x1 && currentY === y1) break;
    const doubled = error * 2;
    if (doubled >= dy) {
      error += dy;
      currentX += sx;
    }
    if (doubled <= dx) {
      error += dx;
      currentY += sy;
    }
  }

  return cells;
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
  startFilled,
  endFilled,
  turnLabel,
  turnDir,
}: {
  label: string;
  startFilled: boolean;
  endFilled: boolean;
  turnLabel: string;
  turnDir: "right" | "left";
}): React.ReactElement {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-xs text-sub font-mono">{label}</div>
      <div className="flex items-center gap-3">
        {/* Before cell */}
        <div className="flex flex-col items-center gap-1">
          <svg width={DIAGRAM_CELL_SIZE} height={DIAGRAM_CELL_SIZE} aria-hidden="true">
            <rect
              width={DIAGRAM_CELL_SIZE}
              height={DIAGRAM_CELL_SIZE}
              rx={4}
              className={`stroke-muted ${startFilled ? "fill-foreground" : "fill-surface"}`}
              strokeWidth={1}
            />
          </svg>
          <div className="text-[10px] text-muted">before</div>
        </div>

        {/* Arrow */}
        <svg
          width={DIAGRAM_ARROW_LEN + DIAGRAM_GAP}
          height={DIAGRAM_CELL_SIZE}
          aria-hidden="true"
          className="text-sub"
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
              className={`stroke-muted ${endFilled ? "fill-foreground" : "fill-surface"}`}
              strokeWidth={1}
            />
          </svg>
          <div className="text-[10px] text-muted">after</div>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <svg
          width={14}
          height={14}
          viewBox="0 0 14 14"
          aria-hidden="true"
          className="text-muted"
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
        <span className="text-xs text-muted font-mono">{turnLabel}</span>
      </div>
    </div>
  );
}

function RuleDiagram(): React.ReactElement {
  return (
    <div className="flex flex-wrap justify-center gap-8 sm:gap-12 p-4 sm:p-6 border border-line bg-surface/50">
      <RuleDiagramPanel
        label="Empty cell"
        startFilled={false}
        endFilled={true}
        turnLabel="Turn right 90°"
        turnDir="right"
      />
      <RuleDiagramPanel
        label="Filled cell"
        startFilled={true}
        endFilled={false}
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
  const { active, random } = useSimulation();
  // State
  const palette = usePalette();
  const [selectedSeed, setSelectedSeed] = useState<SeedPresetId>("blank");
  const [stepCount, setStepCount] = useState<number>(0);
  const [playing, setPlaying] = useState<boolean>(false);
  const [stepsPerFrame, setStepsPerFrame] = useState<number>(1);
  const [fastForwarding, setFastForwarding] = useState<boolean>(false);
  const [editTool, setEditTool] = useState<EditTool>("draw");

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const initialSimulation = useMemo(() => createInitialState("blank", random), [random]);
  const simRef = useRef<SimState>(initialSimulation);
  const animFrameRef = useRef<number>(0);
  const playingRef = useRef<boolean>(false);
  const stepsPerFrameRef = useRef<number>(1);
  const pointerDrawingRef = useRef<boolean>(false);
  const lastPaintCellRef = useRef<[number, number] | null>(null);
  const panStateRef = useRef<{
    startClientX: number;
    startClientY: number;
    origCenterX: number;
    origCenterY: number;
  } | null>(null);
  // Tracked in a ref so callbacks can read the latest lock without
  // re-binding on every change. Mirrored into state purely so React
  // can use it for memoization / dev tools - we don't read state for
  // logic, only the ref.
  const viewLockRef = useRef<ViewLock | null>(null);
  const [, setViewLockTick] = useState<number>(0);

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
    const palette = readPalette();
    ctx.fillStyle = palette.surface;
    ctx.fillRect(0, 0, displayW, displayH);

    const { cellPixelSize, padding, offsetX, offsetY } = computeViewport(
      sim,
      displayW,
      displayH,
      viewLockRef.current,
    );

    if (cellPixelSize >= 5) {
      ctx.strokeStyle = mix(palette.foreground, 12);
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

    // Draw filled cells
    ctx.fillStyle = palette.foreground;
    for (const key of sim.cells) {
      const [cx, cy] = parseCellKey(key);
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

    ctx.fillStyle = palette.accent5;
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

  // Redraw when the theme changes
  useEffect(() => {
    drawState();
  }, [drawState, palette]);

  const getCellFromPointerEvent = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>): [number, number] | null => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return null;

      const rect = canvas.getBoundingClientRect();
      const pointerX = event.clientX - rect.left;
      const pointerY = event.clientY - rect.top;
      const sim = simRef.current;
      const viewport = computeViewport(
        sim,
        container.clientWidth,
        canvas.clientHeight,
        viewLockRef.current,
      );

      const cellX = Math.floor(
        (pointerX - viewport.offsetX) / viewport.cellPixelSize +
          sim.minX -
          viewport.padding,
      );
      const cellY = Math.floor(
        (pointerY - viewport.offsetY) / viewport.cellPixelSize +
          sim.minY -
          viewport.padding,
      );

      return [cellX, cellY];
    },
    [],
  );

  const applyEditToCell = useCallback(
    (x: number, y: number) => {
      const sim = simRef.current;
      const key = cellKey(x, y);

      if (editTool === "draw") {
        if (!sim.cells.has(key)) {
          sim.cells.add(key);
          updateBoundsForCell(sim, x, y);
        }
      } else if (sim.cells.delete(key)) {
        recomputeBounds(sim);
      }
    },
    [editTool],
  );

  /**
   * Snapshot the current auto-fit viewport into a lock. No-op if already
   * locked. Used by paint and zoom-button handlers so the viewport stops
   * tracking the bounding box of visited cells.
   */
  const lockCurrentView = useCallback(() => {
    if (viewLockRef.current !== null) return;
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const sim = simRef.current;
    const vp = computeViewport(
      sim,
      container.clientWidth,
      canvas.clientHeight,
      null,
    );
    viewLockRef.current = {
      cellSize: vp.cellPixelSize,
      centerX: (sim.minX + sim.maxX) / 2,
      centerY: (sim.minY + sim.maxY) / 2,
    };
    setViewLockTick((n) => n + 1);
  }, []);

  const handleCanvasPointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Pan mode works whether the simulation is playing or paused - the
      // user is just changing where they're looking, not editing cells.
      if (editTool === "pan") {
        lockCurrentView();
        const lock = viewLockRef.current;
        if (!lock) return;
        panStateRef.current = {
          startClientX: event.clientX,
          startClientY: event.clientY,
          origCenterX: lock.centerX,
          origCenterY: lock.centerY,
        };
        canvas.setPointerCapture?.(event.pointerId);
        return;
      }

      if (playingRef.current || fastForwarding) return;

      // Lock the viewport before painting so the canvas doesn't zoom out
      // when the user paints near the current edge of the visited region.
      lockCurrentView();

      const cell = getCellFromPointerEvent(event);
      if (!cell) return;

      pointerDrawingRef.current = true;
      lastPaintCellRef.current = cell;
      canvas.setPointerCapture?.(event.pointerId);
      applyEditToCell(cell[0], cell[1]);
      drawState();
    },
    [applyEditToCell, drawState, editTool, fastForwarding, getCellFromPointerEvent, lockCurrentView],
  );

  const handleCanvasPointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (panStateRef.current) {
        const lock = viewLockRef.current;
        if (!lock) return;
        const dx = event.clientX - panStateRef.current.startClientX;
        const dy = event.clientY - panStateRef.current.startClientY;
        viewLockRef.current = {
          ...lock,
          centerX: panStateRef.current.origCenterX - dx / lock.cellSize,
          centerY: panStateRef.current.origCenterY - dy / lock.cellSize,
        };
        setViewLockTick((n) => n + 1);
        drawState();
        return;
      }

      if (!pointerDrawingRef.current || playingRef.current || fastForwarding) return;

      const cell = getCellFromPointerEvent(event);
      if (!cell) return;

      const previous = lastPaintCellRef.current;
      if (!previous) {
        lastPaintCellRef.current = cell;
        applyEditToCell(cell[0], cell[1]);
        drawState();
        return;
      }

      for (const [x, y] of rasterizeLine(previous[0], previous[1], cell[0], cell[1])) {
        applyEditToCell(x, y);
      }
      lastPaintCellRef.current = cell;
      drawState();
    },
    [applyEditToCell, drawState, fastForwarding, getCellFromPointerEvent],
  );

  const endPointerDrawing = useCallback(
    (event?: React.PointerEvent<HTMLCanvasElement>) => {
      pointerDrawingRef.current = false;
      lastPaintCellRef.current = null;
      panStateRef.current = null;
      if (event) {
        event.currentTarget.releasePointerCapture?.(event.pointerId);
      }
    },
    [],
  );

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
    if (!playing || !active) {
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
  }, [playing, active, drawState]);

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
    simRef.current = createInitialState(selectedSeed, random);
    viewLockRef.current = null;
    setViewLockTick((n) => n + 1);
    setStepCount(0);
    drawState();
  }, [drawState, random, selectedSeed]);

  const handleSeedChange = useCallback(
    (seedId: SeedPresetId) => {
      setSelectedSeed(seedId);
      setPlaying(false);
      setFastForwarding(false);
      simRef.current = createInitialState(seedId, random);
      viewLockRef.current = null;
      setViewLockTick((n) => n + 1);
      setStepCount(0);
      drawState();
    },
    [drawState, random],
  );

  // Zoom handlers. Zoom-in/-out lock the viewport (snapshot first if not
  // already locked), then scale the cell size in place. Fit clears the
  // lock and returns to auto-fit.
  const ZOOM_FACTOR = 1.25;
  const zoomBy = useCallback(
    (factor: number) => {
      lockCurrentView();
      const lock = viewLockRef.current;
      if (!lock) return;
      viewLockRef.current = { ...lock, cellSize: lock.cellSize * factor };
      setViewLockTick((n) => n + 1);
      drawState();
    },
    [drawState, lockCurrentView],
  );
  const handleZoomIn = useCallback(() => zoomBy(ZOOM_FACTOR), [zoomBy]);
  const handleZoomOut = useCallback(() => zoomBy(1 / ZOOM_FACTOR), [zoomBy]);
  const handleFit = useCallback(() => {
    viewLockRef.current = null;
    setViewLockTick((n) => n + 1);
    drawState();
  }, [drawState]);

  // -----------------------------------------------------------------------
  // Derived state
  // -----------------------------------------------------------------------

  const phase = getPhase(stepCount);
  const phaseText = getPhaseText(phase);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {/* Heading */}
      <div>
        <h2 className="font-mono text-2xl sm:text-3xl font-semibold text-foreground mb-2">
          Langton&rsquo;s Ant
        </h2>
        <p className="text-muted text-base sm:text-lg">
          Two rules. One unexplained mystery.
        </p>
      </div>

      {/* Rules explanation */}
      <div className="space-y-4 text-foreground text-sm sm:text-base leading-relaxed">
        <p>
          A single ant on an infinite grid. Every cell is either empty or filled.
          The ant follows two rules, and only two:
        </p>
        <ol className="list-decimal list-inside space-y-1 text-muted">
          <li>
            On an <strong className="text-foreground">empty</strong> cell: turn
            90° right, fill the cell, move forward.
          </li>
          <li>
            On a <strong className="text-foreground">filled</strong> cell: turn
            90° left, empty the cell, move forward.
          </li>
        </ol>

        <p className="text-muted">
          The conjecture is stronger than the classic empty-grid story: the
          highway appears to emerge from <strong className="text-foreground">any finite starting set of filled cells</strong>.
          Try a few seeds below and the plane stays finite, but the long-run
          behavior still appears to settle into the same kind of highway.
        </p>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-line bg-surface/50 p-4">
            <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-sub">
              What It Is
            </div>
            <p className="mt-2 text-sm text-foreground">
              One moving agent that writes to the grid as it walks.
            </p>
          </div>
          <div className="rounded-lg border border-line bg-surface/50 p-4">
            <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-sub">
              Why It Matters
            </div>
            <p className="mt-2 text-sm text-foreground">
              It is a reminder that deterministic systems can remain opaque long after they stop feeling simple.
            </p>
          </div>
          <div className="rounded-lg border border-line bg-surface/50 p-4">
            <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-sub">
              What To Notice
            </div>
            <p className="mt-2 text-sm text-foreground">
              The key event is not the early symmetry. It is the abrupt transition from wandering chaos to a stable diagonal highway.
            </p>
          </div>
        </div>

        <RuleDiagram />
      </div>

      {/* Step counter and phase */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6">
        <div className="font-mono text-3xl sm:text-4xl text-foreground tabular-nums tracking-tight">
          {stepCount.toLocaleString()}
          <span className="text-sm sm:text-base text-muted ml-2">
            steps
          </span>
        </div>
        <div
          className={`text-sm font-mono transition-all duration-700 ${
            phase === "highway"
              ? "text-danger"
              : phase === "pre-highway"
                ? "text-accent-2"
                : "text-sub"
          }`}
        >
          {phaseText}
        </div>
      </div>

      {/* Canvas */}
      <div className="space-y-3">
        <div className="border border-line bg-surface/50 p-4 space-y-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-xs font-mono uppercase tracking-[0.2em] text-sub">
                Finite Seed
              </div>
              <p className="mt-1 text-sm text-muted">
                Swap the starting filled-cell configuration, then manually paint or erase filled cells to make your own finite seed.
              </p>
            </div>
            <div className="text-xs font-mono text-sub">
              Empty grid = infinite background, filled cells = finite seed
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {SEED_PRESETS.map((preset) => (
              <Chip
                key={preset.id}
                selected={preset.id === selectedSeed}
                onClick={() => handleSeedChange(preset.id)}
                title={preset.description}
              >
                {preset.label}
              </Chip>
            ))}
          </div>
          <p className="text-xs text-sub">
            {SEED_PRESETS.find((preset) => preset.id === selectedSeed)?.description}
          </p>
          <div className="flex flex-wrap items-center gap-2 border-t pt-3 border-line">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-sub">
              Tool
            </span>
            {(["draw", "erase", "pan"] as const).map((tool) => (
              <Chip
                key={tool}
                selected={editTool === tool}
                onClick={() => setEditTool(tool)}
              >
                {tool === "draw" ? "Draw filled cells" : tool === "erase" ? "Erase filled cells" : "Pan view"}
              </Chip>
            ))}
            <span className="text-xs text-muted">
              Drag to draw or erase (pause first); drag to pan any time.
            </span>
          </div>
        </div>
        <div
          ref={containerRef}
          className="w-full border border-line bg-surface overflow-hidden"
        >
          <canvas
            ref={canvasRef}
            className={`block w-full ${
              editTool === "pan"
                ? "cursor-grab active:cursor-grabbing"
                : playing || fastForwarding
                  ? "cursor-default"
                  : editTool === "erase"
                    ? "cursor-cell"
                    : "cursor-crosshair"
            }`}
            style={{ height: 480, imageRendering: "pixelated" }}
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={endPointerDrawing}
            onPointerLeave={endPointerDrawing}
            onPointerCancel={endPointerDrawing}
            role="img"
            aria-label={`Langton's Ant grid after ${stepCount.toLocaleString()} steps, currently in the ${phase} phase. Use the adjacent tools and playback controls to edit or advance the simulation.`}
          />
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Playback controls */}
          <div className="flex gap-1.5">
            <Button size="sm" onClick={doStep} disabled={playing || fastForwarding}>
              Step
            </Button>
            <Button
              size="sm"
              variant={playing ? "secondary" : "primary"}
              onClick={() => setPlaying((p) => !p)}
              disabled={fastForwarding}
            >
              {playing ? "Pause" : "Play"}
            </Button>
            <Button size="sm" onClick={handleReset}>
              Reset
            </Button>
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-line hidden sm:block" />

          {/* Zoom controls */}
          <div className="flex gap-1.5" role="group" aria-label="Zoom controls">
            <Button size="sm" onClick={handleZoomOut} aria-label="Zoom out" title="Zoom out">
              −
            </Button>
            <Button size="sm" onClick={handleZoomIn} aria-label="Zoom in" title="Zoom in">
              +
            </Button>
            <Button size="sm" onClick={handleFit} aria-label="Fit view" title="Fit view to bounding box">
              Fit
            </Button>
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-line hidden sm:block" />

          {/* Speed slider */}
          <Slider
            className="w-40"
            label="Steps/frame"
            min={1}
            max={500}
            value={stepsPerFrame}
            onChange={setStepsPerFrame}
          />

          {/* Divider */}
          <div className="w-px h-6 bg-line hidden sm:block" />

          {/* Fast-forward button */}
          <Button
            size="sm"
            variant="danger"
            onClick={handleFastForward}
            disabled={fastForwarding || stepCount >= FAST_FORWARD_TARGET}
            className={fastForwarding ? "animate-pulse" : ""}
          >
            {fastForwarding
              ? "Computing..."
              : `Skip to step ${FAST_FORWARD_TARGET.toLocaleString()}`}
          </Button>
        </div>
      </div>

      {/* Takeaway */}
      <div className="text-foreground text-sm sm:text-base leading-relaxed space-y-3 border-l-2 border-danger pl-4">
        <p>
          After approximately 10,000 steps of seemingly random behavior, the ant
          always builds a diagonal highway. A perfectly regular, repeating
          pattern that extends forever.
        </p>
        <p>
          This has been verified computationally for millions of starting
          configurations. But no one has proven it must always happen.
        </p>
        <p className="text-muted">
          Emergence doesn&rsquo;t just mean &ldquo;complex behavior from simple
          rules.&rdquo; Sometimes it means behavior we can observe but cannot
          explain.
        </p>
        <p className="text-muted">
          That is why this demo matters: it separates seeing a pattern from understanding why the pattern had to appear.
        </p>
      </div>
    </div>
  );
}
