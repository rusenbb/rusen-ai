"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RuleNumber = number; // 0–255

interface CellState {
  grid: Uint8Array[];
  width: number;
  generation: number;
}

// ---------------------------------------------------------------------------
// CA logic
// ---------------------------------------------------------------------------

/** Decode a rule number (0–255) into an 8-entry lookup table. */
function decodeRule(rule: RuleNumber): Uint8Array {
  const table = new Uint8Array(8);
  for (let i = 0; i < 8; i++) {
    table[i] = (rule >> i) & 1;
  }
  return table;
}

/** Compute the next generation from the current row. */
function stepRow(row: Uint8Array, table: Uint8Array): Uint8Array {
  const w = row.length;
  const next = new Uint8Array(w);
  for (let i = 0; i < w; i++) {
    const left = i === 0 ? 0 : row[i - 1];
    const center = row[i];
    const right = i === w - 1 ? 0 : row[i + 1];
    const idx = (left << 2) | (center << 1) | right;
    next[i] = table[idx];
  }
  return next;
}

/** Create an initial grid: single cell in the center. */
function createInitialGrid(width: number): CellState {
  const row = new Uint8Array(width);
  row[Math.floor(width / 2)] = 1;
  return { grid: [row], width, generation: 0 };
}

// ---------------------------------------------------------------------------
// Notable rules
// ---------------------------------------------------------------------------

interface NotableRule {
  number: RuleNumber;
  label: string;
}

const NOTABLE_RULES: NotableRule[] = [
  { number: 30, label: "Rule 30" },
  { number: 90, label: "Rule 90" },
  { number: 110, label: "Rule 110" },
  { number: 184, label: "Rule 184" },
];

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

const BG_COLOR = "#171717"; // neutral-900
const CELL_ON_COLOR = "#22d3ee"; // cyan-400
const CELL_ON_RULE_TABLE = "#22d3ee";
const CELL_OFF_RULE_TABLE = "#404040"; // neutral-600

// ---------------------------------------------------------------------------
// Canvas drawing
// ---------------------------------------------------------------------------

/** Draw the entire visible portion of the grid onto the canvas. */
function drawFullGrid(
  canvas: HTMLCanvasElement,
  grid: Uint8Array[],
  gridWidth: number,
  view: { x: number; y: number; scale: number }
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const displayW = canvas.width / dpr;
  const displayH = canvas.height / dpr;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, displayW, displayH);

  const cellSize = view.scale;
  const offsetX = view.x;
  const offsetY = view.y;

  // Determine visible range to avoid drawing off-screen cells
  const startCol = Math.max(0, Math.floor(-offsetX / cellSize));
  const endCol = Math.min(gridWidth, Math.ceil((displayW - offsetX) / cellSize));
  const startRow = Math.max(0, Math.floor(-offsetY / cellSize));
  const endRow = Math.min(grid.length, Math.ceil((displayH - offsetY) / cellSize));

  for (let r = startRow; r < endRow; r++) {
    const row = grid[r];
    for (let c = startCol; c < endCol; c++) {
      if (row[c]) {
        ctx.fillStyle = CELL_ON_COLOR;
        ctx.fillRect(
          offsetX + c * cellSize,
          offsetY + r * cellSize,
          cellSize,
          cellSize
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Rule Table visualization
// ---------------------------------------------------------------------------

/** The 8 neighborhood patterns in standard (descending) order: 111, 110, …, 000 */
const NEIGHBORHOOD_PATTERNS: [number, number, number][] = [
  [1, 1, 1],
  [1, 1, 0],
  [1, 0, 1],
  [1, 0, 0],
  [0, 1, 1],
  [0, 1, 0],
  [0, 0, 1],
  [0, 0, 0],
];

function RuleTableEntry({
  pattern,
  output,
}: {
  pattern: [number, number, number];
  output: number;
}): React.ReactElement {
  const cellSize = 14;
  const gap = 2;
  const totalW = cellSize * 3 + gap * 2;

  return (
    <div className="flex flex-col items-center gap-1.5">
      {/* Input neighborhood — 3 cells in a row */}
      <svg width={totalW} height={cellSize} aria-hidden="true">
        {pattern.map((val: number, i: number) => (
          <rect
            key={i}
            x={i * (cellSize + gap)}
            y={0}
            width={cellSize}
            height={cellSize}
            rx={2}
            fill={val ? CELL_ON_RULE_TABLE : CELL_OFF_RULE_TABLE}
          />
        ))}
      </svg>

      {/* Arrow */}
      <svg width={8} height={10} aria-hidden="true" className="text-neutral-600">
        <path d="M4 0 L4 6 M1 4 L4 8 L7 4" stroke="currentColor" fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      {/* Output cell */}
      <svg width={cellSize} height={cellSize} aria-hidden="true">
        <rect
          x={0}
          y={0}
          width={cellSize}
          height={cellSize}
          rx={2}
          fill={output ? CELL_ON_RULE_TABLE : CELL_OFF_RULE_TABLE}
        />
      </svg>
    </div>
  );
}

function RuleTable({ rule }: { rule: RuleNumber }): React.ReactElement {
  const table = useMemo(() => decodeRule(rule), [rule]);

  return (
    <div className="flex flex-wrap justify-center gap-4 sm:gap-5">
      {NEIGHBORHOOD_PATTERNS.map((pattern, i) => {
        const idx = (pattern[0] << 2) | (pattern[1] << 1) | pattern[2];
        return (
          <RuleTableEntry
            key={i}
            pattern={pattern}
            output={table[idx]}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const GRID_WIDTH = 301; // odd so center cell is exactly centered
const CANVAS_HEIGHT = 400;

export default function ElementaryCA(): React.ReactElement {
  // State
  const [rule, setRule] = useState<RuleNumber>(30);
  const [customRuleInput, setCustomRuleInput] = useState<string>("30");
  const [playing, setPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(10);
  const [generation, setGeneration] = useState<number>(0);
  const [view, setView] = useState({ x: 0, y: 0, scale: 3 });

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);
  const lastTickRef = useRef<number>(0);
  const gridRef = useRef<Uint8Array[]>([]);
  const ruleTableRef = useRef<Uint8Array>(decodeRule(30));
  const dragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const viewRef = useRef(view);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  useEffect(() => {
    ruleTableRef.current = decodeRule(rule);
  }, [rule]);

  // Redraw canvas from grid + view
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const displayW = container.clientWidth;
    const displayH = CANVAS_HEIGHT;
    const w = Math.floor(displayW * dpr);
    const h = Math.floor(displayH * dpr);

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    drawFullGrid(canvas, gridRef.current, GRID_WIDTH, viewRef.current);
  }, []);

  // Initialize grid
  const initializeGrid = useCallback(() => {
    const initial = createInitialGrid(GRID_WIDTH);
    gridRef.current = initial.grid;
    setGeneration(0);

    // Center the view so the initial cell is in the middle of the canvas
    const container = containerRef.current;
    if (container) {
      const containerW = container.clientWidth;
      const centerX = containerW / 2 - (GRID_WIDTH / 2) * 3;
      setView({ x: centerX, y: 0, scale: 3 });
    }

    redraw();
  }, [redraw]);

  // Initialize on mount
  useEffect(() => {
    queueMicrotask(() => {
      initializeGrid();
    });
  }, [initializeGrid]);

  // Redraw when view changes
  useEffect(() => {
    redraw();
  }, [view, redraw]);

  // Handle resize
  useEffect(() => {
    const observer = new ResizeObserver(() => redraw());
    const container = containerRef.current;
    if (container) observer.observe(container);
    return () => observer.disconnect();
  }, [redraw]);

  // Advance one generation (grid grows indefinitely, no scrolling)
  const stepOnce = useCallback((): boolean => {
    const grid = gridRef.current;
    if (grid.length === 0) return false;

    const table = ruleTableRef.current;
    const currentRow = grid[grid.length - 1];
    const nextRow = stepRow(currentRow, table);
    grid.push(nextRow);
    setGeneration(grid.length - 1);
    redraw();
    return true;
  }, [redraw]);

  // Animation loop
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
      const interval = 1000 / speed;
      if (now - lastTickRef.current >= interval) {
        stepOnce();
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
  }, [playing, speed, stepOnce]);

  // --- Pan ---
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    dragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    setView((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
  }, []);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  // --- Zoom (wheel: pinch-to-zoom on trackpad, scroll to pan) ---
  const zoomAt = useCallback((cx: number, cy: number, factor: number) => {
    setView((prev) => {
      const newScale = Math.min(Math.max(prev.scale * factor, 0.5), 20);
      const ratio = newScale / prev.scale;
      return {
        x: cx - (cx - prev.x) * ratio,
        y: cy - (cy - prev.y) * ratio,
        scale: newScale,
      };
    });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey) {
        // Trackpad pinch or ctrl+scroll
        const rect = el.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const factor = Math.pow(2, -e.deltaY * 0.01);
        zoomAt(mx, my, factor);
      } else {
        // Two-finger scroll / regular scroll = pan
        setView((prev) => ({
          ...prev,
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY,
        }));
      }
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [zoomAt]);

  // Zoom buttons
  const zoomCenter = useCallback(
    (factor: number) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      zoomAt(rect.width / 2, rect.height / 2, factor);
    },
    [zoomAt]
  );

  // Reset handler
  const handleReset = useCallback(() => {
    setPlaying(false);
    initializeGrid();
  }, [initializeGrid]);

  // Rule change handler
  const handleRuleChange = useCallback(
    (newRule: RuleNumber) => {
      setRule(newRule);
      setCustomRuleInput(String(newRule));
      setPlaying(false);
      queueMicrotask(() => {
        initializeGrid();
      });
    },
    [initializeGrid]
  );

  // Custom rule input handler
  const handleCustomRuleSubmit = useCallback(() => {
    const parsed = parseInt(customRuleInput, 10);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 255) {
      handleRuleChange(parsed);
    }
  }, [customRuleInput, handleRuleChange]);

  return (
    <div className="space-y-8 rounded-3xl border border-neutral-800 bg-neutral-950/92 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.22)] sm:p-8">
      {/* Heading */}
      <div>
        <h2 className="font-mono text-2xl sm:text-3xl font-semibold text-neutral-100 mb-2">
          Elementary Cellular Automata
        </h2>
        <p className="text-neutral-500 text-base sm:text-lg">
          The simplest possible system. The most surprising behavior.
        </p>
      </div>

      {/* Rules explanation */}
      <div className="space-y-4 text-neutral-300 text-sm sm:text-base leading-relaxed">
        <p>
          A one-dimensional row of cells, each either <strong className="text-cyan-400">on</strong> or off.
          Each cell looks at itself and its two neighbors: three cells, eight possible patterns.
          A <em>rule number</em> from 0 to 255 encodes what the output should be for each pattern.
          That&rsquo;s it. Apply the rule to every cell, simultaneously, to produce the next generation.
        </p>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
            <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-neutral-500">
              What It Is
            </div>
            <p className="mt-2 text-sm text-neutral-300">
              A one-dimensional universe where each cell only sees three cells at a time.
            </p>
          </div>
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
            <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-neutral-500">
              Why It Matters
            </div>
            <p className="mt-2 text-sm text-neutral-300">
              This is the cleanest proof that complexity does not require complicated ingredients.
            </p>
          </div>
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
            <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-neutral-500">
              What To Notice
            </div>
            <p className="mt-2 text-sm text-neutral-300">
              Switch between rules and watch how tiny local changes flip the whole system from order to noise to fractal structure.
            </p>
          </div>
        </div>

        {/* Rule table */}
        <div className="p-4 sm:p-6 rounded-lg border border-neutral-800 bg-neutral-900/50">
          <div className="text-xs text-neutral-500 mb-4 text-center tracking-wide uppercase">
            Rule {rule} / Lookup Table
          </div>
          <RuleTable rule={rule} />
        </div>
      </div>

      {/* Canvas */}
      <div className="space-y-3">
        <div
          ref={containerRef}
          className="relative w-full rounded-lg border border-neutral-800 overflow-hidden select-none cursor-grab active:cursor-grabbing"
          style={{ height: CANVAS_HEIGHT, background: BG_COLOR }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          <canvas
            ref={canvasRef}
            className="block w-full touch-none"
            style={{ height: CANVAS_HEIGHT, imageRendering: "pixelated" }}
          />
          {/* Zoom controls */}
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
            <button
              type="button"
              onClick={() => zoomCenter(1.4)}
              className="w-7 h-7 flex items-center justify-center text-sm rounded border border-neutral-700 bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400"
              title="Zoom in"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => zoomCenter(0.7)}
              className="w-7 h-7 flex items-center justify-center text-sm rounded border border-neutral-700 bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400"
              title="Zoom out"
            >
              &minus;
            </button>
            <button
              type="button"
              onClick={() => {
                const container = containerRef.current;
                if (!container) return;
                const containerW = container.clientWidth;
                setView({ x: containerW / 2 - (GRID_WIDTH / 2) * 3, y: 0, scale: 3 });
              }}
              className="h-7 px-2 flex items-center justify-center text-[10px] font-mono rounded border border-neutral-700 bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400"
              title="Reset view"
            >
              {Math.round(view.scale * 100)}%
            </button>
          </div>
        </div>

        {/* Generation counter */}
        <div className="text-xs text-neutral-500 font-mono">
          Generation {generation}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Rule selector buttons */}
          <div className="flex flex-wrap gap-1.5">
            {NOTABLE_RULES.map((r) => (
              <button
                key={r.number}
                onClick={() => handleRuleChange(r.number)}
                className={`px-3 py-1.5 text-xs font-mono rounded border transition ${
                  rule === r.number
                    ? "border-cyan-500 bg-cyan-500/10 text-cyan-400"
                    : "border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-neutral-300"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Custom rule input */}
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min={0}
              max={255}
              value={customRuleInput}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setCustomRuleInput(e.target.value)
              }
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Enter") handleCustomRuleSubmit();
              }}
              className="w-16 px-2 py-1.5 text-xs font-mono bg-neutral-800 border border-neutral-700 rounded text-neutral-300 focus:outline-none focus:border-cyan-600"
              placeholder="0-255"
            />
            <button
              onClick={handleCustomRuleSubmit}
              className="px-2.5 py-1.5 text-xs font-mono rounded border border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-neutral-300 transition"
            >
              Set
            </button>
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-neutral-800 hidden sm:block" />

          {/* Playback controls */}
          <div className="flex gap-1.5">
            <button
              onClick={stepOnce}
              disabled={playing}
              className="px-3 py-1.5 text-xs font-mono rounded border border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-neutral-300 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Step
            </button>
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

          {/* Speed slider */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-neutral-500 font-mono" htmlFor="ca-speed">
              Speed
            </label>
            <input
              id="ca-speed"
              type="range"
              min={1}
              max={30}
              value={speed}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSpeed(parseInt(e.target.value, 10))
              }
              className="w-20 sm:w-28 accent-cyan-500"
            />
            <span className="text-xs text-neutral-500 font-mono w-12">
              {speed}/s
            </span>
          </div>
        </div>
      </div>

      {/* Takeaway */}
      <div className="text-neutral-300 text-sm sm:text-base leading-relaxed space-y-3 border-l-2 border-cyan-800 pl-4">
        <p>
          <strong className="text-neutral-100">Rule 30</strong> produces apparent randomness.
          Wolfram used it as a pseudorandom number generator in Mathematica.{" "}
          <strong className="text-neutral-100">Rule 110</strong> is proven Turing complete: it can
          compute anything a general-purpose computer can.{" "}
          <strong className="text-neutral-100">Rule 90</strong> produces the Sierpinski triangle, a
          fractal with infinite self-similarity.{" "}
          <strong className="text-neutral-100">Rule 184</strong> models basic traffic flow,
          particles that conserve density.
        </p>
        <p className="text-neutral-500">
          All from a lookup table with 8 entries. The claim of emergence starts here: local rules can already outrun intuition.
        </p>
      </div>
    </div>
  );
}
