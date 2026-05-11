"use client";

import { useCallback, useMemo, useState } from "react";
import { SurfacePlot, type PlotMode } from "@/components/optimization/SurfacePlot";
import { SURFACE_LIST, SURFACES, type SurfaceId } from "@/lib/optimization/surfaces";
import {
  GRAD_ALGO_LIST,
  GRAD_ALGOS,
  runGradient,
  type GradAlgoId,
  type GradHyper,
  DEFAULT_GRAD_HYPER,
} from "@/lib/optimization/gradient-methods";
import {
  SWARM_ALGO_LIST,
  SWARM_ALGOS,
  runSwarm,
  type SwarmAlgoId,
  type SwarmHyper,
  DEFAULT_SWARM_HYPER,
  mulberry32,
} from "@/lib/optimization/swarm-methods";

type Section = "gradient" | "non-gradient";

export default function OptimizationLab() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:py-10 md:py-12 space-y-10">
      <Header />
      <PrimerEssay />
      <GradientSection />
      <SwarmSection />
      <Footer />
    </div>
  );
}

// ─── Header ──────────────────────────────────────────────────────────────────
function Header() {
  return (
    <header className="grid gap-6 border-b border-neutral-200 pb-8 dark:border-neutral-800 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)] lg:items-end">
      <div>
        <p className="mb-3 text-xs font-mono uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">
          OPTIMIZATION / LIVE ALGORITHM LAB
        </p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Optimization Lab</h1>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-neutral-600 dark:text-neutral-400 sm:text-base">
          Run gradient and black-box optimizers on the same surfaces, move the start point, and
          compare how each method searches for a minimum.
        </p>
      </div>
      <div className="grid grid-cols-3 divide-x divide-neutral-200 border-y border-neutral-200 py-4 text-center dark:divide-neutral-800 dark:border-neutral-800">
        <Stat label="surfaces" value="6" />
        <Stat label="algorithms" value="9" />
        <Stat label="views" value="2D / 3D" />
      </div>
    </header>
  );
}

// ─── Primer essay ────────────────────────────────────────────────────────────
function PrimerEssay() {
  return (
    <section className="grid gap-4 md:grid-cols-3">
      <PrimerPoint
        title="Objective"
        text="Minimize f(x, y). Lower regions are better; every method is trying to find a valley."
      />
      <PrimerPoint
        title="Gradient"
        text="Uses ∇f to step downhill. Fast on smooth terrain, brittle on rippled landscapes."
      />
      <PrimerPoint
        title="Black box"
        text="Only samples f(x, y). Slower, but much better when gradients are unavailable or misleading."
      />
    </section>
  );
}

// ─── Gradient section ────────────────────────────────────────────────────────
function GradientSection() {
  const [surfaceId, setSurfaceId] = useState<SurfaceId>("rosenbrock");
  const [algo, setAlgo] = useState<GradAlgoId>("adam");
  const [mode, setMode] = useState<PlotMode>("contour");
  const [start, setStart] = useState<{ x: number; y: number }>({ x: -1.5, y: 1.5 });
  const [hyper, setHyper] = useState<GradHyper>(DEFAULT_GRAD_HYPER);
  const [animating, setAnimating] = useState(true);
  const [frame, setFrame] = useState(0);

  const surface = SURFACES[surfaceId];

  const trace = useMemo(
    () => runGradient({ surface, algo, start, hyper, rng: mulberry32(42) }),
    [surface, algo, start, hyper],
  );

  const handlePick = useCallback((x: number, y: number) => {
    setStart({ x, y });
    setAnimating(true);
    setFrame(0);
  }, []);

  const algoMeta = GRAD_ALGOS[algo];
  const last = trace[trace.length - 1];
  const converged = Math.abs(last.f - surface.globalMin.f) < 1e-2;

  return (
    <section className="border-t border-neutral-200 pt-10 dark:border-neutral-800">
      <SectionEyebrow>I · Gradient-based methods</SectionEyebrow>
      <div className="mb-6 grid gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(18rem,0.35fr)] lg:items-end">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">When you can see the slope</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-neutral-600 dark:text-neutral-300 sm:text-base">
            The gradient ∇f points in the direction of steepest <em>increase</em>. To minimise, we step in the
            opposite direction. Everything in this family is some flavour of that idea: vanilla descent,
            momentum, and adaptive per-coordinate step sizes.
          </p>
        </div>
        <Readout
          rows={[
            ["surface", surface.name],
            ["method", algoMeta.name],
            ["status", converged ? "converged" : "searching"],
          ]}
        />
      </div>

      {/* Surface chooser */}
      <ControlGroup label="Surface">
        <Chips
          items={SURFACE_LIST.map((s) => ({ id: s.id, label: s.name }))}
          selectedId={surfaceId}
          onSelect={(id) => {
            setSurfaceId(id as SurfaceId);
            setStart(defaultStartFor(id as SurfaceId));
            setFrame(0);
            setAnimating(true);
          }}
        />
      </ControlGroup>
      <p className="text-xs text-neutral-500 mt-2 mb-5 max-w-3xl">{surface.blurb}</p>

      {/* Algo + mode */}
      <div className="mb-4 space-y-3 border-y border-neutral-200 py-4 dark:border-neutral-800">
        <ControlGroup label="Algorithm">
          <Chips
            items={GRAD_ALGO_LIST.map((a) => ({ id: a.id, label: a.name }))}
            selectedId={algo}
            onSelect={(id) => {
              setAlgo(id as GradAlgoId);
              setFrame(0);
              setAnimating(true);
            }}
          />
        </ControlGroup>
        <ControlGroup label="Playback">
          <ModeToggle mode={mode} onChange={setMode} />
          <PlayPause
            animating={animating}
            atEnd={frame >= trace.length - 1}
            onClick={() => {
              if (frame >= trace.length - 1) setFrame(0);
              setAnimating((a) => !a);
            }}
            onReset={() => {
              setFrame(0);
              setAnimating(true);
            }}
          />
        </ControlGroup>
      </div>

      <SurfacePlot
        surface={surface}
        trace={trace}
        mode={mode}
        height={460}
        onPick={handlePick}
        frame={frame}
        animate={animating}
        onFrameChange={(f) => {
          setFrame(f);
          if (f >= trace.length - 1) setAnimating(false);
        }}
      />

      {/* Status row */}
      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs font-mono text-neutral-500">
        <span>step {Math.min(frame, trace.length - 1)} / {trace.length - 1}</span>
        <span>
          loss <span className="text-neutral-800 dark:text-neutral-200 tabular-nums">{trace[Math.min(frame, trace.length - 1)].f.toExponential(2)}</span>
        </span>
        <span>
          best <span className="text-neutral-800 dark:text-neutral-200 tabular-nums">{Math.min(...trace.map((t) => t.f)).toExponential(2)}</span>
        </span>
        <span>
          start <span className="text-neutral-800 dark:text-neutral-200">({start.x.toFixed(2)}, {start.y.toFixed(2)})</span>
        </span>
        <span className={converged ? "text-green-500" : "text-orange-500"}>
          {converged ? "✓ converged" : "× did not reach the minimum"}
        </span>
      </div>

      {/* Hyperparameters */}
      <div className="mt-5 grid grid-cols-2 gap-4 rounded-lg border border-neutral-200 bg-white/60 p-4 dark:border-neutral-800 dark:bg-neutral-950/35 sm:grid-cols-4">
        <Slider
          label="Learning rate η"
          value={hyper.lr}
          min={0.001}
          max={0.5}
          step={0.001}
          format={(v) => v.toFixed(3)}
          onChange={(v) => setHyper((h) => ({ ...h, lr: v }))}
        />
        {(algo === "momentum" || algo === "adam") && (
          <Slider
            label={algo === "adam" ? "β₁ (Adam)" : "β (momentum)"}
            value={hyper.momentum}
            min={0}
            max={0.999}
            step={0.001}
            format={(v) => v.toFixed(3)}
            onChange={(v) => setHyper((h) => ({ ...h, momentum: v }))}
          />
        )}
        {(algo === "rmsprop" || algo === "adam") && (
          <Slider
            label={algo === "adam" ? "β₂ (Adam)" : "γ (RMSProp)"}
            value={hyper.decay}
            min={0.5}
            max={0.9999}
            step={0.0001}
            format={(v) => v.toFixed(4)}
            onChange={(v) => setHyper((h) => ({ ...h, decay: v }))}
          />
        )}
        {algo === "sgd" && (
          <Slider
            label="Gradient noise σ"
            value={hyper.noise}
            min={0}
            max={2}
            step={0.05}
            format={(v) => v.toFixed(2)}
            onChange={(v) => setHyper((h) => ({ ...h, noise: v }))}
          />
        )}
        <Slider
          label="Steps"
          value={hyper.steps}
          min={20}
          max={500}
          step={10}
          format={(v) => v.toFixed(0)}
          onChange={(v) => setHyper((h) => ({ ...h, steps: v }))}
        />
      </div>

      {/* Algo prose */}
      <div className="mt-6 rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-5">
        <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-400 mb-2">
          {algoMeta.name} · update rule
        </div>
        <code className="block font-mono text-sm text-neutral-800 dark:text-neutral-100 mb-3">
          {algoMeta.rule}
        </code>
        <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
          {algoMeta.blurb}
        </p>
      </div>
    </section>
  );
}

// ─── Swarm / non-gradient section ────────────────────────────────────────────
function SwarmSection() {
  const [surfaceId, setSurfaceId] = useState<SurfaceId>("rastrigin");
  const [algoA, setAlgoA] = useState<SwarmAlgoId>("pso");
  const [algoB, setAlgoB] = useState<SwarmAlgoId>("ga");
  const [mode, setMode] = useState<PlotMode>("contour");
  const [hyper, setHyper] = useState<SwarmHyper>(DEFAULT_SWARM_HYPER);
  const [animating, setAnimating] = useState(true);
  const [frame, setFrame] = useState(0);
  const [comparing, setComparing] = useState(true);

  const surface = SURFACES[surfaceId];

  const swarmA = useMemo(
    () => runSwarm({ surface, algo: algoA, hyper, seed: 7 }),
    [surface, algoA, hyper],
  );
  const swarmB = useMemo(
    () => (comparing ? runSwarm({ surface, algo: algoB, hyper, seed: 7 }) : undefined),
    [surface, algoB, hyper, comparing],
  );

  const totalFrames = Math.min(
    swarmA.length,
    comparing && swarmB ? swarmB.length : Infinity,
  );

  const algoMetaA = SWARM_ALGOS[algoA];
  const algoMetaB = SWARM_ALGOS[algoB];

  return (
    <section className="border-t border-neutral-200 pt-10 dark:border-neutral-800">
      <SectionEyebrow>II · Non-gradient methods</SectionEyebrow>
      <div className="mb-6 grid gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(18rem,0.35fr)] lg:items-end">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">When you only get to ask f(x, y)</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-neutral-600 dark:text-neutral-300 sm:text-base">
            Black-box methods never differentiate the surface. They probe, rank, mutate, cool, and
            share information across candidates, which makes them useful on noisy or highly multimodal
            landscapes.
          </p>
        </div>
        <Readout
          rows={[
            ["surface", surface.name],
            ["primary", algoMetaA.name],
            ["comparison", comparing ? algoMetaB.name : "off"],
          ]}
        />
      </div>

      <ControlGroup label="Surface">
        <Chips
          items={SURFACE_LIST.map((s) => ({ id: s.id, label: s.name }))}
          selectedId={surfaceId}
          onSelect={(id) => {
            setSurfaceId(id as SurfaceId);
            setFrame(0);
            setAnimating(true);
          }}
        />
      </ControlGroup>
      <p className="text-xs text-neutral-500 mt-2 mb-5 max-w-3xl">{surface.blurb}</p>

      <div className="mb-4 space-y-3 border-y border-neutral-200 py-4 dark:border-neutral-800">
        <ControlGroup label="Primary">
          <Chips
            items={SWARM_ALGO_LIST.map((a) => ({ id: a.id, label: a.name }))}
            selectedId={algoA}
            onSelect={(id) => {
              setAlgoA(id as SwarmAlgoId);
              setFrame(0);
              setAnimating(true);
            }}
            accent="cyan"
          />
        </ControlGroup>

        {comparing && (
          <ControlGroup label="Compare">
            <Chips
              items={SWARM_ALGO_LIST.map((a) => ({ id: a.id, label: a.name }))}
              selectedId={algoB}
              onSelect={(id) => {
                setAlgoB(id as SwarmAlgoId);
                setFrame(0);
                setAnimating(true);
              }}
              accent="pink"
            />
          </ControlGroup>
        )}

        <ControlGroup label="Playback">
          <ModeToggle mode={mode} onChange={setMode} />
          <button
            type="button"
            onClick={() => {
              setComparing((c) => !c);
              setFrame(0);
              setAnimating(true);
            }}
            className={`text-[10px] font-mono uppercase tracking-[0.18em] px-3 py-1.5 rounded-md border transition ${
              comparing
                ? "border-cyan-500 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300"
                : "border-neutral-300 dark:border-neutral-700 text-neutral-500 hover:border-neutral-500"
            }`}
          >
            {comparing ? "Comparing two methods" : "Comparison off"}
          </button>
          <PlayPause
            animating={animating}
            atEnd={frame >= totalFrames - 1}
            onClick={() => {
              if (frame >= totalFrames - 1) setFrame(0);
              setAnimating((a) => !a);
            }}
            onReset={() => {
              setFrame(0);
              setAnimating(true);
            }}
          />
        </ControlGroup>
      </div>

      <SurfacePlot
        surface={surface}
        swarm={swarmA}
        swarmB={swarmB}
        mode={mode}
        height={460}
        frame={frame}
        animate={animating}
        onFrameChange={(f) => {
          setFrame(f);
          if (f >= totalFrames - 1) setAnimating(false);
        }}
      />

      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs font-mono text-neutral-500">
        <span>generation {Math.min(frame, totalFrames - 1)} / {totalFrames - 1}</span>
        {swarmA[Math.min(frame, swarmA.length - 1)] && (
          <span>
            <span className="text-cyan-500">{algoMetaA.name}</span> best{" "}
            <span className="text-neutral-800 dark:text-neutral-200 tabular-nums">
              {Math.min(...swarmA[Math.min(frame, swarmA.length - 1)].map((p) => p.f)).toExponential(2)}
            </span>
          </span>
        )}
        {comparing && swarmB && swarmB[Math.min(frame, swarmB.length - 1)] && (
          <span>
            <span className="text-pink-500">{algoMetaB.name}</span> best{" "}
            <span className="text-neutral-800 dark:text-neutral-200 tabular-nums">
              {Math.min(...swarmB[Math.min(frame, swarmB.length - 1)].map((p) => p.f)).toExponential(2)}
            </span>
          </span>
        )}
      </div>

      {/* Hyperparameters (shared knobs that mean different things per algo) */}
      <div className="mt-5 grid grid-cols-2 gap-4 rounded-lg border border-neutral-200 bg-white/60 p-4 dark:border-neutral-800 dark:bg-neutral-950/35 sm:grid-cols-4">
        <Slider
          label="Population"
          value={hyper.popSize}
          min={5}
          max={80}
          step={1}
          format={(v) => v.toFixed(0)}
          onChange={(v) => setHyper((h) => ({ ...h, popSize: v }))}
        />
        <Slider
          label="Generations"
          value={hyper.generations}
          min={10}
          max={200}
          step={5}
          format={(v) => v.toFixed(0)}
          onChange={(v) => setHyper((h) => ({ ...h, generations: v }))}
        />
        <Slider
          label="Inertia / mutation"
          value={hyper.inertia}
          min={0}
          max={1.2}
          step={0.01}
          format={(v) => v.toFixed(2)}
          onChange={(v) => setHyper((h) => ({ ...h, inertia: v }))}
        />
        <Slider
          label="Coupling (k₁ / k₂)"
          value={hyper.k1}
          min={0.2}
          max={2.5}
          step={0.05}
          format={(v) => v.toFixed(2)}
          onChange={(v) => setHyper((h) => ({ ...h, k1: v, k2: v }))}
        />
      </div>

      {/* Method notes */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <EssayBlock accent="cyan" algo={algoMetaA} />
        {comparing && <EssayBlock accent="pink" algo={algoMetaB} />}
      </div>
    </section>
  );
}

// ─── Footer ──────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="border-t border-neutral-200 dark:border-neutral-800 pt-8">
      <p className="text-xs text-neutral-500 leading-relaxed max-w-3xl">
        All algorithms run in your browser; the surface heightfield is sampled at 96×96 and re-rendered
        on every parameter change. The 3-D view uses three.js with orbit controls; the 2-D contour view
        renders directly to a canvas.
      </p>
    </footer>
  );
}

// ─── Small UI bits ───────────────────────────────────────────────────────────
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3">
      <div className="text-lg font-semibold tabular-nums text-neutral-950 dark:text-neutral-50">
        {value}
      </div>
      <div className="mt-1 text-[10px] font-mono uppercase tracking-[0.18em] text-neutral-500">
        {label}
      </div>
    </div>
  );
}

function PrimerPoint({ title, text }: { title: string; text: string }) {
  return (
    <div className="border-l border-neutral-300 pl-4 dark:border-neutral-700">
      <h2 className="text-[10px] font-mono uppercase tracking-[0.22em] text-neutral-500">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
        {text}
      </p>
    </div>
  );
}

function Readout({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="grid gap-2 border-y border-neutral-200 py-3 text-xs dark:border-neutral-800">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-baseline justify-between gap-4">
          <dt className="font-mono uppercase tracking-[0.18em] text-neutral-500">{label}</dt>
          <dd className="truncate text-right font-mono text-neutral-900 dark:text-neutral-100">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function ControlGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-[7rem_minmax(0,1fr)] sm:items-start">
      <div className="pt-1 text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-500">
        {label}
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-[10px] font-mono uppercase tracking-[0.22em] text-neutral-500 dark:text-neutral-400">
      {children}
    </p>
  );
}

function Chips({
  items,
  selectedId,
  onSelect,
  accent = "cyan",
}: {
  items: { id: string; label: string }[];
  selectedId: string;
  onSelect: (id: string) => void;
  accent?: "cyan" | "pink";
}) {
  const activeCls =
    accent === "pink"
      ? "border-pink-500 bg-pink-500/10 text-pink-700 dark:text-pink-300"
      : "border-cyan-500 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300";
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it) => {
        const active = it.id === selectedId;
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onSelect(it.id)}
            className={`rounded-md border px-3 py-1.5 text-xs font-mono transition ${
              active
                ? activeCls
                : "border-neutral-300 dark:border-neutral-700 text-neutral-500 hover:border-neutral-500"
            }`}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

function ModeToggle({ mode, onChange }: { mode: PlotMode; onChange: (m: PlotMode) => void }) {
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-neutral-300 text-[10px] font-mono uppercase tracking-[0.18em] dark:border-neutral-700">
      <button
        type="button"
        onClick={() => onChange("contour")}
        className={`px-3 py-1.5 transition ${
          mode === "contour"
            ? "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300"
            : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
        }`}
      >
        2D
      </button>
      <button
        type="button"
        onClick={() => onChange("3d")}
        className={`border-l border-neutral-300 px-3 py-1.5 transition dark:border-neutral-700 ${
          mode === "3d"
            ? "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300"
            : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
        }`}
      >
        3D
      </button>
    </div>
  );
}

function PlayPause({
  animating,
  atEnd,
  onClick,
  onReset,
}: {
  animating: boolean;
  atEnd: boolean;
  onClick: () => void;
  onReset: () => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-[0.18em]">
      <button
        type="button"
        onClick={onClick}
        className="rounded-md border border-neutral-300 px-3 py-1.5 transition hover:border-neutral-500 dark:border-neutral-700"
      >
        {atEnd ? "↻ Replay" : animating ? "⏸ Pause" : "▶ Play"}
      </button>
      <button
        type="button"
        onClick={onReset}
        className="rounded-md border border-neutral-300 px-3 py-1.5 text-neutral-500 transition hover:border-neutral-500 dark:border-neutral-700"
      >
        ↺ Reset
      </button>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-neutral-500">
          {label}
        </span>
        <span className="text-xs font-mono tabular-nums text-neutral-800 dark:text-neutral-200">
          {format(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-cyan-500"
      />
    </div>
  );
}

function EssayBlock({
  accent,
  algo,
}: {
  accent: "cyan" | "pink";
  algo: { name: string; tagline: string; essay: string };
}) {
  const borderCls =
    accent === "pink" ? "border-pink-500/30 bg-pink-500/5" : "border-cyan-500/30 bg-cyan-500/5";
  const textCls =
    accent === "pink"
      ? "text-pink-600 dark:text-pink-400"
      : "text-cyan-600 dark:text-cyan-400";
  return (
    <details className={`group rounded-lg border p-4 ${borderCls}`}>
      <summary className="cursor-pointer list-none">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className={`text-[10px] font-mono uppercase tracking-[0.22em] ${textCls}`}>
              {algo.name}
            </div>
            <p className={`mt-1 text-xs italic ${textCls}`}>{algo.tagline}</p>
          </div>
          <span className="font-mono text-xs text-neutral-500 transition group-open:rotate-45">+</span>
        </div>
      </summary>
      <div className="mt-4 whitespace-pre-line text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
        {algo.essay}
      </div>
    </details>
  );
}

// ─── Defaults ────────────────────────────────────────────────────────────────
function defaultStartFor(id: SurfaceId): { x: number; y: number } {
  switch (id) {
    case "bowl": return { x: 4, y: -3.5 };
    case "rosenbrock": return { x: -1.5, y: 1.5 };
    case "saddle": return { x: 2.5, y: 0.05 };
    case "himmelblau": return { x: -3.5, y: -3.5 };
    case "rastrigin": return { x: 3.5, y: 3.5 };
    case "ackley": return { x: 4, y: 4 };
  }
}

// (silence unused-import lint while keeping Section type around for future use)
export type { Section };
