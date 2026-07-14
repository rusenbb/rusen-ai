"use client";

import { useEffect, useMemo, useState } from "react";

import { DemoFootnote, DemoHeader, DemoPage, DemoPanel } from "@/components/ui";

import {
  LANDSCAPES,
  OPTIMIZER_META,
  cloneOptimizerConfigs,
  matchedLearningRateConfigs,
  simulateOptimizer,
  type LandscapeBounds,
  type LandscapeId,
  type LossLandscape,
  type OptimizerConfig,
  type OptimizerConfigs,
  type OptimizerName,
  type Point,
  type Trajectory,
} from "./math";

const NAMES: OptimizerName[] = ["sgd", "momentum", "rmsprop", "adam"];
const MAX_STEPS = 140;
const VIEW_WIDTH = 760;
const VIEW_HEIGHT = 540;
const PADDING = 48;

type ComparisonMode = "matched" | "tuned";

const FORMULAS: Record<OptimizerName, { equation: string; explanation: string }> = {
  sgd: { equation: "θ ← θ − ηg", explanation: "One raw gradient direction per step." },
  momentum: { equation: "v ← βv + g; θ ← θ − ηv", explanation: "Velocity keeps a memory of consistent downhill directions." },
  rmsprop: { equation: "s ← ρs + (1−ρ)g²; θ ← θ − ηg / √s", explanation: "Recent squared gradients rescale each coordinate." },
  adam: { equation: "m̂ / (√v̂ + ε)", explanation: "Adam combines bias-corrected momentum and adaptive scaling." },
};

function clamp(value: number, lower: number, upper: number): number {
  return Math.max(lower, Math.min(upper, value));
}

function pointAt(trajectory: Trajectory, step: number): Point {
  return trajectory.points[Math.min(step, trajectory.points.length - 1)];
}

function lossAt(trajectory: Trajectory, step: number): number {
  return trajectory.losses[Math.min(step, trajectory.losses.length - 1)];
}

function svgPoint(point: Point, bounds: LandscapeBounds): { x: number; y: number } {
  return {
    x: PADDING + ((point.x - bounds.xMin) / (bounds.xMax - bounds.xMin)) * (VIEW_WIDTH - PADDING * 2),
    y: VIEW_HEIGHT - PADDING - ((point.y - bounds.yMin) / (bounds.yMax - bounds.yMin)) * (VIEW_HEIGHT - PADDING * 2),
  };
}

function formatControl(value: number): string {
  if (value > 0 && value < 0.01) return value.toExponential(1);
  if (value >= 0.99 && value < 1) return value.toFixed(4);
  return value.toFixed(2);
}

function Track({
  landscape,
  trajectories,
  step,
  focused,
  onFocus,
}: {
  landscape: LossLandscape;
  trajectories: Trajectory[];
  step: number;
  focused: OptimizerName;
  onFocus: (name: OptimizerName) => void;
}) {
  const cells = useMemo(() => {
    const columns = 31;
    const rows = 25;
    const raw = Array.from({ length: columns * rows }, (_, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const x = landscape.bounds.xMin + (column / (columns - 1)) * (landscape.bounds.xMax - landscape.bounds.xMin);
      const y = landscape.bounds.yMin + (row / (rows - 1)) * (landscape.bounds.yMax - landscape.bounds.yMin);
      return { id: index, x, y, loss: landscape.loss({ x, y }) };
    });
    const maximum = Math.max(...raw.map((cell) => cell.loss), Number.EPSILON);
    return raw.map((cell) => {
      const xStep = (landscape.bounds.xMax - landscape.bounds.xMin) / columns;
      const yStep = (landscape.bounds.yMax - landscape.bounds.yMin) / rows;
      const topLeft = svgPoint({ x: cell.x - xStep / 2, y: cell.y + yStep / 2 }, landscape.bounds);
      const bottomRight = svgPoint({ x: cell.x + xStep / 2, y: cell.y - yStep / 2 }, landscape.bounds);
      return {
        ...cell,
        x: topLeft.x,
        y: topLeft.y,
        width: bottomRight.x - topLeft.x,
        height: bottomRight.y - topLeft.y,
        opacity: Number((0.04 + Math.sqrt(clamp(cell.loss / maximum, 0, 1)) * 0.42).toFixed(3)),
      };
    });
  }, [landscape]);

  const start = trajectories[0]?.points[0] ?? landscape.defaultStart;
  const startScreen = svgPoint(start, landscape.bounds);

  return (
    <svg viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} className="w-full" role="img" aria-label={`${landscape.label} with optimizer trajectories`}>
      <rect x="0" y="0" width={VIEW_WIDTH} height={VIEW_HEIGHT} className="fill-[var(--surface)]" />
      {cells.map((cell) => <rect key={cell.id} x={cell.x} y={cell.y} width={cell.width + 1} height={cell.height + 1} fill="#06b6d4" opacity={cell.opacity} />)}
      <line x1={PADDING} y1={VIEW_HEIGHT - PADDING} x2={VIEW_WIDTH - PADDING} y2={VIEW_HEIGHT - PADDING} className="stroke-neutral-400 dark:stroke-neutral-600" strokeWidth="1" />
      <line x1={PADDING} y1={PADDING} x2={PADDING} y2={VIEW_HEIGHT - PADDING} className="stroke-neutral-400 dark:stroke-neutral-600" strokeWidth="1" />
      <text x={VIEW_WIDTH - PADDING} y={VIEW_HEIGHT - 24} textAnchor="end" className="fill-current text-[11px] font-mono text-neutral-500">parameter θ₁</text>
      <text x="18" y="55" className="fill-current text-[11px] font-mono text-neutral-500">θ₂</text>
      <text x="58" y="69" className="fill-current text-[10px] font-mono text-neutral-500">higher loss</text>
      {landscape.minima.map((minimum, index) => {
        const target = svgPoint(minimum, landscape.bounds);
        return <g key={`${minimum.x}-${minimum.y}`}><circle cx={target.x} cy={target.y} r="6" fill="none" className="stroke-neutral-900 dark:stroke-neutral-100" strokeWidth="2" /><text x={target.x + 10} y={target.y - 10} className="fill-current text-[11px] font-mono text-neutral-500">{landscape.minima.length > 1 ? `minimum ${index + 1}` : "minimum"}</text></g>;
      })}
      <circle cx={startScreen.x} cy={startScreen.y} r="5" fill="none" className="stroke-neutral-700 dark:stroke-neutral-300" strokeWidth="2" />
      <text x={startScreen.x + 9} y={startScreen.y + 15} className="fill-current text-[10px] font-mono text-neutral-500">start</text>
      {trajectories.map((trajectory) => {
        const meta = OPTIMIZER_META[trajectory.name];
        const shown = trajectory.points.slice(0, Math.min(step + 1, trajectory.points.length));
        const final = svgPoint(pointAt(trajectory, step), landscape.bounds);
        return (
          <g key={trajectory.name} onClick={() => onFocus(trajectory.name)} className="cursor-pointer" aria-label={`Focus ${meta.label}`}>
            <polyline points={shown.map((point) => { const screen = svgPoint(point, landscape.bounds); return `${screen.x},${screen.y}`; }).join(" ")} fill="none" stroke={meta.color} strokeWidth={focused === trajectory.name ? 3.4 : 1.8} strokeLinecap="round" strokeLinejoin="round" opacity={focused === trajectory.name ? 1 : 0.68} />
            <circle cx={final.x} cy={final.y} r={focused === trajectory.name ? 5.5 : 4} fill={meta.color} stroke="var(--surface)" strokeWidth="2" />
          </g>
        );
      })}
    </svg>
  );
}

function NumberControl({
  label,
  value,
  min,
  max,
  step,
  onChange,
  tone = "cyan",
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  tone?: "cyan" | "amber" | "fuchsia";
}) {
  const classes = {
    cyan: "accent-cyan-500 text-cyan-700 dark:text-cyan-300",
    amber: "accent-amber-500 text-amber-700 dark:text-amber-300",
    fuchsia: "accent-fuchsia-500 text-fuchsia-700 dark:text-fuchsia-300",
  }[tone];
  return <label className="block border border-[var(--line)] px-3 py-2.5"><span className="flex justify-between gap-3 font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500"><span>{label}</span><strong className={classes}>{formatControl(value)}</strong></span><input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className={`mt-2 block w-full ${classes.split(" ")[0]}`} /></label>;
}

function SettingsPanel({
  focused,
  config,
  comparisonMode,
  sharedLearningRate,
  onSharedLearningRate,
  onConfigChange,
}: {
  focused: OptimizerName;
  config: OptimizerConfig;
  comparisonMode: ComparisonMode;
  sharedLearningRate: number;
  onSharedLearningRate: (value: number) => void;
  onConfigChange: (key: keyof OptimizerConfig, value: number) => void;
}) {
  const meta = OPTIMIZER_META[focused];
  const rate = comparisonMode === "matched" ? sharedLearningRate : config.learningRate;
  return (
    <DemoPanel title={`${meta.label} settings`} description={comparisonMode === "matched" ? "The learning rate is copied to every optimizer for a controlled baseline. The optimizer's own mechanics remain editable." : "This optimizer has its own learning rate. This is exploratory tuning, not a controlled benchmark."} padding="md">
      <div className="space-y-3">
        <NumberControl label={comparisonMode === "matched" ? "matched learning rate η" : `${meta.label} learning rate η`} value={rate} min={0.001} max={focused === "sgd" || focused === "momentum" ? 0.3 : 0.15} step={0.001} onChange={comparisonMode === "matched" ? onSharedLearningRate : (value) => onConfigChange("learningRate", value)} tone="cyan" />
        {focused === "momentum" && <NumberControl label="momentum β" value={config.momentumBeta} min={0} max={0.99} step={0.01} onChange={(value) => onConfigChange("momentumBeta", value)} tone="amber" />}
        {focused === "rmsprop" && <><NumberControl label="RMSProp decay ρ" value={config.rmspropDecay} min={0.5} max={0.999} step={0.001} onChange={(value) => onConfigChange("rmspropDecay", value)} tone="fuchsia" /><NumberControl label="RMSProp epsilon ε" value={config.rmspropEpsilon} min={1e-8} max={1e-4} step={1e-8} onChange={(value) => onConfigChange("rmspropEpsilon", value)} tone="fuchsia" /></>}
        {focused === "adam" && <><NumberControl label="Adam β₁" value={config.adamBeta1} min={0} max={0.99} step={0.01} onChange={(value) => onConfigChange("adamBeta1", value)} tone="fuchsia" /><NumberControl label="Adam β₂" value={config.adamBeta2} min={0.9} max={0.9999} step={0.0001} onChange={(value) => onConfigChange("adamBeta2", value)} tone="fuchsia" /><NumberControl label="Adam epsilon ε" value={config.adamEpsilon} min={1e-8} max={1e-4} step={1e-8} onChange={(value) => onConfigChange("adamEpsilon", value)} tone="fuchsia" /></>}
      </div>
      {focused === "sgd" && <p className="mt-4 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">SGD has no momentum or adaptive accumulator. Its only optimizer setting here is the learning rate.</p>}
      <div className="mt-4 border-t border-[var(--line)] pt-4"><div className="font-mono text-lg text-cyan-700 dark:text-cyan-300">{FORMULAS[focused].equation}</div><p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{FORMULAS[focused].explanation}</p></div>
    </DemoPanel>
  );
}

export default function OptimizerRacetrackPage() {
  const [landscapeId, setLandscapeId] = useState<LandscapeId>("ravine");
  const landscape = LANDSCAPES[landscapeId];
  const [start, setStart] = useState<Point>({ ...LANDSCAPES.ravine.defaultStart });
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>("matched");
  const [sharedLearningRate, setSharedLearningRate] = useState(0.07);
  const [tunedConfigs, setTunedConfigs] = useState<OptimizerConfigs>(() => cloneOptimizerConfigs());
  const [step, setStep] = useState(0);
  const [racing, setRacing] = useState(false);
  const [focused, setFocused] = useState<OptimizerName>("adam");

  const effectiveConfigs = useMemo(
    () => comparisonMode === "matched" ? matchedLearningRateConfigs(sharedLearningRate, tunedConfigs) : tunedConfigs,
    [comparisonMode, sharedLearningRate, tunedConfigs],
  );
  const trajectories = useMemo(
    () => NAMES.map((name) => simulateOptimizer(name, start, effectiveConfigs[name], MAX_STEPS, landscape)),
    [effectiveConfigs, landscape, start],
  );
  const effectiveStep = Math.min(step, MAX_STEPS);
  const anyDiverged = trajectories.some((trajectory) => trajectory.diverged);
  const isRacing = racing && effectiveStep < MAX_STEPS;
  const resetRace = () => { setStep(0); setRacing(false); };

  useEffect(() => {
    if (!isRacing) return;
    const interval = window.setInterval(() => setStep((current) => Math.min(MAX_STEPS, current + 1)), 55);
    return () => window.clearInterval(interval);
  }, [isRacing]);

  const updateStart = (axis: "x" | "y", value: number) => { setStart((current) => ({ ...current, [axis]: value })); resetRace(); };
  const updateFocusedConfig = (key: keyof OptimizerConfig, value: number) => { setTunedConfigs((current) => ({ ...current, [focused]: { ...current[focused], [key]: value } })); resetRace(); };
  const updateSharedRate = (value: number) => { setSharedLearningRate(value); resetRace(); };
  const chooseLandscape = (next: LossLandscape) => { setLandscapeId(next.id); setStart({ ...next.defaultStart }); resetRace(); };
  const restoreSettings = () => { setTunedConfigs(cloneOptimizerConfigs()); setSharedLearningRate(0.07); setStart({ ...landscape.defaultStart }); resetRace(); };
  const statusFor = (trajectory: Trajectory): "diverged" | "finished" | "racing" | "paused" => {
    if (trajectory.diverged) return "diverged";
    if (effectiveStep >= MAX_STEPS) return "finished";
    return isRacing ? "racing" : "paused";
  };

  return (
    <DemoPage width="2xl">
      <DemoHeader
        eyebrow="Optimization / terrain versus update rules"
        title="Optimizer Racetrack"
        description="Question: how do update rules react to the same geometry? Pick a terrain, keep the learning rate matched for a controlled comparison, or tune each optimizer openly."
        actions={<div className="flex flex-wrap gap-2"><button type="button" onClick={() => { if (effectiveStep >= MAX_STEPS) { setStep(0); setRacing(true); } else setRacing((current) => !current); }} className="border border-cyan-500 bg-cyan-500/10 px-3 py-2 font-mono text-xs uppercase tracking-[0.14em] text-cyan-700 transition hover:bg-cyan-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 dark:text-cyan-300">{effectiveStep >= MAX_STEPS ? "Race again" : isRacing ? "Pause" : "Race"}</button><button type="button" onClick={() => setStep((current) => Math.min(MAX_STEPS, current + 1))} className="border border-[var(--line)] px-3 py-2 font-mono text-xs uppercase tracking-[0.14em] text-neutral-500 transition hover:border-cyan-500/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500">Step</button><button type="button" onClick={resetRace} className="border border-[var(--line)] px-3 py-2 font-mono text-xs uppercase tracking-[0.14em] text-neutral-500 transition hover:border-cyan-500/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500">Reset race</button></div>}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <DemoPanel title="Pick a terrain" description="These are analytical losses, so every height and gradient is exact and inspectable." padding="md">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {Object.values(LANDSCAPES).map((candidate) => <button key={candidate.id} type="button" onClick={() => chooseLandscape(candidate)} aria-pressed={landscape.id === candidate.id} className={`border p-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 ${landscape.id === candidate.id ? "border-cyan-500 bg-cyan-500/8 text-cyan-700 dark:text-cyan-300" : "border-[var(--line)] text-neutral-500 hover:border-cyan-500/60"}`}><span className="font-mono text-xs uppercase tracking-[0.12em]">{candidate.shortLabel}</span><span className="mt-1 block text-[11px] leading-relaxed">{candidate.description}</span></button>)}
          </div>
        </DemoPanel>
        <DemoPanel title="Choose the comparison rule" description="Both modes are useful when their purpose is explicit." padding="md">
          <div className="grid grid-cols-2 gap-1">
            <button type="button" onClick={() => { setComparisonMode("matched"); resetRace(); }} aria-pressed={comparisonMode === "matched"} className={`border px-3 py-2 font-mono text-xs uppercase tracking-[0.1em] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 ${comparisonMode === "matched" ? "border-cyan-500 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300" : "border-[var(--line)] text-neutral-500 hover:border-cyan-500/60"}`}>Matched rate</button>
            <button type="button" onClick={() => { setComparisonMode("tuned"); resetRace(); }} aria-pressed={comparisonMode === "tuned"} className={`border px-3 py-2 font-mono text-xs uppercase tracking-[0.1em] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 ${comparisonMode === "tuned" ? "border-cyan-500 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300" : "border-[var(--line)] text-neutral-500 hover:border-cyan-500/60"}`}>Tune each</button>
          </div>
          <p className="mt-3 text-sm text-neutral-500">{comparisonMode === "matched" ? "Every trace receives the same η. This isolates the update rules while still letting you adjust their own β, ρ, and ε settings." : "Each optimizer has its own η and its own named settings. Compare performance carefully because this is now a tuning experiment."}</p>
        </DemoPanel>
      </div>

      <div className="mt-6 grid gap-6 xl:items-start xl:grid-cols-[minmax(0,1.5fr)_minmax(350px,0.7fr)]">
        <DemoPanel title={landscape.label} description="Pale center means lower loss. Click a trace or its legend to choose the optimizer whose settings you want to inspect." padding="none">
          <Track landscape={landscape} trajectories={trajectories} step={effectiveStep} focused={focused} onFocus={setFocused} />
          <div className="flex items-center justify-between gap-3 border-t border-[var(--line)] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-neutral-500">
            <span>Inspecting</span>
            <span className="flex items-center gap-2 text-foreground dark:text-neutral-100">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: OPTIMIZER_META[focused].color }} />
              {OPTIMIZER_META[focused].label}
              <span className="text-neutral-500">open settings</span>
            </span>
          </div>
          <div className="grid grid-cols-2 gap-px border-t border-[var(--line)] bg-[var(--line)] sm:grid-cols-4">
            {NAMES.map((name) => { const meta = OPTIMIZER_META[name]; const active = focused === name; return <button key={name} type="button" onClick={() => setFocused(name)} aria-pressed={active} className={`bg-[var(--surface)] px-3 py-2 text-left font-mono text-xs transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 ${active ? "bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)]" : "hover:bg-[color-mix(in_srgb,var(--foreground)_3%,transparent)]"}`}><span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} /><span className="ml-2 uppercase tracking-[0.12em]">{meta.label}</span></button>; })}
          </div>
        </DemoPanel>

        <div className="space-y-6">
          <DemoPanel title="Race controls" description="Change where every optimizer starts, then scrub or run the shared clock." padding="md">
            <div className="space-y-3">
              <NumberControl label="start θ₁" value={start.x} min={landscape.bounds.xMin} max={landscape.bounds.xMax} step={0.05} onChange={(value) => updateStart("x", value)} />
              <NumberControl label="start θ₂" value={start.y} min={landscape.bounds.yMin} max={landscape.bounds.yMax} step={0.05} onChange={(value) => updateStart("y", value)} tone="amber" />
              {comparisonMode === "matched" && <NumberControl label="shared learning rate η" value={sharedLearningRate} min={0.001} max={0.3} step={0.001} onChange={updateSharedRate} />}
            </div>
            <label className="mt-5 block font-mono text-xs uppercase tracking-[0.14em] text-neutral-500">clock <span className="ml-2 text-cyan-700 dark:text-cyan-300">{effectiveStep} / {MAX_STEPS}</span><input type="range" min="0" max={MAX_STEPS} step="1" value={effectiveStep} onChange={(event) => { setRacing(false); setStep(Number(event.target.value)); }} className="mt-3 block w-full accent-cyan-500" /></label>
            {anyDiverged && <p className="mt-4 border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-700 dark:text-red-300">At least one trace left the displayed terrain. That is a genuine consequence of its current settings, not a clipped animation.</p>}
          </DemoPanel>
          <SettingsPanel focused={focused} config={tunedConfigs[focused]} comparisonMode={comparisonMode} sharedLearningRate={sharedLearningRate} onSharedLearningRate={updateSharedRate} onConfigChange={updateFocusedConfig} />
          <button type="button" onClick={restoreSettings} className="w-full border border-[var(--line)] px-3 py-2 font-mono text-xs uppercase tracking-[0.14em] text-neutral-500 transition hover:border-cyan-500/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500">Restore default settings for this terrain</button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
        <DemoPanel title="Live lap board" description="The highlighted row is the path drawn brightest on the terrain." padding="md">
          <div className="overflow-x-auto"><table className="min-w-[660px] w-full border-collapse font-mono text-xs"><thead className="border-b border-[var(--line)] text-left text-[10px] uppercase tracking-[0.14em] text-neutral-500"><tr><th className="pb-2 font-normal">optimizer</th><th className="pb-2 font-normal">learning rate</th><th className="pb-2 font-normal">current loss</th><th className="pb-2 font-normal">best loss</th><th className="pb-2 text-right font-normal">status</th></tr></thead><tbody>{trajectories.map((trajectory) => { const meta = OPTIMIZER_META[trajectory.name]; const currentLoss = lossAt(trajectory, effectiveStep); const best = Math.min(...trajectory.losses.slice(0, Math.min(effectiveStep + 1, trajectory.losses.length))); const status = statusFor(trajectory); const statusClass = status === "diverged" ? "text-red-600 dark:text-red-400" : status === "finished" ? "text-emerald-600 dark:text-emerald-400" : status === "racing" ? "text-cyan-700 dark:text-cyan-300" : "text-neutral-500"; return <tr key={trajectory.name} className={`border-b border-[var(--line)] ${focused === trajectory.name ? "bg-[color-mix(in_srgb,var(--foreground)_4%,transparent)]" : ""}`}><td className="py-2.5"><button type="button" onClick={() => setFocused(trajectory.name)} className="flex items-center gap-2 hover:text-cyan-700 dark:hover:text-cyan-300"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} /><span>{meta.label}</span></button></td><td className="py-2.5 tabular-nums text-neutral-500">{effectiveConfigs[trajectory.name].learningRate.toFixed(3)}</td><td className="py-2.5 tabular-nums">{currentLoss.toFixed(5)}</td><td className="py-2.5 tabular-nums text-neutral-500">{best.toFixed(5)}</td><td className={`py-2.5 text-right uppercase tracking-[0.12em] ${statusClass}`}>{status}</td></tr>; })}</tbody></table></div>
        </DemoPanel>
        <DemoPanel title="What this terrain is testing" padding="md">
          <div className="border border-cyan-500/25 bg-cyan-500/5 p-3 font-mono text-sm text-cyan-800 dark:text-cyan-200">{landscape.equation}</div>
          <p className="mt-4 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{landscape.description}</p>
          <p className="mt-4 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">No optimizer is universally best. The map lets you separate a controlled same-rate comparison from a transparent tuning exercise, rather than hiding that choice.</p>
        </DemoPanel>
      </div>

      <DemoFootnote align="left">This is a deterministic analytical loss, not a model trained in the browser. It isolates optimizer behavior without a dataset or network obscuring the geometry.</DemoFootnote>
    </DemoPage>
  );
}
