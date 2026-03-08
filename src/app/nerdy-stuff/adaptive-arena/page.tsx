"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ACTION_LABELS,
  ARENA_SIZE,
  BOT_DIFFICULTIES,
  BOT_PROFILES,
  MAX_HEALTH,
  PLAYER_CATEGORY_LABELS,
  TICK_MS,
  advanceMatch,
  buildArenaMap,
  createInitialMatch,
  createPlayerModel,
  deserializeQTable,
  getDifficultyProfile,
  type AbilityAction,
  type ArenaAction,
  type BotCheckpointAsset,
  type ArenaTile,
  type BotCheckpointManifest,
  type BotDifficulty,
  type BotProfileId,
  type MatchState,
  type MoveAction,
  type PlayerCategory,
  type SerializedQTableEntry,
  type TrainingMetricPoint,
  type QTable,
} from "./game"
import { ADAPTIVE_ARENA_CHECKPOINTS } from "./checkpoints.generated"

type ControlState = {
  move: MoveAction | null
  ability: AbilityAction | null
}

const MOVE_KEYS: Record<string, MoveAction> = {
  ArrowUp: "move-up",
  ArrowDown: "move-down",
  ArrowLeft: "move-left",
  ArrowRight: "move-right",
  w: "move-up",
  s: "move-down",
  a: "move-left",
  d: "move-right",
}

const ABILITY_KEYS: Record<string, AbilityAction> = {
  j: "attack",
  k: "guard",
  l: "dash",
}

const CONTROL_BUTTONS: Array<{ label: string; action: MoveAction; hint: string }> = [
  { label: "N", action: "move-up", hint: "W / ↑" },
  { label: "S", action: "move-down", hint: "S / ↓" },
  { label: "W", action: "move-left", hint: "A / ←" },
  { label: "E", action: "move-right", hint: "D / →" },
]

const ABILITY_BUTTONS: Array<{ label: string; action: AbilityAction; hint: string }> = [
  { label: "Attack", action: "attack", hint: "J" },
  { label: "Guard", action: "guard", hint: "K" },
  { label: "Dash", action: "dash", hint: "L" },
]

const ARENA_LEGEND = [
  { label: "You", detail: "Your cyan unit. Stay alive longer than the bot to win the round.", swatch: "bg-cyan-300" },
  { label: "Bot", detail: "The opponent. Its behavior changes based on the selected seed and live adaptation.", swatch: "bg-orange-400" },
  { label: "Health", detail: "Orange pickup. Restores health when you step onto it.", swatch: "bg-orange-500" },
  { label: "Energy", detail: "Green pickup. Refills dash energy so you can reposition harder.", swatch: "bg-lime-400" },
  { label: "Cover", detail: "Teal cover tile. Breaks line of sight and reduces direct pressure.", swatch: "bg-sky-900" },
  { label: "Hazard", detail: "The center cross. Standing on it burns health over time.", swatch: "bg-amber-900" },
] as const

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`
}

function getTileColor(tile: ArenaTile): string {
  switch (tile) {
    case "wall":
      return "#24303c"
    case "cover":
      return "#193748"
    case "hazard":
      return "#512212"
    default:
      return "#091119"
  }
}

function getKeycapClass(): string {
  return "border-white/10 bg-white/[0.04] text-neutral-200"
}

function drawArena(
  canvas: HTMLCanvasElement,
  arena: ArenaTile[][],
  match: MatchState,
  profileAccent: string
) {
  const context = canvas.getContext("2d")
  if (!context) return

  const size = 900
  canvas.width = size
  canvas.height = size

  const tileSize = size / ARENA_SIZE
  context.clearRect(0, 0, size, size)

  const background = context.createLinearGradient(0, 0, size, size)
  background.addColorStop(0, "#040608")
  background.addColorStop(1, "#09121a")
  context.fillStyle = background
  context.fillRect(0, 0, size, size)

  for (let y = 0; y < ARENA_SIZE; y += 1) {
    for (let x = 0; x < ARENA_SIZE; x += 1) {
      const px = x * tileSize
      const py = y * tileSize
      context.fillStyle = getTileColor(arena[y][x])
      context.fillRect(px, py, tileSize, tileSize)

      context.strokeStyle = "rgba(255,255,255,0.04)"
      context.lineWidth = 1
      context.strokeRect(px, py, tileSize, tileSize)
    }
  }

  match.pickups.forEach((pickup) => {
    if (pickup.cooldown > 0) return
    const px = pickup.position.x * tileSize
    const py = pickup.position.y * tileSize
    context.fillStyle = pickup.kind === "health" ? "#f97316" : "#a3e635"
    context.fillRect(px + tileSize * 0.2, py + tileSize * 0.2, tileSize * 0.6, tileSize * 0.6)
    context.strokeStyle = "rgba(255,255,255,0.7)"
    context.lineWidth = 1.5
    context.strokeRect(px + tileSize * 0.2, py + tileSize * 0.2, tileSize * 0.6, tileSize * 0.6)
  })

  if (Math.abs(match.player.position.x - match.bot.position.x) + Math.abs(match.player.position.y - match.bot.position.y) <= 5) {
    context.strokeStyle = "rgba(255,255,255,0.12)"
    context.setLineDash([8, 8])
    context.beginPath()
    context.moveTo((match.player.position.x + 0.5) * tileSize, (match.player.position.y + 0.5) * tileSize)
    context.lineTo((match.bot.position.x + 0.5) * tileSize, (match.bot.position.y + 0.5) * tileSize)
    context.stroke()
    context.setLineDash([])
  }

  const fighters = [
    { ...match.player, color: "#67e8f9", label: "You" },
    { ...match.bot, color: profileAccent, label: "Bot" },
  ]

  fighters.forEach((fighter) => {
    const centerX = (fighter.position.x + 0.5) * tileSize
    const centerY = (fighter.position.y + 0.5) * tileSize
    const radius = tileSize * 0.28

    context.beginPath()
    context.fillStyle = fighter.color
    context.shadowColor = fighter.color
    context.shadowBlur = fighter.flashTicks > 0 ? 24 : 14
    context.arc(centerX, centerY, radius, 0, Math.PI * 2)
    context.fill()
    context.shadowBlur = 0

    if (fighter.guarding) {
      context.beginPath()
      context.strokeStyle = "rgba(255,255,255,0.9)"
      context.lineWidth = 2
      context.arc(centerX, centerY, radius + 4, 0, Math.PI * 2)
      context.stroke()
    }

    context.fillStyle = "rgba(0,0,0,0.85)"
    context.fillRect(centerX - 18, centerY - radius - 16, 36, 14)
    context.fillStyle = "#f8fafc"
    context.font = "10px monospace"
    context.textAlign = "center"
    context.fillText(fighter.label, centerX, centerY - radius - 5)
  })

  context.fillStyle = "rgba(3,7,12,0.88)"
  context.fillRect(size / 2 - 74, 4, 148, 28)
  context.strokeStyle = "rgba(255,255,255,0.14)"
  context.strokeRect(size / 2 - 74, 4, 148, 28)

  context.fillStyle = "#e5e7eb"
  context.font = "12px monospace"
  context.textAlign = "center"
  context.fillText(`TIMER ${match.timer.toString().padStart(3, "0")}`, size / 2, 23)

  const hudY = 16
  const barWidth = 190
  const barHeight = 12
  const hudMargin = 44

  context.textAlign = "left"
  context.fillStyle = "#67e8f9"
  context.font = "11px monospace"
  context.fillText("YOU", hudMargin, hudY)
  context.fillStyle = "rgba(255,255,255,0.12)"
  context.fillRect(hudMargin, hudY + 10, barWidth, barHeight)
  context.fillStyle = "#67e8f9"
  context.fillRect(hudMargin, hudY + 10, barWidth * (match.player.health / MAX_HEALTH), barHeight)
  context.fillStyle = "#e5e7eb"
  context.fillText(`${match.player.health}/${MAX_HEALTH}`, hudMargin, hudY + 38)

  context.textAlign = "right"
  context.fillStyle = profileAccent
  context.fillText("BOT", size - hudMargin, hudY)
  context.fillStyle = "rgba(255,255,255,0.12)"
  context.fillRect(size - hudMargin - barWidth, hudY + 10, barWidth, barHeight)
  context.fillStyle = profileAccent
  context.fillRect(size - hudMargin - barWidth, hudY + 10, barWidth * (match.bot.health / MAX_HEALTH), barHeight)
  context.fillStyle = "#e5e7eb"
  context.fillText(`${match.bot.health}/${MAX_HEALTH}`, size - hudMargin, hudY + 38)
  context.fillStyle = "rgba(229,231,235,0.75)"
  context.font = "10px monospace"
  context.fillText(`${match.lastDecisionMode.toUpperCase()} / ${ACTION_LABELS[match.botIntent]}`, size - hudMargin, hudY + 56)

  if (match.phase === "intermission") {
    context.fillStyle = "rgba(1,4,9,0.72)"
    context.fillRect(0, 0, size, size)
    context.fillStyle = "#f8fafc"
    context.font = "700 32px monospace"
    context.textAlign = "center"
    context.fillText(match.statusMessage, size / 2, size / 2 - 18)
    context.font = "14px monospace"
    context.fillText(`next spawn in ${match.intermissionTicks}`, size / 2, size / 2 + 20)
  }
}

function StatBlock({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.24em] text-neutral-500">{label}</div>
      <div className="mt-2 text-xl font-semibold text-neutral-100" style={tone ? { color: tone } : undefined}>
        {value}
      </div>
    </div>
  )
}

function formatSigned(value: number, digits = 2): string {
  const rounded = value.toFixed(digits)
  return value > 0 ? `+${rounded}` : rounded
}

function TrainingMetricChart(props: {
  label: string
  color: string
  points: TrainingMetricPoint[]
  valueKey: "averageReward" | "averageBotWinRate" | "averageHealthDelta"
  formatValue: (value: number) => string
}) {
  const { label, color, points, valueKey, formatValue } = props

  if (points.length === 0) return null

  const width = 220
  const height = 64
  const padding = 6
  const values = points.map((point) => point[valueKey])
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const path = points
    .map((point, index) => {
      const x = padding + (index / Math.max(1, points.length - 1)) * (width - padding * 2)
      const y = height - padding - ((point[valueKey] - min) / range) * (height - padding * 2)
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(" ")
  const latest = values.at(-1) ?? 0
  const first = values[0] ?? 0

  return (
    <div className="rounded-2xl border border-white/8 bg-black/20 p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">{label}</span>
        <span className="text-sm font-medium" style={{ color }}>
          {formatValue(latest)}
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-2 h-16 w-full overflow-visible">
        <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="mt-1 flex items-center justify-between text-[11px] text-neutral-500">
        <span>start {formatValue(first)}</span>
        <span>end {formatValue(latest)}</span>
      </div>
    </div>
  )
}

function FullscreenCornersIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path
        d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function AdaptiveArenaPage() {
  const arena = useMemo(() => buildArenaMap(), [])
  const arenaPanelRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const controlsRef = useRef<ControlState>({ move: null, ability: null })
  const pressedMovesRef = useRef<MoveAction[]>([])
  const qTableRef = useRef<QTable>(new Map())
  const playerModelRef = useRef(createPlayerModel())
  const checkpointEntriesRef = useRef<SerializedQTableEntry[]>([])
  const checkpointCacheRef = useRef<Map<string, BotCheckpointAsset>>(new Map())

  const [selectedProfileId, setSelectedProfileId] = useState<BotProfileId>("duelist")
  const [selectedDifficulty, setSelectedDifficulty] = useState<BotDifficulty>("medium")
  const [onlineLearning, setOnlineLearning] = useState(true)
  const [autoRunRounds, setAutoRunRounds] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [checkpointManifest, setCheckpointManifest] = useState<BotCheckpointManifest | null>(null)
  const [checkpointLoading, setCheckpointLoading] = useState(true)
  const [checkpointError, setCheckpointError] = useState<string | null>(null)
  const [match, setMatch] = useState<MatchState>(() => createInitialMatch(createPlayerModel()))

  const profile = useMemo(
    () => BOT_PROFILES.find((entry) => entry.id === selectedProfileId) ?? BOT_PROFILES[0],
    [selectedProfileId]
  )
  const runtimeProfile = useMemo(
    () => getDifficultyProfile(profile, selectedDifficulty),
    [profile, selectedDifficulty]
  )
  const checkpointKey = `${selectedProfileId}:${selectedDifficulty}`

  const resetSession = useCallback(() => {
    qTableRef.current = deserializeQTable(checkpointEntriesRef.current)
    playerModelRef.current = createPlayerModel()
    setMatch({
      ...createInitialMatch(playerModelRef.current),
      qStateCount: qTableRef.current.size,
      explorationRate: runtimeProfile.epsilon,
      statusMessage: checkpointManifest
        ? `Loaded ${checkpointManifest.label} checkpoint.`
        : "Checkpoint ready.",
    })
    controlsRef.current = { move: null, ability: null }
    pressedMovesRef.current = []
    setIsRunning(false)
  }, [checkpointManifest, runtimeProfile.epsilon])

  useEffect(() => {
    let cancelled = false

    const loadCheckpoint = async () => {
      setCheckpointLoading(true)
      setCheckpointError(null)

      const manifest =
        ADAPTIVE_ARENA_CHECKPOINTS.find(
          (entry) => entry.profileId === selectedProfileId && entry.difficulty === selectedDifficulty
        ) ?? null

      if (!manifest) {
        if (!cancelled) {
          setCheckpointManifest(null)
          setCheckpointError("Missing checkpoint manifest for the selected seed.")
          setCheckpointLoading(false)
        }
        return
      }

      try {
        const cached = checkpointCacheRef.current.get(checkpointKey)
        let asset: BotCheckpointAsset

        if (cached) {
          asset = cached
        } else {
          asset = await fetch(manifest.assetPath).then(async (response) => {
            if (!response.ok) {
              throw new Error(`Failed to load checkpoint asset: ${response.status}`)
            }

            return (await response.json()) as BotCheckpointAsset
          })
          checkpointCacheRef.current.set(checkpointKey, asset)
        }

        if (cancelled) return

        checkpointEntriesRef.current = asset.qTable
        setCheckpointManifest(manifest)
        qTableRef.current = deserializeQTable(asset.qTable)
        playerModelRef.current = createPlayerModel()
        setMatch({
          ...createInitialMatch(playerModelRef.current),
          qStateCount: qTableRef.current.size,
          explorationRate: runtimeProfile.epsilon,
          statusMessage: `Loaded ${manifest.label} checkpoint.`,
        })
        controlsRef.current = { move: null, ability: null }
        pressedMovesRef.current = []
        setIsRunning(false)
      } catch (error) {
        if (cancelled) return
        setCheckpointManifest(manifest)
        setCheckpointError(error instanceof Error ? error.message : "Failed to load checkpoint.")
      } finally {
        if (!cancelled) {
          setCheckpointLoading(false)
        }
      }
    }

    void loadCheckpoint()

    return () => {
      cancelled = true
    }
  }, [checkpointKey, runtimeProfile.epsilon, selectedDifficulty, selectedProfileId])

  useEffect(() => {
    if (!isRunning) return

    const interval = window.setInterval(() => {
      setMatch((current) => {
        const ability = controlsRef.current.ability
        const moveIntent = controlsRef.current.move
        const playerAction: ArenaAction = ability ?? moveIntent ?? "hold"
        controlsRef.current.ability = null

        const nextMatch = advanceMatch({
          match: current,
          arena,
          profile: runtimeProfile,
          onlineLearning,
          qTable: qTableRef.current,
          playerModel: playerModelRef.current,
          playerAction,
          playerMoveIntent: moveIntent,
        })

        if (nextMatch.phase === "intermission" && !autoRunRounds) {
          window.setTimeout(() => setIsRunning(false), 0)
        }

        return nextMatch
      })
    }, TICK_MS)

    return () => window.clearInterval(interval)
  }, [arena, autoRunRounds, isRunning, onlineLearning, runtimeProfile])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    drawArena(canvas, arena, match, profile.accent)
  }, [arena, match, profile.accent])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === arenaPanelRef.current)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [])

  const setActiveMove = useCallback((action: MoveAction, active: boolean) => {
    const current = pressedMovesRef.current

    if (active) {
      if (!current.includes(action)) {
        pressedMovesRef.current = [...current, action]
      }
    } else {
      pressedMovesRef.current = current.filter((entry) => entry !== action)
    }

    const nextMove = pressedMovesRef.current.at(-1) ?? null
    controlsRef.current.move = nextMove
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === " ") {
        event.preventDefault()
        setIsRunning((current) => !current)
        return
      }

      const move = MOVE_KEYS[event.key] ?? MOVE_KEYS[event.key.toLowerCase()]
      if (move) {
        event.preventDefault()
        setActiveMove(move, true)
        return
      }

      const ability = ABILITY_KEYS[event.key] ?? ABILITY_KEYS[event.key.toLowerCase()]
      if (ability) {
        event.preventDefault()
        controlsRef.current.ability = ability
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      const move = MOVE_KEYS[event.key] ?? MOVE_KEYS[event.key.toLowerCase()]
      if (move) {
        event.preventDefault()
        setActiveMove(move, false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [setActiveMove])

  const toggleFullscreen = useCallback(async () => {
    const panel = arenaPanelRef.current
    if (!panel) return

    if (document.fullscreenElement === panel) {
      await document.exitFullscreen()
      return
    }

    await panel.requestFullscreen()
  }, [])

  const dominantHabits = (Object.entries(match.playerHabits.percentages) as Array<[PlayerCategory, number]>)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
  const primaryActionLabel =
    match.phase === "intermission"
      ? autoRunRounds
        ? "Continue"
        : "Start Next Round"
      : "Start Match"
  const arenaMaxWidth = isFullscreen ? "min(calc(100vw - 4rem), calc(100vh - 8rem))" : "min(100%, calc(100vh - 12rem), 1080px)"

  return (
    <div className="min-h-screen bg-[#05070a] text-neutral-100">
      <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(103,232,249,0.12),transparent_28%),radial-gradient(circle_at_top_right,rgba(249,115,22,0.14),transparent_26%),linear-gradient(135deg,#05070a_0%,#0a1118_48%,#070b10_100%)] p-5 sm:p-8">
          <div
            className="pointer-events-none absolute inset-0 opacity-25"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
              maskImage: "linear-gradient(to bottom, rgba(0,0,0,1), rgba(0,0,0,0.15))",
            }}
          />

          <div className="relative flex flex-col gap-5">
            <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-neutral-400">
                  Reinforcement Learning / 30x30 Tactical Arena
                </div>
                <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:gap-4">
                  <h1 className="text-4xl font-semibold tracking-[0.02em] text-neutral-50">Adaptive Arena</h1>
                  <p className="max-w-xl text-sm leading-6 text-neutral-400">
                    Fight, vary your habits, and see whether the bot actually learns you.
                  </p>
                </div>
              </div>
            </header>

            <section className="space-y-4">
              <div
                ref={arenaPanelRef}
                className={`overflow-hidden rounded-[28px] border border-white/10 bg-[#04080d]/80 shadow-[0_24px_90px_rgba(0,0,0,0.45)] ${isFullscreen ? "h-full bg-[#05070a]" : ""}`}
              >
                <div className={`${isFullscreen ? "block" : "grid xl:grid-cols-[minmax(0,1fr)_360px]"}`}>
                  <div className={`relative border-b border-white/10 xl:border-b-0 xl:border-r xl:border-white/10 ${isFullscreen ? "p-4" : "p-4 sm:p-5"}`}>
                    {isFullscreen && (
                      <div className="absolute left-6 top-6 z-10 flex w-40 flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => setIsRunning((current) => !current)}
                          className="rounded-full border border-white/10 bg-[#02060b]/80 px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-neutral-100 backdrop-blur transition hover:bg-[#0a1118]"
                        >
                          {isRunning ? "Pause" : primaryActionLabel}
                        </button>
                        <button
                          type="button"
                          onClick={() => setAutoRunRounds((current) => !current)}
                          className={`rounded-full border px-4 py-2 text-[11px] uppercase tracking-[0.22em] backdrop-blur transition ${
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
                          className="rounded-full border border-white/10 bg-[#02060b]/80 px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-neutral-200 backdrop-blur transition hover:bg-[#0a1118]"
                        >
                          Reset
                        </button>
                        <button
                          type="button"
                          onClick={() => setOnlineLearning((current) => !current)}
                          className={`rounded-full border px-3 py-2 text-[11px] uppercase tracking-[0.18em] backdrop-blur transition ${
                            onlineLearning
                              ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
                              : "border-white/10 bg-[#02060b]/80 text-neutral-200 hover:bg-[#0a1118]"
                          }`}
                        >
                          {onlineLearning ? "Adaptive On" : "Adaptive Off"}
                        </button>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => void toggleFullscreen()}
                      className="absolute right-6 top-6 z-10 inline-flex items-center justify-center rounded-full border border-white/10 bg-[#02060b]/80 p-2 text-neutral-200 backdrop-blur transition hover:bg-[#0a1118]"
                      aria-label={isFullscreen ? "Exit fullscreen" : "Go fullscreen"}
                      title={isFullscreen ? "Exit fullscreen" : "Go fullscreen"}
                    >
                      <FullscreenCornersIcon />
                    </button>
                    <div className={`${isFullscreen ? "flex h-[calc(100vh-8rem)] items-center justify-center" : ""}`}>
                      <div className="mx-auto w-full" style={{ maxWidth: arenaMaxWidth }}>
                        <canvas
                          ref={canvasRef}
                          className="aspect-square w-full rounded-[22px] border border-white/10 bg-[#020407]"
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
                          disabled={checkpointLoading || Boolean(checkpointError)}
                          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-neutral-100 transition hover:bg-white/10"
                        >
                          {isRunning ? "Pause" : primaryActionLabel}
                        </button>
                        <button
                          type="button"
                          onClick={() => setAutoRunRounds((current) => !current)}
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
                        <button
                          type="button"
                          onClick={() => setOnlineLearning((current) => !current)}
                          className={`rounded-full border px-3 py-2 text-[11px] uppercase tracking-[0.18em] transition ${
                            onlineLearning
                              ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
                              : "border-white/10 bg-white/5 text-neutral-200 hover:bg-white/10"
                          }`}
                        >
                          {onlineLearning ? "Adaptive On" : "Adaptive Off"}
                        </button>
                      </div>

                      <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                        <div className="mb-2 text-[10px] uppercase tracking-[0.24em] text-neutral-500">Bot Seeds</div>
                        <div className="mb-3 flex flex-wrap gap-2">
                          {BOT_DIFFICULTIES.map((difficulty) => {
                            const active = difficulty.id === selectedDifficulty
                            return (
                              <button
                                key={difficulty.id}
                                type="button"
                                onClick={() => setSelectedDifficulty(difficulty.id)}
                                className={`rounded-full border px-3 py-2 text-[11px] uppercase tracking-[0.18em] transition ${
                                  active
                                    ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
                                    : "border-white/8 bg-black/20 text-neutral-300 hover:border-white/16 hover:bg-white/[0.05]"
                                }`}
                                title={difficulty.summary}
                              >
                                {difficulty.label}
                              </button>
                            )
                          })}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {BOT_PROFILES.map((entry) => {
                            const active = entry.id === selectedProfileId
                            return (
                              <div key={entry.id} className="group relative">
                                <button
                                  type="button"
                                  onClick={() => setSelectedProfileId(entry.id)}
                                  className={`rounded-full border px-3 py-2 text-[11px] uppercase tracking-[0.18em] transition ${
                                    active
                                      ? "bg-white/[0.1] text-neutral-100"
                                      : "border-white/8 bg-black/20 text-neutral-300 hover:border-white/16 hover:bg-white/[0.05]"
                                  }`}
                                  style={active ? { borderColor: `${entry.accent}66`, color: entry.accent } : undefined}
                                >
                                  {entry.name.replace(" Seed", "")}
                                </button>
                                <div className="pointer-events-none absolute right-0 top-full z-20 mt-2 w-64 rounded-2xl border border-white/10 bg-[#02060b]/95 px-3 py-2 text-xs leading-5 text-neutral-300 opacity-0 shadow-[0_12px_32px_rgba(0,0,0,0.45)] transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                                  {entry.label}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                        <div className="mb-2 text-[10px] uppercase tracking-[0.24em] text-neutral-500">Legend</div>
                        <div className="flex flex-wrap gap-2">
                          {ARENA_LEGEND.map((item) => (
                            <div key={item.label} className="group relative">
                              <div className="flex items-center gap-2 rounded-full border border-white/8 bg-black/20 px-3 py-2 text-[11px] text-neutral-300">
                                <span className={`h-2.5 w-2.5 rounded-full ${item.swatch}`} />
                                <span className="font-medium text-neutral-100">{item.label}</span>
                              </div>
                              <div className="pointer-events-none absolute right-0 top-full z-20 mt-2 w-56 rounded-2xl border border-white/10 bg-[#02060b]/95 px-3 py-2 text-xs leading-5 text-neutral-300 opacity-0 shadow-[0_12px_32px_rgba(0,0,0,0.45)] transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                                {item.detail}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <div className="mb-3 text-[10px] uppercase tracking-[0.24em] text-neutral-500">Controls</div>
                        <div className="grid gap-4">
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div />
                            {CONTROL_BUTTONS.slice(0, 1).map((button) => (
                              <div
                                key={button.action}
                                className={`rounded-2xl border px-4 py-3 ${getKeycapClass()}`}
                              >
                                <div className="text-lg font-semibold">{button.label}</div>
                                <div className="mt-1 text-[10px] uppercase tracking-[0.22em] text-neutral-500">{button.hint}</div>
                              </div>
                            ))}
                            <div />
                            {CONTROL_BUTTONS.slice(2, 3).map((button) => (
                              <div
                                key={button.action}
                                className={`rounded-2xl border px-4 py-3 ${getKeycapClass()}`}
                              >
                                <div className="text-lg font-semibold">{button.label}</div>
                                <div className="mt-1 text-[10px] uppercase tracking-[0.22em] text-neutral-500">{button.hint}</div>
                              </div>
                            ))}
                            {CONTROL_BUTTONS.slice(1, 2).map((button) => (
                              <div
                                key={button.action}
                                className={`rounded-2xl border px-4 py-3 ${getKeycapClass()}`}
                              >
                                <div className="text-lg font-semibold">{button.label}</div>
                                <div className="mt-1 text-[10px] uppercase tracking-[0.22em] text-neutral-500">{button.hint}</div>
                              </div>
                            ))}
                            {CONTROL_BUTTONS.slice(3, 4).map((button) => (
                              <div
                                key={button.action}
                                className={`rounded-2xl border px-4 py-3 ${getKeycapClass()}`}
                              >
                                <div className="text-lg font-semibold">{button.label}</div>
                                <div className="mt-1 text-[10px] uppercase tracking-[0.22em] text-neutral-500">{button.hint}</div>
                              </div>
                            ))}
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            {ABILITY_BUTTONS.map((button) => (
                              <div
                                key={button.action}
                                className={`rounded-2xl border px-4 py-3 ${getKeycapClass()}`}
                              >
                                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-neutral-100">{button.label}</div>
                                <div className="mt-1 text-[10px] uppercase tracking-[0.22em] text-neutral-500">{button.hint}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <div className="text-[10px] uppercase tracking-[0.24em] text-neutral-500">Bot Readout</div>
                        <div className="mt-2 text-lg font-semibold" style={{ color: profile.accent }}>
                          {checkpointManifest?.label ?? `${profile.name} ${selectedDifficulty}`}
                        </div>
                        <p className="mt-1 text-sm leading-6 text-neutral-400">
                          {checkpointLoading
                            ? "Loading checkpoint..."
                            : checkpointError
                              ? checkpointError
                              : checkpointManifest?.summary ?? profile.summary}
                        </p>
                        {checkpointManifest && !checkpointLoading && !checkpointError && (
                          <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-xs leading-5 text-neutral-400">
                            {checkpointManifest.trainingRounds} training rounds / {formatPercent(checkpointManifest.stats.botWinRate)} eval win rate
                          </div>
                        )}
                        {checkpointManifest?.telemetry.points.length ? (
                          <div className="mt-3 grid gap-3">
                            <TrainingMetricChart
                              label="Training Reward"
                              color={profile.accent}
                              points={checkpointManifest.telemetry.points}
                              valueKey="averageReward"
                              formatValue={(value) => formatSigned(value)}
                            />
                            <TrainingMetricChart
                              label="Training Win Rate"
                              color="#67e8f9"
                              points={checkpointManifest.telemetry.points}
                              valueKey="averageBotWinRate"
                              formatValue={formatPercent}
                            />
                          </div>
                        ) : null}
                        {checkpointManifest && !checkpointLoading && !checkpointError && (
                          <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-neutral-400">
                            <div className="rounded-2xl border border-white/8 bg-black/20 px-3 py-3">
                              reward window {checkpointManifest.telemetry.rollingWindow} rounds
                            </div>
                            <div className="rounded-2xl border border-white/8 bg-black/20 px-3 py-3">
                              states learned {checkpointManifest.qStateCount}
                            </div>
                          </div>
                        )}
                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <StatBlock label="Explore" value={formatPercent(match.explorationRate)} />
                          <StatBlock label="States" value={match.qStateCount.toString()} />
                          <StatBlock label="Intent" value={ACTION_LABELS[match.botIntent]} tone={profile.accent} />
                          <StatBlock label="Mode" value={match.lastDecisionMode.toUpperCase()} />
                        </div>
                      </div>
                    </aside>
                  )}
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-sm uppercase tracking-[0.24em] text-neutral-500">Tick Feed</h2>
                      <p className="mt-2 text-sm text-neutral-300">What just happened and what the learner thinks it is doing.</p>
                    </div>
                    <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-neutral-300">
                      {match.predictedHabit === "balanced" ? "Balanced read" : `${PLAYER_CATEGORY_LABELS[match.predictedHabit]} read`}
                    </div>
                  </div>
                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-neutral-200">
                    {match.statusMessage}
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {dominantHabits.map(([category, value]) => (
                      <div key={category} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                        <div className="flex items-center justify-between text-sm text-neutral-300">
                          <span>{PLAYER_CATEGORY_LABELS[category]}</span>
                          <span>{formatPercent(value)}</span>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-white/8">
                          <div
                            className="h-full rounded-full bg-[linear-gradient(90deg,#67e8f9_0%,#f8fafc_100%)]"
                            style={{ width: `${Math.max(6, value * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 grid gap-2">
                    {match.eventLog.map((event, index) => (
                      <div
                        key={`${event}-${index}`}
                        className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-neutral-300"
                      >
                        {event}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <h2 className="text-sm uppercase tracking-[0.24em] text-neutral-500">Round Ledger</h2>
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
                      Flush Memory
                    </button>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <StatBlock label="You" value={match.scoreboard.player.toString()} tone="#67e8f9" />
                    <StatBlock label="Bot" value={match.scoreboard.bot.toString()} tone={profile.accent} />
                    <StatBlock label="Draw" value={match.scoreboard.draw.toString()} />
                  </div>
                  <div className="mt-4 space-y-2">
                    {match.roundHistory.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-neutral-400">
                        No finished rounds yet. The first few rounds are where exploration is most visible.
                      </div>
                    ) : (
                      match.roundHistory.map((entry) => (
                        <div
                          key={entry.round}
                          className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-sm text-neutral-300"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">Round {entry.round}</span>
                            <span
                              className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.18em] ${
                                entry.outcome === "player"
                                  ? "bg-cyan-400/10 text-cyan-200"
                                  : entry.outcome === "bot"
                                    ? "text-white"
                                    : "bg-white/10 text-neutral-300"
                              }`}
                              style={entry.outcome === "bot" ? { backgroundColor: `${profile.accent}1f`, color: profile.accent } : undefined}
                            >
                              {entry.outcome}
                            </span>
                          </div>
                          <div className="mt-2 text-xs text-neutral-400">
                            you {entry.playerHealth} hp / bot {entry.botHealth} hp
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
  )
}
