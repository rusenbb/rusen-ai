import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"
import {
  BOT_DIFFICULTIES,
  BOT_PROFILES,
  type BotCheckpointAsset,
  buildArenaMap,
  createEmptyQTable,
  createInitialMatch,
  createPlayerModel,
  deserializeQTable,
  getDifficultyProfile,
  serializeQTable,
  type ArenaAction,
  type ArenaTile,
  type BotCheckpoint,
  type BotCheckpointManifest,
  type BotDifficulty,
  type BotProfile,
  type MatchState,
  type MoveAction,
  type Position,
  type QTable,
  type TrainingMetricPoint,
} from "../src/app/nerdy-stuff/adaptive-arena/game"
import { advanceMatch } from "../src/app/nerdy-stuff/adaptive-arena/game"

type ScriptedPolicyName = "aggressor" | "scavenger" | "sentinel" | "flanker" | "duelist" | "anchor"

type ScriptedDecision = {
  action: ArenaAction
  moveIntent: MoveAction | null
}

type EvaluationStats = {
  rounds: number
  botWins: number
  playerWins: number
  draws: number
  botWinRate: number
}

const TELEMETRY_SAMPLE_EVERY = 25
const TELEMETRY_ROLLING_WINDOW = 40

function mulberry32(seed: number) {
  return function random() {
    let next = (seed += 0x6d2b79f5)
    next = Math.imul(next ^ (next >>> 15), next | 1)
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61)
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296
  }
}

function hashString(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function withSeed<T>(seed: number, work: () => T): T {
  const originalRandom = Math.random
  Math.random = mulberry32(seed)
  try {
    return work()
  } finally {
    Math.random = originalRandom
  }
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

function manhattan(left: Position, right: Position): number {
  return Math.abs(left.x - right.x) + Math.abs(left.y - right.y)
}

function isWalkable(arena: ArenaTile[][], position: Position): boolean {
  return arena[position.y]?.[position.x] !== undefined && arena[position.y][position.x] !== "wall"
}

function getDirectionToward(from: Position, to: Position): MoveAction {
  const dx = to.x - from.x
  const dy = to.y - from.y

  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? "move-right" : "move-left"
  }

  return dy >= 0 ? "move-down" : "move-up"
}

function getDirectionAway(from: Position, danger: Position): MoveAction {
  const toward = getDirectionToward(from, danger)
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

function getPerpendicularDirection(from: Position, to: Position, preferPositive: boolean): MoveAction {
  const dx = to.x - from.x
  const dy = to.y - from.y

  if (Math.abs(dx) >= Math.abs(dy)) {
    return preferPositive ? "move-down" : "move-up"
  }

  return preferPositive ? "move-right" : "move-left"
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

function canAttack(arena: ArenaTile[][], from: Position, to: Position): boolean {
  return manhattan(from, to) <= 3 && hasLineOfSight(arena, from, to)
}

function getNearestActivePickup(match: MatchState): Position | null {
  const active = match.pickups.filter((pickup) => pickup.cooldown === 0)
  if (active.length === 0) return null

  return active.reduce((best, pickup) => {
    if (!best) return pickup.position
    return manhattan(match.player.position, pickup.position) < manhattan(match.player.position, best)
      ? pickup.position
      : best
  }, active[0].position)
}

function pickSafeMove(arena: ArenaTile[][], current: Position, preferred: MoveAction, fallback: MoveAction): MoveAction {
  const preferredPosition = movePosition(current, preferred)
  if (isWalkable(arena, preferredPosition)) {
    return preferred
  }

  const fallbackPosition = movePosition(current, fallback)
  if (isWalkable(arena, fallbackPosition)) {
    return fallback
  }

  return preferred
}

function average(values: number[]): number {
  if (values.length === 0) return 0
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(3))
}

function pushRolling(values: number[], value: number, window: number) {
  values.push(value)
  if (values.length > window) {
    values.shift()
  }
}

function chooseScriptedAction(match: MatchState, arena: ArenaTile[][], policy: ScriptedPolicyName): ScriptedDecision {
  if (match.phase !== "live") {
    return { action: "hold", moveIntent: null }
  }

  const self = match.player
  const enemy = match.bot
  const distance = manhattan(self.position, enemy.position)
  const inRange = canAttack(arena, self.position, enemy.position)
  const nearestPickup = getNearestActivePickup(match)
  const lowHealth = self.health <= 44
  const lowEnergy = self.energy <= 1
  const towardEnemy = getDirectionToward(self.position, enemy.position)
  const awayFromEnemy = getDirectionAway(self.position, enemy.position)
  const towardPickup = nearestPickup ? getDirectionToward(self.position, nearestPickup) : towardEnemy

  switch (policy) {
    case "aggressor": {
      if (inRange) return { action: "attack", moveIntent: null }
      if (distance >= 5 && self.energy > 0) return { action: "dash", moveIntent: towardEnemy }
      return { action: pickSafeMove(arena, self.position, towardEnemy, towardPickup), moveIntent: towardEnemy }
    }
    case "scavenger": {
      if (nearestPickup && (lowHealth || lowEnergy || Math.random() < 0.45)) {
        if (self.energy > 0 && distance > 5) {
          return { action: "dash", moveIntent: towardPickup }
        }
        return { action: towardPickup, moveIntent: towardPickup }
      }
      if (inRange && Math.random() < 0.55) return { action: "attack", moveIntent: null }
      return { action: pickSafeMove(arena, self.position, towardPickup, towardEnemy), moveIntent: towardPickup }
    }
    case "sentinel": {
      if (inRange && (lowHealth || Math.random() < 0.55)) return { action: "guard", moveIntent: null }
      if (inRange && enemy.health < 35) return { action: "attack", moveIntent: null }
      if (distance <= 3) return { action: awayFromEnemy, moveIntent: awayFromEnemy }
      return { action: towardEnemy, moveIntent: towardEnemy }
    }
    case "flanker": {
      const flankDirection = getPerpendicularDirection(self.position, enemy.position, Math.random() > 0.5)
      if (inRange && Math.random() < 0.45) return { action: "attack", moveIntent: null }
      if (self.energy > 0 && distance >= 4) return { action: "dash", moveIntent: flankDirection }
      return { action: pickSafeMove(arena, self.position, flankDirection, towardEnemy), moveIntent: flankDirection }
    }
    case "duelist": {
      if (inRange) {
        return enemy.health <= self.health || Math.random() < 0.7
          ? { action: "attack", moveIntent: null }
          : { action: "guard", moveIntent: null }
      }
      if (distance >= 6 && self.energy > 0) {
        return { action: "dash", moveIntent: towardEnemy }
      }
      if (lowHealth && nearestPickup) {
        return { action: towardPickup, moveIntent: towardPickup }
      }
      return { action: towardEnemy, moveIntent: towardEnemy }
    }
    case "anchor": {
      if (inRange) {
        return enemy.health <= self.health || Math.random() < 0.6
          ? { action: "attack", moveIntent: null }
          : { action: "guard", moveIntent: null }
      }

      if (nearestPickup && (lowHealth || lowEnergy) && Math.random() < 0.65) {
        return { action: towardPickup, moveIntent: towardPickup }
      }

      if (distance >= 7 && Math.random() < 0.85) {
        return { action: "hold", moveIntent: null }
      }

      if (distance >= 5 && self.energy > 0 && Math.random() < 0.25) {
        return { action: "dash", moveIntent: towardEnemy }
      }

      return { action: towardEnemy, moveIntent: towardEnemy }
    }
  }
}

function trainCheckpoint(profile: BotProfile, difficulty: BotDifficulty, startingQTable: QTable): BotCheckpoint {
  const setting = BOT_DIFFICULTIES.find((entry) => entry.id === difficulty)
  if (!setting) {
    throw new Error(`Missing difficulty setting for ${difficulty}`)
  }

  const tunedProfile = getDifficultyProfile(profile, difficulty)
  const arena = buildArenaMap()
  const qTable = deserializeQTable(serializeQTable(startingQTable))
  const playerModel = createPlayerModel()
  let match = createInitialMatch(playerModel)
  let completedRounds = 0
  let previousPhase = match.phase
  let policyIndex = 0
  let episodeReward = 0
  const recentRewards: number[] = []
  const recentWins: number[] = []
  const recentHealthDelta: number[] = []
  const telemetryPoints: TrainingMetricPoint[] = []

  while (completedRounds < setting.trainingRounds) {
    const policyName = setting.curriculum[policyIndex % setting.curriculum.length] as ScriptedPolicyName
    const decision = chooseScriptedAction(match, arena, policyName)
    const nextMatch = advanceMatch({
      match,
      arena,
      profile: tunedProfile,
      onlineLearning: true,
      qTable,
      playerModel,
      playerAction: decision.action,
      playerMoveIntent: decision.moveIntent,
    })
    episodeReward += nextMatch.lastBotReward

    if (previousPhase === "live" && nextMatch.phase === "intermission") {
      completedRounds += 1
      const latest = nextMatch.roundHistory[0]
      const reward = episodeReward
      const botWin = latest?.outcome === "bot" ? 1 : 0
      const healthDelta = latest ? latest.botHealth - latest.playerHealth : 0
      pushRolling(recentRewards, reward, TELEMETRY_ROLLING_WINDOW)
      pushRolling(recentWins, botWin, TELEMETRY_ROLLING_WINDOW)
      pushRolling(recentHealthDelta, healthDelta, TELEMETRY_ROLLING_WINDOW)
      if (completedRounds % TELEMETRY_SAMPLE_EVERY === 0 || completedRounds === setting.trainingRounds) {
        telemetryPoints.push({
          round: completedRounds,
          averageReward: average(recentRewards),
          averageBotWinRate: average(recentWins),
          averageHealthDelta: average(recentHealthDelta),
          qStateCount: qTable.size,
        })
      }
      episodeReward = 0
      policyIndex += 1
    }

    previousPhase = nextMatch.phase
    match = nextMatch
  }

  const stats = evaluateCheckpoint(tunedProfile, qTable, setting.curriculum.map((name) => name as ScriptedPolicyName), setting.evaluationRounds)

  return {
    profileId: profile.id,
    difficulty,
    label: `${profile.name.replace(" Seed", "")} ${setting.label}`,
    summary: `${setting.label} checkpoint trained against ${setting.curriculum.join(", ")} scripted opponents.`,
    curriculum: setting.curriculum,
    trainingRounds: setting.trainingRounds,
    qStateCount: qTable.size,
    stats,
    telemetry: {
      sampleEvery: TELEMETRY_SAMPLE_EVERY,
      rollingWindow: TELEMETRY_ROLLING_WINDOW,
      points: telemetryPoints,
    },
    qTable: serializeQTable(qTable),
  }
}

function evaluateCheckpoint(
  profile: BotProfile,
  checkpointQTable: QTable,
  curriculum: ScriptedPolicyName[],
  rounds: number
): EvaluationStats {
  const arena = buildArenaMap()
  const qTable = deserializeQTable(serializeQTable(checkpointQTable))
  const playerModel = createPlayerModel()
  let match = createInitialMatch(playerModel)
  let completedRounds = 0
  let previousPhase = match.phase
  let policyIndex = 0
  let botWins = 0
  let playerWins = 0
  let draws = 0

  while (completedRounds < rounds) {
    const policyName = curriculum[policyIndex % curriculum.length]
    const decision = chooseScriptedAction(match, arena, policyName)
    const nextMatch = advanceMatch({
      match,
      arena,
      profile,
      onlineLearning: false,
      qTable,
      playerModel,
      playerAction: decision.action,
      playerMoveIntent: decision.moveIntent,
    })

    if (previousPhase === "live" && nextMatch.phase === "intermission") {
      completedRounds += 1
      const latest = nextMatch.roundHistory[0]
      if (latest?.outcome === "bot") botWins += 1
      else if (latest?.outcome === "player") playerWins += 1
      else draws += 1
      policyIndex += 1
    }

    previousPhase = nextMatch.phase
    match = nextMatch
  }

  return {
    rounds,
    botWins,
    playerWins,
    draws,
    botWinRate: Number((botWins / rounds).toFixed(3)),
  }
}

function main() {
  const manifests: BotCheckpointManifest[] = []
  const payloadDir = path.resolve(process.cwd(), "public/adaptive-arena-checkpoints")
  mkdirSync(payloadDir, { recursive: true })

  BOT_PROFILES.forEach((profile) => {
    let qTable = createEmptyQTable()

    BOT_DIFFICULTIES.forEach((difficulty) => {
      const seed = hashString(`${profile.id}:${difficulty.id}:adaptive-arena`)
      const checkpoint = withSeed(seed, () => trainCheckpoint(profile, difficulty.id, qTable))
      const filename = `${profile.id}-${difficulty.id}.json`
      const asset: BotCheckpointAsset = {
        qTable: checkpoint.qTable,
        telemetry: checkpoint.telemetry,
      }
      writeFileSync(path.join(payloadDir, filename), JSON.stringify(asset))
      manifests.push({
        profileId: checkpoint.profileId,
        difficulty: checkpoint.difficulty,
        label: checkpoint.label,
        summary: checkpoint.summary,
        curriculum: checkpoint.curriculum,
        trainingRounds: checkpoint.trainingRounds,
        qStateCount: checkpoint.qStateCount,
        stats: checkpoint.stats,
        telemetry: checkpoint.telemetry,
        assetPath: `/adaptive-arena-checkpoints/${filename}`,
      })
      qTable = deserializeQTable(checkpoint.qTable)
    })
  })

  const outDir = path.resolve(process.cwd(), "src/app/nerdy-stuff/adaptive-arena")
  mkdirSync(outDir, { recursive: true })
  const outFile = path.join(outDir, "checkpoints.generated.ts")
  const output = `/* eslint-disable */\nimport type { BotCheckpointManifest } from "./game"\n\nexport const ADAPTIVE_ARENA_CHECKPOINTS: BotCheckpointManifest[] = ${JSON.stringify(manifests, null, 2)}\n`
  writeFileSync(outFile, output)

  console.log(`wrote ${manifests.length} checkpoint manifests to ${outFile}`)
}

main()
