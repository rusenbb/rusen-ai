import { createSeededRandom } from "@/lib/random";

export type Cell = { row: number; col: number };

export type Terrain = "empty" | "wall" | "mud";

export type SearchAlgorithm = "bfs" | "dijkstra" | "greedy" | "astar";

export interface PathGrid {
  rows: number;
  cols: number;
  cells: Terrain[][];
  start: Cell;
  goal: Cell;
}

export interface SearchResult {
  algorithm: SearchAlgorithm;
  visited: Cell[];
  path: Cell[];
  cost: number | null;
  found: boolean;
}

export interface SearchDecision {
  /** Cost so far. For BFS this is move count; otherwise it is terrain cost. */
  g: number;
  /** Manhattan estimate to the goal. */
  h: number;
  /** g + h, used by A*. */
  f: number;
  /** The actual sort value used by the active algorithm. */
  priority: number;
  /** Stable insertion order for ties and the BFS queue explanation. */
  order: number;
}

export interface SearchFrontierEntry extends SearchDecision {
  cell: Cell;
}

export interface SearchFrame {
  /** Zero-based expansion number. */
  step: number;
  /** Cell selected from the frontier on this frame. */
  current: Cell;
  /** Cells settled before the current cell was selected. */
  settled: Cell[];
  /** Current open frontier after expanding the selected cell. */
  frontier: SearchFrontierEntry[];
  /** Cells whose best known route was added or improved on this expansion. */
  newlyOpened: Cell[];
  decision: SearchDecision;
}

export interface SearchTrace extends SearchResult {
  frames: SearchFrame[];
}

export interface PathfindingPreset {
  id: "mud-shortcut" | "open-field" | "blocked-line" | "maze" | "no-route";
  label: string;
  description: string;
  lesson: string;
  createGrid: () => PathGrid;
}

const CARDINAL_STEPS: Cell[] = [
  { row: -1, col: 0 },
  { row: 0, col: 1 },
  { row: 1, col: 0 },
  { row: 0, col: -1 },
];

export const SEARCH_ALGORITHMS: Array<{
  id: SearchAlgorithm;
  label: string;
  description: string;
  decisionRule: string;
}> = [
  {
    id: "bfs",
    label: "BFS",
    description: "Fewest moves when every move is equal.",
    decisionRule: "Expand the oldest frontier cell.",
  },
  {
    id: "dijkstra",
    label: "Dijkstra",
    description: "Lowest total terrain cost.",
    decisionRule: "Expand the cheapest known cell.",
  },
  {
    id: "greedy",
    label: "Greedy",
    description: "Heads toward the goal, not necessarily cheaply.",
    decisionRule: "Expand the cell closest to the goal.",
  },
  {
    id: "astar",
    label: "A*",
    description: "Lowest cost with a distance hint.",
    decisionRule: "Balance known cost and goal distance.",
  },
];

export function sameCell(left: Cell, right: Cell): boolean {
  return left.row === right.row && left.col === right.col;
}

export function cellKey(cell: Cell): string {
  return `${cell.row}:${cell.col}`;
}

export function inBounds(grid: PathGrid, cell: Cell): boolean {
  return cell.row >= 0 && cell.row < grid.rows && cell.col >= 0 && cell.col < grid.cols;
}

export function terrainCost(terrain: Terrain): number {
  return terrain === "mud" ? 5 : 1;
}

export function manhattan(left: Cell, right: Cell): number {
  return Math.abs(left.row - right.row) + Math.abs(left.col - right.col);
}

export function getNeighbors(grid: PathGrid, cell: Cell): Cell[] {
  return CARDINAL_STEPS.map((step) => ({
    row: cell.row + step.row,
    col: cell.col + step.col,
  })).filter(
    (candidate) =>
      inBounds(grid, candidate) && grid.cells[candidate.row][candidate.col] !== "wall",
  );
}

export function pathCost(grid: PathGrid, path: Cell[]): number {
  return path.slice(1).reduce((total, cell) => total + terrainCost(grid.cells[cell.row][cell.col]), 0);
}

function reconstructPath(previous: Map<string, Cell>, goal: Cell): Cell[] {
  const path: Cell[] = [goal];
  let current = goal;

  while (previous.has(cellKey(current))) {
    current = previous.get(cellKey(current))!;
    path.push(current);
  }

  return path.reverse();
}

function dequeueLowest(queue: SearchFrontierEntry[]): SearchFrontierEntry {
  queue.sort((left, right) => left.priority - right.priority || left.order - right.order);
  const next = queue.shift();
  if (!next) {
    throw new Error("Cannot dequeue an empty priority queue.");
  }
  return next;
}

function queueEntry(
  algorithm: SearchAlgorithm,
  grid: PathGrid,
  cell: Cell,
  g: number,
  order: number,
): SearchFrontierEntry {
  const h = manhattan(cell, grid.goal);
  const f = g + h;
  const priority =
    algorithm === "bfs"
      ? order
      : algorithm === "dijkstra"
        ? g
        : algorithm === "greedy"
          ? h
          : f;

  return { cell, g, h, f, priority, order };
}

function visibleFrontier(
  queue: SearchFrontierEntry[],
  closed: Set<string>,
  scores: Map<string, number>,
): SearchFrontierEntry[] {
  const seen = new Set<string>();

  return [...queue]
    .sort((left, right) => left.priority - right.priority || left.order - right.order)
    .filter((entry) => !closed.has(cellKey(entry.cell)) && scores.get(cellKey(entry.cell)) === entry.g)
    .filter((entry) => {
      const key = cellKey(entry.cell);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

/**
 * Preserves the state after every settled cell.
 * The trace is intentionally data, not animation state, so the UI can play, pause, and scrub it.
 */
export function traceSearch(grid: PathGrid, algorithm: SearchAlgorithm): SearchTrace {
  const previous = new Map<string, Cell>();
  const scores = new Map<string, number>([[cellKey(grid.start), 0]]);
  const visited: Cell[] = [];
  const frames: SearchFrame[] = [];
  const closed = new Set<string>();
  let insertionOrder = 0;

  const queue: SearchFrontierEntry[] = [
    queueEntry(algorithm, grid, grid.start, 0, insertionOrder++),
  ];

  while (queue.length > 0) {
    const currentEntry = dequeueLowest(queue);
    const current = currentEntry.cell;
    const currentKey = cellKey(current);
    if (closed.has(currentKey) || scores.get(currentKey) !== currentEntry.g) continue;

    closed.add(currentKey);
    visited.push(current);
    const newlyOpened: Cell[] = [];

    if (!sameCell(current, grid.goal)) {
      const currentScore = scores.get(currentKey) ?? Number.POSITIVE_INFINITY;

      for (const neighbor of getNeighbors(grid, current)) {
        const neighborKey = cellKey(neighbor);
        if (closed.has(neighborKey)) continue;

        const candidateScore =
          algorithm === "bfs"
            ? currentScore + 1
            : currentScore + terrainCost(grid.cells[neighbor.row][neighbor.col]);
        const knownScore = scores.get(neighborKey) ?? Number.POSITIVE_INFINITY;

        if (candidateScore < knownScore) {
          previous.set(neighborKey, current);
          scores.set(neighborKey, candidateScore);
          queue.push(queueEntry(algorithm, grid, neighbor, candidateScore, insertionOrder++));
          newlyOpened.push(neighbor);
        }
      }
    }

    frames.push({
      step: frames.length,
      current,
      settled: visited.slice(0, -1),
      frontier: visibleFrontier(queue, closed, scores),
      newlyOpened,
      decision: {
        g: currentEntry.g,
        h: currentEntry.h,
        f: currentEntry.f,
        priority: currentEntry.priority,
        order: currentEntry.order,
      },
    });

    if (sameCell(current, grid.goal)) {
      const path = reconstructPath(previous, current);
      return {
        algorithm,
        frames,
        visited,
        path,
        cost: pathCost(grid, path),
        found: true,
      };
    }
  }

  return { algorithm, frames, visited, path: [], cost: null, found: false };
}

function createEmptyGrid(
  rows: number,
  cols: number,
  start: Cell,
  goal: Cell,
): PathGrid {
  return {
    rows,
    cols,
    cells: Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => "empty" as Terrain),
    ),
    start,
    goal,
  };
}

function createMudShortcutGrid(): PathGrid {
  const grid = createEmptyGrid(9, 15, { row: 4, col: 1 }, { row: 4, col: 13 });

  for (let col = 4; col <= 10; col += 1) {
    grid.cells[4][col] = "mud";
  }

  return grid;
}

function createOpenFieldGrid(): PathGrid {
  return createEmptyGrid(9, 15, { row: 4, col: 1 }, { row: 4, col: 13 });
}

function createBlockedLineGrid(): PathGrid {
  const grid = createEmptyGrid(9, 15, { row: 4, col: 1 }, { row: 4, col: 13 });

  for (let row = 0; row < 8; row += 1) {
    grid.cells[row][7] = "wall";
  }

  return grid;
}

const MAZE_SEED = 7;
const MAZE_LOOPS = 14;

/**
 * Depth-first maze on odd cells, then a few extra openings so more than one route exists.
 * A fixed seed keeps the race the same on every visit.
 */
function createMazeGrid(): PathGrid {
  const rows = 17;
  const cols = 29;
  const grid = createEmptyGrid(rows, cols, { row: 1, col: 1 }, { row: rows - 2, col: cols - 2 });
  const random = createSeededRandom(MAZE_SEED);
  grid.cells = grid.cells.map((row) => row.map(() => "wall" as Terrain));

  const stack: Cell[] = [{ row: 1, col: 1 }];
  grid.cells[1][1] = "empty";
  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const options = CARDINAL_STEPS.map((step) => ({
      next: { row: current.row + step.row * 2, col: current.col + step.col * 2 },
      between: { row: current.row + step.row, col: current.col + step.col },
    })).filter(
      ({ next }) =>
        next.row > 0 && next.row < rows - 1 && next.col > 0 && next.col < cols - 1 && grid.cells[next.row][next.col] === "wall",
    );
    if (options.length === 0) {
      stack.pop();
      continue;
    }
    const { next, between } = options[Math.floor(random() * options.length)];
    grid.cells[between.row][between.col] = "empty";
    grid.cells[next.row][next.col] = "empty";
    stack.push(next);
  }

  // Knock out interior walls that separate two corridors in a straight line.
  let opened = 0;
  while (opened < MAZE_LOOPS) {
    const row = 1 + Math.floor(random() * (rows - 2));
    const col = 1 + Math.floor(random() * (cols - 2));
    if (grid.cells[row][col] !== "wall") continue;
    const horizontal = grid.cells[row][col - 1] === "empty" && grid.cells[row][col + 1] === "empty" && grid.cells[row - 1][col] === "wall" && grid.cells[row + 1][col] === "wall";
    const vertical = grid.cells[row - 1][col] === "empty" && grid.cells[row + 1][col] === "empty" && grid.cells[row][col - 1] === "wall" && grid.cells[row][col + 1] === "wall";
    if (!horizontal && !vertical) continue;
    grid.cells[row][col] = "empty";
    opened += 1;
  }

  return grid;
}

/** The goal sits in a sealed room, so every solver has to rule out the whole reachable map. */
function createNoRouteGrid(): PathGrid {
  const grid = createEmptyGrid(9, 15, { row: 4, col: 1 }, { row: 4, col: 12 });

  for (let col = 10; col <= 14; col += 1) {
    grid.cells[2][col] = "wall";
    grid.cells[6][col] = "wall";
  }
  for (let row = 2; row <= 6; row += 1) {
    grid.cells[row][10] = "wall";
  }

  return grid;
}

export const PATHFINDING_PRESETS: PathfindingPreset[] = [
  {
    id: "mud-shortcut",
    label: "Mud shortcut",
    description: "A 12-move shortcut crosses seven mud cells.",
    lesson:
      "The straight route costs 40. A dry two-move detour costs 14, so shortest in moves and cheapest in terrain are different questions.",
    createGrid: createMudShortcutGrid,
  },
  {
    id: "open-field",
    label: "Open field",
    description: "Every move costs one and every route is equally fair.",
    lesson:
      "When cost ties, route quality is not the story. Watch how much of the map each rule needs to inspect before it knows the answer.",
    createGrid: createOpenFieldGrid,
  },
  {
    id: "blocked-line",
    label: "Blocked line",
    description: "The goal is close, but a wall makes the direct line impossible.",
    lesson:
      "A goal-distance hint is guidance, not x-ray vision. Every solver must discover the opening before it can finish the detour.",
    createGrid: createBlockedLineGrid,
  },
  {
    id: "maze",
    label: "Maze",
    description: "A 17 by 29 maze with a few loops, so more than one route exists.",
    lesson:
      "In corridors the straight-line hint often points at a dead end. Greedy follows it and settles for a longer route; A* still finds the shortest one.",
    createGrid: createMazeGrid,
  },
  {
    id: "no-route",
    label: "No route",
    description: "The goal sits in a sealed room.",
    lesson: "To say there is no route, every solver has to check every cell it can reach.",
    createGrid: createNoRouteGrid,
  },
];

export function createDefaultGrid(): PathGrid {
  return createMudShortcutGrid();
}

export function updateTerrain(grid: PathGrid, cell: Cell, terrain: Terrain): PathGrid {
  if (!inBounds(grid, cell) || sameCell(cell, grid.start) || sameCell(cell, grid.goal)) {
    return grid;
  }

  return {
    ...grid,
    cells: grid.cells.map((row, rowIndex) =>
      row.map((value, columnIndex) =>
        rowIndex === cell.row && columnIndex === cell.col ? terrain : value,
      ),
    ),
  };
}

export function moveEndpoint(grid: PathGrid, endpoint: "start" | "goal", cell: Cell): PathGrid {
  if (!inBounds(grid, cell) || grid.cells[cell.row][cell.col] === "wall") return grid;
  if (endpoint === "start" && sameCell(cell, grid.goal)) return grid;
  if (endpoint === "goal" && sameCell(cell, grid.start)) return grid;

  return { ...grid, [endpoint]: cell };
}
