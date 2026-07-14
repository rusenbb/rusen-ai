import { describe, expect, it } from "vitest";

import {
  PATHFINDING_PRESETS,
  cellKey,
  createDefaultGrid,
  runSearch,
  traceSearch,
  type PathGrid,
} from "./algorithms";

const weightedDetour: PathGrid = {
  rows: 3,
  cols: 5,
  cells: [
    ["empty", "empty", "empty", "empty", "empty"],
    ["empty", "mud", "mud", "mud", "empty"],
    ["empty", "empty", "empty", "empty", "empty"],
  ],
  start: { row: 1, col: 0 },
  goal: { row: 1, col: 4 },
};

describe("pathfinding algorithms", () => {
  it("lets BFS take the fewest-step route even when it crosses expensive mud", () => {
    const result = runSearch(weightedDetour, "bfs");

    expect(result.found).toBe(true);
    expect(result.path).toHaveLength(5);
    expect(result.cost).toBe(16);
  });

  it("lets Dijkstra and A* choose the cheaper detour", () => {
    const dijkstra = runSearch(weightedDetour, "dijkstra");
    const astar = runSearch(weightedDetour, "astar");

    expect(dijkstra.cost).toBe(6);
    expect(astar.cost).toBe(6);
    expect(dijkstra.path).toHaveLength(7);
    expect(astar.path).toHaveLength(7);
  });

  it("reports an unreachable goal", () => {
    const blocked: PathGrid = {
      ...weightedDetour,
      cells: [
        ["empty", "wall", "empty", "empty", "empty"],
        ["empty", "wall", "mud", "mud", "empty"],
        ["empty", "wall", "empty", "empty", "empty"],
      ],
    };

    expect(runSearch(blocked, "astar")).toMatchObject({ found: false, path: [], cost: null });
  });

  it("uses a default scenario where move count and terrain cost disagree", () => {
    const grid = createDefaultGrid();
    const bfs = runSearch(grid, "bfs");
    const dijkstra = runSearch(grid, "dijkstra");
    const greedy = runSearch(grid, "greedy");
    const astar = runSearch(grid, "astar");

    expect(bfs).toMatchObject({ cost: 40, found: true });
    expect(greedy).toMatchObject({ cost: 40, found: true });
    expect(dijkstra).toMatchObject({ cost: 14, found: true });
    expect(astar).toMatchObject({ cost: 14, found: true });
    expect(bfs.path.length).toBeLessThan(dijkstra.path.length);
  });

  it("keeps every curated scenario solvable", () => {
    PATHFINDING_PRESETS.forEach((preset) => {
      const grid = preset.createGrid();

      ["bfs", "dijkstra", "greedy", "astar"].forEach((algorithm) => {
        expect(runSearch(grid, algorithm as "bfs" | "dijkstra" | "greedy" | "astar").found).toBe(true);
      });
    });
  });

  it("records an inspectable frontier after every settled cell", () => {
    const grid = createDefaultGrid();
    const trace = traceSearch(grid, "astar");

    expect(trace.frames).toHaveLength(trace.visited.length);
    expect(trace.frames[0]).toMatchObject({ current: grid.start, settled: [] });
    expect(trace.frames[0].newlyOpened).toHaveLength(4);
    expect(trace.frames.at(-1)?.current).toEqual(grid.goal);

    trace.frames.forEach((frame) => {
      const settled = new Set(frame.settled.map(cellKey));

      expect(settled.has(cellKey(frame.current))).toBe(false);
      expect(frame.frontier.some((entry) => settled.has(cellKey(entry.cell)))).toBe(false);
      expect(frame.frontier.some((entry) => cellKey(entry.cell) === cellKey(frame.current))).toBe(false);
      expect(frame.decision.f).toBe(frame.decision.g + frame.decision.h);
    });
  });
});
