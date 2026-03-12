"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type SceneId =
  | "groves"
  | "meadow"
  | "ring"
  | "lattice"
  | "bridge"
  | "spiral";
type StageLabel = "Scattered" | "Locking" | "Synchronized";

interface ScenePreset {
  id: SceneId;
  label: string;
  subtitle: string;
  count: number;
  coupling: number;
  radius: number;
  jitter: number;
  seed: number;
}

interface Firefly {
  x: number;
  y: number;
  phase: number;
  frequency: number;
  flash: number;
  refractory: number;
}

interface DisplayStats {
  sync: number;
  flashes: number;
  liveCoupling: number;
  stage: StageLabel;
}

const WORLD_W = 960;
const WORLD_H = 540;
const DEFAULT_CANVAS_WIDTH = 720;
const BASE_FREQUENCY = 0.72;
const REFRACTORY_SECONDS = 0.16;
const HOLD_SCATTER_SECONDS = 1.8;
const RAMP_SECONDS = 6.2;
const LOCK_HOLD_SECONDS = 2.2;
const FIELD_PADDING = 56;

const SCENES: ScenePreset[] = [
  {
    id: "groves",
    label: "Twin Groves",
    subtitle: "two clusters learning one shared beat",
    count: 72,
    coupling: 0.37,
    radius: 185,
    jitter: 0.05,
    seed: 17,
  },
  {
    id: "meadow",
    label: "Open Meadow",
    subtitle: "a loose field that still falls into time",
    count: 78,
    coupling: 0.39,
    radius: 210,
    jitter: 0.04,
    seed: 31,
  },
  {
    id: "ring",
    label: "Canopy Ring",
    subtitle: "a chorus closing around the field",
    count: 64,
    coupling: 0.35,
    radius: 190,
    jitter: 0.045,
    seed: 47,
  },
  {
    id: "lattice",
    label: "Loose Lattice",
    subtitle: "a perturbed grid with many even local neighborhoods",
    count: 81,
    coupling: 0.34,
    radius: 170,
    jitter: 0.04,
    seed: 59,
  },
  {
    id: "bridge",
    label: "Bridge",
    subtitle: "two crowds joined by a narrow synchrony corridor",
    count: 74,
    coupling: 0.41,
    radius: 185,
    jitter: 0.05,
    seed: 71,
  },
  {
    id: "spiral",
    label: "Spiral Arm",
    subtitle: "a curling path where rhythm has to travel around the turn",
    count: 68,
    coupling: 0.36,
    radius: 180,
    jitter: 0.045,
    seed: 83,
  },
];

function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeInOut(value: number): number {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function computeSync(fireflies: Firefly[]): number {
  let real = 0;
  let imaginary = 0;

  for (const firefly of fireflies) {
    const angle = firefly.phase * Math.PI * 2;
    real += Math.cos(angle);
    imaginary += Math.sin(angle);
  }

  return Math.sqrt(real * real + imaginary * imaginary) / fireflies.length;
}

function stageFrom(sync: number, liveCoupling: number): StageLabel {
  if (liveCoupling < 0.04) return "Scattered";
  if (sync < 0.84) return "Locking";
  return "Synchronized";
}

function cloneFireflies(fireflies: Firefly[]): Firefly[] {
  return fireflies.map((firefly) => ({ ...firefly }));
}

function createScene(preset: ScenePreset): Firefly[] {
  const rng = createRng(preset.seed);
  const fireflies: Firefly[] = [];

  for (let i = 0; i < preset.count; i++) {
    let x = 0;
    let y = 0;

    if (preset.id === "groves") {
      const leftCluster = i < preset.count / 2;
      const cx = leftCluster ? WORLD_W * 0.3 : WORLD_W * 0.7;
      const cy = leftCluster ? WORLD_H * 0.42 : WORLD_H * 0.58;
      x = cx + (rng() - 0.5) * 160;
      y = cy + (rng() - 0.5) * 150;
    } else if (preset.id === "ring") {
      const angle = (i / preset.count) * Math.PI * 2 + rng() * 0.2;
      const rx = WORLD_W * 0.28 + rng() * 18;
      const ry = WORLD_H * 0.24 + rng() * 18;
      x = WORLD_W * 0.5 + Math.cos(angle) * rx;
      y = WORLD_H * 0.5 + Math.sin(angle) * ry;
    } else if (preset.id === "lattice") {
      const cols = 9;
      const rows = 9;
      const col = i % cols;
      const row = Math.floor(i / cols);
      const usableW = WORLD_W - FIELD_PADDING * 2;
      const usableH = WORLD_H - FIELD_PADDING * 2;
      x =
        FIELD_PADDING +
        (col / (cols - 1)) * usableW +
        (rng() - 0.5) * 28;
      y =
        FIELD_PADDING +
        (row / (rows - 1)) * usableH +
        (rng() - 0.5) * 28;
    } else if (preset.id === "bridge") {
      const bridgeCount = 14;
      const leftCount = Math.floor((preset.count - bridgeCount) / 2);
      const rightCount = preset.count - bridgeCount - leftCount;

      if (i < leftCount) {
        x = WORLD_W * 0.26 + (rng() - 0.5) * 150;
        y = WORLD_H * 0.45 + (rng() - 0.5) * 170;
      } else if (i < leftCount + bridgeCount) {
        const t = (i - leftCount) / Math.max(1, bridgeCount - 1);
        x = lerp(WORLD_W * 0.36, WORLD_W * 0.64, t) + (rng() - 0.5) * 16;
        y = WORLD_H * 0.5 + (rng() - 0.5) * 36;
      } else if (i < leftCount + bridgeCount + rightCount) {
        x = WORLD_W * 0.74 + (rng() - 0.5) * 150;
        y = WORLD_H * 0.55 + (rng() - 0.5) * 170;
      }
    } else if (preset.id === "spiral") {
      const t = i / Math.max(1, preset.count - 1);
      const angle = t * Math.PI * 3.8 + rng() * 0.12;
      const radius = 36 + t * 185;
      x = WORLD_W * 0.5 + Math.cos(angle) * radius + (rng() - 0.5) * 12;
      y = WORLD_H * 0.5 + Math.sin(angle) * radius * 0.72 + (rng() - 0.5) * 12;
    } else {
      x = FIELD_PADDING + rng() * (WORLD_W - FIELD_PADDING * 2);
      y = FIELD_PADDING + rng() * (WORLD_H - FIELD_PADDING * 2);
    }

    fireflies.push({
      x,
      y,
      phase: rng(),
      frequency: BASE_FREQUENCY + (rng() - 0.5) * preset.jitter,
      flash: 0,
      refractory: 0,
    });
  }

  return fireflies;
}

function easeOut(value: number): number {
  return 1 - (1 - value) * (1 - value);
}

export default function FireflySynchronization(): React.ReactElement {
  const initialScene = SCENES[0];

  const [selectedScene, setSelectedScene] = useState<SceneId>(initialScene.id);
  const [coupling, setCoupling] = useState<number>(initialScene.coupling);
  const [radius, setRadius] = useState<number>(initialScene.radius);
  const [playing, setPlaying] = useState<boolean>(false);
  const [autoRestart, setAutoRestart] = useState<boolean>(true);
  const [canvasWidth, setCanvasWidth] = useState<number>(DEFAULT_CANVAS_WIDTH);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [stats, setStats] = useState<DisplayStats>({
    sync: 0,
    flashes: 0,
    liveCoupling: 0,
    stage: "Scattered",
  });

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const firefliesRef = useRef<Firefly[]>(createScene(initialScene));
  const sceneRef = useRef<SceneId>(initialScene.id);
  const couplingRef = useRef<number>(initialScene.coupling);
  const radiusRef = useRef<number>(initialScene.radius);
  const playingRef = useRef<boolean>(false);
  const autoRestartRef = useRef<boolean>(true);
  const animationRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const statsTimeRef = useRef<number>(0);
  const transitionTimeRef = useRef<number>(0);
  const lockedTimeRef = useRef<number>(0);
  const liveCouplingRef = useRef<number>(0);

  useEffect(() => {
    couplingRef.current = coupling;
  }, [coupling]);

  useEffect(() => {
    radiusRef.current = radius;
  }, [radius]);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    autoRestartRef.current = autoRestart;
  }, [autoRestart]);

  const beginTransition = useCallback((sceneId: SceneId) => {
    const preset = SCENES.find((scene) => scene.id === sceneId) ?? SCENES[0];
    firefliesRef.current = createScene(preset);
    sceneRef.current = preset.id;
    transitionTimeRef.current = 0;
    lockedTimeRef.current = 0;
    liveCouplingRef.current = 0;
    setStats({
      sync: computeSync(firefliesRef.current),
      flashes: 0,
      liveCoupling: 0,
      stage: "Scattered",
    });
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvasWidth;
    const height = Math.max(300, Math.round((width * WORLD_H) / WORLD_W));
    const dpr = window.devicePixelRatio || 1;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, "#030d0d");
    bg.addColorStop(0.55, "#071713");
    bg.addColorStop(1, "#03080b");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    const haze = ctx.createRadialGradient(
      width * 0.5,
      height * 0.42,
      0,
      width * 0.5,
      height * 0.42,
      width * 0.52
    );
    haze.addColorStop(0, "rgba(250, 204, 21, 0.09)");
    haze.addColorStop(0.48, "rgba(45, 212, 191, 0.05)");
    haze.addColorStop(1, "rgba(3, 8, 11, 0)");
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, width, height);

    const scaleX = width / WORLD_W;
    const scaleY = height / WORLD_H;
    const hoveredFirefly =
      hoveredIndex === null ? null : firefliesRef.current[hoveredIndex] ?? null;

    if (hoveredFirefly) {
      const px = hoveredFirefly.x * scaleX;
      const py = hoveredFirefly.y * scaleY;
      const radiusPx = radiusRef.current * ((scaleX + scaleY) * 0.5);

      ctx.strokeStyle = "rgba(94, 234, 212, 0.22)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 7]);
      ctx.beginPath();
      ctx.arc(px, py, radiusPx, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      const glow = ctx.createRadialGradient(px, py, 0, px, py, radiusPx);
      glow.addColorStop(0, "rgba(94, 234, 212, 0.08)");
      glow.addColorStop(1, "rgba(94, 234, 212, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(px, py, radiusPx, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const firefly of firefliesRef.current) {
      const px = firefly.x * scaleX;
      const py = firefly.y * scaleY;
      const flash = easeOut(clamp(firefly.flash, 0, 1));
      const radiusPx = 2.2 + flash * 7.2;

      if (flash > 0.01) {
        const glow = ctx.createRadialGradient(px, py, 0, px, py, radiusPx * 5.4);
        glow.addColorStop(0, `rgba(255, 248, 204, ${0.95 * flash})`);
        glow.addColorStop(0.4, `rgba(250, 204, 21, ${0.34 * flash})`);
        glow.addColorStop(1, "rgba(250, 204, 21, 0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(px, py, radiusPx * 5.4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle =
        flash > 0.18
          ? "#fff7cc"
          : firefly.phase > 0.82
            ? "#facc15"
            : "rgba(153, 246, 228, 0.34)";
      ctx.beginPath();
      ctx.arc(px, py, radiusPx, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = "rgba(187, 247, 208, 0.09)";
    ctx.lineWidth = 1;
    ctx.strokeRect(14, 14, width - 28, height - 28);
  }, [canvasWidth, hoveredIndex]);

  const emitPulse = useCallback((worldX: number, worldY: number) => {
    const radiusValue = radiusRef.current * 0.82;
    const radiusSquared = radiusValue * radiusValue;
    const nextFireflies = cloneFireflies(firefliesRef.current);

    for (const firefly of nextFireflies) {
      const dx = firefly.x - worldX;
      const dy = firefly.y - worldY;
      const distanceSquared = dx * dx + dy * dy;
      if (distanceSquared > radiusSquared) continue;

      const distanceRatio = Math.sqrt(distanceSquared) / radiusValue;
      firefly.phase = clamp(firefly.phase + (1 - distanceRatio) * 0.96, 0, 1);
    }

    firefliesRef.current = nextFireflies;
  }, []);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setCanvasWidth(Math.max(280, Math.floor(entry.contentRect.width)));
      }
    });

    observer.observe(wrap);
    setCanvasWidth(Math.max(280, wrap.clientWidth));

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    render();
  }, [render, stats]);

  useEffect(() => {
    beginTransition(initialScene.id);
  }, [beginTransition, initialScene.id]);

  useEffect(() => {
    let mounted = true;

    const step = (now: number) => {
      if (!mounted) return;

      const previous = lastTimeRef.current || now;
      const dt = Math.min(0.05, (now - previous) / 1000);
      lastTimeRef.current = now;

      if (playingRef.current) {
        transitionTimeRef.current += dt;
        const rampProgress = easeInOut(
          (transitionTimeRef.current - HOLD_SCATTER_SECONDS) / RAMP_SECONDS
        );
        const liveCoupling = couplingRef.current * rampProgress;
        liveCouplingRef.current = liveCoupling;

        const nextFireflies = cloneFireflies(firefliesRef.current);
        const queue: number[] = [];
        const flashed = new Set<number>();

        for (let i = 0; i < nextFireflies.length; i++) {
          const firefly = nextFireflies[i];
          firefly.refractory = Math.max(0, firefly.refractory - dt);
          firefly.flash = Math.max(0, firefly.flash - dt * 2.9);
          firefly.phase += firefly.frequency * dt;

          if (firefly.phase >= 1 && firefly.refractory <= 0) {
            queue.push(i);
          }
        }

        const influenceRadius = radiusRef.current;
        const influenceRadiusSquared = influenceRadius * influenceRadius;
        let flashesThisStep = 0;

        while (queue.length > 0) {
          const sourceIndex = queue.pop()!;
          if (flashed.has(sourceIndex)) continue;

          const source = nextFireflies[sourceIndex];
          flashed.add(sourceIndex);
          source.phase = 0;
          source.flash = 1;
          source.refractory = REFRACTORY_SECONDS;
          flashesThisStep += 1;

          if (liveCoupling <= 0) continue;

          for (let i = 0; i < nextFireflies.length; i++) {
            if (i === sourceIndex || flashed.has(i)) continue;

            const target = nextFireflies[i];
            if (target.refractory > 0) continue;

            const dx = target.x - source.x;
            const dy = target.y - source.y;
            const distanceSquared = dx * dx + dy * dy;
            if (distanceSquared > influenceRadiusSquared) continue;

            const distanceRatio = Math.sqrt(distanceSquared) / influenceRadius;
            const phaseSensitivity = 0.4 + target.phase * 0.95;
            const nudge =
              liveCoupling *
              phaseSensitivity *
              (1 - distanceRatio * 0.72);

            target.phase += nudge;
            if (target.phase >= 1) {
              queue.push(i);
            }
          }
        }

        firefliesRef.current = nextFireflies;

        const sync = computeSync(nextFireflies);
        if (sync > 0.96 && liveCoupling >= couplingRef.current * 0.98) {
          lockedTimeRef.current += dt;
        } else {
          lockedTimeRef.current = 0;
        }

        if (autoRestartRef.current && lockedTimeRef.current >= LOCK_HOLD_SECONDS) {
          beginTransition(sceneRef.current);
        }

        if (now - statsTimeRef.current > 120) {
          statsTimeRef.current = now;
          setStats({
            sync,
            flashes: flashesThisStep,
            liveCoupling,
            stage: stageFrom(sync, liveCoupling),
          });
        }
      }

      render();
      animationRef.current = requestAnimationFrame(step);
    };

    animationRef.current = requestAnimationFrame(step);

    return () => {
      mounted = false;
      cancelAnimationFrame(animationRef.current);
    };
  }, [beginTransition, render]);

  const handleSceneChange = useCallback((preset: ScenePreset) => {
    setSelectedScene(preset.id);
    setCoupling(preset.coupling);
    setRadius(preset.radius);
    couplingRef.current = preset.coupling;
    radiusRef.current = preset.radius;
    beginTransition(preset.id);
  }, [beginTransition]);

  const handleRestart = useCallback(() => {
    beginTransition(selectedScene);
  }, [beginTransition, selectedScene]);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * WORLD_W;
    const y = ((event.clientY - rect.top) / rect.height) * WORLD_H;
    emitPulse(x, y);
    render();
  }, [emitPulse, render]);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * WORLD_W;
    const y = ((event.clientY - rect.top) / rect.height) * WORLD_H;

    let bestIndex: number | null = null;
    let bestDistanceSquared = Number.POSITIVE_INFINITY;
    const maxDistanceSquared = 28 * 28;

    for (let i = 0; i < firefliesRef.current.length; i++) {
      const firefly = firefliesRef.current[i];
      const dx = firefly.x - x;
      const dy = firefly.y - y;
      const distanceSquared = dx * dx + dy * dy;
      if (distanceSquared < bestDistanceSquared) {
        bestDistanceSquared = distanceSquared;
        bestIndex = i;
      }
    }

    setHoveredIndex(bestDistanceSquared <= maxDistanceSquared ? bestIndex : null);
  }, []);

  const handlePointerLeave = useCallback(() => {
    setHoveredIndex(null);
  }, []);

  const currentScene = SCENES.find((scene) => scene.id === selectedScene) ?? initialScene;
  const canvasHeight = Math.max(300, Math.round((canvasWidth * WORLD_H) / WORLD_W));

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="font-mono text-2xl sm:text-3xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
          Firefly Synchronization
        </h2>
        <p className="text-neutral-500 dark:text-neutral-400 text-base sm:text-lg">
          From scattered clocks to one shared pulse.
        </p>
      </div>

      <div className="space-y-4 text-neutral-700 dark:text-neutral-300 text-sm sm:text-base leading-relaxed">
        <p>
          The surprising part is the transition. At first the field is only a
          crowd of private clocks. Then the local nudges begin to matter. With
          no conductor and no global signal, the scattered flashing can collapse
          into one rhythm.
        </p>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 p-4">
            <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-neutral-500">
              What It Is
            </div>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
              Fixed local oscillators that only react when nearby neighbors flash.
            </p>
          </div>
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 p-4">
            <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-neutral-500">
              Why It Matters
            </div>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
              It shows emergence in time rather than shape. Order appears as synchrony, not geometry.
            </p>
          </div>
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 p-4">
            <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-neutral-500">
              What To Notice
            </div>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
              First the flashes are random. Then whole bursts start arriving together. That is the emergence moment.
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-[linear-gradient(135deg,rgba(6,95,70,0.08),rgba(250,204,21,0.14))] dark:bg-[linear-gradient(135deg,rgba(16,185,129,0.1),rgba(250,204,21,0.12))] p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-neutral-500">
                Scene
              </div>
              <div className="mt-2 text-base font-medium text-neutral-900 dark:text-neutral-100">
                {currentScene.label}
              </div>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                {currentScene.subtitle}
              </p>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
              Press <span className="font-mono">Play</span> to start the
              transition. If you want to replay it from the beginning, hit
              <span className="font-mono"> Restart transition</span>.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {SCENES.map((scene) => {
            const active = scene.id === selectedScene;
            return (
              <button
                key={scene.id}
                type="button"
                onClick={() => handleSceneChange(scene)}
                className={`rounded-full border px-3 py-1.5 text-xs font-mono transition ${
                  active
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-300"
                    : "border-neutral-300 text-neutral-600 hover:border-neutral-500 hover:text-neutral-900 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500 dark:hover:text-neutral-100"
                }`}
              >
                {scene.label}
              </button>
            );
          })}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/50 p-4">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-xs font-mono uppercase tracking-[0.18em] text-neutral-500">
                Nudge Strength
              </span>
              <span className="text-sm font-mono tabular-nums text-neutral-900 dark:text-neutral-100">
                {coupling.toFixed(2)}
              </span>
            </div>
            <input
              aria-label="Nudge strength"
              type="range"
              min={0.18}
              max={0.55}
              step={0.01}
              value={coupling}
              onChange={(event) => setCoupling(Number(event.target.value))}
              className="mt-3 w-full accent-emerald-500"
            />
          </label>

          <label className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/50 p-4">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-xs font-mono uppercase tracking-[0.18em] text-neutral-500">
                Neighbor Reach
              </span>
              <span className="text-sm font-mono tabular-nums text-neutral-900 dark:text-neutral-100">
                {Math.round(radius)} px
              </span>
            </div>
            <input
              aria-label="Neighbor reach"
              type="range"
              min={110}
              max={260}
              step={5}
              value={radius}
              onChange={(event) => setRadius(Number(event.target.value))}
              className="mt-3 w-full accent-amber-500"
            />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/50 p-4">
            <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-neutral-500">
              Stage
            </div>
            <div className="mt-2 text-2xl font-mono tabular-nums text-neutral-900 dark:text-neutral-100">
              {stats.stage}
            </div>
          </div>
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/50 p-4">
            <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-neutral-500">
              Sync Score
            </div>
            <div className="mt-2 text-2xl font-mono tabular-nums text-neutral-900 dark:text-neutral-100">
              {Math.round(stats.sync * 100)}%
            </div>
          </div>
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/50 p-4">
            <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-neutral-500">
              Live Coupling
            </div>
            <div className="mt-2 text-2xl font-mono tabular-nums text-neutral-900 dark:text-neutral-100">
              {stats.liveCoupling.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden bg-[#03080b] shadow-[0_16px_40px_rgba(15,23,42,0.1)]">
          <div
            ref={wrapRef}
            className="relative w-full"
            style={{ height: canvasHeight }}
          >
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerLeave={handlePointerLeave}
              className="block w-full cursor-crosshair touch-none"
              style={{ height: canvasHeight }}
            />
            <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-3 text-[10px] font-mono uppercase tracking-[0.18em] text-white/60">
              <span>Scattered first, synchronized later</span>
              <span>{currentScene.count} clocks</span>
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between p-3 text-[10px] font-mono uppercase tracking-[0.18em] text-white/60">
              <span>{stats.stage}</span>
              <span>{stats.flashes} flashes now</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setPlaying((current) => !current)}
            className={`px-3 py-1.5 text-xs font-mono rounded border transition ${
              playing
                ? "border-amber-500 bg-amber-500/10 text-amber-700 dark:border-amber-600 dark:bg-amber-600/10 dark:text-amber-400"
                : "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-600/10 dark:text-emerald-300"
            }`}
          >
            {playing ? "Pause" : "Play"}
          </button>
          <button
            type="button"
            onClick={handleRestart}
            className="px-3 py-1.5 text-xs font-mono rounded border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:border-neutral-500 hover:text-neutral-900 dark:hover:border-neutral-500 dark:hover:text-neutral-100 transition"
          >
            Restart transition
          </button>
          <button
            type="button"
            onClick={() => setAutoRestart((current) => !current)}
            className={`px-3 py-1.5 text-xs font-mono rounded border transition ${
              autoRestart
                ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-600/10 dark:text-emerald-300"
                : "border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:border-neutral-500 hover:text-neutral-900 dark:hover:border-neutral-500 dark:hover:text-neutral-100"
            }`}
          >
            Auto-restart: {autoRestart ? "On" : "Off"}
          </button>
          <button
            type="button"
            onClick={() => emitPulse(WORLD_W * 0.5, WORLD_H * 0.5)}
            className="px-3 py-1.5 text-xs font-mono rounded border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:border-neutral-500 hover:text-neutral-900 dark:hover:border-neutral-500 dark:hover:text-neutral-100 transition"
          >
            Pulse center
          </button>
        </div>
      </div>

      <div className="text-neutral-700 dark:text-neutral-300 text-sm sm:text-base leading-relaxed space-y-3 border-l-2 border-emerald-300 dark:border-emerald-800 pl-4">
        <p>
          This section works only if the main field tells the story by itself.
          You should be able to watch independent blinking give way to bursts
          that arrive together.
        </p>
        <p>
          In pulse-coupled oscillator models, each unit only makes tiny local
          timing corrections. But once enough of those corrections accumulate,
          the population stops behaving like many clocks and starts behaving
          like one distributed clock.
        </p>
        <p className="text-neutral-500 dark:text-neutral-400">
          Emergence here is a transition: from private timing to public rhythm.
        </p>
      </div>
    </div>
  );
}
