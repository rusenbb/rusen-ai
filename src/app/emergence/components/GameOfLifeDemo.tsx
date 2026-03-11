"use client";

import { useRef, useState, useEffect, useCallback } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Grid = Uint8Array;
type CellCoord = [number, number];

interface PatternDef {
  label: string;
  cells: CellCoord[];
}

interface RuleDiagram {
  title: string;
  rule: string;
  before: CellCoord[];
  after: CellCoord[];
  size: number; // grid width/height for the mini diagram
  highlight?: CellCoord; // the cell the rule focuses on
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COLS = 80;
const ROWS = 60;
const CANVAS_HEIGHT = 400;
const MAX_AGE = 120;

// Age-based color palette: newly born cells are bright cyan, older cells fade
function cellColor(age: number): string {
  const t = Math.min(age / MAX_AGE, 1);
  // Cyan → teal → dim grey-green
  const r = Math.round(20 + t * 30);
  const g = Math.round(240 - t * 160);
  const b = Math.round(220 - t * 140);
  return `rgb(${r},${g},${b})`;
}

// ---------------------------------------------------------------------------
// Preset patterns
// ---------------------------------------------------------------------------

const PATTERNS: PatternDef[] = [
  {
    label: "Glider",
    cells: [
      [0, 1],
      [1, 2],
      [2, 0],
      [2, 1],
      [2, 2],
    ],
  },
  {
    label: "Blinker",
    cells: [
      [1, 0],
      [1, 1],
      [1, 2],
    ],
  },
  {
    label: "R-pentomino",
    cells: [
      [0, 1],
      [0, 2],
      [1, 0],
      [1, 1],
      [2, 1],
    ],
  },
  {
    label: "Glider Gun",
    cells: [
      [5, 1],
      [5, 2],
      [6, 1],
      [6, 2],
      [3, 13],
      [3, 14],
      [4, 12],
      [4, 16],
      [5, 11],
      [5, 17],
      [6, 11],
      [6, 15],
      [6, 17],
      [6, 18],
      [7, 11],
      [7, 17],
      [8, 12],
      [8, 16],
      [9, 13],
      [9, 14],
      [1, 25],
      [2, 23],
      [2, 25],
      [3, 21],
      [3, 22],
      [4, 21],
      [4, 22],
      [5, 21],
      [5, 22],
      [6, 23],
      [6, 25],
      [7, 25],
      [3, 35],
      [3, 36],
      [4, 35],
      [4, 36],
    ],
  },
  {
    label: "Random",
    cells: [], // handled specially
  },
];

// ---------------------------------------------------------------------------
// Rule diagrams data
// ---------------------------------------------------------------------------

const RULE_DIAGRAMS: RuleDiagram[] = [
  {
    title: "Underpopulation",
    rule: "A live cell with fewer than 2 live neighbors dies",
    size: 3,
    highlight: [1, 1],
    before: [
      [0, 0],
      [1, 1],
    ],
    after: [[0, 0]],
  },
  {
    title: "Survival",
    rule: "A live cell with 2 or 3 live neighbors survives",
    size: 3,
    highlight: [1, 1],
    before: [
      [0, 0],
      [0, 2],
      [1, 1],
    ],
    after: [
      [0, 0],
      [0, 2],
      [1, 1],
    ],
  },
  {
    title: "Overpopulation",
    rule: "A live cell with more than 3 live neighbors dies",
    size: 3,
    highlight: [1, 1],
    before: [
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 0],
      [1, 1],
    ],
    after: [
      [0, 0],
      [0, 2],
      [1, 0],
    ],
  },
  {
    title: "Reproduction",
    rule: "A dead cell with exactly 3 live neighbors becomes alive",
    size: 3,
    highlight: [1, 1],
    before: [
      [0, 0],
      [0, 2],
      [2, 1],
    ],
    after: [
      [0, 0],
      [0, 2],
      [1, 1],
      [2, 1],
    ],
  },
];

// ---------------------------------------------------------------------------
// Grid helpers
// ---------------------------------------------------------------------------

function emptyGrid(): Grid {
  return new Uint8Array(COLS * ROWS);
}

function emptyAgeGrid(): Uint8Array {
  return new Uint8Array(COLS * ROWS);
}

function idx(r: number, c: number): number {
  return r * COLS + c;
}

function countNeighbors(grid: Grid, r: number, c: number): number {
  let count = 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = (r + dr + ROWS) % ROWS;
      const nc = (c + dc + COLS) % COLS;
      if (grid[idx(nr, nc)]) count++;
    }
  }
  return count;
}

function stepGrid(
  grid: Grid,
  ages: Uint8Array
): { next: Grid; nextAges: Uint8Array } {
  const next = emptyGrid();
  const nextAges = emptyAgeGrid();
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const i = idx(r, c);
      const n = countNeighbors(grid, r, c);
      const alive = grid[i] === 1;
      if (alive && (n === 2 || n === 3)) {
        next[i] = 1;
        nextAges[i] = Math.min(ages[i] + 1, MAX_AGE);
      } else if (!alive && n === 3) {
        next[i] = 1;
        nextAges[i] = 1;
      }
    }
  }
  return { next, nextAges };
}

function placePattern(
  cells: CellCoord[],
  offsetR: number,
  offsetC: number
): { grid: Grid; ages: Uint8Array } {
  const grid = emptyGrid();
  const ages = emptyAgeGrid();
  for (const [r, c] of cells) {
    const pr = ((r + offsetR) % ROWS + ROWS) % ROWS;
    const pc = ((c + offsetC) % COLS + COLS) % COLS;
    grid[idx(pr, pc)] = 1;
    ages[idx(pr, pc)] = 1;
  }
  return { grid, ages };
}

function randomGrid(): { grid: Grid; ages: Uint8Array } {
  const grid = emptyGrid();
  const ages = emptyAgeGrid();
  for (let i = 0; i < grid.length; i++) {
    if (Math.random() < 0.25) {
      grid[i] = 1;
      ages[i] = 1;
    }
  }
  return { grid, ages };
}

// ---------------------------------------------------------------------------
// Mini grid component for rule diagrams
// ---------------------------------------------------------------------------

function MiniGrid({
  cells,
  size,
  highlight,
  highlightAlive,
}: {
  cells: CellCoord[];
  size: number;
  highlight?: CellCoord;
  highlightAlive: boolean;
}) {
  const cellSet = new Set(cells.map(([r, c]) => `${r},${c}`));
  const cellSize = 20;
  const gap = 1;
  const totalSize = size * cellSize + (size - 1) * gap;

  return (
    <div
      className="inline-grid border border-neutral-700 rounded-sm"
      style={{
        gridTemplateColumns: `repeat(${size}, ${cellSize}px)`,
        gap: `${gap}px`,
        width: totalSize + 2,
        height: totalSize + 2,
        padding: 1,
      }}
    >
      {Array.from({ length: size * size }, (_, i) => {
        const r = Math.floor(i / size);
        const c = i % size;
        const alive = cellSet.has(`${r},${c}`);
        const isHighlight =
          highlight && highlight[0] === r && highlight[1] === c;

        let bg = "bg-neutral-800";
        if (alive) bg = "bg-cyan-400";
        if (isHighlight && !highlightAlive && !alive) bg = "bg-neutral-600";
        if (isHighlight && alive && !highlightAlive) bg = "bg-red-400/70";

        return (
          <div
            key={i}
            className={`${bg} rounded-[1px] transition-colors`}
            style={{
              width: cellSize,
              height: cellSize,
              outline: isHighlight ? "2px solid rgba(255,255,255,0.5)" : "none",
              outlineOffset: -1,
            }}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function GameOfLifeDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const gridRef = useRef<Grid>(emptyGrid());
  const agesRef = useRef<Uint8Array>(emptyAgeGrid());

  const [generation, setGeneration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(10);
  const [canvasWidth, setCanvasWidth] = useState(640);

  const playingRef = useRef(playing);
  const speedRef = useRef(speed);
  const generationRef = useRef(0);
  const animRef = useRef<number>(0);
  const lastTickRef = useRef<number>(0);
  const drawingRef = useRef(false);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  // Responsive width
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setCanvasWidth(Math.floor(entry.contentRect.width));
      }
    });
    ro.observe(container);
    setCanvasWidth(container.clientWidth);
    return () => ro.disconnect();
  }, []);

  // Compute cell size from canvas dimensions
  const cellW = canvasWidth / COLS;
  const cellH = CANVAS_HEIGHT / ROWS;

  // Render the grid onto the canvas
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvasWidth;
    const h = CANVAS_HEIGHT;

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);
    }

    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, w, h);

    // Grid lines (subtle)
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 0.5;
    for (let c = 0; c <= COLS; c++) {
      const x = c * (w / COLS);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let r = 0; r <= ROWS; r++) {
      const y = r * (h / ROWS);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Cells
    const grid = gridRef.current;
    const ages = agesRef.current;
    const cw = w / COLS;
    const ch = h / ROWS;
    const pad = 0.5;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const i = idx(r, c);
        if (grid[i]) {
          ctx.fillStyle = cellColor(ages[i]);
          ctx.fillRect(c * cw + pad, r * ch + pad, cw - pad * 2, ch - pad * 2);
        }
      }
    }
  }, [canvasWidth]);

  // Animation loop
  useEffect(() => {
    let mounted = true;

    const loop = (time: number) => {
      if (!mounted) return;

      if (playingRef.current) {
        const interval = 1000 / speedRef.current;
        if (time - lastTickRef.current >= interval) {
          lastTickRef.current = time;
          const { next, nextAges } = stepGrid(
            gridRef.current,
            agesRef.current
          );
          gridRef.current = next;
          agesRef.current = nextAges;
          generationRef.current += 1;
          setGeneration(generationRef.current);
        }
      }

      render();
      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => {
      mounted = false;
      cancelAnimationFrame(animRef.current);
    };
  }, [render]);

  // Canvas click/drag to toggle cells
  const getCellFromEvent = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const c = Math.floor(x / cellW);
      const r = Math.floor(y / cellH);
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null;
      return { r, c };
    },
    [cellW, cellH]
  );

  const toggleCell = useCallback((r: number, c: number) => {
    const i = idx(r, c);
    if (gridRef.current[i]) {
      gridRef.current[i] = 0;
      agesRef.current[i] = 0;
    } else {
      gridRef.current[i] = 1;
      agesRef.current[i] = 1;
    }
  }, []);

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      drawingRef.current = true;
      const cell = getCellFromEvent(e);
      if (cell) toggleCell(cell.r, cell.c);
    },
    [getCellFromEvent, toggleCell]
  );

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!drawingRef.current) return;
      const cell = getCellFromEvent(e);
      if (cell) {
        const i = idx(cell.r, cell.c);
        if (!gridRef.current[i]) {
          gridRef.current[i] = 1;
          agesRef.current[i] = 1;
        }
      }
    },
    [getCellFromEvent]
  );

  const handleCanvasMouseUp = useCallback(() => {
    drawingRef.current = false;
  }, []);

  // Controls
  const handleStep = useCallback(() => {
    const { next, nextAges } = stepGrid(gridRef.current, agesRef.current);
    gridRef.current = next;
    agesRef.current = nextAges;
    generationRef.current += 1;
    setGeneration(generationRef.current);
  }, []);

  const handleClear = useCallback(() => {
    gridRef.current = emptyGrid();
    agesRef.current = emptyAgeGrid();
    generationRef.current = 0;
    setGeneration(0);
    setPlaying(false);
  }, []);

  const handlePreset = useCallback((pattern: PatternDef) => {
    if (pattern.label === "Random") {
      const { grid, ages } = randomGrid();
      gridRef.current = grid;
      agesRef.current = ages;
    } else {
      const centerR = Math.floor(ROWS / 2) - 2;
      const centerC = Math.floor(COLS / 2) - 2;
      const { grid, ages } = placePattern(pattern.cells, centerR, centerC);
      gridRef.current = grid;
      agesRef.current = ages;
    }
    generationRef.current = 0;
    setGeneration(0);
  }, []);

  return (
    <section className="space-y-12 rounded-3xl border border-neutral-800 bg-neutral-950/92 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.22)] sm:p-8">
      {/* Header */}
      <div>
        <h2 className="font-mono text-2xl sm:text-3xl font-semibold text-neutral-100 mb-2">
          Conway&apos;s Game of Life
        </h2>
        <p className="text-neutral-500 text-lg font-mono">
          Four rules. Infinite complexity.
        </p>
      </div>

      {/* Rules explanation */}
      <div className="space-y-8">
        <p className="text-neutral-300 leading-relaxed max-w-2xl">
          The Game of Life is a cellular automaton devised by mathematician John
          Conway in 1970. It has no players. Its evolution is determined
          entirely by its initial state. The universe is an infinite
          two-dimensional grid of cells, each either <em>alive</em> or{" "}
          <em>dead</em>. Every generation, four rules are applied simultaneously
          to every cell:
        </p>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
            <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-neutral-500">
              What It Is
            </div>
            <p className="mt-2 text-sm text-neutral-300">
              A two-dimensional world where cells are only born, survive, or die depending on nearby neighbors.
            </p>
          </div>
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
            <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-neutral-500">
              Why It Matters
            </div>
            <p className="mt-2 text-sm text-neutral-300">
              This is where emergence stops looking decorative and starts looking computational.
            </p>
          </div>
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
            <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-neutral-500">
              What To Notice
            </div>
            <p className="mt-2 text-sm text-neutral-300">
              Small seeds do not just expand. They stabilize, oscillate, travel, and sometimes build larger machinery.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {RULE_DIAGRAMS.map((rd, i) => {
            const afterHasHighlight =
              rd.highlight &&
              rd.after.some(
                ([r, c]) => r === rd.highlight![0] && c === rd.highlight![1]
              );

            return (
              <div
                key={i}
                className="border border-neutral-800 rounded-lg p-4 space-y-3"
              >
                <div>
                  <span className="text-xs font-mono text-neutral-500 uppercase tracking-wider">
                    Rule {i + 1}
                  </span>
                  <h3 className="font-mono text-sm font-semibold text-neutral-200 mt-0.5">
                    {rd.title}
                  </h3>
                </div>
                <p className="text-neutral-400 text-sm leading-relaxed">
                  {rd.rule}
                </p>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-[10px] text-neutral-600 mb-1 font-mono">
                      Before
                    </div>
                    <MiniGrid
                      cells={rd.before}
                      size={rd.size}
                      highlight={rd.highlight}
                      highlightAlive={
                        rd.before.some(
                          ([r, c]) =>
                            rd.highlight &&
                            r === rd.highlight[0] &&
                            c === rd.highlight[1]
                        ) ?? false
                      }
                    />
                  </div>
                  <div className="text-neutral-600 text-lg font-mono">&rarr;</div>
                  <div className="text-center">
                    <div className="text-[10px] text-neutral-600 mb-1 font-mono">
                      After
                    </div>
                    <MiniGrid
                      cells={rd.after}
                      size={rd.size}
                      highlight={rd.highlight}
                      highlightAlive={afterHasHighlight ?? false}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive demo */}
      <div className="space-y-4">
        <h3 className="font-mono text-lg text-neutral-200">
          Try it yourself
        </h3>
        <p className="text-neutral-400 text-sm">
          Click or drag on the grid to draw cells. Load a preset pattern and
          press Play to watch it evolve. Start with a glider or blinker, then try the gun and watch persistent structure emerge from local rules alone.
        </p>

        {/* Controls row */}
        <div className="flex flex-wrap items-center gap-2">
          {PATTERNS.map((p) => (
            <button
              key={p.label}
              onClick={() => handlePreset(p)}
              className="px-3 py-1.5 text-xs font-mono rounded border border-neutral-700 text-neutral-300 hover:border-neutral-500 hover:text-neutral-100 transition-colors"
            >
              {p.label}
            </button>
          ))}

          <div className="w-px h-6 bg-neutral-800 mx-1" />

          <button
            onClick={handleStep}
            className="px-3 py-1.5 text-xs font-mono rounded border border-neutral-700 text-neutral-300 hover:border-neutral-500 hover:text-neutral-100 transition-colors"
          >
            Step
          </button>
          <button
            onClick={() => setPlaying((p) => !p)}
            className={`px-3 py-1.5 text-xs font-mono rounded border transition-colors ${
              playing
                ? "border-cyan-600 text-cyan-400 hover:border-cyan-500"
                : "border-neutral-700 text-neutral-300 hover:border-neutral-500 hover:text-neutral-100"
            }`}
          >
            {playing ? "Pause" : "Play"}
          </button>
          <button
            onClick={handleClear}
            className="px-3 py-1.5 text-xs font-mono rounded border border-neutral-700 text-neutral-300 hover:border-neutral-500 hover:text-neutral-100 transition-colors"
          >
            Clear
          </button>

          <div className="w-px h-6 bg-neutral-800 mx-1" />

          <span className="text-xs font-mono text-neutral-500">
            Gen {generation}
          </span>
        </div>

        {/* Speed slider */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-neutral-500 w-12">
            Speed
          </span>
          <input
            type="range"
            min={1}
            max={30}
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="flex-1 max-w-48 accent-cyan-500 h-1"
          />
          <span className="text-xs font-mono text-neutral-500 w-16">
            {speed} gen/s
          </span>
        </div>

        {/* Canvas */}
        <div ref={containerRef} className="w-full">
          <canvas
            ref={canvasRef}
            style={{ width: canvasWidth, height: CANVAS_HEIGHT }}
            className="rounded-lg border border-neutral-800 cursor-crosshair"
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
          />
        </div>
      </div>

      {/* Takeaway */}
      <div className="space-y-4 border-t border-neutral-800 pt-8">
        <p className="text-neutral-300 leading-relaxed max-w-2xl">
          The Game of Life is{" "}
          <span className="text-neutral-100 font-medium">Turing complete</span>{" "}
          ... you can build entire computers inside it. Logic gates,
          memory, clocks. All from four rules applied to a grid.
        </p>
        <p className="text-neutral-300 leading-relaxed max-w-2xl">
          Earlier versions of this website used a Game of Life-based background.
          The standalone experience remains here because it shows how a tiny local
          rule set can scale into moving structure and machine-like behavior.
        </p>
        <p className="text-neutral-500 max-w-2xl">
          What to take away: the same tiny rule set can produce stillness, repetition, locomotion, and computation depending only on the seed.
        </p>
      </div>
    </section>
  );
}
