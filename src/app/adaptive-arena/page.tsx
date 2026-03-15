"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BOT_ACCENT,
  BOT_CONFIG,
  BOT_DIFFICULTIES,
  TICK_MS,
  advanceMatch,
  buildArenaMap,
  createArenaNavigator,
  createInitialMatch,
  createPlayerModel,
  getDifficultyConfig,
  type AbilityAction,
  type ArenaAction,
  type BotBrain,
  type BotDifficulty,
  type DQNCheckpointAsset,
  type DQNCheckpointManifest,
  type MatchState,
  type MoveAction,
} from "./game";
import { createDQNAgent, deserializeDQNWeights } from "./dqn";
import { ADAPTIVE_ARENA_CHECKPOINTS } from "./checkpoints.generated";
import { drawArena } from "./rendering";
import {
  ABILITY_BUTTONS,
  ARENA_LEGEND,
  CONTROL_BUTTONS,
  FullscreenCornersIcon,
  StatBlock,
  getKeycapClass,
} from "./presentation";

type ControlState = {
  move: MoveAction | null;
  ability: AbilityAction | null;
  abilityTicksLeft: number;
};

const ABILITY_BUFFER_TICKS = 3;

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

export default function AdaptiveArenaPage() {
  const arena = useMemo(() => buildArenaMap(), []);
  const navigator = useMemo(() => createArenaNavigator(arena), [arena]);
  const arenaPanelRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controlsRef = useRef<ControlState>({
    move: null,
    ability: null,
    abilityTicksLeft: 0,
  });
  const pressedMovesRef = useRef<MoveAction[]>([]);
  const brainRef = useRef<BotBrain>({
    kind: "dqn",
    agent: createDQNAgent({
      layerSizes: [68, 128, 64, 8],
      learningRate: 3e-4,
      gamma: 0.97,
      batchSize: 64,
      replayCapacity: 50_000,
      targetUpdateFreq: 500,
      epsilon: 0.1,
      epsilonDecay: 1,
      epsilonMin: 0.05,
      weightDecay: 0,
    }),
  });
  const playerModelRef = useRef(createPlayerModel());
  const checkpointCacheRef = useRef<Map<string, DQNCheckpointAsset>>(new Map());

  const [selectedDifficulty, setSelectedDifficulty] =
    useState<BotDifficulty>("medium");
  const [autoRunRounds, setAutoRunRounds] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [, setCanvasSize] = useState(0);
  const [checkpointManifest, setCheckpointManifest] =
    useState<DQNCheckpointManifest | null>(null);
  const [checkpointLoading, setCheckpointLoading] = useState(true);
  const [checkpointError, setCheckpointError] = useState<string | null>(null);
  const [match, setMatch] = useState<MatchState>(() =>
    createInitialMatch(createPlayerModel()),
  );

  const runtimeConfig = useMemo(
    () => getDifficultyConfig(BOT_CONFIG, selectedDifficulty),
    [selectedDifficulty],
  );
  const checkpointKey = selectedDifficulty;

  const resetSession = useCallback(() => {
    const cached = checkpointCacheRef.current.get(checkpointKey);
    if (cached) {
      const agent = createDQNAgent({
        layerSizes: cached.config.layerSizes,
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
      agent.policy = deserializeDQNWeights(cached.weights);
      agent.target = deserializeDQNWeights(cached.weights);
      brainRef.current = { kind: "dqn", agent };
    }
    playerModelRef.current = createPlayerModel();
    const brain = brainRef.current;
    const paramCount = brain.agent.config.layerSizes.reduce(
      (acc, _, i, a) =>
        i < a.length - 1 ? acc + a[i] * a[i + 1] + a[i + 1] : acc,
      0,
    );
    setMatch({
      ...createInitialMatch(playerModelRef.current),
      qStateCount: paramCount,
      explorationRate: runtimeConfig.epsilon,
      statusMessage: checkpointManifest
        ? `Loaded ${checkpointManifest.label} checkpoint.`
        : "Checkpoint ready.",
    });
    controlsRef.current = { move: null, ability: null, abilityTicksLeft: 0 };
    pressedMovesRef.current = [];
    setIsRunning(false);
  }, [checkpointKey, checkpointManifest, runtimeConfig.epsilon]);

  useEffect(() => {
    let cancelled = false;

    const loadCheckpoint = async () => {
      setCheckpointLoading(true);
      setCheckpointError(null);

      const manifest =
        ADAPTIVE_ARENA_CHECKPOINTS.find(
          (entry) => entry.difficulty === selectedDifficulty,
        ) ?? null;

      if (!manifest) {
        if (!cancelled) {
          setCheckpointManifest(null);
          setCheckpointError(
            "Missing checkpoint manifest for the selected seed.",
          );
          setCheckpointLoading(false);
        }
        return;
      }

      try {
        const cached = checkpointCacheRef.current.get(checkpointKey);
        let asset: DQNCheckpointAsset;

        if (cached) {
          asset = cached;
        } else {
          asset = await fetch(manifest.assetPath).then(async (response) => {
            if (!response.ok) {
              throw new Error(
                `Failed to load checkpoint asset: ${response.status}`,
              );
            }

            return (await response.json()) as DQNCheckpointAsset;
          });
          checkpointCacheRef.current.set(checkpointKey, asset);
        }

        if (cancelled) return;

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
        brainRef.current = { kind: "dqn", agent };

        setCheckpointManifest(manifest);
        playerModelRef.current = createPlayerModel();
        setMatch({
          ...createInitialMatch(playerModelRef.current),
          qStateCount: manifest.parameterCount,
          explorationRate: runtimeConfig.epsilon,
          statusMessage: `Loaded ${manifest.label} checkpoint.`,
        });
        controlsRef.current = {
          move: null,
          ability: null,
          abilityTicksLeft: 0,
        };
        pressedMovesRef.current = [];
        setIsRunning(false);
      } catch (error) {
        if (cancelled) return;
        setCheckpointManifest(manifest);
        setCheckpointError(
          error instanceof Error ? error.message : "Failed to load checkpoint.",
        );
      } finally {
        if (!cancelled) {
          setCheckpointLoading(false);
        }
      }
    };

    void loadCheckpoint();

    return () => {
      cancelled = true;
    };
  }, [checkpointKey, runtimeConfig.epsilon, selectedDifficulty]);

  useEffect(() => {
    if (!isRunning) return;

    const interval = window.setInterval(() => {
      setMatch((current) => {
        const controls = controlsRef.current;
        const ability = controls.ability;
        const moveIntent = controls.move;
        const playerAction: ArenaAction = ability ?? moveIntent ?? "hold";
        if (ability) {
          controls.abilityTicksLeft -= 1;
          if (controls.abilityTicksLeft <= 0) {
            controls.ability = null;
            controls.abilityTicksLeft = 0;
          }
        }

        const nextMatch = advanceMatch({
          match: current,
          arena,
          navigator,
          config: runtimeConfig,
          onlineLearning: false,
          brain: brainRef.current,
          playerModel: playerModelRef.current,
          playerAction,
          playerMoveIntent: moveIntent,
        });

        if (
          current.phase === "live" &&
          nextMatch.phase === "intermission" &&
          !autoRunRounds
        ) {
          window.setTimeout(() => setIsRunning(false), 0);
        }

        return nextMatch;
      });
    }, TICK_MS);

    return () => window.clearInterval(interval);
  }, [arena, autoRunRounds, isRunning, navigator, runtimeConfig]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawArena(canvas, arena, match, BOT_ACCENT);
  }, [arena, match]);

  // Re-draw at native resolution when canvas container resizes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setCanvasSize(entry.contentRect.width);
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === arenaPanelRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const setActiveMove = useCallback((action: MoveAction, active: boolean) => {
    const current = pressedMovesRef.current;

    if (active) {
      if (!current.includes(action)) {
        pressedMovesRef.current = [...current, action];
      }
    } else {
      pressedMovesRef.current = current.filter((entry) => entry !== action);
    }

    const nextMove = pressedMovesRef.current.at(-1) ?? null;
    controlsRef.current.move = nextMove;
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === " ") {
        event.preventDefault();
        if (event.repeat) return;
        setIsRunning((current) => !current);
        return;
      }

      const move = MOVE_KEYS[event.key] ?? MOVE_KEYS[event.key.toLowerCase()];
      if (move) {
        event.preventDefault();
        setActiveMove(move, true);
        return;
      }

      const ability =
        ABILITY_KEYS[event.key] ?? ABILITY_KEYS[event.key.toLowerCase()];
      if (ability) {
        event.preventDefault();
        controlsRef.current.ability = ability;
        controlsRef.current.abilityTicksLeft = ABILITY_BUFFER_TICKS;
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

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [setActiveMove]);

  const toggleFullscreen = useCallback(async () => {
    const panel = arenaPanelRef.current;
    if (!panel) return;

    if (document.fullscreenElement === panel) {
      await document.exitFullscreen();
      return;
    }

    await panel.requestFullscreen();
  }, []);

  const primaryActionLabel =
    match.phase === "intermission"
      ? autoRunRounds
        ? "Continue"
        : "Start Next Round"
      : "Start Match";
  const arenaMaxWidth = isFullscreen
    ? "min(calc(100vw - 2rem), calc(100vh - 2rem))"
    : "min(100%, calc(100vh - 12rem), 1080px)";

  return (
    <div className="min-h-screen py-6 text-neutral-900 dark:text-neutral-100 sm:py-8">
      <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(103,232,249,0.12),transparent_28%),radial-gradient(circle_at_top_right,rgba(249,115,22,0.14),transparent_26%),linear-gradient(135deg,#05070a_0%,#0a1118_48%,#070b10_100%)] p-5 sm:p-8">
          <div
            className="pointer-events-none absolute inset-0 opacity-25"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
              maskImage:
                "linear-gradient(to bottom, rgba(0,0,0,1), rgba(0,0,0,0.15))",
            }}
          />

          <div className="relative flex flex-col gap-5">
            <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-neutral-400">
                  Reinforcement Learning / 30x30 Tactical Arena
                </div>
                <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:gap-4">
                  <h1 className="text-4xl font-semibold tracking-[0.02em] text-neutral-50">
                    RL-Arena
                  </h1>
                  <p className="max-w-xl text-sm leading-6 text-neutral-400">
                    Fight checkpoint-trained bots across four difficulty levels
                    in a tight tactical arena.
                  </p>
                </div>
              </div>
            </header>

            <section className="space-y-4">
              <div
                ref={arenaPanelRef}
                className={`overflow-hidden ${isFullscreen ? "h-screen bg-[#05070a]" : "rounded-[28px] border border-white/10 bg-[#04080d]/80 shadow-[0_24px_90px_rgba(0,0,0,0.45)]"}`}
              >
                <div
                  className={`${isFullscreen ? "block" : "grid xl:grid-cols-[minmax(0,1fr)_360px]"}`}
                >
                  <div
                    className={`relative ${isFullscreen ? "p-2" : "border-b border-white/10 p-4 sm:p-5 xl:border-b-0 xl:border-r xl:border-white/10"}`}
                  >
                    {isFullscreen && (
                      <div className="absolute left-3 top-3 z-10 flex w-32 flex-col gap-2 sm:left-6 sm:top-6 sm:w-40">
                        <button
                          type="button"
                          onClick={() => setIsRunning((current) => !current)}
                          className="rounded-full border border-white/10 bg-[#02060b]/80 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-neutral-100 backdrop-blur transition hover:bg-[#0a1118] sm:px-4 sm:text-[11px] sm:tracking-[0.22em]"
                        >
                          {isRunning ? "Pause" : primaryActionLabel}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setAutoRunRounds((current) => !current)
                          }
                          className={`rounded-full border px-3 py-2 text-[10px] uppercase tracking-[0.18em] backdrop-blur transition sm:px-4 sm:text-[11px] sm:tracking-[0.22em] ${
                            autoRunRounds
                              ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
                              : "border-white/10 bg-[#02060b]/80 text-neutral-200 hover:bg-[#0a1118]"
                          }`}
                        >
                          {autoRunRounds ? "Auto-run On" : "Auto-run Off"}
                        </button>
                        <button
                          type="button"
                          onClick={resetSession}
                          className="rounded-full border border-white/10 bg-[#02060b]/80 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-neutral-200 backdrop-blur transition hover:bg-[#0a1118] sm:px-4 sm:text-[11px] sm:tracking-[0.22em]"
                        >
                          Reset
                        </button>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => void toggleFullscreen()}
                      className="absolute right-3 top-3 z-10 inline-flex items-center justify-center rounded-full border border-white/10 bg-[#02060b]/80 p-2 text-neutral-200 backdrop-blur transition hover:bg-[#0a1118] sm:right-6 sm:top-6"
                      aria-label={
                        isFullscreen ? "Exit fullscreen" : "Go fullscreen"
                      }
                      title={isFullscreen ? "Exit fullscreen" : "Go fullscreen"}
                    >
                      <FullscreenCornersIcon />
                    </button>
                    <div
                      className={`${isFullscreen ? "flex h-[calc(100vh-2rem)] items-center justify-center" : ""}`}
                    >
                      <div
                        className="mx-auto w-full"
                        style={{ maxWidth: arenaMaxWidth }}
                      >
                        <canvas
                          ref={canvasRef}
                          className={`aspect-square w-full bg-[#020407] ${isFullscreen ? "" : "rounded-[22px] border border-white/10"}`}
                        />
                      </div>
                    </div>
                  </div>

                  {!isFullscreen && (
                    <aside className="flex flex-col gap-3 bg-black/10 p-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setIsRunning((current) => !current)}
                          disabled={
                            checkpointLoading || Boolean(checkpointError)
                          }
                          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-neutral-100 transition hover:bg-white/10"
                        >
                          {isRunning ? "Pause" : primaryActionLabel}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setAutoRunRounds((current) => !current)
                          }
                          className={`rounded-full border px-4 py-2 text-[11px] uppercase tracking-[0.22em] transition ${
                            autoRunRounds
                              ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
                              : "border-white/10 bg-white/5 text-neutral-200 hover:bg-white/10"
                          }`}
                        >
                          {autoRunRounds ? "Auto-run On" : "Auto-run Off"}
                        </button>
                        <button
                          type="button"
                          onClick={resetSession}
                          disabled={checkpointLoading}
                          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-neutral-200 transition hover:bg-white/10"
                        >
                          Reset
                        </button>
                      </div>

                      <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                        <div className="mb-2 text-[10px] uppercase tracking-[0.24em] text-neutral-500">
                          Difficulty
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {BOT_DIFFICULTIES.map((difficulty) => {
                            const active = difficulty.id === selectedDifficulty;
                            return (
                              <button
                                key={difficulty.id}
                                type="button"
                                onClick={() =>
                                  setSelectedDifficulty(difficulty.id)
                                }
                                className={`rounded-full border px-3 py-2 text-[11px] uppercase tracking-[0.18em] transition ${
                                  active
                                    ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
                                    : "border-white/8 bg-black/20 text-neutral-300 hover:border-white/16 hover:bg-white/[0.05]"
                                }`}
                                title={difficulty.summary}
                              >
                                {difficulty.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                        <div className="mb-2 text-[10px] uppercase tracking-[0.24em] text-neutral-500">
                          Legend
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {ARENA_LEGEND.map((item) => (
                            <div key={item.label} className="group relative">
                              <div className="flex items-center gap-2 rounded-full border border-white/8 bg-black/20 px-3 py-2 text-[11px] text-neutral-300">
                                <span
                                  className={`h-2.5 w-2.5 rounded-full ${item.swatch}`}
                                />
                                <span className="font-medium text-neutral-100">
                                  {item.label}
                                </span>
                              </div>
                              <div className="pointer-events-none absolute right-0 top-full z-20 mt-2 w-56 rounded-2xl border border-white/10 bg-[#02060b]/95 px-3 py-2 text-xs leading-5 text-neutral-300 opacity-0 shadow-[0_12px_32px_rgba(0,0,0,0.45)] transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                                {item.detail}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <div className="mb-3 text-[10px] uppercase tracking-[0.24em] text-neutral-500">
                          Controls
                        </div>
                        <div className="grid gap-4">
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div />
                            {CONTROL_BUTTONS.slice(0, 1).map((button) => (
                              <div
                                key={button.action}
                                className={`rounded-2xl border px-4 py-3 ${getKeycapClass()}`}
                              >
                                <div className="text-sm font-semibold">
                                  {button.label}
                                </div>
                              </div>
                            ))}
                            <div />
                            {CONTROL_BUTTONS.slice(2, 3).map((button) => (
                              <div
                                key={button.action}
                                className={`rounded-2xl border px-4 py-3 ${getKeycapClass()}`}
                              >
                                <div className="text-sm font-semibold">
                                  {button.label}
                                </div>
                              </div>
                            ))}
                            {CONTROL_BUTTONS.slice(1, 2).map((button) => (
                              <div
                                key={button.action}
                                className={`rounded-2xl border px-4 py-3 ${getKeycapClass()}`}
                              >
                                <div className="text-sm font-semibold">
                                  {button.label}
                                </div>
                              </div>
                            ))}
                            {CONTROL_BUTTONS.slice(3, 4).map((button) => (
                              <div
                                key={button.action}
                                className={`rounded-2xl border px-4 py-3 ${getKeycapClass()}`}
                              >
                                <div className="text-sm font-semibold">
                                  {button.label}
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            {ABILITY_BUTTONS.map((button) => (
                              <div
                                key={button.action}
                                className={`rounded-2xl border px-4 py-3 ${getKeycapClass()}`}
                              >
                                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-neutral-100">
                                  {button.label}
                                </div>
                                <div className="mt-1 text-[10px] uppercase tracking-[0.22em] text-neutral-500">
                                  {button.hint}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                    </aside>
                  )}
                </div>
              </div>

              <div className="grid gap-4">
                <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <h2 className="text-sm uppercase tracking-[0.24em] text-neutral-500">
                        Round Ledger
                      </h2>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-neutral-300">
                        Round {match.round.toString().padStart(2, "0")}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={resetSession}
                      disabled={checkpointLoading}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] uppercase tracking-[0.22em] text-neutral-200 transition hover:bg-white/10"
                    >
                      Reset Session
                    </button>
                  </div>
                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-neutral-200">
                    <div className="break-words leading-6">
                      {match.statusMessage}
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <StatBlock
                      label="You"
                      value={match.scoreboard.player.toString()}
                      tone="#67e8f9"
                    />
                    <StatBlock
                      label="Bot"
                      value={match.scoreboard.bot.toString()}
                      tone={BOT_ACCENT}
                    />
                    <StatBlock
                      label="Draw"
                      value={match.scoreboard.draw.toString()}
                    />
                  </div>
                  <div className="mt-4 space-y-2">
                    {match.roundHistory.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-neutral-400">
                        No finished rounds yet. The first few rounds are where
                        exploration is most visible.
                      </div>
                    ) : (
                      match.roundHistory.map((entry) => (
                        <div
                          key={entry.round}
                          className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-sm text-neutral-300"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">
                              Round {entry.round}
                            </span>
                            <span
                              className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.18em] ${
                                entry.outcome === "player"
                                  ? "bg-cyan-400/10 text-cyan-200"
                                  : entry.outcome === "bot"
                                    ? "text-white"
                                    : "bg-white/10 text-neutral-300"
                              }`}
                              style={
                                entry.outcome === "bot"
                                  ? {
                                      backgroundColor: `${BOT_ACCENT}1f`,
                                      color: BOT_ACCENT,
                                    }
                                  : undefined
                              }
                            >
                              {entry.outcome}
                            </span>
                          </div>
                          <div className="mt-2 text-xs text-neutral-400">
                            you {entry.playerHealth} hp / bot {entry.botHealth}{" "}
                            hp
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
