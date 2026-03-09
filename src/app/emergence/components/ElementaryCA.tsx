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
const CELL_OFF_COLOR = "#171717";
const CELL_ON_RULE_TABLE = "#22d3ee";
const CELL_OFF_RULE_TABLE = "#404040"; // neutral-600

// ---------------------------------------------------------------------------
// Canvas drawing
// ---------------------------------------------------------------------------

/** Draw a single row of cells onto the canvas. */
function drawRow(
  canvas: HTMLCanvasElement,
  row: Uint8Array,
  rowIndex: number,
  cellSize: number
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  for (let x = 0; x < row.length; x++) {
    ctx.fillStyle = row[x] ? CELL_ON_COLOR : CELL_OFF_COLOR;
    ctx.fillRect(x * cellSize, rowIndex * cellSize, cellSize, cellSize);
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

export default function ElementaryCA(): React.ReactElement {
  // State
  const [rule, setRule] = useState<RuleNumber>(30);
  const [customRuleInput, setCustomRuleInput] = useState<string>("30");
  const [playing, setPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(10); // generations per second
  const [cellState, setCellState] = useState<CellState | null>(null);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);
  const lastTickRef = useRef<number>(0);
  const cellStateRef = useRef<CellState | null>(null);
  const ruleTableRef = useRef<Uint8Array>(decodeRule(30));
  const cellSizeRef = useRef<number>(2);
  const maxRowsRef = useRef<number>(200);

  // Keep refs in sync
  useEffect(() => {
    cellStateRef.current = cellState;
  }, [cellState]);

  useEffect(() => {
    ruleTableRef.current = decodeRule(rule);
  }, [rule]);

  // Compute cell size and initialize grid when container mounts or resizes
  const initializeGrid = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const containerW = container.clientWidth;
    const canvasH = 400;

    // Target ~200 cells across; clamp cell size to at least 1
    const cellSize = Math.max(1, Math.floor(containerW / 200));
    cellSizeRef.current = cellSize;

    const gridWidth = Math.floor(containerW / cellSize);
    const maxRows = Math.floor(canvasH / cellSize);
    maxRowsRef.current = maxRows;

    // Set canvas resolution to match container
    canvas.width = containerW;
    canvas.height = canvasH;

    // Clear canvas
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const initial = createInitialGrid(gridWidth);
    setCellState(initial);
    cellStateRef.current = initial;

    // Draw initial row
    drawRow(canvas, initial.grid[0], 0, cellSize);
  }, []);

  // Initialize on mount
  useEffect(() => {
    initializeGrid();
  }, [initializeGrid]);

  // Handle resize
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      setPlaying(false);
      initializeGrid();
    });
    const container = containerRef.current;
    if (container) observer.observe(container);
    return () => observer.disconnect();
  }, [initializeGrid]);

  // Advance one generation
  const stepOnce = useCallback((): boolean => {
    const state = cellStateRef.current;
    const canvas = canvasRef.current;
    if (!state || !canvas) return false;

    const table = ruleTableRef.current;
    const currentRow = state.grid[state.grid.length - 1];
    const nextRow = stepRow(currentRow, table);
    const nextGen = state.generation + 1;

    const maxRows = maxRowsRef.current;
    const cellSize = cellSizeRef.current;

    if (nextGen >= maxRows) {
      // Scroll: shift everything up by one row
      const ctx = canvas.getContext("2d");
      if (!ctx) return false;

      const newGrid = [...state.grid.slice(1), nextRow];
      const newState: CellState = {
        grid: newGrid,
        width: state.width,
        generation: nextGen,
      };
      setCellState(newState);
      cellStateRef.current = newState;

      // Redraw entire canvas (scrolling)
      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (let r = 0; r < newGrid.length; r++) {
        drawRow(canvas, newGrid[r], r, cellSize);
      }
    } else {
      // Append: just draw the new row
      const newGrid = [...state.grid, nextRow];
      const newState: CellState = {
        grid: newGrid,
        width: state.width,
        generation: nextGen,
      };
      setCellState(newState);
      cellStateRef.current = newState;

      drawRow(canvas, nextRow, nextGen, cellSize);
    }

    return true;
  }, []);

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
      // Re-initialize after rule change so the table and canvas are in sync
      // Use a microtask so the rule state update commits first
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

  const generation = cellState?.generation ?? 0;

  return (
    <div className="space-y-8">
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
          Each cell looks at itself and its two neighbors &mdash; three cells, eight possible patterns.
          A <em>rule number</em> from 0 to 255 encodes what the output should be for each pattern.
          That&rsquo;s it. Apply the rule to every cell, simultaneously, to produce the next generation.
        </p>

        {/* Rule table */}
        <div className="p-4 sm:p-6 rounded-lg border border-neutral-800 bg-neutral-900/50">
          <div className="text-xs text-neutral-500 mb-4 text-center tracking-wide uppercase">
            Rule {rule} &mdash; Lookup Table
          </div>
          <RuleTable rule={rule} />
        </div>
      </div>

      {/* Canvas */}
      <div className="space-y-3">
        <div
          ref={containerRef}
          className="w-full rounded-lg border border-neutral-800 overflow-hidden"
          style={{ height: 400, background: BG_COLOR }}
        >
          <canvas
            ref={canvasRef}
            className="block w-full"
            style={{ height: 400, imageRendering: "pixelated" }}
          />
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
          <strong className="text-neutral-100">Rule 30</strong> produces apparent randomness &mdash;
          Wolfram used it as a pseudorandom number generator in Mathematica.{" "}
          <strong className="text-neutral-100">Rule 110</strong> is proven Turing complete: it can
          compute anything a general-purpose computer can.{" "}
          <strong className="text-neutral-100">Rule 90</strong> produces the Sierpinski triangle, a
          fractal with infinite self-similarity.{" "}
          <strong className="text-neutral-100">Rule 184</strong> models basic traffic flow &mdash;
          particles that conserve density.
        </p>
        <p className="text-neutral-500">
          All from a lookup table with 8 entries.
        </p>
      </div>
    </div>
  );
}
