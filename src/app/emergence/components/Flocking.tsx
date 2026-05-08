"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const WORLD_W = 720;
const WORLD_H = 480;
const VIEW_RADIUS = 48;
const SEP_RADIUS = 22;
const MAX_SPEED = 3.0;
const MAX_FORCE = 0.05;
const PREDATOR_RADIUS = 110;
const PREDATOR_FORCE = 0.6;

type Boid = { x: number; y: number; vx: number; vy: number };

type Preset = {
  id: string;
  label: string;
  subtitle: string;
  separation: number;
  alignment: number;
  cohesion: number;
};

const PRESETS: Preset[] = [
  {
    id: "balanced",
    label: "Balanced",
    subtitle: "the textbook flock; three forces in steady tension",
    separation: 1.0,
    alignment: 1.0,
    cohesion: 1.0,
  },
  {
    id: "tight",
    label: "Tight",
    subtitle: "loud cohesion, mild separation, almost a single body",
    separation: 0.5,
    alignment: 1.4,
    cohesion: 1.6,
  },
  {
    id: "edgy",
    label: "Edgy",
    subtitle: "personal space matters; little tolerance for crowding",
    separation: 1.8,
    alignment: 0.8,
    cohesion: 0.7,
  },
  {
    id: "lonely",
    label: "Lonely",
    subtitle: "too little pull; the flock dissolves into wandering individuals",
    separation: 1.5,
    alignment: 0.3,
    cohesion: 0.4,
  },
];

function makeBoids(count: number): Boid[] {
  const boids: Boid[] = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    boids.push({
      x: Math.random() * WORLD_W,
      y: Math.random() * WORLD_H,
      vx: Math.cos(angle) * MAX_SPEED * 0.6,
      vy: Math.sin(angle) * MAX_SPEED * 0.6,
    });
  }
  return boids;
}

function clampSpeed(b: Boid) {
  const sp = Math.hypot(b.vx, b.vy);
  if (sp > MAX_SPEED) {
    b.vx = (b.vx / sp) * MAX_SPEED;
    b.vy = (b.vy / sp) * MAX_SPEED;
  }
}

function steerToward(
  vx: number,
  vy: number,
  curVx: number,
  curVy: number,
): [number, number] {
  const len = Math.hypot(vx, vy);
  if (len === 0) return [0, 0];
  let sx = (vx / len) * MAX_SPEED - curVx;
  let sy = (vy / len) * MAX_SPEED - curVy;
  const m = Math.hypot(sx, sy);
  if (m > MAX_FORCE) {
    sx = (sx / m) * MAX_FORCE;
    sy = (sy / m) * MAX_FORCE;
  }
  return [sx, sy];
}

export default function FlockingDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boidsRef = useRef<Boid[]>([]);
  const predatorRef = useRef<{ x: number; y: number } | null>(null);

  const [presetId, setPresetId] = useState("balanced");
  const [count, setCount] = useState(140);
  const [paused, setPaused] = useState(false);
  const [predatorMode, setPredatorMode] = useState(false);
  const [separation, setSeparation] = useState(PRESETS[0].separation);
  const [alignment, setAlignment] = useState(PRESETS[0].alignment);
  const [cohesion, setCohesion] = useState(PRESETS[0].cohesion);

  const activePreset = useMemo(
    () => PRESETS.find((p) => p.id === presetId) ?? PRESETS[0],
    [presetId],
  );

  // Reseed on count change.
  useEffect(() => {
    boidsRef.current = makeBoids(count);
  }, [count]);

  // Snap sliders to preset when preset changes.
  useEffect(() => {
    setSeparation(activePreset.separation);
    setAlignment(activePreset.alignment);
    setCohesion(activePreset.cohesion);
  }, [activePreset]);

  // Animation loop.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(WORLD_H * dpr);
      canvas.style.height = `${WORLD_H}px`;
    };
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    const step = () => {
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Background
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, w, h);

      // Faint grid
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 60) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      for (let y = 0; y <= h; y += 60) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();

      const boids = boidsRef.current;
      const sx = w / WORLD_W;
      const sy = h / WORLD_H;
      const SX = (x: number) => x * sx;
      const SY = (y: number) => y * sy;

      if (!paused) {
        for (let i = 0; i < boids.length; i++) {
          const b = boids[i];
          let sepX = 0,
            sepY = 0,
            sepN = 0;
          let aliX = 0,
            aliY = 0,
            aliN = 0;
          let cohX = 0,
            cohY = 0,
            cohN = 0;
          for (let j = 0; j < boids.length; j++) {
            if (i === j) continue;
            const o = boids[j];
            const dx = o.x - b.x;
            const dy = o.y - b.y;
            const d2 = dx * dx + dy * dy;
            if (d2 > VIEW_RADIUS * VIEW_RADIUS) continue;
            const d = Math.sqrt(d2);
            aliX += o.vx;
            aliY += o.vy;
            aliN++;
            cohX += o.x;
            cohY += o.y;
            cohN++;
            if (d < SEP_RADIUS && d > 0.001) {
              sepX -= dx / d;
              sepY -= dy / d;
              sepN++;
            }
          }

          let fx = 0,
            fy = 0;
          if (sepN > 0) {
            const [s1, s2] = steerToward(sepX / sepN, sepY / sepN, b.vx, b.vy);
            fx += s1 * separation;
            fy += s2 * separation;
          }
          if (aliN > 0) {
            const [s1, s2] = steerToward(aliX / aliN, aliY / aliN, b.vx, b.vy);
            fx += s1 * alignment;
            fy += s2 * alignment;
          }
          if (cohN > 0) {
            const [s1, s2] = steerToward(cohX / cohN - b.x, cohY / cohN - b.y, b.vx, b.vy);
            fx += s1 * cohesion;
            fy += s2 * cohesion;
          }

          if (predatorRef.current) {
            const pdx = b.x - predatorRef.current.x;
            const pdy = b.y - predatorRef.current.y;
            const pd2 = pdx * pdx + pdy * pdy;
            if (pd2 < PREDATOR_RADIUS * PREDATOR_RADIUS) {
              const pd = Math.sqrt(pd2) || 1;
              const intensity = 1 - pd / PREDATOR_RADIUS;
              fx += (pdx / pd) * PREDATOR_FORCE * intensity;
              fy += (pdy / pd) * PREDATOR_FORCE * intensity;
            }
          }

          b.vx += fx;
          b.vy += fy;
          clampSpeed(b);
          b.x += b.vx;
          b.y += b.vy;
          if (b.x < 0) b.x += WORLD_W;
          else if (b.x > WORLD_W) b.x -= WORLD_W;
          if (b.y < 0) b.y += WORLD_H;
          else if (b.y > WORLD_H) b.y -= WORLD_H;
        }
      }

      // Render boids as triangles pointing in their velocity direction
      ctx.fillStyle = "#22d3ee";
      for (let i = 0; i < boids.length; i++) {
        const b = boids[i];
        const angle = Math.atan2(b.vy, b.vx);
        const x = SX(b.x);
        const y = SY(b.y);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(7, 0);
        ctx.lineTo(-4, 3);
        ctx.lineTo(-4, -3);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // Predator visualization
      if (predatorRef.current) {
        const x = SX(predatorRef.current.x);
        const y = SY(predatorRef.current.y);
        const r = PREDATOR_RADIUS * Math.min(sx, sy);
        ctx.strokeStyle = "rgba(244, 114, 182, 0.4)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "#f472b6";
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [paused, separation, alignment, cohesion]);

  // Predator pointer tracking
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!predatorMode) {
      predatorRef.current = null;
      return;
    }
    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * WORLD_W;
      const y = ((e.clientY - rect.top) / rect.height) * WORLD_H;
      predatorRef.current = { x, y };
    };
    const onLeave = () => {
      predatorRef.current = null;
    };
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);
    return () => {
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      predatorRef.current = null;
    };
  }, [predatorMode]);

  const reset = useCallback(() => {
    boidsRef.current = makeBoids(count);
  }, [count]);

  return (
    <div className="rounded-2xl border border-neutral-300 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/60 p-4 sm:p-5 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
      {/* Preset selector */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {PRESETS.map((p) => {
          const active = p.id === presetId;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setPresetId(p.id)}
              className={`rounded-full border px-3 py-1 text-xs font-mono transition ${
                active
                  ? "border-cyan-500 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300"
                  : "border-neutral-300 dark:border-neutral-700 text-neutral-500 hover:border-neutral-500"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-neutral-500 mb-4 italic">{activePreset.subtitle}</p>

      <div className="rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-black mb-4">
        <canvas ref={canvasRef} className="block w-full" />
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3 text-xs">
        <label className="flex flex-col gap-1">
          <span className="font-mono uppercase tracking-[0.2em] text-neutral-500">
            Separation · {separation.toFixed(2)}
          </span>
          <input
            type="range"
            min={0}
            max={2}
            step={0.05}
            value={separation}
            onChange={(e) => setSeparation(parseFloat(e.target.value))}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-mono uppercase tracking-[0.2em] text-neutral-500">
            Alignment · {alignment.toFixed(2)}
          </span>
          <input
            type="range"
            min={0}
            max={2}
            step={0.05}
            value={alignment}
            onChange={(e) => setAlignment(parseFloat(e.target.value))}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-mono uppercase tracking-[0.2em] text-neutral-500">
            Cohesion · {cohesion.toFixed(2)}
          </span>
          <input
            type="range"
            min={0}
            max={2}
            step={0.05}
            value={cohesion}
            onChange={(e) => setCohesion(parseFloat(e.target.value))}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          className="rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-xs font-mono uppercase tracking-[0.18em] hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
        >
          {paused ? "▶ Play" : "⏸ Pause"}
        </button>
        <button
          type="button"
          onClick={reset}
          className="rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-xs font-mono uppercase tracking-[0.18em] hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
        >
          ↺ Reseed
        </button>
        <label className="flex items-center gap-2 text-xs font-mono">
          <input
            type="checkbox"
            checked={predatorMode}
            onChange={(e) => setPredatorMode(e.target.checked)}
          />
          <span className="uppercase tracking-[0.18em] text-neutral-500">
            Disturb (cursor scares the flock)
          </span>
        </label>
        <label className="flex items-center gap-2 text-xs font-mono ml-auto">
          <span className="uppercase tracking-[0.18em] text-neutral-500">
            Count · {count}
          </span>
          <input
            type="range"
            min={20}
            max={300}
            step={5}
            value={count}
            onChange={(e) => setCount(parseInt(e.target.value, 10))}
          />
        </label>
      </div>
    </div>
  );
}
