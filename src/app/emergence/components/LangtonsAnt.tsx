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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GRID_SIZE = 200; // logical grid dimension (200x200)
const HIGHWAY_STEP = 10_500; // step threshold for highway detection
const FAST_FORWARD_TARGET = 11_000;

const BG_COLOR = "#171717"; // neutral-900
const CELL_COLOR = "#525252"; // neutral-600 for black cells
const ANT_COLOR = "#ef4444"; // red-500

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

function createInitialState(): SimState {
  const cx = Math.floor(GRID_SIZE / 2);
  const cy = Math.floor(GRID_SIZE / 2);
  return {
    cells: new Set<string>(),
    ant: { x: cx, y: cy, dir: 0 as Direction },
    step: 0,
    minX: cx,
    maxX: cx,
    minY: cy,
    maxY: cy,
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
    <div className="flex flex-wrap justify-center gap-8 sm:gap-12 p-4 sm:p-6 rounded-lg border border-neutral-800 bg-neutral-900/50">
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
  const [stepCount, setStepCount] = useState<number>(0);
  const [playing, setPlaying] = useState<boolean>(false);
  const [stepsPerFrame, setStepsPerFrame] = useState<number>(1);
  const [fastForwarding, setFastForwarding] = useState<boolean>(false);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simRef = useRef<SimState>(createInitialState());
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
    simRef.current = createInitialState();
    setStepCount(0);
    drawState();
  }, [drawState]);

  // -----------------------------------------------------------------------
  // Derived state
  // -----------------------------------------------------------------------

  const phase = getPhase(stepCount);
  const phaseText = getPhaseText(phase);

  return (
    <div className="space-y-8">
      {/* Heading */}
      <div>
        <h2 className="font-mono text-2xl sm:text-3xl font-semibold text-neutral-100 mb-2">
          Langton&rsquo;s Ant
        </h2>
        <p className="text-neutral-500 text-base sm:text-lg">
          Two rules. One unexplained mystery.
        </p>
      </div>

      {/* Rules explanation */}
      <div className="space-y-4 text-neutral-300 text-sm sm:text-base leading-relaxed">
        <p>
          A single ant on an infinite grid. Every cell is either white or black.
          The ant follows two rules, and only two:
        </p>
        <ol className="list-decimal list-inside space-y-1 text-neutral-400">
          <li>
            On a <strong className="text-neutral-200">white</strong> cell: turn
            90° right, flip the cell to black, move forward.
          </li>
          <li>
            On a <strong className="text-neutral-200">black</strong> cell: turn
            90° left, flip the cell to white, move forward.
          </li>
        </ol>

        <RuleDiagram />
      </div>

      {/* Step counter and phase */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6">
        <div className="font-mono text-3xl sm:text-4xl text-neutral-100 tabular-nums tracking-tight">
          {stepCount.toLocaleString()}
          <span className="text-sm sm:text-base text-neutral-600 ml-2">
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
        <div
          ref={containerRef}
          className="w-full rounded-lg border border-neutral-800 overflow-hidden"
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
              className="px-3 py-1.5 text-xs font-mono rounded border border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-neutral-300 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Step
            </button>
            <button
              onClick={() => setPlaying((p) => !p)}
              disabled={fastForwarding}
              className={`px-3 py-1.5 text-xs font-mono rounded border transition disabled:opacity-40 disabled:cursor-not-allowed ${
                playing
                  ? "border-amber-600 bg-amber-600/10 text-amber-400"
                  : "border-cyan-700 bg-cyan-700/10 text-cyan-400 hover:border-cyan-500"
              }`}
            >
              {playing ? "Pause" : "Play"}
            </button>
            <button
              onClick={handleReset}
              className="px-3 py-1.5 text-xs font-mono rounded border border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-neutral-300 transition"
            >
              Reset
            </button>
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-neutral-800 hidden sm:block" />

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
          <div className="w-px h-6 bg-neutral-800 hidden sm:block" />

          {/* Fast-forward button */}
          <button
            onClick={handleFastForward}
            disabled={
              fastForwarding || stepCount >= FAST_FORWARD_TARGET
            }
            className={`px-4 py-1.5 text-xs font-mono rounded border transition ${
              fastForwarding
                ? "border-amber-600 bg-amber-600/10 text-amber-400 animate-pulse"
                : stepCount >= FAST_FORWARD_TARGET
                  ? "border-neutral-800 text-neutral-700 cursor-not-allowed"
                  : "border-red-700 bg-red-700/10 text-red-400 hover:border-red-500 hover:bg-red-700/20"
            } disabled:cursor-not-allowed`}
          >
            {fastForwarding
              ? "Computing..."
              : `Skip to step ${FAST_FORWARD_TARGET.toLocaleString()}`}
          </button>
        </div>
      </div>

      {/* Takeaway */}
      <div className="text-neutral-300 text-sm sm:text-base leading-relaxed space-y-3 border-l-2 border-red-800 pl-4">
        <p>
          After approximately 10,000 steps of seemingly random behavior, the ant
          always builds a diagonal highway. A perfectly regular, repeating
          pattern that extends forever.
        </p>
        <p>
          This has been verified computationally for millions of starting
          configurations. But no one has proven it must always happen.
        </p>
        <p className="text-neutral-500">
          Emergence doesn&rsquo;t just mean &ldquo;complex behavior from simple
          rules.&rdquo; Sometimes it means behavior we can observe but cannot
          explain.
        </p>
      </div>
    </div>
  );
}
