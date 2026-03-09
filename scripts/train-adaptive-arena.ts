import { mkdirSync, writeFileSync, statSync } from "node:fs";
import path from "node:path";
import { fork } from "node:child_process";
import {
  BOT_CONFIG,
  BOT_DIFFICULTIES,
  type BotConfig,
  type DQNCheckpointAsset,
  type DQNCheckpointManifest,
  ACTIONS,
  buildArenaMap,
  createArenaNavigator,
  createInitialMatch,
  createPlayerModel,
  encodeStateAsPlayer,
  getDifficultyConfig,
  STATE_DIM,
  type ArenaAction,
  type ArenaTile,
  type BotDifficulty,
  type DQNBrain,
  type MatchState,
  type TrainingMetricPoint,
} from "../src/app/nerdy-stuff/adaptive-arena/game";
import { advanceMatch } from "../src/app/nerdy-stuff/adaptive-arena/game";
import {
  chooseAction as dqnChooseAction,
  createDQNAgent,
  deepCopyWeights,
  serializeDQNWeights,
  trainStep,
  type DQNConfig,
  type DQNWeights,
  type SerializedDQNWeights,
} from "../src/app/nerdy-stuff/adaptive-arena/dqn";

// ── Shared Types ──────────────────────────────────────────────────────────────

type EvaluationStats = {
  rounds: number;
  botWins: number;
  playerWins: number;
  draws: number;
  botWinRate: number;
};

type TrainedCheckpoint = {
  difficulty: BotDifficulty;
  label: string;
  summary: string;
  snapshotInterval: number;
  trainingRounds: number;
  parameterCount: number;
  stats: EvaluationStats;
  telemetry: {
    sampleEvery: number;
    rollingWindow: number;
    points: TrainingMetricPoint[];
  };
  weights: SerializedDQNWeights;
  config: { layerSizes: number[] };
};

// ── Self-Play Pool Types ─────────────────────────────────────────────────────

type PoolEntry = {
  label: string;
  weights: DQNWeights;
  epsilon: number;
  capturedAtRound: number;
};
type OpponentPool = { entries: PoolEntry[]; maxSize: number };

// ── Constants ─────────────────────────────────────────────────────────────────

const TELEMETRY_SAMPLE_EVERY = 50;
const TELEMETRY_ROLLING_WINDOW = 60;
const TRAIN_EVERY_N_TICKS = 20;
const DQN_LAYER_SIZES = [STATE_DIM, 128, 64, 8];
const TRAINING_ROUND_TICKS = 100;
const SNAPSHOT_INTERVAL = 50;
const BATCH_SIZE = 64;
const WEIGHT_DECAY = 0.0003;

// ── Self-Play Pool Config ────────────────────────────────────────────────────

const SNAPSHOT_EPSILON = 0.08;

const POOL_CONFIG: Record<
  BotDifficulty,
  {
    maxSize: number;
    snapshotEvery: number;
  }
> = {
  easy: { maxSize: 8, snapshotEvery: 30 },
  medium: { maxSize: 12, snapshotEvery: 60 },
  hard: { maxSize: 15, snapshotEvery: 100 },
  expert: { maxSize: 20, snapshotEvery: 150 },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function mulberry32(seed: number) {
  return function random() {
    let next = (seed += 0x6d2b79f5);
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function withSeed<T>(seed: number, work: () => T): T {
  const originalRandom = Math.random;
  Math.random = mulberry32(seed);
  try {
    return work();
  } finally {
    Math.random = originalRandom;
  }
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Number(
    (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(3),
  );
}

function pushRolling(values: number[], value: number, window: number) {
  values.push(value);
  if (values.length > window) {
    values.shift();
  }
}

function countParameters(layerSizes: number[]): number {
  let total = 0;
  for (let i = 0; i < layerSizes.length - 1; i++) {
    total += layerSizes[i] * layerSizes[i + 1] + layerSizes[i + 1];
  }
  return total;
}

// ── Opponent Pool ────────────────────────────────────────────────────────────

function createPool(
  difficulty: BotDifficulty,
  initialWeights: DQNWeights,
): OpponentPool {
  return {
    entries: [
      {
        label: "init",
        weights: deepCopyWeights(initialWeights),
        epsilon: 0.5,
        capturedAtRound: 0,
      },
    ],
    maxSize: POOL_CONFIG[difficulty].maxSize,
  };
}

function addSnapshot(
  pool: OpponentPool,
  weights: DQNWeights,
  round: number,
): void {
  if (pool.entries.length >= pool.maxSize) {
    pool.entries.splice(0, 1);
  }
  pool.entries.push({
    label: `snap-r${round}`,
    weights,
    epsilon: SNAPSHOT_EPSILON,
    capturedAtRound: round,
  });
}

function sampleOpponent(pool: OpponentPool): PoolEntry {
  return pool.entries[Math.floor(Math.random() * pool.entries.length)];
}

function chooseOpponentAction(
  opponent: PoolEntry,
  match: MatchState,
  arena: ArenaTile[][],
  navigator: ReturnType<typeof createArenaNavigator>,
): ArenaAction {
  const state = encodeStateAsPlayer(match, arena, "balanced", navigator);
  const decision = dqnChooseAction(opponent.weights, state, opponent.epsilon);
  return ACTIONS[decision.actionIndex];
}

// ── Training ──────────────────────────────────────────────────────────────────

function trainCheckpoint(
  config: BotConfig,
  difficulty: BotDifficulty,
): TrainedCheckpoint {
  const setting = BOT_DIFFICULTIES.find((entry) => entry.id === difficulty);
  if (!setting) {
    throw new Error(`Missing difficulty setting for ${difficulty}`);
  }

  const tunedConfig = getDifficultyConfig(config, difficulty);
  const arena = buildArenaMap();
  const navigator = createArenaNavigator(arena);
  const poolCfg = POOL_CONFIG[difficulty];

  const dqnConfig: DQNConfig = {
    layerSizes: DQN_LAYER_SIZES,
    learningRate: 0.001 * tunedConfig.alpha * 3,
    gamma: tunedConfig.gamma,
    targetUpdateFreq: 500,
    batchSize: BATCH_SIZE,
    replayCapacity: 50_000,
    epsilon: 1.0,
    epsilonDecay: 0.9997,
    epsilonMin: 0.05,
    weightDecay: WEIGHT_DECAY,
  };

  const agent = createDQNAgent(dqnConfig);
  const pool = createPool(difficulty, agent.policy);

  const brain: DQNBrain = { kind: "dqn", agent };
  const playerModel = createPlayerModel();
  let match = createInitialMatch(playerModel, TRAINING_ROUND_TICKS);
  let completedRounds = 0;
  let previousPhase = match.phase;
  let episodeReward = 0;
  let tickCount = 0;
  const recentRewards: number[] = [];
  const recentWins: number[] = [];
  const recentHealthDelta: number[] = [];
  const telemetryPoints: TrainingMetricPoint[] = [];

  let currentOpponent = sampleOpponent(pool);

  while (completedRounds < setting.trainingRounds) {
    const opponentAction = chooseOpponentAction(
      currentOpponent,
      match,
      arena,
      navigator,
    );

    const nextMatch = advanceMatch({
      match,
      arena,
      navigator,
      config: tunedConfig,
      onlineLearning: true,
      trackHeatmaps: false,
      brain,
      playerModel,
      playerAction: opponentAction,
      playerMoveIntent: null,
      maxRoundTicks: TRAINING_ROUND_TICKS,
    });

    tickCount++;
    episodeReward += nextMatch.lastBotReward;

    if (
      tickCount % TRAIN_EVERY_N_TICKS === 0 &&
      agent.replay.size >= dqnConfig.batchSize
    ) {
      trainStep(agent);
    }

    if (previousPhase === "live" && nextMatch.phase === "intermission") {
      completedRounds += 1;
      const latest = nextMatch.roundHistory[0];
      const botWin = latest?.outcome === "bot" ? 1 : 0;
      const healthDelta = latest ? latest.botHealth - latest.playerHealth : 0;
      pushRolling(recentRewards, episodeReward, TELEMETRY_ROLLING_WINDOW);
      pushRolling(recentWins, botWin, TELEMETRY_ROLLING_WINDOW);
      pushRolling(recentHealthDelta, healthDelta, TELEMETRY_ROLLING_WINDOW);

      if (
        completedRounds % TELEMETRY_SAMPLE_EVERY === 0 ||
        completedRounds === setting.trainingRounds
      ) {
        telemetryPoints.push({
          round: completedRounds,
          averageReward: average(recentRewards),
          averageBotWinRate: average(recentWins),
          averageHealthDelta: average(recentHealthDelta),
          qStateCount: agent.replay.size,
        });
      }

      // Decay epsilon
      agent.config.epsilon = Math.max(
        dqnConfig.epsilonMin,
        agent.config.epsilon * dqnConfig.epsilonDecay,
      );

      episodeReward = 0;

      // Snapshot current policy into the pool
      if (completedRounds % poolCfg.snapshotEvery === 0) {
        addSnapshot(pool, deepCopyWeights(agent.policy), completedRounds);
      }

      // Sample a new opponent for the next round
      currentOpponent = sampleOpponent(pool);

      if (completedRounds % 200 === 0) {
        const winRate = average(recentWins);
        console.log(
          `  [${difficulty}] round ${completedRounds}/${setting.trainingRounds} — win: ${(winRate * 100).toFixed(1)}%, ε: ${agent.config.epsilon.toFixed(4)}, pool: ${pool.entries.length}, steps: ${agent.stepCount}`,
        );
      }
    }

    previousPhase = nextMatch.phase;
    match = nextMatch;
  }

  // Evaluate against the final pool
  const stats = evaluateAgainstPool(
    tunedConfig,
    agent.policy,
    pool,
    setting.evaluationRounds,
  );
  console.log(
    `  [${difficulty}] eval vs pool: ${(stats.botWinRate * 100).toFixed(1)}% win rate (${stats.botWins}W/${stats.playerWins}L/${stats.draws}D over ${stats.rounds} rounds)`,
  );

  return {
    difficulty,
    label: `${setting.label}`,
    summary: `${setting.label} checkpoint (${setting.trainingRounds} rounds, pure self-play league with ${pool.entries.length} opponents).`,
    snapshotInterval: SNAPSHOT_INTERVAL,
    trainingRounds: setting.trainingRounds,
    parameterCount: countParameters(DQN_LAYER_SIZES),
    stats,
    telemetry: {
      sampleEvery: TELEMETRY_SAMPLE_EVERY,
      rollingWindow: TELEMETRY_ROLLING_WINDOW,
      points: telemetryPoints,
    },
    weights: serializeDQNWeights(agent.policy),
    config: { layerSizes: DQN_LAYER_SIZES },
  };
}

// ── Evaluation ────────────────────────────────────────────────────────────────

function evaluateAgainstPool(
  config: BotConfig,
  policyWeights: DQNWeights,
  pool: OpponentPool,
  rounds: number,
): EvaluationStats {
  const arena = buildArenaMap();
  const navigator = createArenaNavigator(arena);
  const evalDqnConfig: DQNConfig = {
    layerSizes: DQN_LAYER_SIZES,
    learningRate: 0,
    gamma: config.gamma,
    targetUpdateFreq: 9999,
    batchSize: 64,
    replayCapacity: 1000,
    epsilon: 0.05,
    epsilonDecay: 1,
    epsilonMin: 0.05,
    weightDecay: 0,
  };
  const evalAgent = createDQNAgent(evalDqnConfig);
  evalAgent.policy = deepCopyWeights(policyWeights);
  evalAgent.target = deepCopyWeights(policyWeights);

  const brain: DQNBrain = { kind: "dqn", agent: evalAgent };
  const playerModel = createPlayerModel();
  let match = createInitialMatch(playerModel, TRAINING_ROUND_TICKS);
  let completedRounds = 0;
  let previousPhase = match.phase;
  let botWins = 0;
  let playerWins = 0;
  let draws = 0;
  let currentOpponent = sampleOpponent(pool);

  while (completedRounds < rounds) {
    const opponentAction = chooseOpponentAction(
      currentOpponent,
      match,
      arena,
      navigator,
    );
    const nextMatch = advanceMatch({
      match,
      arena,
      navigator,
      config,
      onlineLearning: false,
      trackHeatmaps: false,
      brain,
      playerModel,
      playerAction: opponentAction,
      playerMoveIntent: null,
      maxRoundTicks: TRAINING_ROUND_TICKS,
    });

    if (previousPhase === "live" && nextMatch.phase === "intermission") {
      completedRounds += 1;
      const latest = nextMatch.roundHistory[0];
      if (latest?.outcome === "bot") botWins += 1;
      else if (latest?.outcome === "player") playerWins += 1;
      else draws += 1;
      currentOpponent = sampleOpponent(pool);
    }

    previousPhase = nextMatch.phase;
    match = nextMatch;
  }

  return {
    rounds,
    botWins,
    playerWins,
    draws,
    botWinRate: Number((botWins / rounds).toFixed(3)),
  };
}

// ── Child Process Entry Point ─────────────────────────────────────────────────

const childDifficulty = process.env.TRAIN_DIFFICULTY as
  | BotDifficulty
  | undefined;
if (childDifficulty) {
  const seed = hashString(`arena:${childDifficulty}:selfplay-v3`);
  const checkpoint = withSeed(seed, () =>
    trainCheckpoint(BOT_CONFIG, childDifficulty),
  );
  process.send!({ type: "result", checkpoint });
  process.exit(0);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const payloadDir = path.resolve(
    process.cwd(),
    "public/adaptive-arena-checkpoints",
  );
  mkdirSync(payloadDir, { recursive: true });

  console.log(
    `Training DQN (pure self-play) — network: ${DQN_LAYER_SIZES.join(" → ")} (${countParameters(DQN_LAYER_SIZES)} params)`,
  );
  console.log(
    `Batch size: ${BATCH_SIZE}, weight decay: ${WEIGHT_DECAY}, round ticks: ${TRAINING_ROUND_TICKS}`,
  );
  console.log(
    `Training all ${BOT_DIFFICULTIES.length} difficulties in parallel\n`,
  );

  const scriptPath = new URL(import.meta.url).pathname;
  const results = await Promise.all(
    BOT_DIFFICULTIES.map((difficulty) => {
      return new Promise<TrainedCheckpoint>((resolve, reject) => {
        const pc = POOL_CONFIG[difficulty.id];
        console.log(
          `── ${difficulty.label} (${difficulty.trainingRounds} rounds, pool max ${pc.maxSize}, snap every ${pc.snapshotEvery}) ──`,
        );
        const child = fork(scriptPath, [], {
          execArgv: process.execArgv.filter(
            (a) => !a.startsWith("--eval") && !a.startsWith("--print"),
          ),
          env: { ...process.env, TRAIN_DIFFICULTY: difficulty.id },
          stdio: ["ignore", "inherit", "inherit", "ipc"],
        });
        child.on(
          "message",
          (msg: { type: string; checkpoint: TrainedCheckpoint }) => {
            if (msg.type === "result") {
              resolve(msg.checkpoint);
            }
          },
        );
        child.on("error", reject);
        child.on("exit", (code) => {
          if (code !== 0)
            reject(
              new Error(
                `Child process for ${difficulty.id} exited with code ${code}`,
              ),
            );
        });
      });
    }),
  );

  // Write checkpoint assets and manifests
  const manifests: DQNCheckpointManifest[] = [];
  for (const checkpoint of results) {
    const filename = `arena-${checkpoint.difficulty}.json`;
    const asset: DQNCheckpointAsset = {
      weights: checkpoint.weights,
      config: checkpoint.config,
      telemetry: checkpoint.telemetry,
    };
    writeFileSync(path.join(payloadDir, filename), JSON.stringify(asset));
    manifests.push({
      difficulty: checkpoint.difficulty,
      label: checkpoint.label,
      summary: checkpoint.summary,
      snapshotInterval: checkpoint.snapshotInterval,
      trainingRounds: checkpoint.trainingRounds,
      parameterCount: checkpoint.parameterCount,
      stats: checkpoint.stats,
      telemetry: checkpoint.telemetry,
      assetPath: `/adaptive-arena-checkpoints/${filename}`,
    });
  }

  const difficultyOrder = BOT_DIFFICULTIES.map((d) => d.id);
  manifests.sort(
    (a, b) =>
      difficultyOrder.indexOf(a.difficulty) -
      difficultyOrder.indexOf(b.difficulty),
  );

  const outDir = path.resolve(
    process.cwd(),
    "src/app/nerdy-stuff/adaptive-arena",
  );
  mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, "checkpoints.generated.ts");
  const output = `/* eslint-disable */\nimport type { DQNCheckpointManifest } from "./game"\n\nexport const ADAPTIVE_ARENA_CHECKPOINTS: DQNCheckpointManifest[] = ${JSON.stringify(manifests, null, 2)}\n`;
  writeFileSync(outFile, output);

  console.log(`\nWrote ${manifests.length} checkpoint manifests to ${outFile}`);
  const totalSize = manifests.reduce((sum, m) => {
    const assetPath = path.join(payloadDir, `arena-${m.difficulty}.json`);
    try {
      return sum + statSync(assetPath).size;
    } catch {
      return sum;
    }
  }, 0);
  console.log(
    `Total checkpoint asset size: ${(totalSize / 1024).toFixed(0)} KB`,
  );
}

if (!childDifficulty) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
