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

interface AvalancheHistogram {
  /** size 1 */
  s1: number;
  /** size 2-5 */
  s2_5: number;
  /** size 6-20 */
  s6_20: number;
  /** size 21-100 */
  s21_100: number;
  /** size 101-1000 */
  s101_1000: number;
  /** size 1000+ */
  s1000: number;
}

interface SimStats {
  totalDropped: number;
  lastAvalancheSize: number;
  histogram: AvalancheHistogram;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GRID_W = 100;
const GRID_H = 100;
const CANVAS_HEIGHT = 450;

const BG_COLOR = "#171717"; // neutral-900

/** Grain count -> color */
const GRAIN_COLORS: string[] = [
  "#171717", // 0: near background
  "#312e81", // 1: deep indigo
  "#0d9488", // 2: teal
  "#f59e0b", // 3: amber — critical
];
const TOPPLE_COLOR = "#ffffff"; // white flash during cascade

// ---------------------------------------------------------------------------
// Sandpile logic
// ---------------------------------------------------------------------------

function createGrid(): Uint8Array {
  return new Uint8Array(GRID_W * GRID_H);
}

function idx(x: number, y: number): number {
  return y * GRID_W + x;
}

/**
 * Drop a grain at (x, y) and fully resolve the avalanche.
 * Returns the total number of topples.
 */
function dropAndResolve(
  grid: Uint8Array,
  x: number,
  y: number,
  toppledSet: Set<number> | null
): number {
  grid[idx(x, y)] += 1;

  let avalancheSize = 0;

  // Queue of cells that might need toppling
  const queue: number[] = [];
  if (grid[idx(x, y)] >= 4) {
    queue.push(idx(x, y));
  }

  // Process queue — a cell may topple more than once, so we re-check
  while (queue.length > 0) {
    const cellIdx = queue.pop()!;
    while (grid[cellIdx] >= 4) {
      grid[cellIdx] -= 4;
      avalancheSize += 1;

      if (toppledSet) toppledSet.add(cellIdx);

      const cx = cellIdx % GRID_W;
      const cy = (cellIdx - cx) / GRID_W;

      // Distribute to neighbors
      const neighbors: [number, number][] = [
        [cx - 1, cy],
        [cx + 1, cy],
        [cx, cy - 1],
        [cx, cy + 1],
      ];

      for (const [nx, ny] of neighbors) {
        if (nx >= 0 && nx < GRID_W && ny >= 0 && ny < GRID_H) {
          const ni = idx(nx, ny);
          grid[ni] += 1;
          if (grid[ni] >= 4) {
            queue.push(ni);
          }
        }
        // Grains that fall off the edge are lost
      }
    }
  }

  return avalancheSize;
}

function recordAvalanche(histogram: AvalancheHistogram, size: number): void {
  if (size <= 0) return;
  if (size === 1) histogram.s1++;
  else if (size <= 5) histogram.s2_5++;
  else if (size <= 20) histogram.s6_20++;
  else if (size <= 100) histogram.s21_100++;
  else if (size <= 1000) histogram.s101_1000++;
  else histogram.s1000++;
}

function createHistogram(): AvalancheHistogram {
  return { s1: 0, s2_5: 0, s6_20: 0, s21_100: 0, s101_1000: 0, s1000: 0 };
}

// ---------------------------------------------------------------------------
// Topple rule diagram
// ---------------------------------------------------------------------------

function ToppleDiagram(): React.ReactElement {
  const cellSz = 32;
  const gap = 3;

  /** Render a small 3x3 grid of grain counts */
  function MiniGrid({
    cells,
    highlight,
  }: {
    cells: (number | null)[];
    highlight?: Set<number>;
  }): React.ReactElement {
    return (
      <div
        className="inline-grid"
        style={{
          gridTemplateColumns: `repeat(3, ${cellSz}px)`,
          gap: `${gap}px`,
        }}
      >
        {cells.map((val, i) => {
          const isHighlighted = highlight?.has(i);
          const bg =
            val === null
              ? "transparent"
              : isHighlighted
                ? TOPPLE_COLOR
                : GRAIN_COLORS[Math.min(val, 3)];
          const textColor =
            val === null
              ? "transparent"
              : isHighlighted
                ? "#171717"
                : val >= 3
                  ? "#171717"
                  : "#a3a3a3";

          return (
            <div
              key={i}
              className="flex items-center justify-center rounded text-xs font-mono font-bold"
              style={{
                width: cellSz,
                height: cellSz,
                backgroundColor: bg,
                color: textColor,
                border:
                  val === null ? "1px dashed #404040" : "1px solid #404040",
              }}
            >
              {val !== null ? val : ""}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 rounded-lg border border-neutral-800 bg-neutral-900/50">
      <div className="text-xs text-neutral-500 mb-4 text-center tracking-wide uppercase">
        The Toppling Rule
      </div>
      <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
        {/* Before: center cell has 3, about to receive 1 */}
        <div className="flex flex-col items-center gap-2">
          <div className="text-[10px] text-neutral-600 font-mono">
            +1 grain
          </div>
          <MiniGrid
            cells={[null, 1, null, 0, 3, 2, null, 1, null]}
            highlight={new Set([4])}
          />
          <div className="text-[10px] text-neutral-500">
            center = 3 + 1 = <strong className="text-amber-400">4</strong>
          </div>
        </div>

        {/* Arrow */}
        <svg
          width={32}
          height={24}
          aria-hidden="true"
          className="text-neutral-500 shrink-0"
        >
          <line
            x1={2}
            y1={12}
            x2={24}
            y2={12}
            stroke="currentColor"
            strokeWidth={1.5}
          />
          <polygon points="24,8 32,12 24,16" fill="currentColor" />
        </svg>

        {/* After: center toppled, neighbors +1 */}
        <div className="flex flex-col items-center gap-2">
          <div className="text-[10px] text-neutral-600 font-mono">topple!</div>
          <MiniGrid
            cells={[null, 2, null, 1, 0, 3, null, 2, null]}
            highlight={new Set([1, 3, 5, 7])}
          />
          <div className="text-[10px] text-neutral-500">
            center &minus;4, neighbors +1
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Histogram display
// ---------------------------------------------------------------------------

interface HistogramBarProps {
  label: string;
  count: number;
  maxCount: number;
}

function HistogramBar({
  label,
  count,
  maxCount,
}: HistogramBarProps): React.ReactElement {
  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;

  return (
    <div className="flex items-center gap-2 text-xs font-mono">
      <span className="text-neutral-500 w-16 sm:w-20 text-right shrink-0">
        {label}
      </span>
      <div className="flex-1 h-3 bg-neutral-800 rounded-sm overflow-hidden">
        <div
          className="h-full rounded-sm transition-all duration-150"
          style={{
            width: `${Math.max(pct, count > 0 ? 1 : 0)}%`,
            backgroundColor:
              pct > 60
                ? "#f59e0b"
                : pct > 20
                  ? "#0d9488"
                  : "#312e81",
          }}
        />
      </div>
      <span className="text-neutral-500 w-12 text-right tabular-nums">
        {count.toLocaleString()}
      </span>
    </div>
  );
}

function AvalancheHistogramDisplay({
  histogram,
}: {
  histogram: AvalancheHistogram;
}): React.ReactElement {
  const entries: { label: string; count: number }[] = [
    { label: "1", count: histogram.s1 },
    { label: "2-5", count: histogram.s2_5 },
    { label: "6-20", count: histogram.s6_20 },
    { label: "21-100", count: histogram.s21_100 },
    { label: "101-1k", count: histogram.s101_1000 },
    { label: "1k+", count: histogram.s1000 },
  ];

  const maxCount = Math.max(...entries.map((e) => e.count), 1);

  return (
    <div className="space-y-1.5">
      <div className="text-xs text-neutral-500 font-mono uppercase tracking-wide">
        Avalanche Size Distribution
      </div>
      {entries.map((e) => (
        <HistogramBar
          key={e.label}
          label={e.label}
          count={e.count}
          maxCount={maxCount}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function SandPile(): React.ReactElement {
  // State
  const [playing, setPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(15);
  const [stats, setStats] = useState<SimStats>({
    totalDropped: 0,
    lastAvalancheSize: 0,
    histogram: createHistogram(),
  });

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<Uint8Array>(createGrid());
  const statsRef = useRef<SimStats>({
    totalDropped: 0,
    lastAvalancheSize: 0,
    histogram: createHistogram(),
  });
  const animFrameRef = useRef<number>(0);
  const lastTickRef = useRef<number>(0);
  const playingRef = useRef<boolean>(false);
  const speedRef = useRef<number>(15);
  const toppledCellsRef = useRef<Set<number>>(new Set());

  // Keep refs in sync
  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  // -----------------------------------------------------------------------
  // Drawing
  // -----------------------------------------------------------------------

  const drawGrid = useCallback((showToppled: boolean = false) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const grid = gridRef.current;
    const dpr = window.devicePixelRatio || 1;
    const displayW = container.clientWidth;
    const displayH = CANVAS_HEIGHT;
    const w = Math.floor(displayW * dpr);
    const h = Math.floor(displayH * dpr);

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Cell pixel size
    const cellW = displayW / GRID_W;
    const cellH = displayH / GRID_H;

    const toppled = showToppled ? toppledCellsRef.current : null;

    // Draw cells
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        const i = idx(x, y);
        const grains = grid[i];

        if (showToppled && toppled && toppled.has(i)) {
          ctx.fillStyle = TOPPLE_COLOR;
        } else {
          ctx.fillStyle = GRAIN_COLORS[Math.min(grains, 3)];
        }

        ctx.fillRect(
          Math.floor(x * cellW),
          Math.floor(y * cellH),
          Math.ceil(cellW),
          Math.ceil(cellH)
        );
      }
    }
  }, []);

  // -----------------------------------------------------------------------
  // Drop logic
  // -----------------------------------------------------------------------

  const dropAtRandom = useCallback((): void => {
    const x = Math.floor(Math.random() * GRID_W);
    const y = Math.floor(Math.random() * GRID_H);
    toppledCellsRef.current.clear();
    const size = dropAndResolve(
      gridRef.current,
      x,
      y,
      toppledCellsRef.current
    );
    const s = statsRef.current;
    s.totalDropped++;
    s.lastAvalancheSize = size;
    recordAvalanche(s.histogram, size);
    setStats({ ...s });
  }, []);

  const dropAt = useCallback((x: number, y: number): void => {
    const gx = Math.max(0, Math.min(GRID_W - 1, x));
    const gy = Math.max(0, Math.min(GRID_H - 1, y));
    toppledCellsRef.current.clear();
    const size = dropAndResolve(
      gridRef.current,
      gx,
      gy,
      toppledCellsRef.current
    );
    const s = statsRef.current;
    s.totalDropped++;
    s.lastAvalancheSize = size;
    recordAvalanche(s.histogram, size);
    setStats({ ...s });
  }, []);

  const dropMany = useCallback(
    (count: number): void => {
      for (let i = 0; i < count; i++) {
        const x = Math.floor(Math.random() * GRID_W);
        const y = Math.floor(Math.random() * GRID_H);
        // Only track toppled cells for the last drop
        toppledCellsRef.current.clear();
        const size = dropAndResolve(
          gridRef.current,
          x,
          y,
          i === count - 1 ? toppledCellsRef.current : null
        );
        const s = statsRef.current;
        s.totalDropped++;
        s.lastAvalancheSize = size;
        recordAvalanche(s.histogram, size);
      }
      setStats({ ...statsRef.current });
      drawGrid(true);
      // Clear topple highlight after a brief flash
      setTimeout(() => drawGrid(false), 80);
    },
    [drawGrid]
  );

  // -----------------------------------------------------------------------
  // Canvas click
  // -----------------------------------------------------------------------

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>): void => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const gx = Math.floor((mx / rect.width) * GRID_W);
      const gy = Math.floor((my / rect.height) * GRID_H);

      dropAt(gx, gy);
      drawGrid(true);
      setTimeout(() => drawGrid(false), 80);
    },
    [dropAt, drawGrid]
  );

  // -----------------------------------------------------------------------
  // Initialize / resize
  // -----------------------------------------------------------------------

  useEffect(() => {
    drawGrid();

    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      drawGrid();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [drawGrid]);

  // -----------------------------------------------------------------------
  // Animation loop
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (!playing) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = 0;
      }
      return;
    }

    lastTickRef.current = performance.now();

    const loop = (now: number): void => {
      if (!playingRef.current) return;

      const interval = 1000 / speedRef.current;
      if (now - lastTickRef.current >= interval) {
        dropAtRandom();
        drawGrid(toppledCellsRef.current.size > 0);

        // Clear topple flash for next frame
        if (toppledCellsRef.current.size > 0) {
          // Schedule a non-flash redraw shortly after
          setTimeout(() => {
            if (playingRef.current) return; // next frame will handle it
            drawGrid(false);
          }, 40);
        }

        lastTickRef.current = now;
      }
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = 0;
      }
    };
  }, [playing, dropAtRandom, drawGrid]);

  // -----------------------------------------------------------------------
  // Reset
  // -----------------------------------------------------------------------

  const handleReset = useCallback(() => {
    setPlaying(false);
    gridRef.current = createGrid();
    const freshStats: SimStats = {
      totalDropped: 0,
      lastAvalancheSize: 0,
      histogram: createHistogram(),
    };
    statsRef.current = freshStats;
    setStats(freshStats);
    toppledCellsRef.current.clear();
    drawGrid();
  }, [drawGrid]);

  // -----------------------------------------------------------------------
  // Single drop button
  // -----------------------------------------------------------------------

  const handleDropOne = useCallback(() => {
    dropAtRandom();
    drawGrid(true);
    setTimeout(() => drawGrid(false), 80);
  }, [dropAtRandom, drawGrid]);

  return (
    <div className="space-y-8">
      {/* Heading */}
      <div>
        <h2 className="font-mono text-2xl sm:text-3xl font-semibold text-neutral-100 mb-2">
          Self-Organized Criticality
        </h2>
        <p className="text-neutral-500 text-base sm:text-lg">
          Drop a grain. Trigger a catastrophe.
        </p>
      </div>

      {/* Rules explanation */}
      <div className="space-y-4 text-neutral-300 text-sm sm:text-base leading-relaxed">
        <p>
          A grid of cells. Each cell holds 0&ndash;3 grains of sand. Drop one
          grain on a random cell &mdash; or wherever you click. When a cell
          reaches <strong className="text-amber-400">4 grains</strong>, it{" "}
          <em>topples</em>: loses 4 grains, each of its 4 neighbors gains 1. If
          a neighbor now has 4+, it topples too. Chain reaction.
        </p>
        <p>
          Grains that fall off the edge are lost forever.
        </p>

        {/* Topple diagram */}
        <ToppleDiagram />

        <p className="text-neutral-500">
          That&rsquo;s the entire system. No agents. No decisions. Just gravity
          and counting to four.
        </p>
      </div>

      {/* Canvas */}
      <div className="space-y-3">
        <div
          ref={containerRef}
          className="w-full rounded-lg border border-neutral-800 overflow-hidden cursor-crosshair"
          style={{ height: CANVAS_HEIGHT, background: BG_COLOR }}
        >
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            className="block w-full"
            style={{ height: CANVAS_HEIGHT, imageRendering: "pixelated" }}
          />
        </div>

        {/* Stats bar */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs font-mono">
          <div className="text-neutral-500">
            Grains dropped:{" "}
            <span className="text-neutral-300 tabular-nums">
              {stats.totalDropped.toLocaleString()}
            </span>
          </div>
          <div className="text-neutral-500">
            Last avalanche:{" "}
            <span
              className={`tabular-nums ${
                stats.lastAvalancheSize > 100
                  ? "text-red-400 font-bold"
                  : stats.lastAvalancheSize > 20
                    ? "text-amber-400"
                    : stats.lastAvalancheSize > 0
                      ? "text-teal-400"
                      : "text-neutral-400"
              }`}
            >
              {stats.lastAvalancheSize.toLocaleString()} topples
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Drop buttons */}
          <div className="flex gap-1.5">
            <button
              onClick={handleDropOne}
              disabled={playing}
              className="px-3 py-1.5 text-xs font-mono rounded border border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-neutral-300 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Drop 1
            </button>
            <button
              onClick={() => dropMany(100)}
              disabled={playing}
              className="px-3 py-1.5 text-xs font-mono rounded border border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-neutral-300 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Drop 100
            </button>
            <button
              onClick={() => dropMany(1000)}
              disabled={playing}
              className="px-3 py-1.5 text-xs font-mono rounded border border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-neutral-300 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Drop 1000
            </button>
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-neutral-800 hidden sm:block" />

          {/* Playback controls */}
          <div className="flex gap-1.5">
            <button
              onClick={() => setPlaying((p) => !p)}
              className={`px-3 py-1.5 text-xs font-mono rounded border transition ${
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
              htmlFor="sand-speed"
            >
              Speed
            </label>
            <input
              id="sand-speed"
              type="range"
              min={1}
              max={60}
              value={speed}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSpeed(parseInt(e.target.value, 10))
              }
              className="w-20 sm:w-28 accent-cyan-500"
            />
            <span className="text-xs text-neutral-500 font-mono w-12 tabular-nums">
              {speed}/s
            </span>
          </div>
        </div>
      </div>

      {/* Avalanche histogram */}
      <div className="p-4 rounded-lg border border-neutral-800 bg-neutral-900/50">
        <AvalancheHistogramDisplay histogram={stats.histogram} />
      </div>

      {/* Takeaway */}
      <div className="text-neutral-300 text-sm sm:text-base leading-relaxed space-y-3 border-l-2 border-amber-800 pl-4">
        <p>
          The sandpile tuned itself to criticality. You didn&rsquo;t set any
          parameters. It just got there.
        </p>
        <p>
          This same power law appears in earthquakes, forest fires, stock market
          crashes, and extinction events.
        </p>
        <p>
          Per Bak called this &ldquo;self-organized criticality&rdquo; in 1987.
          His claim: catastrophe isn&rsquo;t a bug in these systems. It&rsquo;s
          a feature they create for themselves.
        </p>
        <p className="text-neutral-500">
          The next grain is always potentially the one that brings everything
          down.
        </p>
      </div>
    </div>
  );
}
