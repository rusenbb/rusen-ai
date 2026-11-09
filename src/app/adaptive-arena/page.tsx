"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button, Chip, DemoHeader, DemoPage, Details, Segmented, Stat } from "@/components/ui";

import { ArenaControls } from "./ArenaControls";
import { ADAPTIVE_ARENA_CHECKPOINTS } from "./checkpoints.generated";
import { chooseAction, createDQNAgent, deserializeDQNWeights, forward } from "./dqn";
import {
  ACTIONS,
  BOT_CONFIG,
  BOT_DIFFICULTIES,
  MAX_HEALTH,
  ROUND_TICKS,
  TICK_MS,
  advanceMatch,
  buildArenaMap,
  createArenaNavigator,
  createInitialMatch,
  createPlayerModel,
  encodeState,
  encodeStateAsPlayer,
  getDifficultyConfig,
  type AbilityAction,
  type ArenaAction,
  type BotBrain,
  type BotDifficulty,
  type DQNCheckpointAsset,
  type MatchState,
  type MoveAction,
} from "./game";
import { ACTION_NAMES, FullscreenCornersIcon } from "./presentation";
import { drawArena, type ArenaLabels } from "./rendering";

type ControlState = {
  move: MoveAction | null;
  ability: AbilityAction | null;
  abilityTicksLeft: number;
};

/** "demo": both sides are driven by the checkpoint until the visitor starts. "play": the visitor controls the left fighter. */
type Mode = "demo" | "play";

const ABILITY_BUFFER_TICKS = 3;
const LABEL = "font-mono text-[0.7rem] uppercase tracking-[0.08em] text-[var(--sub)]";
const PLAY_LABELS: ArenaLabels = { player: "You", bot: "Bot" };
const DEMO_LABELS: ArenaLabels = { player: "Bot A", bot: "Bot B" };
/** The attract demo uses a stronger checkpoint: Medium against itself mostly ends in draws. */
const DEMO_DIFFICULTY: BotDifficulty = "hard";

const MOVE_KEYS: Record<string, MoveAction> = {
  ArrowUp: "move-up",
  ArrowDown: "move-down",
  ArrowLeft: "move-left",
  ArrowRight: "move-right",
  w: "move-up",
  s: "move-down",
  a: "move-left",
  d: "move-right",
};

const ABILITY_KEYS: Record<string, AbilityAction> = {
  j: "attack",
  k: "guard",
  l: "dash",
};

const OUTCOME_WORDS = { player: "won", bot: "lost", draw: "drew" } as const;

const TRAINING_RANGE = (() => {
  const rounds = ADAPTIVE_ARENA_CHECKPOINTS.map((entry) => entry.trainingRounds);
  return `${Math.min(...rounds).toLocaleString("en-US")} to ${Math.max(...rounds).toLocaleString("en-US")}`;
})();

function createCheckpointBrain(asset: DQNCheckpointAsset): BotBrain {
  const agent = createDQNAgent({
    layerSizes: asset.config.layerSizes,
    learningRate: 3e-4,
    gamma: 0.97,
    batchSize: 64,
    replayCapacity: 50_000,
    targetUpdateFreq: 500,
    epsilon: 0.1,
    epsilonDecay: 1,
    epsilonMin: 0.05,
    weightDecay: 0,
  });
  agent.policy = deserializeDQNWeights(asset.weights);
  agent.target = deserializeDQNWeights(asset.weights);
  return { kind: "dqn", agent };
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

function HealthBar({ label, health, color, align }: { label: string; health: number; color: string; align: "left" | "right" }) {
  return (
    <div className={`min-w-0 flex-1 ${align === "right" ? "text-right" : ""}`}>
      <div className={`${LABEL} tabular-nums`}>
        {label} {health}
      </div>
      <div className={`mt-1 flex h-1.5 bg-[var(--line)] ${align === "right" ? "justify-end" : ""}`}>
        <div style={{ width: `${(health / MAX_HEALTH) * 100}%`, background: color }} />
      </div>
    </div>
  );
}

export default function AdaptiveArenaPage() {
  const arena = useMemo(() => buildArenaMap(), []);
  const navigator = useMemo(() => createArenaNavigator(arena), [arena]);
  const reducedMotion = usePrefersReducedMotion();
  const arenaPanelRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controlsRef = useRef<ControlState>({ move: null, ability: null, abilityTicksLeft: 0 });
  const pressedMovesRef = useRef<MoveAction[]>([]);
  const brainRef = useRef<BotBrain | null>(null);
  const playerModelRef = useRef(createPlayerModel());
  const checkpointCacheRef = useRef<Map<BotDifficulty, DQNCheckpointAsset>>(new Map());

  const [difficulty, setDifficulty] = useState<BotDifficulty>("medium");
  const [mode, setMode] = useState<Mode>("demo");
  const [playRunning, setPlayRunning] = useState(false);
  const [autoNextRound, setAutoNextRound] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [redraw, setRedraw] = useState(0);
  const [checkpointLoading, setCheckpointLoading] = useState(true);
  const [checkpointError, setCheckpointError] = useState<string | null>(null);
  const [match, setMatch] = useState<MatchState>(() => createInitialMatch(createPlayerModel()));
  const startAfterLoadRef = useRef(false);

  const activeDifficulty = mode === "demo" ? DEMO_DIFFICULTY : difficulty;
  const manifest = ADAPTIVE_ARENA_CHECKPOINTS.find((entry) => entry.difficulty === activeDifficulty) ?? null;
  const runtimeConfig = useMemo(() => getDifficultyConfig(BOT_CONFIG, activeDifficulty), [activeDifficulty]);
  const ready = !checkpointLoading && !checkpointError;
  const isRunning = ready && (mode === "demo" ? !reducedMotion : playRunning);
  const labels = mode === "demo" ? DEMO_LABELS : PLAY_LABELS;

  const clearControls = useCallback(() => {
    pressedMovesRef.current = [];
    controlsRef.current = { move: null, ability: null, abilityTicksLeft: 0 };
  }, []);

  const freshMatch = useCallback(() => {
    playerModelRef.current = createPlayerModel();
    clearControls();
    setMatch(createInitialMatch(playerModelRef.current));
  }, [clearControls]);

  /** Leaves the demo (or restarts) and hands the left fighter to the visitor. */
  const startPlaying = useCallback(() => {
    if (!ready) return;
    if (mode === "demo") {
      setMode("play");
      freshMatch();
      // Leaving the demo may swap the checkpoint; start once the visitor's one is loaded.
      startAfterLoadRef.current = difficulty !== DEMO_DIFFICULTY;
    }
    setPlayRunning(true);
  }, [difficulty, freshMatch, mode, ready]);

  const resetSession = useCallback(() => {
    setPlayRunning(false);
    setMode("play");
    freshMatch();
  }, [freshMatch]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setCheckpointLoading(true);
      setCheckpointError(null);
      setPlayRunning(false);
      if (!manifest) {
        setCheckpointError("Missing checkpoint for this difficulty.");
        setCheckpointLoading(false);
        return;
      }
      try {
        let asset = checkpointCacheRef.current.get(activeDifficulty);
        if (!asset) {
          const response = await fetch(manifest.assetPath);
          if (!response.ok) throw new Error(`The checkpoint did not load (HTTP ${response.status}).`);
          asset = (await response.json()) as DQNCheckpointAsset;
          checkpointCacheRef.current.set(activeDifficulty, asset);
        }
        if (cancelled) return;
        brainRef.current = createCheckpointBrain(asset);
        freshMatch();
        if (startAfterLoadRef.current) {
          startAfterLoadRef.current = false;
          setPlayRunning(true);
        }
      } catch (error) {
        if (!cancelled) setCheckpointError(error instanceof Error ? error.message : "The checkpoint did not load.");
      } finally {
        if (!cancelled) setCheckpointLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [activeDifficulty, freshMatch, manifest]);

  // Game loop. In the demo the left fighter uses the same checkpoint from its own side, as in self-play training.
  useEffect(() => {
    if (!isRunning) return;
    const interval = window.setInterval(() => {
      const brain = brainRef.current;
      if (!brain) return;
      setMatch((current) => {
        let playerAction: ArenaAction;
        let moveIntent: MoveAction | null = null;
        if (mode === "demo") {
          const state = encodeStateAsPlayer(current, arena, "balanced", navigator);
          playerAction = ACTIONS[chooseAction(brain.agent.policy, state, runtimeConfig.epsilon).actionIndex];
        } else {
          const controls = controlsRef.current;
          const ability = controls.ability;
          moveIntent = controls.move;
          playerAction = ability ?? moveIntent ?? "hold";
          if (ability) {
            controls.abilityTicksLeft -= 1;
            if (controls.abilityTicksLeft <= 0) {
              controls.ability = null;
              controls.abilityTicksLeft = 0;
            }
          }
        }
        const next = advanceMatch({
          match: current,
          arena,
          navigator,
          config: runtimeConfig,
          onlineLearning: false,
          brain,
          playerModel: playerModelRef.current,
          playerAction,
          playerMoveIntent: moveIntent,
        });
        if (mode === "play" && !autoNextRound && current.phase === "live" && next.phase === "intermission") {
          window.setTimeout(() => setPlayRunning(false), 0);
        }
        return next;
      });
    }, TICK_MS);
    return () => window.clearInterval(interval);
  }, [arena, autoNextRound, isRunning, mode, navigator, runtimeConfig]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) drawArena(canvas, arena, match, labels);
  }, [arena, match, labels, redraw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const bump = () => setRedraw((value) => value + 1);
    const observer = new ResizeObserver(bump);
    observer.observe(canvas);
    window.addEventListener("rusen-theme-change", bump);
    return () => {
      observer.disconnect();
      window.removeEventListener("rusen-theme-change", bump);
    };
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === arenaPanelRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const setActiveMove = useCallback((action: MoveAction, active: boolean) => {
    const current = pressedMovesRef.current;
    if (active) {
      if (!current.includes(action)) pressedMovesRef.current = [...current, action];
    } else {
      pressedMovesRef.current = current.filter((entry) => entry !== action);
    }
    controlsRef.current.move = pressedMovesRef.current.at(-1) ?? null;
  }, []);

  const triggerAbility = useCallback((ability: AbilityAction) => {
    controlsRef.current.ability = ability;
    controlsRef.current.abilityTicksLeft = ABILITY_BUFFER_TICKS;
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (!ready || event.metaKey || event.ctrlKey || event.altKey) return;
      const move = MOVE_KEYS[event.key] ?? MOVE_KEYS[event.key.toLowerCase()];
      const ability = ABILITY_KEYS[event.key] ?? ABILITY_KEYS[event.key.toLowerCase()];

      if (event.key === " ") {
        if (target?.closest("button, summary")) return;
        event.preventDefault();
        if (event.repeat) return;
        if (mode === "demo" || !playRunning) startPlaying();
        else setPlayRunning(false);
        return;
      }
      // Any printable key, arrow or Enter starts a match from the demo.
      if (mode === "demo") {
        if (target?.closest("button, a, summary")) return;
        if (event.key.length !== 1 && !event.key.startsWith("Arrow") && event.key !== "Enter") return;
        event.preventDefault();
        startPlaying();
        if (move) setActiveMove(move, true);
        return;
      }
      if (!playRunning) return;
      if (move) {
        event.preventDefault();
        setActiveMove(move, true);
      } else if (ability) {
        event.preventDefault();
        triggerAbility(ability);
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      const move = MOVE_KEYS[event.key] ?? MOVE_KEYS[event.key.toLowerCase()];
      if (move) {
        event.preventDefault();
        setActiveMove(move, false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", clearControls);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", clearControls);
      clearControls();
    };
  }, [clearControls, mode, playRunning, ready, setActiveMove, startPlaying, triggerAbility]);

  const toggleFullscreen = useCallback(async () => {
    const panel = arenaPanelRef.current;
    if (!panel) return;
    if (document.fullscreenElement === panel) await document.exitFullscreen();
    else await panel.requestFullscreen();
  }, []);

  // The bot's view of this exact position: one network score per action, the highest is what it will pick
  // unless it explores at random.
  const scores = useMemo(() => {
    const brain = brainRef.current;
    if (!brain || checkpointLoading) return null;
    const values = Array.from(forward(brain.agent.policy, encodeState(match, arena, match.predictedHabit, navigator)));
    const min = Math.min(...values);
    const span = Math.max(...values) - min || 1;
    const best = values.indexOf(Math.max(...values));
    return { values: values.map((value) => (value - min) / span), best };
  }, [arena, checkpointLoading, match, navigator]);

  const notStarted = match.phase === "live" && match.timer === ROUND_TICKS && match.round === 1;
  const primaryLabel =
    mode === "demo" || notStarted ? "Start Match" : playRunning ? "Pause" : match.phase === "intermission" ? "Next round" : "Resume";
  const onPrimary = () => (mode === "play" && playRunning ? setPlayRunning(false) : startPlaying());
  const controlsDisabled = mode !== "play" || !playRunning || !ready;

  let overlay: { title: string; hint: string } | null = null;
  if (checkpointError) overlay = { title: "The bot did not load", hint: checkpointError };
  else if (checkpointLoading) overlay = { title: "Loading the bot", hint: `${manifest?.label ?? ""} checkpoint` };
  else if (mode === "demo") overlay = { title: "Press any key or tap to play", hint: reducedMotion ? "" : "Two copies of the Hard bot are playing each other" };
  else if (!playRunning && match.phase === "live")
    overlay = notStarted ? { title: "Press any key or tap to play", hint: "" } : { title: "Paused", hint: "Press Space to resume" };

  const primaryButtons = (className = "") => (
    <div className={`flex-wrap gap-2 ${className}`}>
      <Button size="sm" variant="primary" onClick={onPrimary} disabled={!ready}>
        {primaryLabel}
      </Button>
      <Button size="sm" variant="ghost" onClick={resetSession} disabled={!ready}>
        Reset
      </Button>
    </div>
  );

  return (
    <DemoPage>
      <DemoHeader
        className="sm:mb-6"
        eyebrow="Reinforcement learning"
        title="RL-Arena"
        description="Beat a bot trained by reinforcement learning. Move with WASD or the arrows, attack with J, guard with K, dash with L."
      />

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div
          ref={arenaPanelRef}
          className={isFullscreen ? "flex h-screen flex-col justify-center gap-2 overflow-auto bg-[var(--background)] p-3" : "min-w-0"}
        >
          <div className="mx-auto w-full" style={{ maxWidth: isFullscreen ? "min(100%, calc(100svh - 13rem))" : "min(100%, max(18rem, calc(100svh - 21rem)))" }}>
            <div className="mb-2 flex items-end gap-4">
              <HealthBar label={labels.player} health={match.player.health} color="var(--accent)" align="left" />
              <div className={`${LABEL} shrink-0 tabular-nums`}>
                Round {match.round} · {match.timer.toString().padStart(3, "0")}
              </div>
              <HealthBar label={labels.bot} health={match.bot.health} color="var(--accent-2)" align="right" />
            </div>
            <div className="relative">
              <canvas
                ref={canvasRef}
                role="img"
                aria-label={`Arena. You: (${match.player.position.x}, ${match.player.position.y}), health ${match.player.health}. Bot: (${match.bot.position.x}, ${match.bot.position.y}), health ${match.bot.health}.`}
                className="block aspect-square w-full border border-[var(--line)]"
                onPointerDown={() => {
                  if (mode === "demo" || (!playRunning && match.phase === "live")) startPlaying();
                }}
              />
              {overlay ? (
                <button
                  type="button"
                  tabIndex={-1}
                  aria-hidden
                  onClick={startPlaying}
                  className={`absolute inset-x-0 flex cursor-pointer flex-col items-center justify-center gap-1 px-4 text-center ${
                    mode === "demo" ? "bottom-0 border-t border-[var(--line)] bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] py-4" : "inset-y-0 bg-[color-mix(in_srgb,var(--surface)_70%,transparent)]"
                  }`}
                >
                  <span className="text-lg font-semibold sm:text-2xl">{overlay.title}</span>
                  {overlay.hint ? <span className="text-sm text-[var(--muted)]">{overlay.hint}</span> : null}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void toggleFullscreen()}
                className="absolute right-2 top-2 border border-[var(--line)] bg-[var(--surface)] p-1.5 text-[var(--muted)] hover:text-[var(--foreground)]"
                aria-label={isFullscreen ? "Exit fullscreen" : "Go fullscreen"}
                title={isFullscreen ? "Exit fullscreen" : "Go fullscreen"}
              >
                <FullscreenCornersIcon />
              </button>
            </div>
            <div className={`mt-2 flex flex-wrap gap-x-5 gap-y-1 ${LABEL}`}>
              <span>+ health · ◆ energy</span>
              <span className="inline-flex items-center gap-1.5">
                <i className="size-2.5" style={{ background: "color-mix(in srgb, var(--accent) 16%, var(--surface))", outline: "1px solid var(--line)" }} />
                cover, less damage
              </span>
              <span className="inline-flex items-center gap-1.5">
                <i className="size-2.5" style={{ background: "color-mix(in srgb, var(--accent-2) 22%, var(--surface))", outline: "1px solid var(--line)" }} />
                hazard, burns health
              </span>
            </div>
          </div>

          <div className={`mx-auto mt-4 w-full max-w-md ${isFullscreen ? "" : "lg:hidden"}`}>
            {primaryButtons("mb-3 flex")}
            <ArenaControls compact disabled={controlsDisabled} onMove={setActiveMove} onAbility={triggerAbility} />
          </div>
        </div>

        <aside className="space-y-6">
          <Segmented
            label="Difficulty"
            options={BOT_DIFFICULTIES.map((entry) => ({ value: entry.id, label: entry.label }))}
            value={difficulty}
            onChange={(next) => {
              setDifficulty(next);
              if (mode === "play") setPlayRunning(false);
            }}
          />

          <div aria-live="off">
            <Stat
              size="lg"
              label={mode === "demo" ? "Bot B's top choice" : "Bot's top choice"}
              value={scores ? ACTION_NAMES[ACTIONS[scores.best]] : "--"}
              note={
                match.lastDecisionMode === "explore"
                  ? `Last step it tried a random move: ${ACTION_NAMES[match.botIntent]}.`
                  : "Its network scores every move for this position."
              }
            />
            {scores ? (
              <ol className="mt-3 space-y-1" aria-label="Bot's score for each move">
                {ACTIONS.map((action, index) => (
                  <li key={action} className="grid grid-cols-[4rem_minmax(0,1fr)] items-center gap-2">
                    <span className={LABEL}>{ACTION_NAMES[action]}</span>
                    <span className="h-2 bg-[var(--line)]">
                      <span
                        className="block h-full"
                        style={{
                          width: `${Math.max(2, scores.values[index] * 100)}%`,
                          background: index === scores.best ? "var(--accent-2)" : "var(--sub)",
                          opacity: index === scores.best ? 1 : 0.45,
                        }}
                      />
                    </span>
                  </li>
                ))}
              </ol>
            ) : null}
          </div>

          <div className="space-y-3">
            {isFullscreen ? null : primaryButtons("hidden lg:flex")}
            <Chip selected={autoNextRound} onClick={() => setAutoNextRound((value) => !value)}>
              Next round starts by itself
            </Chip>
          </div>

          {mode === "play" ? (
            <div>
              <div className="grid grid-cols-3 gap-3">
                <Stat label="You" value={match.scoreboard.player} />
                <Stat label="Bot" value={match.scoreboard.bot} />
                <Stat label="Draw" value={match.scoreboard.draw} />
              </div>
              {match.roundHistory.length ? (
                <ol className="mt-3 text-sm text-[var(--muted)]">
                  {match.roundHistory.slice(0, 3).map((entry) => (
                    <li key={entry.round} className="border-t border-[var(--line)] py-1.5">
                      Round {entry.round}: you {OUTCOME_WORDS[entry.outcome]}, {entry.playerHealth} hp to {entry.botHealth}
                    </li>
                  ))}
                </ol>
              ) : null}
            </div>
          ) : null}
        </aside>
      </div>

      <Details summary="About the bots" className="mt-10">
        <p>
          Each difficulty is a separate DQN checkpoint ({manifest?.parameterCount.toLocaleString("en-US") ?? "--"} weights) trained by
          self-play for {TRAINING_RANGE} rounds. The bots do not learn while you play. You win a round by knocking the bot out or by
          having more health when the timer ends.
        </p>
        {manifest ? (
          <dl className="mt-3 grid gap-x-4 gap-y-1 sm:grid-cols-[12rem_minmax(0,1fr)]">
            <dt className={LABEL}>{manifest.label} evaluation</dt>
            <dd>
              {manifest.stats.botWins} wins, {manifest.stats.playerWins} losses and {manifest.stats.draws} draws in {manifest.stats.rounds} rounds
              against an opponent pool of other bots, not against people
            </dd>
            <dt className={LABEL}>Training revision</dt>
            <dd className="break-all font-mono">{manifest.provenance?.trainerCommit ?? "Not recorded for this checkpoint"}</dd>
            <dt className={LABEL}>Environment version</dt>
            <dd>{manifest.provenance?.environmentVersion ?? "Not recorded for this checkpoint"}</dd>
            {manifest.provenance?.evaluation ? (
              <>
                <dt className={LABEL}>Evaluation conditions</dt>
                <dd>{manifest.provenance.evaluation}</dd>
              </>
            ) : null}
          </dl>
        ) : null}
        <p className="mt-3 text-xs">
          Parity checks compare 25 controlled transitions between the training and browser code on a matched 100-tick clock. Training rounds
          last 100 ticks; rounds here last {ROUND_TICKS}.
        </p>
      </Details>
    </DemoPage>
  );
}
