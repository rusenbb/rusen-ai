import type { DQNAgent, SerializedDQNWeights } from "./dqn";
import {
  chooseAction as dqnChooseAction,
  forward as dqnForward,
  pushTransition,
} from "./dqn";

export const ARENA_SIZE = 30;
export const ROUND_TICKS = 180;
export const INTERMISSION_TICKS = 10;
export const TICK_MS = 150;
export const MAX_HEALTH = 100;
export const MAX_ENERGY = 4;

export type ArenaTile = "floor" | "wall" | "cover" | "hazard";
export type ArenaAction =
  | "move-up"
  | "move-down"
  | "move-left"
  | "move-right"
  | "attack"
  | "guard"
  | "dash"
  | "hold";
export type MoveAction = Extract<
  ArenaAction,
  "move-up" | "move-down" | "move-left" | "move-right"
>;
export type AbilityAction = Extract<ArenaAction, "attack" | "guard" | "dash">;
export type BotDecisionMode = "seeded" | "explore" | "exploit";
export type PlayerCategory =
  | "pressure"
  | "guarded"
  | "scavenger"
  | "vertical"
  | "horizontal"
  | "holding";
export type PlayerHabit = PlayerCategory | "balanced";
export type BotProfileId = "arena";
export type BotDifficulty = "easy" | "medium" | "hard" | "expert";
export type RoundOutcome = "player" | "bot" | "draw";

export type Position = {
  x: number;
  y: number;
};

export type Fighter = {
  position: Position;
  health: number;
  energy: number;
  guarding: boolean;
  flashTicks: number;
  lastAction: ArenaAction;
};

export type Pickup = {
  id: string;
  position: Position;
  kind: "health" | "energy";
  cooldown: number;
};

export type RoundHistoryEntry = {
  round: number;
  outcome: RoundOutcome;
  playerHealth: number;
  botHealth: number;
};

export type HabitSnapshot = {
  dominant: PlayerHabit;
  percentages: Record<PlayerCategory, number>;
};

export type MatchState = {
  phase: "live" | "intermission";
  round: number;
  timer: number;
  intermissionTicks: number;
  player: Fighter;
  bot: Fighter;
  pickups: Pickup[];
  playerHeat: number[][];
  botHeat: number[][];
  scoreboard: {
    player: number;
    bot: number;
    draw: number;
  };
  roundHistory: RoundHistoryEntry[];
  eventLog: string[];
  playerHabits: HabitSnapshot;
  predictedHabit: PlayerHabit;
  explorationRate: number;
  qStateCount: number;
  lastDecisionMode: BotDecisionMode;
  botIntent: ArenaAction;
  lastBotReward: number;
  statusMessage: string;
};

export type ArenaNavigator = {
  indexByCell: Int16Array;
  walkableCellIds: Int16Array;
  distances: Int16Array[];
  firstMoves: Int8Array[];
};

export type BotConfig = {
  epsilon: number;
  alpha: number;
  gamma: number;
};

export type BotCheckpointStats = {
  rounds: number;
  botWins: number;
  playerWins: number;
  draws: number;
  botWinRate: number;
};

export type TrainingMetricPoint = {
  round: number;
  averageReward: number;
  averageBotWinRate: number;
  averageHealthDelta: number;
  qStateCount: number;
};

export type BotTrainingTelemetry = {
  sampleEvery: number;
  rollingWindow: number;
  points: TrainingMetricPoint[];
};

export type DQNCheckpointAsset = {
  weights: SerializedDQNWeights;
  config: { layerSizes: number[] };
  telemetry: BotTrainingTelemetry;
};

export type DQNCheckpointManifest = {
  difficulty: BotDifficulty;
  label: string;
  summary: string;
  trainingRounds: number;
  snapshotInterval: number;
  parameterCount: number;
  stats: BotCheckpointStats;
  telemetry: BotTrainingTelemetry;
  assetPath: string;
};

export type DQNBrain = { kind: "dqn"; agent: DQNAgent };
export type BotBrain = DQNBrain;

export type BotDifficultySetting = {
  id: BotDifficulty;
  label: string;
  summary: string;
  epsilonMultiplier: number;
  alphaMultiplier: number;
  gammaBonus: number;
  trainingRounds: number;
  evaluationRounds: number;
};

export type PlayerModel = {
  recent: PlayerCategory[];
  totals: Record<PlayerCategory, number>;
};

export const ACTIONS: ArenaAction[] = [
  "move-up",
  "move-down",
  "move-left",
  "move-right",
  "attack",
  "guard",
  "dash",
  "hold",
];

export const ACTION_LABELS: Record<ArenaAction, string> = {
  "move-up": "Move N",
  "move-down": "Move S",
  "move-left": "Move W",
  "move-right": "Move E",
  attack: "Attack",
  guard: "Guard",
  dash: "Dash",
  hold: "Hold",
};

export const PLAYER_CATEGORY_LABELS: Record<PlayerCategory, string> = {
  pressure: "Pressure",
  guarded: "Guarded",
  scavenger: "Resource",
  vertical: "Vertical",
  horizontal: "Horizontal",
  holding: "Holding",
};

const PLAYER_CATEGORIES: PlayerCategory[] = [
  "pressure",
  "guarded",
  "scavenger",
  "vertical",
  "horizontal",
  "holding",
];

const PLAYER_SPAWN: Position = { x: 3, y: 15 };
const BOT_SPAWN: Position = { x: 26, y: 14 };
const CARDINAL_ACTIONS: MoveAction[] = [
  "move-up",
  "move-right",
  "move-down",
  "move-left",
];
const MOVE_DELTAS: ReadonlyArray<readonly [number, number]> = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

const PICKUP_SPAWNS: Array<{
  id: string;
  position: Position;
  kind: "health" | "energy";
}> = [
  { id: "nw-health", position: { x: 4, y: 4 }, kind: "health" },
  { id: "sw-energy", position: { x: 4, y: 25 }, kind: "energy" },
  { id: "ne-energy", position: { x: 25, y: 4 }, kind: "energy" },
  { id: "se-health", position: { x: 25, y: 25 }, kind: "health" },
  { id: "north-health", position: { x: 14, y: 5 }, kind: "health" },
  { id: "south-energy", position: { x: 15, y: 24 }, kind: "energy" },
  { id: "west-energy", position: { x: 6, y: 15 }, kind: "energy" },
  { id: "east-health", position: { x: 23, y: 14 }, kind: "health" },
];

export const BOT_CONFIG: BotConfig = {
  epsilon: 0.18,
  alpha: 0.27,
  gamma: 0.74,
};

export const BOT_ACCENT = "#a78bfa";

export const BOT_DIFFICULTIES: BotDifficultySetting[] = [
  {
    id: "easy",
    label: "Easy",
    summary:
      "Lightly trained self-play checkpoint with visible mistakes and more exploration.",
    epsilonMultiplier: 1.35,
    alphaMultiplier: 0.9,
    gammaBonus: -0.02,
    trainingRounds: 1000,
    evaluationRounds: 150,
  },
  {
    id: "medium",
    label: "Medium",
    summary:
      "Balanced self-play checkpoint intended as the default playable difficulty.",
    epsilonMultiplier: 1,
    alphaMultiplier: 1,
    gammaBonus: 0,
    trainingRounds: 3000,
    evaluationRounds: 200,
  },
  {
    id: "hard",
    label: "Hard",
    summary:
      "Thoroughly trained self-play checkpoint with tighter exploitation.",
    epsilonMultiplier: 0.78,
    alphaMultiplier: 1.08,
    gammaBonus: 0.03,
    trainingRounds: 6000,
    evaluationRounds: 300,
  },
  {
    id: "expert",
    label: "Expert",
    summary: "Longest-trained self-play checkpoint with emergent strategy.",
    epsilonMultiplier: 0.6,
    alphaMultiplier: 1.15,
    gammaBonus: 0.05,
    trainingRounds: 12000,
    evaluationRounds: 400,
  },
];

export function getDifficultySetting(
  difficulty: BotDifficulty,
): BotDifficultySetting {
  const setting = BOT_DIFFICULTIES.find((entry) => entry.id === difficulty);
  if (!setting) {
    throw new Error(`Unknown bot difficulty: ${difficulty}`);
  }

  return setting;
}

export function getDifficultyConfig(
  config: BotConfig,
  difficulty: BotDifficulty,
): BotConfig {
  const setting = getDifficultySetting(difficulty);
  return {
    epsilon: Math.max(0.03, config.epsilon * setting.epsilonMultiplier),
    alpha: config.alpha * setting.alphaMultiplier,
    gamma: Math.min(0.95, config.gamma + setting.gammaBonus),
  };
}

function createGrid<T>(fill: T): T[][] {
  return Array.from({ length: ARENA_SIZE }, () =>
    Array.from({ length: ARENA_SIZE }, () => fill),
  );
}

function setRect(
  arena: ArenaTile[][],
  x: number,
  y: number,
  width: number,
  height: number,
  tile: ArenaTile,
) {
  for (let yy = y; yy < y + height; yy += 1) {
    for (let xx = x; xx < x + width; xx += 1) {
      if (yy > 0 && yy < ARENA_SIZE - 1 && xx > 0 && xx < ARENA_SIZE - 1) {
        arena[yy][xx] = tile;
      }
    }
  }
}

function setTile(arena: ArenaTile[][], x: number, y: number, tile: ArenaTile) {
  if (x > 0 && x < ARENA_SIZE - 1 && y > 0 && y < ARENA_SIZE - 1) {
    arena[y][x] = tile;
  }
}

export function buildArenaMap(): ArenaTile[][] {
  const arena = createGrid<ArenaTile>("floor");

  for (let i = 0; i < ARENA_SIZE; i += 1) {
    arena[0][i] = "wall";
    arena[ARENA_SIZE - 1][i] = "wall";
    arena[i][0] = "wall";
    arena[i][ARENA_SIZE - 1] = "wall";
  }

  setRect(arena, 6, 4, 3, 7, "wall");
  setRect(arena, 21, 4, 3, 7, "wall");
  setRect(arena, 6, 19, 3, 7, "wall");
  setRect(arena, 21, 19, 3, 7, "wall");

  setRect(arena, 11, 7, 8, 2, "wall");
  setRect(arena, 11, 21, 8, 2, "wall");
  setRect(arena, 13, 12, 4, 1, "wall");
  setRect(arena, 13, 17, 4, 1, "wall");

  for (let x = 11; x <= 18; x += 1) {
    setTile(arena, x, 14, "hazard");
    setTile(arena, x, 15, "hazard");
  }

  for (let y = 11; y <= 18; y += 1) {
    setTile(arena, 14, y, "hazard");
    setTile(arena, 15, y, "hazard");
  }

  const coverTiles: Position[] = [
    { x: 5, y: 12 },
    { x: 5, y: 17 },
    { x: 24, y: 12 },
    { x: 24, y: 17 },
    { x: 10, y: 5 },
    { x: 19, y: 5 },
    { x: 10, y: 24 },
    { x: 19, y: 24 },
    { x: 10, y: 14 },
    { x: 19, y: 15 },
    { x: 12, y: 10 },
    { x: 17, y: 19 },
    { x: 12, y: 19 },
    { x: 17, y: 10 },
  ];

  coverTiles.forEach((tile) => {
    if (arena[tile.y][tile.x] === "floor") {
      arena[tile.y][tile.x] = "cover";
    }
  });

  return arena;
}

function createFighter(position: Position): Fighter {
  return {
    position,
    health: MAX_HEALTH,
    energy: 2,
    guarding: false,
    flashTicks: 0,
    lastAction: "hold",
  };
}

function createPickups(): Pickup[] {
  return PICKUP_SPAWNS.map((spawn) => ({ ...spawn, cooldown: 0 }));
}

function createEmptyHeatmap(): number[][] {
  return createGrid(0);
}

export function createPlayerModel(): PlayerModel {
  return {
    recent: [],
    totals: {
      pressure: 0,
      guarded: 0,
      scavenger: 0,
      vertical: 0,
      horizontal: 0,
      holding: 0,
    },
  };
}

export function getHabitSnapshot(model: PlayerModel): HabitSnapshot {
  const source =
    model.recent.length > 0 ? countRecent(model.recent) : model.totals;
  const total = Object.values(source).reduce((sum, value) => sum + value, 0);

  if (total === 0) {
    return {
      dominant: "balanced",
      percentages: PLAYER_CATEGORIES.reduce(
        (acc, category) => {
          acc[category] = 0;
          return acc;
        },
        {} as Record<PlayerCategory, number>,
      ),
    };
  }

  let dominant: PlayerHabit = "balanced";
  let dominantValue = 0;

  const percentages = PLAYER_CATEGORIES.reduce(
    (acc, category) => {
      const percentage = source[category] / total;
      acc[category] = percentage;
      if (percentage > dominantValue) {
        dominantValue = percentage;
        dominant = percentage >= 0.26 ? category : "balanced";
      }
      return acc;
    },
    {} as Record<PlayerCategory, number>,
  );

  return { dominant, percentages };
}

function countRecent(recent: PlayerCategory[]): Record<PlayerCategory, number> {
  const counts = PLAYER_CATEGORIES.reduce(
    (acc, category) => {
      acc[category] = 0;
      return acc;
    },
    {} as Record<PlayerCategory, number>,
  );

  recent.forEach((entry) => {
    counts[entry] += 1;
  });

  return counts;
}

function positionToCellId(position: Position): number {
  return position.y * ARENA_SIZE + position.x;
}

export function createArenaNavigator(arena: ArenaTile[][]): ArenaNavigator {
  const cellCount = ARENA_SIZE * ARENA_SIZE;
  const indexByCell = new Int16Array(cellCount);
  indexByCell.fill(-1);

  const walkableCellIds: number[] = [];
  for (let y = 0; y < ARENA_SIZE; y += 1) {
    for (let x = 0; x < ARENA_SIZE; x += 1) {
      if (arena[y][x] !== "wall") {
        const cellId = y * ARENA_SIZE + x;
        indexByCell[cellId] = walkableCellIds.length;
        walkableCellIds.push(cellId);
      }
    }
  }

  const walkableCount = walkableCellIds.length;
  const queue = new Int16Array(walkableCount);
  const distanceByCell = new Int16Array(cellCount);
  const firstMoveByCell = new Int8Array(cellCount);
  const distances: Int16Array[] = new Array(walkableCount);
  const firstMoves: Int8Array[] = new Array(walkableCount);

  for (let sourceIndex = 0; sourceIndex < walkableCount; sourceIndex += 1) {
    distanceByCell.fill(-1);
    firstMoveByCell.fill(-1);

    const sourceCellId = walkableCellIds[sourceIndex];
    let head = 0;
    let tail = 0;
    queue[tail++] = sourceCellId;
    distanceByCell[sourceCellId] = 0;

    while (head < tail) {
      const currentCellId = queue[head++];
      const currentDistance = distanceByCell[currentCellId];
      const currentFirstMove = firstMoveByCell[currentCellId];
      const currentX = currentCellId % ARENA_SIZE;
      const currentY = Math.floor(currentCellId / ARENA_SIZE);

      for (
        let actionIndex = 0;
        actionIndex < MOVE_DELTAS.length;
        actionIndex += 1
      ) {
        const [dx, dy] = MOVE_DELTAS[actionIndex];
        const nextX = currentX + dx;
        const nextY = currentY + dy;

        if (
          nextX < 0 ||
          nextX >= ARENA_SIZE ||
          nextY < 0 ||
          nextY >= ARENA_SIZE
        ) {
          continue;
        }

        const nextCellId = nextY * ARENA_SIZE + nextX;
        if (
          indexByCell[nextCellId] === -1 ||
          distanceByCell[nextCellId] !== -1
        ) {
          continue;
        }

        distanceByCell[nextCellId] = currentDistance + 1;
        firstMoveByCell[nextCellId] =
          currentFirstMove === -1 ? actionIndex : currentFirstMove;
        queue[tail++] = nextCellId;
      }
    }

    const rowDistances = new Int16Array(walkableCount);
    const rowFirstMoves = new Int8Array(walkableCount);
    rowDistances.fill(-1);
    rowFirstMoves.fill(-1);

    for (let targetIndex = 0; targetIndex < walkableCount; targetIndex += 1) {
      const targetCellId = walkableCellIds[targetIndex];
      rowDistances[targetIndex] = distanceByCell[targetCellId];
      rowFirstMoves[targetIndex] = firstMoveByCell[targetCellId];
    }

    distances[sourceIndex] = rowDistances;
    firstMoves[sourceIndex] = rowFirstMoves;
  }

  return {
    indexByCell,
    walkableCellIds: Int16Array.from(walkableCellIds),
    distances,
    firstMoves,
  };
}

function updatePlayerModel(model: PlayerModel, category: PlayerCategory) {
  model.recent.push(category);
  model.totals[category] += 1;

  if (model.recent.length > 24) {
    model.recent.shift();
  }
}

function cloneHeatmapWithIncrement(
  heatmap: number[][],
  position: Position,
): number[][] {
  return heatmap.map((row, rowIndex) => {
    if (rowIndex !== position.y) return row;
    const nextRow = row.slice();
    nextRow[position.x] += 1;
    return nextRow;
  });
}

function manhattan(a: Position, b: Position): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function isWalkable(arena: ArenaTile[][], position: Position): boolean {
  return (
    arena[position.y]?.[position.x] !== undefined &&
    arena[position.y][position.x] !== "wall"
  );
}

function positionsEqual(a: Position, b: Position): boolean {
  return a.x === b.x && a.y === b.y;
}

function movePosition(position: Position, action: MoveAction): Position {
  switch (action) {
    case "move-up":
      return { x: position.x, y: position.y - 1 };
    case "move-down":
      return { x: position.x, y: position.y + 1 };
    case "move-left":
      return { x: position.x - 1, y: position.y };
    case "move-right":
      return { x: position.x + 1, y: position.y };
  }
}

function getDirectionToward(from: Position, to: Position): MoveAction {
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? "move-right" : "move-left";
  }

  return dy >= 0 ? "move-down" : "move-up";
}

function getDirectionAway(from: Position, threat: Position): MoveAction {
  const toward = getDirectionToward(from, threat);
  switch (toward) {
    case "move-up":
      return "move-down";
    case "move-down":
      return "move-up";
    case "move-left":
      return "move-right";
    case "move-right":
      return "move-left";
  }
}

function getNearestActivePickup(
  position: Position,
  pickups: Pickup[],
): Pickup | null {
  let best: Pickup | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const pickup of pickups) {
    if (pickup.cooldown !== 0) {
      continue;
    }

    const distance = manhattan(position, pickup.position);
    if (distance < bestDistance) {
      best = pickup;
      bestDistance = distance;
    }
  }

  return best;
}

function getTile(arena: ArenaTile[][], position: Position): ArenaTile {
  return arena[position.y][position.x];
}

function hasLineOfSight(
  arena: ArenaTile[][],
  from: Position,
  to: Position,
): boolean {
  let x0 = from.x;
  let y0 = from.y;
  const x1 = to.x;
  const y1 = to.y;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  while (!(x0 === x1 && y0 === y1)) {
    const e2 = err * 2;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }

    if (x0 === x1 && y0 === y1) break;

    const tile = arena[y0]?.[x0];
    if (tile === "wall" || tile === "cover") {
      return false;
    }
  }

  return true;
}

function canAttack(
  arena: ArenaTile[][],
  attacker: Fighter,
  target: Fighter,
): boolean {
  return (
    manhattan(attacker.position, target.position) <= 3 &&
    hasLineOfSight(arena, attacker.position, target.position)
  );
}

function getCoverReduction(arena: ArenaTile[][], target: Fighter): number {
  return getTile(arena, target.position) === "cover" ? 0.72 : 1;
}

function applyPickup(
  fighter: Fighter,
  pickup: Pickup,
): { fighter: Fighter; reward: number; log: string } {
  if (pickup.kind === "health") {
    return {
      fighter: {
        ...fighter,
        health: clamp(fighter.health + 18, 0, MAX_HEALTH),
      },
      reward: 0.16,
      log: "secured a med charge",
    };
  }

  return {
    fighter: { ...fighter, energy: clamp(fighter.energy + 2, 0, MAX_ENERGY) },
    reward: 0.12,
    log: "refilled dash energy",
  };
}

function tickPickups(pickups: Pickup[]): Pickup[] {
  return pickups.map((pickup) =>
    pickup.cooldown > 0
      ? {
          ...pickup,
          cooldown: pickup.cooldown - 1,
        }
      : pickup,
  );
}

function getZone(position: Position): string {
  if (
    position.x >= 11 &&
    position.x <= 18 &&
    position.y >= 11 &&
    position.y <= 18
  ) {
    return "center";
  }
  if (position.x <= 9) return "west";
  if (position.x >= 20) return "east";
  if (position.y <= 9) return "north";
  if (position.y >= 20) return "south";
  return "mid";
}

// ── DQN State Encoding ────────────────────────────────────────────────────────

export const STATE_DIM = 68;

const ZONE_NAMES = ["west", "east", "north", "south", "center", "mid"] as const;
const ZONE_INDEX: Record<(typeof ZONE_NAMES)[number], number> = {
  west: 0,
  east: 1,
  north: 2,
  south: 3,
  center: 4,
  mid: 5,
};
const ACTION_INDEX: Record<ArenaAction, number> = {
  "move-up": 0,
  "move-down": 1,
  "move-left": 2,
  "move-right": 3,
  attack: 4,
  guard: 5,
  dash: 6,
  hold: 7,
};
const HABIT_INDEX: Record<PlayerHabit, number> = {
  pressure: 0,
  guarded: 1,
  scavenger: 2,
  vertical: 3,
  horizontal: 4,
  holding: 5,
  balanced: 6,
};
const STILLNESS_INDEX: Record<"idle" | "sticky" | "active", number> = {
  idle: 0,
  sticky: 1,
  active: 2,
};
const CHASE_TILE_INDEX: Record<ArenaTile | "wall", number> = {
  floor: 0,
  wall: 1,
  cover: 2,
  hazard: 3,
};

function tileOrdinal(arena: ArenaTile[][], pos: Position): number {
  const tile = arena[pos.y]?.[pos.x];
  if (!tile || tile === "wall") return 0;
  if (tile === "cover") return 0.33;
  if (tile === "hazard") return 0.67;
  return 1; // floor
}

function directionDxDy(action: MoveAction | null): [number, number] {
  if (!action) return [0, 0];
  switch (action) {
    case "move-up":
      return [0, -1];
    case "move-down":
      return [0, 1];
    case "move-left":
      return [-1, 0];
    case "move-right":
      return [1, 0];
  }
}

function fillEncodedState(
  out: Float32Array,
  bot: Fighter,
  player: Fighter,
  pickups: Pickup[],
  arena: ArenaTile[][],
  habit: PlayerHabit,
  navigator?: ArenaNavigator,
): Float32Array {
  let i = 0;

  const dx = clamp(player.position.x - bot.position.x, -9, 9);
  const dy = clamp(player.position.y - bot.position.y, -9, 9);
  const distance = manhattan(player.position, bot.position);
  const pathProbe = getPathProbe(
    arena,
    bot.position,
    player.position,
    navigator,
  );
  const los = hasLineOfSight(arena, bot.position, player.position) ? 1 : 0;
  const attackWindow = distance <= 3 && los ? 1 : 0;
  const pickup = getNearestActivePickup(bot.position, pickups);
  const pickupDist = pickup ? manhattan(bot.position, pickup.position) : 28;
  const pickupDir = pickup
    ? getDirectionToward(bot.position, pickup.position)
    : null;
  const chaseMove = pathProbe.firstMove
    ? movePosition(bot.position, pathProbe.firstMove)
    : null;
  const chaseTile =
    chaseMove && arena[chaseMove.y]?.[chaseMove.x]
      ? getTile(arena, chaseMove)
      : "wall";
  const playerStillness =
    player.lastAction === "hold"
      ? "idle"
      : habit === "holding"
        ? "sticky"
        : "active";

  // Continuous (9)
  out[i++] = dx / 9; // 0
  out[i++] = dy / 9; // 1
  out[i++] = clamp(distance, 0, 28) / 28; // 2
  out[i++] =
    pathProbe.distance !== null ? clamp(pathProbe.distance, 0, 28) / 28 : 0.5; // 3
  out[i++] = bot.health / MAX_HEALTH; // 4
  out[i++] = player.health / MAX_HEALTH; // 5
  out[i++] = bot.energy / MAX_ENERGY; // 6
  out[i++] = player.energy / MAX_ENERGY; // 7
  out[i++] = clamp(pickupDist, 0, 28) / 28; // 8

  // Binary (3)
  out[i++] = los; // 9
  out[i++] = attackWindow; // 10
  out[i++] = pathProbe.distance === null ? 1 : 0; // 11

  // Directional (4)
  const [stepDx, stepDy] = directionDxDy(pathProbe.firstMove);
  out[i++] = stepDx; // 12
  out[i++] = stepDy; // 13
  const [pickDx, pickDy] = directionDxDy(pickupDir);
  out[i++] = pickDx; // 14
  out[i++] = pickDy; // 15

  // One-hot: chase tile (4)
  const tileIdx = CHASE_TILE_INDEX[chaseTile];
  out[i + tileIdx] = 1; // 16-19
  i += 4;

  // One-hot: bot zone (6)
  const botZone = getZone(bot.position);
  out[i + ZONE_INDEX[botZone as (typeof ZONE_NAMES)[number]]] = 1; // 20-25
  i += 6;

  // One-hot: player zone (6)
  const playerZone = getZone(player.position);
  out[i + ZONE_INDEX[playerZone as (typeof ZONE_NAMES)[number]]] = 1; // 26-31
  i += 6;

  // One-hot: bot last action (8)
  out[i + ACTION_INDEX[bot.lastAction]] = 1; // 32-39
  i += 8;

  // One-hot: player last action (8)
  out[i + ACTION_INDEX[player.lastAction]] = 1; // 40-47
  i += 8;

  // One-hot: player habit (7)
  out[i + HABIT_INDEX[habit]] = 1; // 48-54
  i += 7;

  // One-hot: player stillness (3)
  out[i + STILLNESS_INDEX[playerStillness]] = 1; // 55-57
  i += 3;

  // Bot local terrain ordinals (5)
  out[i++] = tileOrdinal(arena, bot.position); // 58
  out[i++] = tileOrdinal(arena, movePosition(bot.position, "move-up")); // 59
  out[i++] = tileOrdinal(arena, movePosition(bot.position, "move-right")); // 60
  out[i++] = tileOrdinal(arena, movePosition(bot.position, "move-down")); // 61
  out[i++] = tileOrdinal(arena, movePosition(bot.position, "move-left")); // 62

  // Player local terrain ordinals (5)
  out[i++] = tileOrdinal(arena, player.position); // 63
  out[i++] = tileOrdinal(arena, movePosition(player.position, "move-up")); // 64
  out[i++] = tileOrdinal(arena, movePosition(player.position, "move-right")); // 65
  out[i++] = tileOrdinal(arena, movePosition(player.position, "move-down")); // 66
  out[i++] = tileOrdinal(arena, movePosition(player.position, "move-left")); // 67

  return out;
}

export function encodeState(
  match: MatchState,
  arena: ArenaTile[][],
  habit: PlayerHabit,
  navigator?: ArenaNavigator,
): Float32Array {
  return fillEncodedState(
    new Float32Array(STATE_DIM),
    match.bot,
    match.player,
    match.pickups,
    arena,
    habit,
    navigator,
  );
}

export function encodeStateAsPlayer(
  match: MatchState,
  arena: ArenaTile[][],
  botHabit: PlayerHabit,
  navigator?: ArenaNavigator,
): Float32Array {
  return fillEncodedState(
    new Float32Array(STATE_DIM),
    match.player,
    match.bot,
    match.pickups,
    arena,
    botHabit,
    navigator,
  );
}

// ── Path Finding ──────────────────────────────────────────────────────────────

type PathProbe = {
  distance: number | null;
  firstMove: MoveAction | null;
};

function getCachedPathProbe(
  navigator: ArenaNavigator,
  from: Position,
  target: Position,
): PathProbe {
  const fromIndex = navigator.indexByCell[positionToCellId(from)];
  const targetIndex = navigator.indexByCell[positionToCellId(target)];

  if (fromIndex === -1 || targetIndex === -1) {
    return { distance: null, firstMove: null };
  }

  if (fromIndex === targetIndex) {
    return { distance: 0, firstMove: null };
  }

  const distance = navigator.distances[fromIndex][targetIndex];
  if (distance < 0) {
    return { distance: null, firstMove: null };
  }

  const moveIndex = navigator.firstMoves[fromIndex][targetIndex];
  return {
    distance,
    firstMove: moveIndex >= 0 ? CARDINAL_ACTIONS[moveIndex] : null,
  };
}

function getPathProbe(
  arena: ArenaTile[][],
  from: Position,
  target: Position,
  navigator?: ArenaNavigator,
): PathProbe {
  if (navigator) {
    return getCachedPathProbe(navigator, from, target);
  }

  if (positionsEqual(from, target)) {
    return { distance: 0, firstMove: null };
  }

  const visited = Array.from({ length: ARENA_SIZE }, () =>
    Array.from({ length: ARENA_SIZE }, () => false),
  );
  const queue: Array<{
    position: Position;
    distance: number;
    firstMove: MoveAction | null;
  }> = [{ position: from, distance: 0, firstMove: null }];
  let head = 0;
  visited[from.y][from.x] = true;

  while (head < queue.length) {
    const current = queue[head];
    head += 1;

    for (const action of CARDINAL_ACTIONS) {
      const nextPosition = movePosition(current.position, action);
      if (
        !isWalkable(arena, nextPosition) ||
        visited[nextPosition.y][nextPosition.x]
      ) {
        continue;
      }

      const firstMove = current.firstMove ?? action;
      if (positionsEqual(nextPosition, target)) {
        return { distance: current.distance + 1, firstMove };
      }

      visited[nextPosition.y][nextPosition.x] = true;
      queue.push({
        position: nextPosition,
        distance: current.distance + 1,
        firstMove,
      });
    }
  }

  return { distance: null, firstMove: null };
}

function getPathDirectionToward(
  arena: ArenaTile[][],
  from: Position,
  target: Position,
  navigator?: ArenaNavigator,
): MoveAction {
  return (
    getPathProbe(arena, from, target, navigator).firstMove ??
    getDirectionToward(from, target)
  );
}

function getExplorationRate(
  baseEpsilon: number,
  round: number,
  history: RoundHistoryEntry[],
): number {
  const base = Math.max(
    0.05,
    baseEpsilon * Math.pow(0.92, Math.max(0, round - 1)),
  );
  const recentLosses = history
    .slice(0, 4)
    .filter((entry) => entry.outcome === "player").length;
  return clamp(base + (recentLosses >= 3 ? 0.06 : 0), 0.05, 0.32);
}

function classifyPlayerAction(
  action: ArenaAction,
  movedFrom: Position,
  movedTo: Position,
  pickedUp: boolean,
): PlayerCategory {
  if (pickedUp) return "scavenger";
  if (action === "attack") return "pressure";
  if (action === "guard" || action === "dash") return "guarded";
  if (action === "move-up" || action === "move-down") return "vertical";
  if (action === "move-left" || action === "move-right") return "horizontal";
  if (positionsEqual(movedFrom, movedTo)) return "holding";
  return "holding";
}

function pickDashDirection(
  actor: Fighter,
  opponent: Fighter,
  arena: ArenaTile[][],
  match: MatchState,
  moveIntent: MoveAction | null,
  isBot: boolean,
  navigator?: ArenaNavigator,
): MoveAction {
  if (!isBot && moveIntent) {
    return moveIntent;
  }

  if (isBot) {
    if (actor.health <= 35 || match.predictedHabit === "pressure") {
      return getSafeDashDirection(
        actor.position,
        getDirectionAway(actor.position, opponent.position),
        arena,
      );
    }

    const nearestPickup = getNearestActivePickup(actor.position, match.pickups);
    if (nearestPickup && (actor.energy <= 1 || actor.health < 65)) {
      return getSafeDashDirection(
        actor.position,
        getPathDirectionToward(
          arena,
          actor.position,
          nearestPickup.position,
          navigator,
        ),
        arena,
      );
    }
  }

  return getSafeDashDirection(
    actor.position,
    getPathDirectionToward(arena, actor.position, opponent.position, navigator),
    arena,
  );
}

function getSafeDashDirection(
  position: Position,
  preferred: MoveAction,
  arena: ArenaTile[][],
): MoveAction {
  const moveActions: MoveAction[] = [
    "move-up",
    "move-down",
    "move-left",
    "move-right",
  ];
  const ordered = [
    preferred,
    ...moveActions.filter((action) => action !== preferred),
  ];

  const scoreDirection = (action: MoveAction) => {
    let current = position;

    for (let step = 0; step < 2; step += 1) {
      const candidate = movePosition(current, action);
      if (!isWalkable(arena, candidate)) {
        return Number.NEGATIVE_INFINITY;
      }
      current = candidate;
    }

    const tile = getTile(arena, current);
    if (tile === "hazard") return -1;
    if (tile === "cover") return 0.2;
    return 0;
  };

  return ordered.reduce(
    (best, action) => {
      const score = scoreDirection(action);
      if (score > best.score) {
        return { action, score };
      }
      return best;
    },
    { action: preferred, score: scoreDirection(preferred) },
  ).action;
}

function resolveMovement(
  actor: Fighter,
  opponent: Fighter,
  action: ArenaAction,
  arena: ArenaTile[][],
  match: MatchState,
  moveIntent: MoveAction | null,
  isBot: boolean,
  navigator?: ArenaNavigator,
): { fighter: Fighter; failed: boolean } {
  if (action === "attack" || action === "guard" || action === "hold") {
    return { fighter: actor, failed: false };
  }

  if (action === "dash") {
    if (actor.energy <= 0) {
      return { fighter: actor, failed: true };
    }

    const direction = pickDashDirection(
      actor,
      opponent,
      arena,
      match,
      moveIntent,
      isBot,
      navigator,
    );
    let current = actor.position;

    for (let step = 0; step < 2; step += 1) {
      const candidate = movePosition(current, direction);
      if (
        !isWalkable(arena, candidate) ||
        positionsEqual(candidate, opponent.position)
      ) {
        break;
      }
      current = candidate;
    }

    if (positionsEqual(current, actor.position)) {
      return { fighter: actor, failed: true };
    }

    return {
      fighter: {
        ...actor,
        position: current,
        energy: clamp(actor.energy - 1, 0, MAX_ENERGY),
      },
      failed: false,
    };
  }

  const candidate = movePosition(actor.position, action);
  if (
    !isWalkable(arena, candidate) ||
    positionsEqual(candidate, opponent.position)
  ) {
    return { fighter: actor, failed: true };
  }

  return {
    fighter: {
      ...actor,
      position: candidate,
    },
    failed: false,
  };
}

function collectPickups(
  fighter: Fighter,
  pickups: Pickup[],
): {
  fighter: Fighter;
  pickups: Pickup[];
  reward: number;
  pickedUp: boolean;
  logs: string[];
} {
  let nextFighter = fighter;
  let reward = 0;
  let pickedUp = false;
  const logs: string[] = [];

  const nextPickups = pickups.map((pickup) => {
    if (
      pickup.cooldown === 0 &&
      positionsEqual(pickup.position, fighter.position)
    ) {
      pickedUp = true;
      const applied = applyPickup(nextFighter, pickup);
      nextFighter = applied.fighter;
      reward += applied.reward;
      logs.push(applied.log);
      return { ...pickup, cooldown: 18 };
    }

    return pickup;
  });

  return {
    fighter: nextFighter,
    pickups: nextPickups,
    reward,
    pickedUp,
    logs,
  };
}

function buildEventLog(existing: string[], additions: string[]): string[] {
  const filtered = additions.filter(Boolean);
  if (filtered.length === 0) {
    return existing.slice(0, 5);
  }
  return [...filtered.reverse(), ...existing].slice(0, 6);
}

function startNextRound(match: MatchState, roundTicks?: number): MatchState {
  return {
    ...match,
    phase: "live",
    round: match.round + 1,
    timer: roundTicks ?? ROUND_TICKS,
    intermissionTicks: 0,
    player: createFighter(PLAYER_SPAWN),
    bot: createFighter(BOT_SPAWN),
    pickups: createPickups(),
    statusMessage: "New round. Same checkpoint, fresh arena.",
    lastBotReward: 0,
    eventLog: [
      "round reset: positions, pickups, and health restored",
      ...match.eventLog,
    ].slice(0, 6),
  };
}

function concludeRound(
  match: MatchState,
  outcome: RoundOutcome,
  statusMessage: string,
): MatchState {
  return {
    ...match,
    phase: "intermission",
    intermissionTicks: INTERMISSION_TICKS,
    scoreboard: {
      player: match.scoreboard.player + (outcome === "player" ? 1 : 0),
      bot: match.scoreboard.bot + (outcome === "bot" ? 1 : 0),
      draw: match.scoreboard.draw + (outcome === "draw" ? 1 : 0),
    },
    roundHistory: [
      {
        round: match.round,
        outcome,
        playerHealth: match.player.health,
        botHealth: match.bot.health,
      },
      ...match.roundHistory,
    ].slice(0, 8),
    statusMessage,
  };
}

/**
 * Scripted rush-and-fight opponent for offline training.
 * Always approaches the bot, attacks when in range, occasionally guards or grabs pickups.
 * @param epsilon probability of random action (controls difficulty)
 */
export function chooseScriptedAction(
  match: MatchState,
  arena: ArenaTile[][],
  epsilon: number,
  navigator?: ArenaNavigator,
): ArenaAction {
  if (match.phase !== "live") return "hold";

  if (Math.random() < epsilon) {
    return ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
  }

  const opp = match.player; // scripted opponent plays as "player"
  const bot = match.bot;

  // Attack if in range
  if (canAttack(arena, opp, bot)) {
    // Small chance to guard instead of always attacking
    if (Math.random() < 0.12) return "guard";
    return "attack";
  }

  // Grab a nearby pickup if health is low or pickup is very close
  const pickup = getNearestActivePickup(opp.position, match.pickups);
  if (pickup) {
    const pickupDist = manhattan(opp.position, pickup.position);
    const botDist = manhattan(opp.position, bot.position);
    if ((opp.health < 50 && pickupDist < botDist) || pickupDist <= 2) {
      return getPathDirectionToward(
        arena,
        opp.position,
        pickup.position,
        navigator,
      );
    }
  }

  // Dash toward bot if we have energy and are far
  if (
    opp.energy >= 1 &&
    manhattan(opp.position, bot.position) > 5 &&
    Math.random() < 0.3
  ) {
    return "dash";
  }

  // Move toward bot
  return getPathDirectionToward(arena, opp.position, bot.position, navigator);
}

export function createInitialMatch(
  playerModel: PlayerModel,
  maxRoundTicks?: number,
): MatchState {
  const habits = getHabitSnapshot(playerModel);
  return {
    phase: "live",
    round: 1,
    timer: maxRoundTicks ?? ROUND_TICKS,
    intermissionTicks: 0,
    player: createFighter(PLAYER_SPAWN),
    bot: createFighter(BOT_SPAWN),
    pickups: createPickups(),
    playerHeat: createEmptyHeatmap(),
    botHeat: createEmptyHeatmap(),
    scoreboard: {
      player: 0,
      bot: 0,
      draw: 0,
    },
    roundHistory: [],
    eventLog: [
      "arena online: fight for cover, avoid the central hazard, and outplay the checkpoint bot",
    ],
    playerHabits: habits,
    predictedHabit: habits.dominant,
    explorationRate: 0.2,
    qStateCount: 0,
    lastDecisionMode: "seeded",
    botIntent: "hold",
    lastBotReward: 0,
    statusMessage: "Round 1. Selected checkpoint loaded.",
  };
}

export function resetMatch(playerModel: PlayerModel): MatchState {
  return createInitialMatch(playerModel);
}

export function advanceMatch(options: {
  match: MatchState;
  arena: ArenaTile[][];
  navigator?: ArenaNavigator;
  config: BotConfig;
  onlineLearning: boolean;
  trackHeatmaps?: boolean;
  brain: BotBrain;
  playerModel: PlayerModel;
  playerAction: ArenaAction;
  playerMoveIntent: MoveAction | null;
  maxRoundTicks?: number;
}): MatchState {
  const {
    match,
    arena,
    navigator,
    config,
    onlineLearning,
    trackHeatmaps = true,
    brain,
    playerModel,
    playerAction,
    playerMoveIntent,
    maxRoundTicks,
  } = options;

  const brainSize = brain.agent.replay.size;

  if (match.phase === "intermission") {
    if (match.intermissionTicks <= 1) {
      const habits = getHabitSnapshot(playerModel);
      const nextRound = startNextRound(match, maxRoundTicks);
      return {
        ...nextRound,
        playerHabits: habits,
        predictedHabit: habits.dominant,
        explorationRate: getExplorationRate(
          config.epsilon,
          nextRound.round,
          nextRound.roundHistory,
        ),
        qStateCount: brainSize,
      };
    }

    return {
      ...match,
      intermissionTicks: match.intermissionTicks - 1,
      lastBotReward: 0,
    };
  }

  const predictedHabit = match.predictedHabit;

  // Bot action selection via DQN
  const epsilon = getExplorationRate(
    config.epsilon,
    match.round,
    match.roundHistory,
  );
  const currentStateVec = encodeState(match, arena, predictedHabit, navigator);
  const decision = dqnChooseAction(
    brain.agent.policy,
    currentStateVec,
    epsilon,
  );
  const botAction: ArenaAction = ACTIONS[decision.actionIndex];
  const botMode: BotDecisionMode = decision.mode;

  let botReward = 0;
  const events: string[] = [];

  const playerStart = {
    ...match.player,
    guarding: playerAction === "guard",
    flashTicks: Math.max(0, match.player.flashTicks - 1),
    lastAction: playerAction,
  };
  const botStart = {
    ...match.bot,
    guarding: botAction === "guard",
    flashTicks: Math.max(0, match.bot.flashTicks - 1),
    lastAction: botAction,
  };

  const playerMove = resolveMovement(
    playerStart,
    botStart,
    playerAction,
    arena,
    match,
    playerMoveIntent,
    false,
    navigator,
  );
  const botMove = resolveMovement(
    botStart,
    playerMove.fighter,
    botAction,
    arena,
    match,
    null,
    true,
    navigator,
  );

  let player = playerMove.fighter;
  let bot = botMove.fighter;

  if (positionsEqual(player.position, bot.position)) {
    player = { ...player, position: playerStart.position };
    bot = { ...bot, position: botStart.position };
  }

  if (
    positionsEqual(player.position, botStart.position) &&
    positionsEqual(bot.position, playerStart.position)
  ) {
    player = { ...player, position: playerStart.position };
    bot = { ...bot, position: botStart.position };
  }

  if (botAction === "dash" && botMove.failed) {
    botReward -= 0.05;
  }
  if (botAction === "attack" && !canAttack(arena, bot, player)) {
    botReward -= 0.05;
  }

  let pickups = tickPickups(match.pickups);

  const playerPickup = collectPickups(player, pickups);
  player = playerPickup.fighter;
  pickups = playerPickup.pickups;

  const botPickup = collectPickups(bot, pickups);
  bot = botPickup.fighter;
  pickups = botPickup.pickups;
  for (const log of botPickup.logs) {
    if (log.includes("med charge")) botReward += 0.16;
    else botReward += 0.12;
  }

  playerPickup.logs.forEach((log) => events.push(`you ${log}`));
  botPickup.logs.forEach((log) => events.push(`bot ${log}`));

  const playerDeals =
    playerAction === "attack" && canAttack(arena, player, bot);
  const botDeals = botAction === "attack" && canAttack(arena, bot, player);

  const botDamage = playerDeals
    ? Math.round(15 * getCoverReduction(arena, bot) * (bot.guarding ? 0.45 : 1))
    : 0;
  const playerDamage = botDeals
    ? Math.round(
        15 * getCoverReduction(arena, player) * (player.guarding ? 0.45 : 1),
      )
    : 0;

  if (botDamage > 0) {
    bot = {
      ...bot,
      health: clamp(bot.health - botDamage, 0, MAX_HEALTH),
      flashTicks: 2,
    };
    botReward -= 0.25;
    events.push(`you landed ${botDamage} damage`);
  }

  if (playerDamage > 0) {
    player = {
      ...player,
      health: clamp(player.health - playerDamage, 0, MAX_HEALTH),
      flashTicks: 2,
    };
    botReward += 0.35;
    events.push(`bot landed ${playerDamage} damage`);
  }

  if (getTile(arena, player.position) === "hazard") {
    player = {
      ...player,
      health: clamp(player.health - 4, 0, MAX_HEALTH),
      flashTicks: 1,
    };
    events.push("you burned on the center hazard");
  }

  if (getTile(arena, bot.position) === "hazard") {
    bot = {
      ...bot,
      health: clamp(bot.health - 4, 0, MAX_HEALTH),
      flashTicks: 1,
    };
    botReward -= 0.14;
    events.push("bot stepped through the hazard");
  }

  const playerCategory = classifyPlayerAction(
    playerAction,
    match.player.position,
    player.position,
    playerPickup.pickedUp,
  );
  updatePlayerModel(playerModel, playerCategory);
  const habitSnapshot = getHabitSnapshot(playerModel);

  let terminalOutcome: RoundOutcome | null = null;
  let terminalMessage = "";
  let terminalReward = 0;
  const nextTimer = match.timer - 1;

  if (player.health <= 0 && bot.health <= 0) {
    terminalOutcome = "draw";
    terminalMessage = "Round drawn. Both fighters collapsed at the same time.";
    terminalReward = 0.1;
  } else if (player.health <= 0) {
    terminalOutcome = "bot";
    terminalMessage =
      "Bot wins the round. It will keep this memory for the next spawn.";
    terminalReward = 1;
  } else if (bot.health <= 0) {
    terminalOutcome = "player";
    terminalMessage =
      "You win the round. The bot will try to patch that pattern next time.";
    terminalReward = -1;
  } else if (nextTimer <= 0) {
    if (player.health === bot.health) {
      terminalOutcome = "draw";
      terminalMessage = "Timer expired with even health.";
      terminalReward = -0.15;
    } else if (bot.health > player.health) {
      terminalOutcome = "bot";
      terminalMessage = "Timer expired. Bot held the health edge.";
      terminalReward = 0.45;
    } else {
      terminalOutcome = "player";
      terminalMessage = "Timer expired. You held the health edge.";
      terminalReward = -0.45;
    }
  }

  const nextMatchBase: MatchState = {
    ...match,
    timer: nextTimer,
    player,
    bot,
    pickups,
    playerHeat: trackHeatmaps
      ? cloneHeatmapWithIncrement(match.playerHeat, player.position)
      : match.playerHeat,
    botHeat: trackHeatmaps
      ? cloneHeatmapWithIncrement(match.botHeat, bot.position)
      : match.botHeat,
    eventLog: buildEventLog(match.eventLog, events),
    playerHabits: habitSnapshot,
    predictedHabit: habitSnapshot.dominant,
    explorationRate: epsilon,
    qStateCount: brainSize,
    lastDecisionMode: botMode,
    botIntent: botAction,
    lastBotReward: botReward + terminalReward,
    statusMessage:
      botMode === "explore"
        ? "Bot explored a lower-confidence action this tick."
        : "Bot exploited the strongest learned action for this state.",
  };

  // Online learning — store transition in replay buffer
  if (onlineLearning) {
    const nextStateVec = terminalOutcome
      ? null
      : encodeState(nextMatchBase, arena, habitSnapshot.dominant, navigator);
    pushTransition(brain.agent.replay, {
      state: currentStateVec,
      action: ACTIONS.indexOf(botAction),
      reward: botReward + terminalReward,
      nextState: nextStateVec,
    });
  }

  if (terminalOutcome) {
    return concludeRound(
      {
        ...nextMatchBase,
        qStateCount: brainSize,
        eventLog: buildEventLog(nextMatchBase.eventLog, [terminalMessage]),
      },
      terminalOutcome,
      terminalMessage,
    );
  }

  return {
    ...nextMatchBase,
    qStateCount: brainSize,
  };
}
