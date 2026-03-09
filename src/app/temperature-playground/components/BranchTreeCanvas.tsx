"use client";

import { useRef, useState, useCallback, useMemo, useEffect } from "react";
import type { GeneratedToken } from "../types";
import ProbabilityTable from "./ProbabilityTable";

export interface TreeRun {
  id: number;
  parentId: number | null;
  parentForkTokenIndex: number;
  tokens: GeneratedToken[];
  isGenerating: boolean;
}

interface Props {
  runs: TreeRun[];
  prompt: string;
  selectedRunId: number | null;
  selectedTokenIndex: number;
  onTokenSelect: (runId: number, tokenIndex: number) => void;
}

// Layout constants
const TOKEN_W = 56;
const TOKEN_H = 28;
const STRIDE = TOKEN_W + 2;
const ROW_GAP = 16; // vertical gap between rows (below arrow tip to next token top)
const PAD = 32;

// --- Layout ---

interface LayoutEntry {
  runId: number;
  x: number;
  y: number;
  tokens: GeneratedToken[];
  parentId: number | null;
}

interface Arrow {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Horizontal offset for the departure point when multiple arrows leave the same parent */
  siblingOffset: number;
}

/**
 * Depth-first tree layout: children are placed directly below their parent
 * with only enough vertical gap for the connecting arrow, keeping the tree
 * compact and avoiding the long diagonal arrows that cause collisions.
 */
function computeLayout(runs: TreeRun[]) {
  const entries: LayoutEntry[] = [];
  const arrows: Arrow[] = [];
  const posMap = new Map<number, { x: number; y: number }>();

  const sorted = [...runs].sort((a, b) => a.id - b.id);

  // Build children lookup and count siblings per parent for offset calculation
  const childrenOf = new Map<number, TreeRun[]>();
  for (const run of sorted) {
    if (run.parentId !== null) {
      const list = childrenOf.get(run.parentId) ?? [];
      list.push(run);
      childrenOf.set(run.parentId, list);
    }
  }

  // Track the next available Y per column-ish region to avoid vertical overlap
  let nextY = PAD;

  // Process in BFS order so parents are always placed before children
  const queue: TreeRun[] = sorted.filter((r) => r.parentId === null);
  const visited = new Set<number>();
  // BFS with sorted insertion
  let head = 0;
  while (head < queue.length) {
    const run = queue[head++];
    if (visited.has(run.id)) continue;
    visited.add(run.id);

    let x = PAD;
    let y = nextY;

    if (run.parentId !== null && posMap.has(run.parentId)) {
      const parent = posMap.get(run.parentId)!;
      x = parent.x + run.parentForkTokenIndex * STRIDE;
      // Place child right below parent row
      y = Math.max(nextY, parent.y + TOKEN_H + ROW_GAP + 18); // 18 = arrow clearance

      // Compute sibling offset: if multiple children share the same parent,
      // stagger their departure points horizontally so arrows don't overlap
      const siblings = childrenOf.get(run.parentId) ?? [];
      const sibIdx = siblings.indexOf(run);
      const siblingOffset = siblings.length > 1 ? (sibIdx - (siblings.length - 1) / 2) * 6 : 0;

      const forkX =
        parent.x +
        Math.max(0, run.parentForkTokenIndex - 1) * STRIDE +
        TOKEN_W / 2 +
        siblingOffset;
      const forkY = parent.y + TOKEN_H;

      arrows.push({
        x1: forkX,
        y1: forkY,
        x2: x + TOKEN_W / 2,
        y2: y,
        siblingOffset,
      });
    }

    entries.push({
      runId: run.id,
      x,
      y,
      tokens: run.tokens,
      parentId: run.parentId,
    });
    posMap.set(run.id, { x, y });
    nextY = y + TOKEN_H + ROW_GAP + 18;

    // Enqueue children
    const children = childrenOf.get(run.id);
    if (children) {
      for (const child of children) queue.push(child);
    }
  }

  return { entries, arrows };
}

// --- Full text path ---

function getFullText(
  runs: TreeRun[],
  prompt: string,
  runId: number,
  tokenIndex: number
): string {
  const map = new Map(runs.map((r) => [r.id, r]));

  function collect(id: number, upTo: number): string {
    const run = map.get(id);
    if (!run) return "";

    let prefix = "";
    if (run.parentId !== null) {
      prefix = collect(run.parentId, run.parentForkTokenIndex - 1);
    }

    return (
      prefix +
      run.tokens
        .slice(0, upTo + 1)
        .map((t) => t.token)
        .join("")
    );
  }

  return prompt + collect(runId, tokenIndex);
}

// --- Colors ---

function probColor(p: number, selected: boolean): string {
  if (selected) return "bg-blue-500 border-blue-600 text-white";
  if (p > 0.5) return "bg-green-600/90 border-green-700 text-white";
  if (p > 0.2) return "bg-emerald-500/80 border-emerald-600 text-white";
  if (p > 0.1) return "bg-yellow-500/80 border-yellow-600 text-neutral-900";
  if (p > 0.05) return "bg-orange-500/80 border-orange-600 text-white";
  return "bg-red-500/80 border-red-600 text-white";
}

// --- Component ---

export default function BranchTreeCanvas({
  runs,
  prompt,
  selectedRunId,
  selectedTokenIndex,
  onTokenSelect,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const dragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  const { entries, arrows } = useMemo(() => computeLayout(runs), [runs]);

  const selectedToken = useMemo(() => {
    if (selectedRunId === null || selectedTokenIndex < 0) return null;
    return (
      runs.find((r) => r.id === selectedRunId)?.tokens[selectedTokenIndex] ??
      null
    );
  }, [runs, selectedRunId, selectedTokenIndex]);

  const previewText = useMemo(() => {
    if (selectedRunId === null || selectedTokenIndex < 0) return "";
    return getFullText(runs, prompt, selectedRunId, selectedTokenIndex);
  }, [runs, prompt, selectedRunId, selectedTokenIndex]);

  const canvasSize = useMemo(() => {
    let w = 0;
    let h = 0;
    for (const e of entries) {
      w = Math.max(w, e.x + e.tokens.length * STRIDE + PAD);
      h = Math.max(h, e.y + TOKEN_H + PAD);
    }
    return { width: Math.max(w, 200), height: Math.max(h, 200) };
  }, [entries]);

  // Pan
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      dragging.current = true;
      lastMouse.current = { x: e.clientX, y: e.clientY };
    },
    []
  );

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    setView((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
  }, []);

  const onMouseUp = useCallback(() => {
    dragging.current = false;
  }, []);

  // Zoom helpers
  const zoomAt = useCallback(
    (cx: number, cy: number, factor: number) => {
      setView((prev) => {
        const newScale = Math.min(Math.max(prev.scale * factor, 0.15), 4);
        const ratio = newScale / prev.scale;
        return {
          x: cx - (cx - prev.x) * ratio,
          y: cy - (cy - prev.y) * ratio,
          scale: newScale,
        };
      });
    },
    []
  );

  const zoomCenter = useCallback(
    (factor: number) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      zoomAt(rect.width / 2, rect.height / 2, factor);
    },
    [zoomAt]
  );

  // Wheel: pinch-to-zoom (trackpad) + scroll to pan
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();

      // Trackpad pinch-to-zoom fires with ctrlKey set by the browser
      if (e.ctrlKey) {
        const rect = el.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        // Trackpad pinch deltaY is much smaller than mouse scroll, so use
        // a continuous factor instead of a fixed step
        const factor = Math.pow(2, -e.deltaY * 0.01);
        zoomAt(mx, my, factor);
      } else {
        // Two-finger scroll (trackpad pan) or regular mouse scroll
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

  if (runs.length === 0) {
    return (
      <div className="h-80 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg flex items-center justify-center text-neutral-400">
        Run branching to build a token tree.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Text preview */}
      <div className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg min-h-[72px]">
        <div className="text-xs text-neutral-500 mb-1">
          {selectedRunId !== null
            ? `Branch #${selectedRunId + 1} \u00b7 Token ${selectedTokenIndex + 1}`
            : "Click a token to preview the full text path"}
        </div>
        <div className="font-mono text-sm whitespace-pre-wrap">
          <span className="text-neutral-400">{prompt}</span>
          {previewText && (
            <span className="text-neutral-900 dark:text-neutral-100">
              {previewText.slice(prompt.length)}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Canvas */}
        <div
          ref={containerRef}
          className="relative flex-1 border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden select-none cursor-grab active:cursor-grabbing"
          style={{ height: 480 }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          {/* Zoom controls */}
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
            <button
              type="button"
              onClick={() => zoomCenter(1.25)}
              className="w-7 h-7 flex items-center justify-center text-sm rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-100/80 dark:bg-neutral-800/80 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-400"
              title="Zoom in"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => zoomCenter(0.8)}
              className="w-7 h-7 flex items-center justify-center text-sm rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-100/80 dark:bg-neutral-800/80 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-400"
              title="Zoom out"
            >
              &minus;
            </button>
            <button
              type="button"
              onClick={() => setView({ x: 0, y: 0, scale: 1 })}
              className="h-7 px-2 flex items-center justify-center text-[10px] rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-100/80 dark:bg-neutral-800/80 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-400"
              title="Reset view"
            >
              {Math.round(view.scale * 100)}%
            </button>
          </div>

          <div
            style={{
              transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
              transformOrigin: "0 0",
              position: "relative",
              width: canvasSize.width,
              height: canvasSize.height,
            }}
          >
            {/* Arrows */}
            <svg
              className="absolute pointer-events-none"
              style={{
                width: canvasSize.width,
                height: canvasSize.height,
                overflow: "visible",
              }}
            >
              <defs>
                <marker
                  id="tree-arrow"
                  markerWidth="7"
                  markerHeight="5"
                  refX="7"
                  refY="2.5"
                  orient="auto"
                >
                  <polygon
                    points="0 0, 7 2.5, 0 5"
                    className="fill-neutral-400 dark:fill-neutral-500"
                  />
                </marker>
              </defs>
              {arrows.map((a, i) => {
                const dy = a.y2 - a.y1;
                const dx = a.x2 - a.x1;
                // Scale control point offset with distance so short arrows
                // curve gently and long arrows don't clip through nodes
                const cpY = Math.min(Math.max(dy * 0.4, 12), 60);
                // For arrows with significant horizontal distance, add a
                // horizontal component to the control points to create an
                // S-curve that routes around intermediate nodes
                const cpX = dx * 0.15;
                return (
                  <path
                    key={i}
                    d={`M ${a.x1} ${a.y1} C ${a.x1 + cpX} ${a.y1 + cpY}, ${a.x2 - cpX} ${a.y2 - cpY}, ${a.x2} ${a.y2}`}
                    fill="none"
                    strokeWidth={1.5}
                    className="stroke-neutral-400 dark:stroke-neutral-500"
                    markerEnd="url(#tree-arrow)"
                  />
                );
              })}
            </svg>

            {/* Branch labels */}
            {entries.map((entry) => (
              <div
                key={`lbl-${entry.runId}`}
                className="absolute text-[9px] text-neutral-500 whitespace-nowrap pointer-events-none"
                style={{ left: entry.x, top: entry.y - 13 }}
              >
                #{entry.runId + 1}
                {entry.parentId !== null
                  ? ` \u2190 #${entry.parentId + 1}`
                  : " (root)"}
              </div>
            ))}

            {/* Token blocks */}
            {entries.map((entry) =>
              entry.tokens.map((token, i) => {
                const sel =
                  entry.runId === selectedRunId && i === selectedTokenIndex;
                return (
                  <div
                    key={`${entry.runId}-${i}`}
                    className={`absolute flex items-center justify-center rounded-[3px] border text-[10px] font-mono leading-none truncate cursor-pointer transition-all hover:brightness-110 hover:scale-105 hover:z-20 ${probColor(token.selectedProbability, sel)} ${sel ? "ring-2 ring-offset-1 ring-blue-400 dark:ring-blue-500 z-10 scale-105" : ""}`}
                    style={{
                      left: entry.x + i * STRIDE,
                      top: entry.y,
                      width: TOKEN_W,
                      height: TOKEN_H,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onTokenSelect(entry.runId, i);
                    }}
                    title={`"${token.token}" \u00b7 ${(token.selectedProbability * 100).toFixed(1)}%`}
                  >
                    <span className="truncate px-0.5">
                      {token.token.trim() || "\u23b5"}
                    </span>
                  </div>
                );
              })
            )}

            {/* Generating indicators */}
            {entries.map((entry) => {
              const run = runs.find((r) => r.id === entry.runId);
              if (!run?.isGenerating) return null;
              return (
                <div
                  key={`gen-${entry.runId}`}
                  className="absolute flex items-center text-[10px] text-blue-500 animate-pulse pointer-events-none"
                  style={{
                    left: entry.x + entry.tokens.length * STRIDE + 4,
                    top: entry.y + TOKEN_H / 2 - 6,
                  }}
                >
                  ...
                </div>
              );
            })}
          </div>
        </div>

        {/* Probability panel */}
        {selectedToken && (
          <div className="w-full lg:w-72 shrink-0 border border-neutral-200 dark:border-neutral-800 rounded-lg p-3">
            <div className="mb-2">
              <span className="text-xs text-neutral-500">Selected: </span>
              <code className="text-sm font-bold">
                {selectedToken.token.trim() || "\u23b5"}
              </code>
              <span className="text-xs text-neutral-500 ml-1">
                ({(selectedToken.selectedProbability * 100).toFixed(1)}%)
              </span>
            </div>
            <div className="h-[360px]">
              <ProbabilityTable
                probabilities={selectedToken.topProbabilities}
                selectedTokenId={selectedToken.tokenId}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
