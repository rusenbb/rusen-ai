export const ARENA_SIZE = 30
export const ROUND_TICKS = 180
export const INTERMISSION_TICKS = 10
export const TICK_MS = 150
export const MAX_HEALTH = 100
export const MAX_ENERGY = 4

export type ArenaTile = "floor" | "wall" | "cover" | "hazard"
export type ArenaAction =
  | "move-up"
  | "move-down"
  | "move-left"
  | "move-right"
  | "attack"
  | "guard"
  | "dash"
  | "hold"
export type MoveAction = Extract<ArenaAction, "move-up" | "move-down" | "move-left" | "move-right">
export type AbilityAction = Extract<ArenaAction, "attack" | "guard" | "dash">
export type BotDecisionMode = "seeded" | "explore" | "exploit"
export type PlayerCategory = "pressure" | "guarded" | "scavenger" | "vertical" | "horizontal" | "holding"
export type PlayerHabit = PlayerCategory | "balanced"
export type BotProfileId = "duelist" | "bastion" | "scavenger" | "stalker"
export type BotDifficulty = "easy" | "medium" | "hard" | "expert"
export type RoundOutcome = "player" | "bot" | "draw"

export type Position = {
  x: number
  y: number
}

export type Fighter = {
  position: Position
  health: number
  energy: number
  guarding: boolean
  flashTicks: number
  lastAction: ArenaAction
}

export type Pickup = {
  id: string
  position: Position
  kind: "health" | "energy"
  cooldown: number
}

export type RoundHistoryEntry = {
  round: number
  outcome: RoundOutcome
  playerHealth: number
  botHealth: number
}

export type HabitSnapshot = {
  dominant: PlayerHabit
  percentages: Record<PlayerCategory, number>
}

export type MatchState = {
  phase: "live" | "intermission"
  round: number
  timer: number
  intermissionTicks: number
  player: Fighter
  bot: Fighter
  pickups: Pickup[]
  playerHeat: number[][]
  botHeat: number[][]
  scoreboard: {
    player: number
    bot: number
    draw: number
  }
  roundHistory: RoundHistoryEntry[]
  eventLog: string[]
  playerHabits: HabitSnapshot
  predictedHabit: PlayerHabit
  explorationRate: number
  qStateCount: number
  lastDecisionMode: BotDecisionMode
  botIntent: ArenaAction
  lastBotReward: number
  statusMessage: string
}

export type BotProfile = {
  id: BotProfileId
  name: string
  label: string
  summary: string
  accent: string
  epsilon: number
  alpha: number
  gamma: number
  aggression: number
  caution: number
  pickupBias: number
  pursuit: number
  baseline: Record<ArenaAction, number>
}

export type ActionScores = Record<ArenaAction, number>
export type QTable = Map<string, ActionScores>
export type SerializedQTableEntry = {
  stateKey: string
  scores: ActionScores
}

export type BotCheckpointStats = {
  rounds: number
  botWins: number
  playerWins: number
  draws: number
  botWinRate: number
}

export type TrainingMetricPoint = {
  round: number
  averageReward: number
  averageBotWinRate: number
  averageHealthDelta: number
  qStateCount: number
}

export type BotTrainingTelemetry = {
  sampleEvery: number
  rollingWindow: number
  points: TrainingMetricPoint[]
}

export type BotCheckpoint = {
  profileId: BotProfileId
  difficulty: BotDifficulty
  label: string
  summary: string
  curriculum: string[]
  trainingRounds: number
  qStateCount: number
  stats: BotCheckpointStats
  telemetry: BotTrainingTelemetry
  qTable: SerializedQTableEntry[]
}

export type BotCheckpointManifest = Omit<BotCheckpoint, "qTable"> & {
  assetPath: string
}

export type BotCheckpointAsset = {
  qTable: SerializedQTableEntry[]
  telemetry: BotTrainingTelemetry
}

export type BotDifficultySetting = {
  id: BotDifficulty
  label: string
  summary: string
  epsilonMultiplier: number
  alphaMultiplier: number
  gammaBonus: number
  trainingRounds: number
  evaluationRounds: number
  curriculum: string[]
}

export type PlayerModel = {
  recent: PlayerCategory[]
  totals: Record<PlayerCategory, number>
}

export const ACTIONS: ArenaAction[] = [
  "move-up",
  "move-down",
  "move-left",
  "move-right",
  "attack",
  "guard",
  "dash",
  "hold",
]

export const ACTION_LABELS: Record<ArenaAction, string> = {
  "move-up": "Move N",
  "move-down": "Move S",
  "move-left": "Move W",
  "move-right": "Move E",
  attack: "Attack",
  guard: "Guard",
  dash: "Dash",
  hold: "Hold",
}

export const PLAYER_CATEGORY_LABELS: Record<PlayerCategory, string> = {
  pressure: "Pressure",
  guarded: "Guarded",
  scavenger: "Resource",
  vertical: "Vertical",
  horizontal: "Horizontal",
  holding: "Holding",
}

const PLAYER_CATEGORIES: PlayerCategory[] = [
  "pressure",
  "guarded",
  "scavenger",
  "vertical",
  "horizontal",
  "holding",
]

const PLAYER_SPAWN: Position = { x: 3, y: 15 }
const BOT_SPAWN: Position = { x: 26, y: 14 }
const CARDINAL_ACTIONS: MoveAction[] = ["move-up", "move-right", "move-down", "move-left"]

const PICKUP_SPAWNS: Array<{ id: string; position: Position; kind: "health" | "energy" }> = [
  { id: "nw-health", position: { x: 4, y: 4 }, kind: "health" },
  { id: "sw-energy", position: { x: 4, y: 25 }, kind: "energy" },
  { id: "ne-energy", position: { x: 25, y: 4 }, kind: "energy" },
  { id: "se-health", position: { x: 25, y: 25 }, kind: "health" },
  { id: "north-health", position: { x: 14, y: 5 }, kind: "health" },
  { id: "south-energy", position: { x: 15, y: 24 }, kind: "energy" },
  { id: "west-energy", position: { x: 6, y: 15 }, kind: "energy" },
  { id: "east-health", position: { x: 23, y: 14 }, kind: "health" },
]

export const BOT_PROFILES: BotProfile[] = [
  {
    id: "duelist",
    name: "Duelist Seed",
    label: "Pressure-first baseline that closes distance and tests your reactions.",
    summary: "Starts assertive, then learns which lanes and timings you fail to punish.",
    accent: "#f97316",
    epsilon: 0.2,
    alpha: 0.28,
    gamma: 0.72,
    aggression: 1.4,
    caution: 0.65,
    pickupBias: 0.6,
    pursuit: 1.2,
    baseline: {
      "move-up": 0.2,
      "move-down": 0.2,
      "move-left": 0.2,
      "move-right": 0.2,
      attack: 0.7,
      guard: 0.05,
      dash: 0.35,
      hold: -0.1,
    },
  },
  {
    id: "bastion",
    name: "Bastion Seed",
    label: "Cover-heavy baseline that absorbs pressure and punishes overcommitment.",
    summary: "Prefers shielded angles, health timing, and low-risk counterattacks.",
    accent: "#67e8f9",
    epsilon: 0.16,
    alpha: 0.24,
    gamma: 0.78,
    aggression: 0.8,
    caution: 1.45,
    pickupBias: 1.05,
    pursuit: 0.7,
    baseline: {
      "move-up": 0.1,
      "move-down": 0.1,
      "move-left": 0.1,
      "move-right": 0.1,
      attack: 0.3,
      guard: 0.65,
      dash: 0.18,
      hold: 0.2,
    },
  },
  {
    id: "scavenger",
    name: "Scavenger Seed",
    label: "Pickup-focused baseline that turns map control into health and energy edges.",
    summary: "Routes through value lanes first, then converts resource advantage into trades.",
    accent: "#a3e635",
    epsilon: 0.18,
    alpha: 0.25,
    gamma: 0.74,
    aggression: 0.95,
    caution: 0.95,
    pickupBias: 1.55,
    pursuit: 0.8,
    baseline: {
      "move-up": 0.15,
      "move-down": 0.15,
      "move-left": 0.15,
      "move-right": 0.15,
      attack: 0.25,
      guard: 0.18,
      dash: 0.28,
      hold: -0.05,
    },
  },
  {
    id: "stalker",
    name: "Stalker Seed",
    label: "Flank-oriented baseline that uses dashes and side lanes to cut you off.",
    summary: "Starts mobile and opportunistic, then sharpens toward your preferred routes.",
    accent: "#c084fc",
    epsilon: 0.22,
    alpha: 0.3,
    gamma: 0.7,
    aggression: 1.1,
    caution: 0.85,
    pickupBias: 0.7,
    pursuit: 1.35,
    baseline: {
      "move-up": 0.25,
      "move-down": 0.25,
      "move-left": 0.25,
      "move-right": 0.25,
      attack: 0.45,
      guard: 0.08,
      dash: 0.55,
      hold: -0.15,
    },
  },
]

export const BOT_DIFFICULTIES: BotDifficultySetting[] = [
  {
    id: "easy",
    label: "Easy",
    summary: "Lightly trained checkpoint with visible mistakes and more exploration.",
    epsilonMultiplier: 1.35,
    alphaMultiplier: 0.9,
    gammaBonus: -0.02,
    trainingRounds: 220,
    evaluationRounds: 120,
    curriculum: ["aggressor", "anchor", "scavenger"],
  },
  {
    id: "medium",
    label: "Medium",
    summary: "Balanced checkpoint intended as the default playable difficulty.",
    epsilonMultiplier: 1,
    alphaMultiplier: 1,
    gammaBonus: 0,
    trainingRounds: 700,
    evaluationRounds: 160,
    curriculum: ["aggressor", "scavenger", "sentinel", "anchor"],
  },
  {
    id: "hard",
    label: "Hard",
    summary: "More thoroughly trained checkpoint with tighter exploitation.",
    epsilonMultiplier: 0.78,
    alphaMultiplier: 1.08,
    gammaBonus: 0.03,
    trainingRounds: 1800,
    evaluationRounds: 220,
    curriculum: ["aggressor", "scavenger", "sentinel", "flanker", "anchor", "duelist"],
  },
  {
    id: "expert",
    label: "Expert",
    summary: "Longest-trained checkpoint with the sharpest punish game.",
    epsilonMultiplier: 0.6,
    alphaMultiplier: 1.15,
    gammaBonus: 0.05,
    trainingRounds: 3600,
    evaluationRounds: 280,
    curriculum: ["aggressor", "scavenger", "sentinel", "flanker", "duelist", "anchor", "anchor"],
  },
]

export function getDifficultySetting(difficulty: BotDifficulty): BotDifficultySetting {
  const setting = BOT_DIFFICULTIES.find((entry) => entry.id === difficulty)
  if (!setting) {
    throw new Error(`Unknown bot difficulty: ${difficulty}`)
  }

  return setting
}

export function getBotProfile(profileId: BotProfileId): BotProfile {
  const profile = BOT_PROFILES.find((entry) => entry.id === profileId)
  if (!profile) {
    throw new Error(`Unknown bot profile: ${profileId}`)
  }

  return profile
}

export function getDifficultyProfile(profile: BotProfile, difficulty: BotDifficulty): BotProfile {
  const setting = getDifficultySetting(difficulty)
  return {
    ...profile,
    epsilon: Math.max(0.03, profile.epsilon * setting.epsilonMultiplier),
    alpha: profile.alpha * setting.alphaMultiplier,
    gamma: Math.min(0.95, profile.gamma + setting.gammaBonus),
  }
}

export function createEmptyQTable(): QTable {
  return new Map()
}

export function serializeQTable(qTable: QTable): SerializedQTableEntry[] {
  return [...qTable.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([stateKey, scores]) => ({
      stateKey,
      scores: { ...scores },
    }))
}

export function deserializeQTable(entries: SerializedQTableEntry[]): QTable {
  const qTable = createEmptyQTable()

  entries.forEach((entry) => {
    qTable.set(entry.stateKey, { ...entry.scores })
  })

  return qTable
}

function createGrid<T>(fill: T): T[][] {
  return Array.from({ length: ARENA_SIZE }, () => Array.from({ length: ARENA_SIZE }, () => fill))
}

function setRect(arena: ArenaTile[][], x: number, y: number, width: number, height: number, tile: ArenaTile) {
  for (let yy = y; yy < y + height; yy += 1) {
    for (let xx = x; xx < x + width; xx += 1) {
      if (yy > 0 && yy < ARENA_SIZE - 1 && xx > 0 && xx < ARENA_SIZE - 1) {
        arena[yy][xx] = tile
      }
    }
  }
}

function setTile(arena: ArenaTile[][], x: number, y: number, tile: ArenaTile) {
  if (x > 0 && x < ARENA_SIZE - 1 && y > 0 && y < ARENA_SIZE - 1) {
    arena[y][x] = tile
  }
}

export function buildArenaMap(): ArenaTile[][] {
  const arena = createGrid<ArenaTile>("floor")

  for (let i = 0; i < ARENA_SIZE; i += 1) {
    arena[0][i] = "wall"
    arena[ARENA_SIZE - 1][i] = "wall"
    arena[i][0] = "wall"
    arena[i][ARENA_SIZE - 1] = "wall"
  }

  setRect(arena, 6, 4, 3, 7, "wall")
  setRect(arena, 21, 4, 3, 7, "wall")
  setRect(arena, 6, 19, 3, 7, "wall")
  setRect(arena, 21, 19, 3, 7, "wall")

  setRect(arena, 11, 7, 8, 2, "wall")
  setRect(arena, 11, 21, 8, 2, "wall")
  setRect(arena, 13, 12, 4, 1, "wall")
  setRect(arena, 13, 17, 4, 1, "wall")

  for (let x = 11; x <= 18; x += 1) {
    setTile(arena, x, 14, "hazard")
    setTile(arena, x, 15, "hazard")
  }

  for (let y = 11; y <= 18; y += 1) {
    setTile(arena, 14, y, "hazard")
    setTile(arena, 15, y, "hazard")
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
  ]

  coverTiles.forEach((tile) => {
    if (arena[tile.y][tile.x] === "floor") {
      arena[tile.y][tile.x] = "cover"
    }
  })

  return arena
}

function createFighter(position: Position): Fighter {
  return {
    position,
    health: MAX_HEALTH,
    energy: 2,
    guarding: false,
    flashTicks: 0,
    lastAction: "hold",
  }
}

function createPickups(): Pickup[] {
  return PICKUP_SPAWNS.map((spawn) => ({ ...spawn, cooldown: 0 }))
}

function createEmptyHeatmap(): number[][] {
  return createGrid(0)
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
  }
}

export function getHabitSnapshot(model: PlayerModel): HabitSnapshot {
  const source = model.recent.length > 0 ? countRecent(model.recent) : model.totals
  const total = Object.values(source).reduce((sum, value) => sum + value, 0)

  if (total === 0) {
    return {
      dominant: "balanced",
      percentages: PLAYER_CATEGORIES.reduce((acc, category) => {
        acc[category] = 0
        return acc
      }, {} as Record<PlayerCategory, number>),
    }
  }

  let dominant: PlayerHabit = "balanced"
  let dominantValue = 0

  const percentages = PLAYER_CATEGORIES.reduce((acc, category) => {
    const percentage = source[category] / total
    acc[category] = percentage
    if (percentage > dominantValue) {
      dominantValue = percentage
      dominant = percentage >= 0.26 ? category : "balanced"
    }
    return acc
  }, {} as Record<PlayerCategory, number>)

  return { dominant, percentages }
}

function countRecent(recent: PlayerCategory[]): Record<PlayerCategory, number> {
  const counts = PLAYER_CATEGORIES.reduce((acc, category) => {
    acc[category] = 0
    return acc
  }, {} as Record<PlayerCategory, number>)

  recent.forEach((entry) => {
    counts[entry] += 1
  })

  return counts
}

function updatePlayerModel(model: PlayerModel, category: PlayerCategory) {
  model.recent.push(category)
  model.totals[category] += 1

  if (model.recent.length > 24) {
    model.recent.shift()
  }
}

function cloneHeatmapWithIncrement(heatmap: number[][], position: Position): number[][] {
  return heatmap.map((row, rowIndex) => {
    if (rowIndex !== position.y) return row
    const nextRow = row.slice()
    nextRow[position.x] += 1
    return nextRow
  })
}

function manhattan(a: Position, b: Position): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function isWalkable(arena: ArenaTile[][], position: Position): boolean {
  return arena[position.y]?.[position.x] !== undefined && arena[position.y][position.x] !== "wall"
}

function positionsEqual(a: Position, b: Position): boolean {
  return a.x === b.x && a.y === b.y
}

function movePosition(position: Position, action: MoveAction): Position {
  switch (action) {
    case "move-up":
      return { x: position.x, y: position.y - 1 }
    case "move-down":
      return { x: position.x, y: position.y + 1 }
    case "move-left":
      return { x: position.x - 1, y: position.y }
    case "move-right":
      return { x: position.x + 1, y: position.y }
  }
}

function getDirectionToward(from: Position, to: Position): MoveAction {
  const dx = to.x - from.x
  const dy = to.y - from.y

  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? "move-right" : "move-left"
  }

  return dy >= 0 ? "move-down" : "move-up"
}

function getDirectionAway(from: Position, threat: Position): MoveAction {
  const toward = getDirectionToward(from, threat)
  switch (toward) {
    case "move-up":
      return "move-down"
    case "move-down":
      return "move-up"
    case "move-left":
      return "move-right"
    case "move-right":
      return "move-left"
  }
}

function getNearestActivePickup(position: Position, pickups: Pickup[]): Pickup | null {
  const active = pickups.filter((pickup) => pickup.cooldown === 0)
  if (active.length === 0) return null

  return active.reduce((best, current) => {
    if (!best) return current
    return manhattan(position, current.position) < manhattan(position, best.position) ? current : best
  }, active[0])
}

function getTile(arena: ArenaTile[][], position: Position): ArenaTile {
  return arena[position.y][position.x]
}

function hasLineOfSight(arena: ArenaTile[][], from: Position, to: Position): boolean {
  let x0 = from.x
  let y0 = from.y
  const x1 = to.x
  const y1 = to.y
  const dx = Math.abs(x1 - x0)
  const dy = Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let err = dx - dy

  while (!(x0 === x1 && y0 === y1)) {
    const e2 = err * 2
    if (e2 > -dy) {
      err -= dy
      x0 += sx
    }
    if (e2 < dx) {
      err += dx
      y0 += sy
    }

    if (x0 === x1 && y0 === y1) break

    const tile = arena[y0]?.[x0]
    if (tile === "wall" || tile === "cover") {
      return false
    }
  }

  return true
}

function canAttack(arena: ArenaTile[][], attacker: Fighter, target: Fighter): boolean {
  return manhattan(attacker.position, target.position) <= 3 && hasLineOfSight(arena, attacker.position, target.position)
}

function getCoverReduction(arena: ArenaTile[][], target: Fighter): number {
  return getTile(arena, target.position) === "cover" ? 0.72 : 1
}

function applyPickup(fighter: Fighter, pickup: Pickup): { fighter: Fighter; reward: number; log: string } {
  if (pickup.kind === "health") {
    return {
      fighter: { ...fighter, health: clamp(fighter.health + 18, 0, MAX_HEALTH) },
      reward: 0.16,
      log: "secured a med charge",
    }
  }

  return {
    fighter: { ...fighter, energy: clamp(fighter.energy + 2, 0, MAX_ENERGY) },
    reward: 0.12,
    log: "refilled dash energy",
  }
}

function tickPickups(pickups: Pickup[]): Pickup[] {
  return pickups.map((pickup) =>
    pickup.cooldown > 0
      ? {
          ...pickup,
          cooldown: pickup.cooldown - 1,
        }
      : pickup
  )
}

function getZone(position: Position): string {
  if (position.x >= 11 && position.x <= 18 && position.y >= 11 && position.y <= 18) {
    return "center"
  }
  if (position.x <= 9) return "west"
  if (position.x >= 20) return "east"
  if (position.y <= 9) return "north"
  if (position.y >= 20) return "south"
  return "mid"
}

function encodeTile(tile: ArenaTile): string {
  switch (tile) {
    case "wall":
      return "W"
    case "cover":
      return "C"
    case "hazard":
      return "H"
    default:
      return "F"
  }
}

function getDirectionToken(action: MoveAction | null): string {
  switch (action) {
    case "move-up":
      return "n"
    case "move-right":
      return "e"
    case "move-down":
      return "s"
    case "move-left":
      return "w"
    default:
      return "none"
  }
}

function getHealthBucket(health: number): string {
  if (health <= 25) return "critical"
  if (health <= 50) return "low"
  if (health <= 75) return "mid"
  if (health <= 90) return "high"
  return "full"
}

function getEnergyBucket(energy: number): string {
  if (energy <= 0) return "0"
  if (energy === 1) return "1"
  if (energy === 2) return "2"
  return "3p"
}

function getDistanceBucket(distance: number | null): string {
  if (distance === null) return "blocked"
  if (distance <= 2) return "clash"
  if (distance <= 5) return "close"
  if (distance <= 9) return "mid"
  if (distance <= 14) return "far"
  return "deep"
}

function getLocalTerrainSignature(arena: ArenaTile[][], position: Position): string {
  const positions = [
    position,
    movePosition(position, "move-up"),
    movePosition(position, "move-right"),
    movePosition(position, "move-down"),
    movePosition(position, "move-left"),
  ]

  return positions
    .map((candidate) => {
      if (!arena[candidate.y]?.[candidate.x]) {
        return "W"
      }

      return encodeTile(getTile(arena, candidate))
    })
    .join("")
}

type PathProbe = {
  distance: number | null
  firstMove: MoveAction | null
}

function getPathProbe(arena: ArenaTile[][], from: Position, target: Position): PathProbe {
  if (positionsEqual(from, target)) {
    return { distance: 0, firstMove: null }
  }

  const visited = Array.from({ length: ARENA_SIZE }, () => Array.from({ length: ARENA_SIZE }, () => false))
  const queue: Array<{ position: Position; distance: number; firstMove: MoveAction | null }> = [
    { position: from, distance: 0, firstMove: null },
  ]
  let head = 0
  visited[from.y][from.x] = true

  while (head < queue.length) {
    const current = queue[head]
    head += 1

    for (const action of CARDINAL_ACTIONS) {
      const nextPosition = movePosition(current.position, action)
      if (!isWalkable(arena, nextPosition) || visited[nextPosition.y][nextPosition.x]) {
        continue
      }

      const firstMove = current.firstMove ?? action
      if (positionsEqual(nextPosition, target)) {
        return { distance: current.distance + 1, firstMove }
      }

      visited[nextPosition.y][nextPosition.x] = true
      queue.push({
        position: nextPosition,
        distance: current.distance + 1,
        firstMove,
      })
    }
  }

  return { distance: null, firstMove: null }
}

function getPathDirectionToward(arena: ArenaTile[][], from: Position, target: Position): MoveAction {
  return getPathProbe(arena, from, target).firstMove ?? getDirectionToward(from, target)
}

function getStateKey(match: MatchState, arena: ArenaTile[][], habit: PlayerHabit): string {
  const dx = clamp(match.player.position.x - match.bot.position.x, -9, 9)
  const dy = clamp(match.player.position.y - match.bot.position.y, -9, 9)
  const distance = manhattan(match.player.position, match.bot.position)
  const pathToPlayer = getPathProbe(arena, match.bot.position, match.player.position)
  const los = hasLineOfSight(arena, match.bot.position, match.player.position) ? 1 : 0
  const attackWindow = canAttack(arena, match.bot, match.player) ? 1 : 0
  const botHealth = getHealthBucket(match.bot.health)
  const playerHealth = getHealthBucket(match.player.health)
  const botEnergy = getEnergyBucket(match.bot.energy)
  const playerEnergy = getEnergyBucket(match.player.energy)
  const pickup = getNearestActivePickup(match.bot.position, match.pickups)
  const pickupDistance = pickup ? manhattan(match.bot.position, pickup.position) : null
  const pickupDirection = pickup ? getDirectionToward(match.bot.position, pickup.position) : null
  const chaseMove = pathToPlayer.firstMove ? movePosition(match.bot.position, pathToPlayer.firstMove) : null
  const chaseTile = chaseMove && arena[chaseMove.y]?.[chaseMove.x] ? getTile(arena, chaseMove) : "wall"
  const playerStillness = match.player.lastAction === "hold" ? "idle" : habit === "holding" ? "sticky" : "active"

  return [
    `dx${dx}`,
    `dy${dy}`,
    `man${getDistanceBucket(distance)}`,
    `path${getDistanceBucket(pathToPlayer.distance)}`,
    `step${getDirectionToken(pathToPlayer.firstMove)}`,
    `los${los}`,
    `atk${attackWindow}`,
    `bh${botHealth}`,
    `ph${playerHealth}`,
    `be${botEnergy}`,
    `pe${playerEnergy}`,
    `pickup${pickupDirection ? getDirectionToken(pickupDirection) : "none"}${getDistanceBucket(pickupDistance)}`,
    `ct${encodeTile(chaseTile)}`,
    `bz${getZone(match.bot.position)}`,
    `pz${getZone(match.player.position)}`,
    `bLast${match.bot.lastAction}`,
    `pLast${match.player.lastAction}`,
    `habit${habit}`,
    `still${playerStillness}`,
    `bLocal${getLocalTerrainSignature(arena, match.bot.position)}`,
    `pLocal${getLocalTerrainSignature(arena, match.player.position)}`,
  ].join("|")
}

function createActionScores(seed: number): ActionScores {
  return {
    "move-up": seed,
    "move-down": seed,
    "move-left": seed,
    "move-right": seed,
    attack: seed,
    guard: seed,
    dash: seed,
    hold: seed,
  }
}

function addDirectionalBias(scores: ActionScores, direction: MoveAction, amount: number) {
  scores[direction] += amount
}

function scoreMoveRisks(scores: ActionScores, arena: ArenaTile[][], position: Position) {
  const moveActions: MoveAction[] = ["move-up", "move-down", "move-left", "move-right"]

  moveActions.forEach((action) => {
    const candidate = movePosition(position, action)
    if (!isWalkable(arena, candidate)) {
      scores[action] -= 0.8
      return
    }

    const tile = getTile(arena, candidate)
    if (tile === "hazard") {
      scores[action] -= 1.2
    }

    if (tile === "cover") {
      scores[action] += 0.12
    }
  })
}

function scoreSeedPolicy(match: MatchState, arena: ArenaTile[][], profile: BotProfile, habit: PlayerHabit): ActionScores {
  const scores = { ...profile.baseline }
  const distance = manhattan(match.bot.position, match.player.position)
  const towardPlayer = getPathDirectionToward(arena, match.bot.position, match.player.position)
  const awayFromPlayer = getDirectionAway(match.bot.position, match.player.position)
  const nearestPickup = getNearestActivePickup(match.bot.position, match.pickups)
  const pickupDirection = nearestPickup ? getPathDirectionToward(arena, match.bot.position, nearestPickup.position) : null
  const onHazard = getTile(arena, match.bot.position) === "hazard"
  const onCover = getTile(arena, match.bot.position) === "cover"

  scoreMoveRisks(scores, arena, match.bot.position)
  addDirectionalBias(scores, towardPlayer, profile.pursuit)

  if (distance <= 2) {
    scores.attack += 1.35 * profile.aggression
    scores.guard += 0.7 * profile.caution
    scores.dash -= 0.2
  } else if (distance <= 5) {
    scores.attack += 0.6 * profile.aggression
    scores.dash += 0.25 * profile.aggression
  } else {
    scores.attack -= 0.2
    scores.dash += 0.4 * profile.pursuit
  }

  if (!hasLineOfSight(arena, match.bot.position, match.player.position)) {
    scores.dash += 0.22
    addDirectionalBias(scores, towardPlayer, 0.35)
  }

  if (match.bot.health <= 38) {
    scores.guard += 0.95 * profile.caution
    scores.attack -= 0.35
    addDirectionalBias(scores, awayFromPlayer, 0.55)
    if (pickupDirection) {
      addDirectionalBias(scores, pickupDirection, 0.9 * profile.pickupBias)
    }
  }

  if (onCover) {
    scores.hold += 0.2 * profile.caution
    scores.guard += 0.25 * profile.caution
  }

  if (onHazard) {
    scores.hold -= 0.6
    addDirectionalBias(scores, awayFromPlayer, 0.2)
    scores.dash += 0.5
  }

  if (nearestPickup && (profile.pickupBias > 1 || match.bot.health < 75 || match.bot.energy <= 1)) {
    addDirectionalBias(scores, pickupDirection ?? towardPlayer, 0.75 * profile.pickupBias)
  }

  if (habit === "holding") {
    scores.hold -= 1.1
    scores.guard -= 0.18
    scores.attack += distance <= 4 ? 1.1 * profile.aggression : 0.2
    scores.dash += distance >= 5 ? 0.7 * profile.pursuit : 0.12
    addDirectionalBias(scores, towardPlayer, 1.1 * profile.pursuit)
  }

  if (habit === "pressure") {
    scores.guard += 0.85
    scores.dash += 0.3
  }

  if (habit === "guarded") {
    scores.attack += 0.45
    addDirectionalBias(scores, towardPlayer, 0.35)
  }

  if (habit === "scavenger" && nearestPickup) {
    addDirectionalBias(scores, pickupDirection ?? towardPlayer, 0.95)
  }

  if (habit === "vertical") {
    const horizontalCut = match.player.position.x > match.bot.position.x ? "move-right" : "move-left"
    scores[horizontalCut] += 0.55
  }

  if (habit === "horizontal") {
    const verticalCut = match.player.position.y > match.bot.position.y ? "move-down" : "move-up"
    scores[verticalCut] += 0.55
  }

  return scores
}

function getQValues(qTable: QTable, stateKey: string, seedScores: ActionScores): ActionScores {
  const existing = qTable.get(stateKey)
  if (existing) {
    return existing
  }

  const seeded = { ...seedScores }
  qTable.set(stateKey, seeded)
  return seeded
}

function getExplorationRate(profile: BotProfile, round: number, history: RoundHistoryEntry[]): number {
  const base = Math.max(0.05, profile.epsilon * Math.pow(0.92, Math.max(0, round - 1)))
  const recentLosses = history.slice(0, 4).filter((entry) => entry.outcome === "player").length
  return clamp(base + (recentLosses >= 3 ? 0.06 : 0), 0.05, 0.32)
}

function chooseBotAction(
  match: MatchState,
  arena: ArenaTile[][],
  profile: BotProfile,
  qTable: QTable,
  habit: PlayerHabit
): { action: ArenaAction; mode: BotDecisionMode; stateKey: string } {
  const stateKey = getStateKey(match, arena, habit)
  const seeded = scoreSeedPolicy(match, arena, profile, habit)
  const existing = qTable.has(stateKey)
  const scores = getQValues(qTable, stateKey, seeded)
  const epsilon = getExplorationRate(profile, match.round, match.roundHistory)

  if (Math.random() < epsilon) {
    const weighted = ACTIONS.filter((action) => scores[action] > -0.7)
    const pool = weighted.length > 0 ? weighted : ACTIONS
    return {
      action: pool[Math.floor(Math.random() * pool.length)],
      mode: "explore",
      stateKey,
    }
  }

  let bestAction = ACTIONS[0]
  let bestScore = Number.NEGATIVE_INFINITY

  ACTIONS.forEach((action) => {
    const score = scores[action]
    if (score > bestScore) {
      bestScore = score
      bestAction = action
    }
  })

  return {
    action: bestAction,
    mode: existing ? "exploit" : "seeded",
    stateKey,
  }
}

function updateQ(qTable: QTable, stateKey: string, action: ArenaAction, reward: number, nextStateKey: string | null, profile: BotProfile) {
  const current = qTable.get(stateKey) ?? createActionScores(0)
  const next = nextStateKey ? qTable.get(nextStateKey) ?? createActionScores(0) : createActionScores(0)
  const nextMax = nextStateKey ? Math.max(...ACTIONS.map((candidate) => next[candidate])) : 0
  current[action] += profile.alpha * (reward + profile.gamma * nextMax - current[action])
  qTable.set(stateKey, current)
}

function classifyPlayerAction(action: ArenaAction, movedFrom: Position, movedTo: Position, pickedUp: boolean): PlayerCategory {
  if (pickedUp) return "scavenger"
  if (action === "attack") return "pressure"
  if (action === "guard" || action === "dash") return "guarded"
  if (action === "move-up" || action === "move-down") return "vertical"
  if (action === "move-left" || action === "move-right") return "horizontal"
  if (positionsEqual(movedFrom, movedTo)) return "holding"
  return "holding"
}

function pickDashDirection(
  actor: Fighter,
  opponent: Fighter,
  arena: ArenaTile[][],
  match: MatchState,
  profile: BotProfile,
  moveIntent: MoveAction | null,
  isBot: boolean
): MoveAction {
  if (!isBot && moveIntent) {
    return moveIntent
  }

  if (isBot) {
    if (actor.health <= 35 || match.predictedHabit === "pressure") {
      return getSafeDashDirection(actor.position, getDirectionAway(actor.position, opponent.position), arena)
    }

    const nearestPickup = getNearestActivePickup(actor.position, match.pickups)
    if (nearestPickup && (profile.pickupBias > 1 || actor.energy <= 1 || actor.health < 65)) {
      return getSafeDashDirection(actor.position, getPathDirectionToward(arena, actor.position, nearestPickup.position), arena)
    }
  }

  return getSafeDashDirection(actor.position, getPathDirectionToward(arena, actor.position, opponent.position), arena)
}

function getSafeDashDirection(position: Position, preferred: MoveAction, arena: ArenaTile[][]): MoveAction {
  const moveActions: MoveAction[] = ["move-up", "move-down", "move-left", "move-right"]
  const ordered = [preferred, ...moveActions.filter((action) => action !== preferred)]

  const scoreDirection = (action: MoveAction) => {
    let current = position

    for (let step = 0; step < 2; step += 1) {
      const candidate = movePosition(current, action)
      if (!isWalkable(arena, candidate)) {
        return Number.NEGATIVE_INFINITY
      }
      current = candidate
    }

    const tile = getTile(arena, current)
    if (tile === "hazard") return -1
    if (tile === "cover") return 0.2
    return 0
  }

  return ordered.reduce(
    (best, action) => {
      const score = scoreDirection(action)
      if (score > best.score) {
        return { action, score }
      }
      return best
    },
    { action: preferred, score: scoreDirection(preferred) }
  ).action
}

function resolveMovement(
  actor: Fighter,
  opponent: Fighter,
  action: ArenaAction,
  arena: ArenaTile[][],
  match: MatchState,
  profile: BotProfile,
  moveIntent: MoveAction | null,
  isBot: boolean
): { fighter: Fighter; failed: boolean } {
  if (action === "attack" || action === "guard" || action === "hold") {
    return { fighter: actor, failed: false }
  }

  if (action === "dash") {
    if (actor.energy <= 0) {
      return { fighter: actor, failed: true }
    }

    const direction = pickDashDirection(actor, opponent, arena, match, profile, moveIntent, isBot)
    let current = actor.position

    for (let step = 0; step < 2; step += 1) {
      const candidate = movePosition(current, direction)
      if (!isWalkable(arena, candidate) || positionsEqual(candidate, opponent.position)) {
        break
      }
      current = candidate
    }

    if (positionsEqual(current, actor.position)) {
      return { fighter: actor, failed: true }
    }

    return {
      fighter: {
        ...actor,
        position: current,
        energy: clamp(actor.energy - 1, 0, MAX_ENERGY),
      },
      failed: false,
    }
  }

  const candidate = movePosition(actor.position, action)
  if (!isWalkable(arena, candidate) || positionsEqual(candidate, opponent.position)) {
    return { fighter: actor, failed: true }
  }

  return {
    fighter: {
      ...actor,
      position: candidate,
    },
    failed: false,
  }
}

function collectPickups(fighter: Fighter, pickups: Pickup[]): { fighter: Fighter; pickups: Pickup[]; reward: number; pickedUp: boolean; logs: string[] } {
  let nextFighter = fighter
  let reward = 0
  let pickedUp = false
  const logs: string[] = []

  const nextPickups = pickups.map((pickup) => {
    if (pickup.cooldown === 0 && positionsEqual(pickup.position, fighter.position)) {
      pickedUp = true
      const applied = applyPickup(nextFighter, pickup)
      nextFighter = applied.fighter
      reward += applied.reward
      logs.push(applied.log)
      return { ...pickup, cooldown: 18 }
    }

    return pickup
  })

  return {
    fighter: nextFighter,
    pickups: nextPickups,
    reward,
    pickedUp,
    logs,
  }
}

function buildEventLog(existing: string[], additions: string[]): string[] {
  const filtered = additions.filter(Boolean)
  if (filtered.length === 0) {
    return existing.slice(0, 5)
  }
  return [...filtered.reverse(), ...existing].slice(0, 6)
}

function startNextRound(match: MatchState): MatchState {
  return {
    ...match,
    phase: "live",
    round: match.round + 1,
    timer: ROUND_TICKS,
    intermissionTicks: 0,
    player: createFighter(PLAYER_SPAWN),
    bot: createFighter(BOT_SPAWN),
    pickups: createPickups(),
    statusMessage: "New round. The bot keeps its memory.",
    lastBotReward: 0,
    eventLog: ["round reset: positions, pickups, and health restored", ...match.eventLog].slice(0, 6),
  }
}

function concludeRound(match: MatchState, outcome: RoundOutcome, statusMessage: string): MatchState {
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
  }
}

export function createInitialMatch(playerModel: PlayerModel): MatchState {
  const habits = getHabitSnapshot(playerModel)
  return {
    phase: "live",
    round: 1,
    timer: ROUND_TICKS,
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
      "arena online: fight for cover, avoid the central hazard, and watch the bot adapt",
    ],
    playerHabits: habits,
    predictedHabit: habits.dominant,
    explorationRate: 0.2,
    qStateCount: 0,
    lastDecisionMode: "seeded",
    botIntent: "hold",
    lastBotReward: 0,
    statusMessage: "Round 1. The bot starts from its selected seed policy.",
  }
}

export function resetMatch(playerModel: PlayerModel): MatchState {
  return createInitialMatch(playerModel)
}

export function advanceMatch(options: {
  match: MatchState
  arena: ArenaTile[][]
  profile: BotProfile
  onlineLearning: boolean
  qTable: QTable
  playerModel: PlayerModel
  playerAction: ArenaAction
  playerMoveIntent: MoveAction | null
}): MatchState {
  const { match, arena, profile, onlineLearning, qTable, playerModel, playerAction, playerMoveIntent } = options

  if (match.phase === "intermission") {
    if (match.intermissionTicks <= 1) {
      const habits = getHabitSnapshot(playerModel)
      const nextRound = startNextRound(match)
      return {
        ...nextRound,
        playerHabits: habits,
        predictedHabit: habits.dominant,
        explorationRate: getExplorationRate(profile, nextRound.round, nextRound.roundHistory),
        qStateCount: qTable.size,
      }
    }

    return {
      ...match,
      intermissionTicks: match.intermissionTicks - 1,
      lastBotReward: 0,
    }
  }

  const predictedHabit = getHabitSnapshot(playerModel).dominant
  const previousDistance = manhattan(match.bot.position, match.player.position)
  const botDecision = chooseBotAction(match, arena, profile, qTable, predictedHabit)

  let botReward = 0
  const events: string[] = []

  const playerStart = { ...match.player, guarding: playerAction === "guard", flashTicks: Math.max(0, match.player.flashTicks - 1), lastAction: playerAction }
  const botStart = { ...match.bot, guarding: botDecision.action === "guard", flashTicks: Math.max(0, match.bot.flashTicks - 1), lastAction: botDecision.action }

  const playerMove = resolveMovement(playerStart, botStart, playerAction, arena, match, profile, playerMoveIntent, false)
  const botMove = resolveMovement(botStart, playerMove.fighter, botDecision.action, arena, match, profile, null, true)

  let player = playerMove.fighter
  let bot = botMove.fighter

  if (positionsEqual(player.position, bot.position)) {
    player = { ...player, position: playerStart.position }
    bot = { ...bot, position: botStart.position }
  }

  if (positionsEqual(player.position, botStart.position) && positionsEqual(bot.position, playerStart.position)) {
    player = { ...player, position: playerStart.position }
    bot = { ...bot, position: botStart.position }
  }

  if (botDecision.action === "dash" && botMove.failed) {
    botReward -= 0.05
  }
  if (botDecision.action === "attack" && !canAttack(arena, bot, player)) {
    botReward -= 0.05
  }

  let pickups = tickPickups(match.pickups)

  const playerPickup = collectPickups(player, pickups)
  player = playerPickup.fighter
  pickups = playerPickup.pickups

  const botPickup = collectPickups(bot, pickups)
  bot = botPickup.fighter
  pickups = botPickup.pickups
  botReward += botPickup.reward

  playerPickup.logs.forEach((log) => events.push(`you ${log}`))
  botPickup.logs.forEach((log) => events.push(`bot ${log}`))

  const playerDeals = playerAction === "attack" && canAttack(arena, player, bot)
  const botDeals = botDecision.action === "attack" && canAttack(arena, bot, player)

  const botDamage = playerDeals
    ? Math.round(15 * getCoverReduction(arena, bot) * (bot.guarding ? 0.45 : 1))
    : 0
  const playerDamage = botDeals
    ? Math.round(15 * getCoverReduction(arena, player) * (player.guarding ? 0.45 : 1))
    : 0

  if (botDamage > 0) {
    bot = { ...bot, health: clamp(bot.health - botDamage, 0, MAX_HEALTH), flashTicks: 2 }
    botReward -= 0.32
    events.push(`you landed ${botDamage} damage`)
  }

  if (playerDamage > 0) {
    player = { ...player, health: clamp(player.health - playerDamage, 0, MAX_HEALTH), flashTicks: 2 }
    botReward += 0.28
    events.push(`bot landed ${playerDamage} damage`)
  }

  if (getTile(arena, player.position) === "hazard") {
    player = { ...player, health: clamp(player.health - 4, 0, MAX_HEALTH), flashTicks: 1 }
    events.push("you burned on the center hazard")
  }

  if (getTile(arena, bot.position) === "hazard") {
    bot = { ...bot, health: clamp(bot.health - 4, 0, MAX_HEALTH), flashTicks: 1 }
    botReward -= 0.14
    events.push("bot stepped through the hazard")
  }

  const playerCategory = classifyPlayerAction(playerAction, match.player.position, player.position, playerPickup.pickedUp)
  updatePlayerModel(playerModel, playerCategory)
  const habitSnapshot = getHabitSnapshot(playerModel)
  const nextDistance = manhattan(bot.position, player.position)

  if (nextDistance < previousDistance) {
    botReward += 0.045 * profile.pursuit
  } else if (nextDistance > previousDistance && previousDistance > 3) {
    botReward -= 0.035
  }

  if (predictedHabit === "holding") {
    if (botDecision.action === "hold") {
      botReward -= 0.14
    }
    if (nextDistance < previousDistance) {
      botReward += 0.08
    }
    if (canAttack(arena, bot, player)) {
      botReward += 0.12
    }
  }

  if (botDecision.action === "hold" && previousDistance > 3 && getTile(arena, bot.position) !== "cover") {
    botReward -= 0.08
  }

  let terminalOutcome: RoundOutcome | null = null
  let terminalMessage = ""
  let terminalReward = 0

  const nextMatchBase: MatchState = {
    ...match,
    timer: match.timer - 1,
    player,
    bot,
    pickups,
    playerHeat: cloneHeatmapWithIncrement(match.playerHeat, player.position),
    botHeat: cloneHeatmapWithIncrement(match.botHeat, bot.position),
    eventLog: buildEventLog(match.eventLog, events),
    playerHabits: habitSnapshot,
    predictedHabit: habitSnapshot.dominant,
    explorationRate: getExplorationRate(profile, match.round, match.roundHistory),
    qStateCount: qTable.size,
    lastDecisionMode: botDecision.mode,
    botIntent: botDecision.action,
    lastBotReward: botReward + terminalReward,
    statusMessage:
      botDecision.mode === "explore"
        ? "Bot explored a lower-confidence action this tick."
        : botDecision.mode === "exploit"
          ? "Bot exploited the strongest learned action for this state."
          : "Bot is still operating from its seed policy in this state.",
  }

  if (player.health <= 0 && bot.health <= 0) {
    terminalOutcome = "draw"
    terminalMessage = "Round drawn. Both fighters collapsed at the same time."
    terminalReward = 0.1
  } else if (player.health <= 0) {
    terminalOutcome = "bot"
    terminalMessage = "Bot wins the round. It will keep this memory for the next spawn."
    terminalReward = 1
  } else if (bot.health <= 0) {
    terminalOutcome = "player"
    terminalMessage = "You win the round. The bot will try to patch that pattern next time."
    terminalReward = -1
  } else if (nextMatchBase.timer <= 0) {
    if (player.health === bot.health) {
      terminalOutcome = "draw"
      terminalMessage = "Timer expired with even health."
      terminalReward = -0.02
    } else if (bot.health > player.health) {
      terminalOutcome = "bot"
      terminalMessage = "Timer expired. Bot held the health edge."
      terminalReward = 0.45
    } else {
      terminalOutcome = "player"
      terminalMessage = "Timer expired. You held the health edge."
      terminalReward = -0.45
    }
  }

  const nextStateKey = terminalOutcome ? null : getStateKey(nextMatchBase, arena, habitSnapshot.dominant)
  if (onlineLearning) {
    updateQ(qTable, botDecision.stateKey, botDecision.action, botReward + terminalReward, nextStateKey, profile)
  }

  if (terminalOutcome) {
    return concludeRound(
      {
        ...nextMatchBase,
        qStateCount: qTable.size,
        eventLog: buildEventLog(nextMatchBase.eventLog, [terminalMessage]),
      },
      terminalOutcome,
      terminalMessage
    )
  }

  return {
    ...nextMatchBase,
    qStateCount: qTable.size,
  }
}
