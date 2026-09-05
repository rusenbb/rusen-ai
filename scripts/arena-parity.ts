import { dirname } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { ACTIONS, BOT_CONFIG, advanceMatch, buildArenaMap, createArenaNavigator, createInitialMatch, createPlayerModel, encodeState, type ArenaAction } from "../src/app/adaptive-arena/game.ts";
import { createDQNAgent } from "../src/app/adaptive-arena/dqn.ts";

const arena = buildArenaMap();
const navigator = createArenaNavigator(arena);
const situations = [
  { name: "spawn", bot: [26, 14], player: [3, 15], timer: 100 },
  { name: "adjacent", bot: [3, 14], player: [4, 14], timer: 100 },
  { name: "wall", bot: [1, 1], player: [4, 1], timer: 100 },
  { name: "hazard", bot: [14, 14], player: [15, 14], timer: 100 },
  { name: "timeout", bot: [26, 14], player: [3, 15], timer: 1 },
];
const pairs: [ArenaAction, ArenaAction][] = [["hold", "hold"], ["attack", "guard"], ["guard", "attack"], ["move-up", "move-left"], ["dash", "hold"]];
const originalRandom = Math.random;
// Force exploitation only; the constant output layer chooses the requested action.
Math.random = () => 0.99;
try {
  const cases = situations.flatMap((situation) => pairs.map(([botAction, playerAction]) => {
    const model = createPlayerModel();
    const match = createInitialMatch(model, 100);
    match.timer = situation.timer;
    match.bot.position = { x: situation.bot[0], y: situation.bot[1] };
    match.player.position = { x: situation.player[0], y: situation.player[1] };
    const agent = createDQNAgent({ layerSizes: [68, 8], learningRate: 0.001, gamma: 0.9, batchSize: 1, replayCapacity: 1, targetUpdateFreq: 1, epsilon: 0, epsilonDecay: 1, epsilonMin: 0, weightDecay: 0 });
    agent.policy.layers[0].weights.fill(0);
    agent.policy.layers[0].biases.fill(0);
    agent.policy.layers[0].biases[ACTIONS.indexOf(botAction)] = 1;
    const before = Array.from(encodeState(match, arena, "balanced", navigator));
    const next = advanceMatch({ match, arena, navigator, brain: { kind: "dqn", agent }, config: BOT_CONFIG, playerModel: model, playerAction, playerMoveIntent: null, onlineLearning: false, trackHeatmaps: false, maxRoundTicks: 100 });
    return { ...situation, botAction: ACTIONS.indexOf(botAction), playerAction: ACTIONS.indexOf(playerAction), before, after: Array.from(encodeState(next, arena, "balanced", navigator)), expected: { bot: [next.bot.position.x, next.bot.position.y, next.bot.health, next.bot.energy], player: [next.player.position.x, next.player.position.y, next.player.health, next.player.energy], reward: next.lastBotReward, timer: next.timer, done: next.phase === "intermission" } };
  }));
  const report = { arena: arena.map(row => row.map(tile => ["floor", "wall", "cover", "hazard"].indexOf(tile))), cases };
  const output = process.argv[2] ?? "output/arena-parity-input.json";
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify(report));
  console.log(`Prepared ${cases.length} browser-environment transitions.`);
} finally { Math.random = originalRandom; }
