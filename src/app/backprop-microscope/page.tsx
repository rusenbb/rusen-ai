"use client";

import { useMemo, useState } from "react";

import { DemoFootnote, DemoHeader, DemoPage, DemoPanel } from "@/components/ui";

import {
  DEFAULT_TARGET,
  INITIAL_WEIGHT,
  LEARNING_RATE,
  SAMPLE_INPUT,
  evaluateNeuron,
  neuronFiniteDifference,
  trainNeuron,
  type NeuronComputation,
  type TrainingStep,
} from "./math";

const TRAIN_MANY_STEPS = 8;

function fmt(value: number, digits = 3): string {
  return Number.isFinite(value) ? value.toFixed(digits) : "n/a";
}

function signed(value: number, digits = 3): string {
  return `${value >= 0 ? "+" : ""}${fmt(value, digits)}`;
}

function pathForWeight(weight: number): string {
  const left = 58;
  const top = 28;
  const width = 650;
  const height = 330;
  const toX = (value: number) => left + ((value + 1) / 2) * width;
  const toY = (value: number) => top + ((1 - value) / 2) * height;

  return Array.from({ length: 121 }, (_, index) => {
    const input = -1 + (index / 120) * 2;
    const output = Math.tanh(weight * input);
    return `${index === 0 ? "M" : "L"}${toX(input).toFixed(2)} ${toY(output).toFixed(2)}`;
  }).join(" ");
}

function CurvePlot({
  computation,
  target,
}: {
  computation: NeuronComputation;
  target: number;
}) {
  const left = 58;
  const top = 28;
  const width = 650;
  const height = 330;
  const bottom = top + height;
  const right = left + width;
  const toX = (value: number) => left + ((value + 1) / 2) * width;
  const toY = (value: number) => top + ((1 - value) / 2) * height;
  const sampleX = toX(SAMPLE_INPUT);
  const targetY = toY(target);
  const predictionY = toY(computation.prediction);
  const errorLabelY = (targetY + predictionY) / 2;
  const isPredictionAbove = computation.error > 0;

  return (
    <svg
      viewBox="0 0 760 410"
      className="w-full overflow-visible"
      role="img"
      aria-label={`A tanh curve with a prediction of ${fmt(computation.prediction, 2)} and a target of ${fmt(target, 2)} at input ${SAMPLE_INPUT}`}
    >
      <defs>
        <linearGradient id="neuron-curve-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgb(217 70 239)" stopOpacity="0.2" />
          <stop offset="100%" stopColor="rgb(217 70 239)" stopOpacity="0" />
        </linearGradient>
        <marker id="error-cap" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 z" className="fill-red-500" />
        </marker>
      </defs>

      {[-1, -0.5, 0, 0.5, 1].map((tick) => (
        <g key={`horizontal-${tick}`}>
          <line x1={left} x2={right} y1={toY(tick)} y2={toY(tick)} className={tick === 0 ? "stroke-neutral-400 dark:stroke-neutral-500" : "stroke-neutral-200 dark:stroke-neutral-800"} strokeWidth={tick === 0 ? "1.5" : "1"} />
          <text x={left - 12} y={toY(tick) + 4} textAnchor="end" className="fill-current text-[10px] font-mono text-neutral-500">{tick}</text>
        </g>
      ))}
      {[-1, -0.5, 0, 0.5, 1].map((tick) => (
        <g key={`vertical-${tick}`}>
          <line x1={toX(tick)} x2={toX(tick)} y1={top} y2={bottom} className={tick === 0 ? "stroke-neutral-400 dark:stroke-neutral-500" : "stroke-neutral-200 dark:stroke-neutral-800"} strokeWidth={tick === 0 ? "1.5" : "1"} />
          <text x={toX(tick)} y={bottom + 21} textAnchor="middle" className="fill-current text-[10px] font-mono text-neutral-500">{tick}</text>
        </g>
      ))}

      <path d={`${pathForWeight(computation.weight)} L ${toX(1)} ${toY(0)} L ${toX(-1)} ${toY(0)} Z`} fill="url(#neuron-curve-fill)" />
      <path d={pathForWeight(computation.weight)} fill="none" className="stroke-fuchsia-500" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
      <line x1={sampleX} x2={sampleX} y1={top} y2={bottom} className="stroke-cyan-500/55 stroke-dashed" strokeWidth="1.5" />
      <text x={sampleX} y={top - 9} textAnchor="middle" className="fill-cyan-700 text-[10px] font-mono dark:fill-cyan-300">training input x = {SAMPLE_INPUT}</text>

      <line
        x1={sampleX}
        x2={sampleX}
        y1={predictionY}
        y2={targetY}
        className="stroke-red-500"
        strokeWidth="2.5"
        markerStart="url(#error-cap)"
        markerEnd="url(#error-cap)"
      />
      <rect x={sampleX + 12} y={errorLabelY - 12} width="79" height="23" rx="3" className="fill-[var(--surface)] stroke-red-500/45" />
      <text x={sampleX + 51.5} y={errorLabelY + 4} textAnchor="middle" className="fill-red-600 text-[11px] font-mono dark:fill-red-300">error {fmt(Math.abs(computation.error), 2)}</text>

      <circle cx={sampleX} cy={predictionY} r="8" className="fill-fuchsia-500 stroke-[var(--surface)]" strokeWidth="3" />
      <text x={sampleX + 13} y={predictionY + (isPredictionAbove ? -11 : 20)} className="fill-fuchsia-700 text-[11px] font-mono dark:fill-fuchsia-300">prediction {fmt(computation.prediction, 2)}</text>
      <path d={`M ${sampleX - 8} ${targetY} L ${sampleX + 8} ${targetY} M ${sampleX} ${targetY - 8} L ${sampleX} ${targetY + 8}`} className="stroke-amber-500" strokeWidth="3" strokeLinecap="round" />
      <text x={sampleX + 13} y={targetY + (isPredictionAbove ? 20 : -11)} className="fill-amber-700 text-[11px] font-mono dark:fill-amber-300">target {fmt(target, 2)}</text>

      <text x={right} y={bottom + 45} textAnchor="end" className="fill-current text-[11px] font-mono text-neutral-500">input x</text>
      <text x={left - 43} y={top} textAnchor="middle" transform={`rotate(-90 ${left - 43} ${top})`} className="fill-current text-[11px] font-mono text-neutral-500">output ŷ</text>
    </svg>
  );
}

function CurrentState({ computation }: { computation: NeuronComputation }) {
  return (
    <div className="grid grid-cols-3 gap-px border border-[var(--line)] bg-[var(--line)] font-mono text-xs">
      <div className="bg-[var(--surface)] p-3">
        <span className="block text-[10px] uppercase tracking-[0.13em] text-neutral-500">prediction</span>
        <strong className="mt-1 block text-base tabular-nums text-fuchsia-700 dark:text-fuchsia-300">{signed(computation.prediction, 2)}</strong>
      </div>
      <div className="bg-[var(--surface)] p-3">
        <span className="block text-[10px] uppercase tracking-[0.13em] text-neutral-500">target</span>
        <strong className="mt-1 block text-base tabular-nums text-amber-700 dark:text-amber-300">{signed(computation.target, 2)}</strong>
      </div>
      <div className="bg-[var(--surface)] p-3">
        <span className="block text-[10px] uppercase tracking-[0.13em] text-neutral-500">loss</span>
        <strong className="mt-1 block text-base tabular-nums text-red-700 dark:text-red-300">{fmt(computation.loss, 3)}</strong>
      </div>
    </div>
  );
}

function StepReceipt({ step }: { step: TrainingStep | null }) {
  if (!step) {
    return (
      <div className="border border-[var(--line)] bg-[color-mix(in_srgb,var(--foreground)_3%,transparent)] p-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500">What will change?</span>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">The red gap is sent backward to the only adjustable knob, <span className="font-mono text-fuchsia-700 dark:text-fuchsia-300">w</span>. A target above the curve raises the curve at this input; a target below it lowers the curve.</p>
      </div>
    );
  }

  const lossImproved = step.after.loss < step.before.loss;
  return (
    <div className="border border-emerald-500/45 bg-emerald-500/[0.055] p-4">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">After {step.steps === 1 ? "one step" : `${step.steps} steps`}</span>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <p className="font-mono text-sm tabular-nums text-neutral-700 dark:text-neutral-200"><span className="text-neutral-500">weight </span>{fmt(step.weightBefore, 3)} <span className="text-emerald-600 dark:text-emerald-300">→</span> {fmt(step.weightAfter, 3)}</p>
        <p className="font-mono text-sm tabular-nums text-neutral-700 dark:text-neutral-200"><span className="text-neutral-500">loss </span>{fmt(step.before.loss, 3)} <span className="text-emerald-600 dark:text-emerald-300">→</span> {fmt(step.after.loss, 3)}</p>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{lossImproved ? "The curve moved toward the dot, so the error shrank." : "This step did not shrink the loss. Try resetting or moving the target away from tanh's flat extremes."}</p>
    </div>
  );
}

export default function BackpropMicroscopePage() {
  const [target, setTarget] = useState(DEFAULT_TARGET);
  const [weight, setWeight] = useState(INITIAL_WEIGHT);
  const [lastStep, setLastStep] = useState<TrainingStep | null>(null);
  const computation = useMemo(
    () => evaluateNeuron(SAMPLE_INPUT, target, weight),
    [target, weight],
  );
  const finiteDifference = useMemo(
    () => neuronFiniteDifference(SAMPLE_INPUT, target, weight),
    [target, weight],
  );

  const train = (steps: number) => {
    const step = trainNeuron(SAMPLE_INPUT, target, weight, steps);
    setWeight(step.weightAfter);
    setLastStep(step);
  };

  const changeTarget = (nextTarget: number) => {
    setTarget(nextTarget);
    setLastStep(null);
  };

  const reset = () => {
    setWeight(INITIAL_WEIGHT);
    setLastStep(null);
  };

  return (
    <DemoPage width="xl">
      <DemoHeader
        eyebrow="Neural nets / one exact backward pass"
        title="Make the Curve Hit the Dot"
        description="A neuron is trying to hit one target. Move the target, then watch one gradient update change the tanh curve itself."
      />

      <DemoPanel title="One neuron, one mistake" description="The purple curve is ŷ = tanh(w · x). The red gap is the one prediction mistake that backpropagation sends back to w." padding="md">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_270px] xl:items-start">
          <div className="min-w-0">
            <CurvePlot computation={computation} target={target} />
            <CurrentState computation={computation} />
          </div>

          <aside className="border border-[var(--line)] bg-[color-mix(in_srgb,var(--foreground)_3%,transparent)] p-4">
            <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-amber-700 dark:text-amber-300">Move the dot</span>
            <label className="mt-3 block">
              <span className="flex items-baseline justify-between gap-3 font-mono text-xs uppercase tracking-[0.12em] text-neutral-600 dark:text-neutral-300">
                Target height <strong className="text-lg text-amber-700 dark:text-amber-300">{signed(target, 2)}</strong>
              </span>
              <input
                type="range"
                min="-0.9"
                max="0.9"
                step="0.05"
                value={target}
                onChange={(event) => changeTarget(Number(event.target.value))}
                className="mt-4 block w-full accent-amber-500"
                aria-label="Target height"
              />
              <span className="mt-2 flex justify-between font-mono text-[10px] uppercase tracking-[0.1em] text-neutral-500"><span>low</span><span>high</span></span>
            </label>

            <div className="mt-6 grid gap-2">
              <button type="button" onClick={() => train(1)} className="border border-fuchsia-500 bg-fuchsia-500/10 px-3 py-2.5 font-mono text-xs uppercase tracking-[0.13em] text-fuchsia-700 transition hover:bg-fuchsia-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-500 dark:text-fuchsia-300">Step once</button>
              <button type="button" onClick={() => train(TRAIN_MANY_STEPS)} className="border border-cyan-500/50 bg-cyan-500/[0.045] px-3 py-2.5 font-mono text-xs uppercase tracking-[0.13em] text-cyan-700 transition hover:bg-cyan-500/[0.1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 dark:text-cyan-300">Train {TRAIN_MANY_STEPS} steps</button>
              <button type="button" onClick={reset} className="border border-[var(--line)] px-3 py-2.5 font-mono text-xs uppercase tracking-[0.13em] text-neutral-500 transition hover:border-neutral-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-500">Reset curve</button>
            </div>
            <p className="mt-5 border-l-2 border-cyan-500 pl-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">The learning rate is fixed at <span className="font-mono text-cyan-700 dark:text-cyan-300">{LEARNING_RATE}</span> so this stays about one idea: how an error tells one parameter which way to move.</p>
          </aside>
        </div>
      </DemoPanel>

      <section className="mt-6">
        <StepReceipt step={lastStep} />
      </section>

      <details className="mt-6 border border-[var(--line)] bg-[var(--surface)]">
        <summary className="cursor-pointer px-4 py-3 font-mono text-xs uppercase tracking-[0.14em] text-neutral-600 transition hover:text-fuchsia-700 dark:text-neutral-300 dark:hover:text-fuchsia-300">Inspect the compact chain rule</summary>
        <div className="border-t border-[var(--line)] p-4">
          <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">This is the full backwards calculation for the one knob in the picture. The finite difference is an independent numerical check, not the value used to train.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 font-mono text-xs">
            <div className="border border-red-500/30 bg-red-500/[0.045] p-3"><span className="block text-[10px] uppercase tracking-[0.12em] text-neutral-500">prediction error</span><strong className="mt-1 block text-base tabular-nums text-red-700 dark:text-red-300">{fmt(computation.error, 5)}</strong></div>
            <div className="border border-amber-500/30 bg-amber-500/[0.045] p-3"><span className="block text-[10px] uppercase tracking-[0.12em] text-neutral-500">tanh local slope</span><strong className="mt-1 block text-base tabular-nums text-amber-700 dark:text-amber-300">{fmt(computation.localSlope, 5)}</strong></div>
            <div className="border border-cyan-500/30 bg-cyan-500/[0.045] p-3"><span className="block text-[10px] uppercase tracking-[0.12em] text-neutral-500">input x</span><strong className="mt-1 block text-base tabular-nums text-cyan-700 dark:text-cyan-300">{fmt(SAMPLE_INPUT, 2)}</strong></div>
            <div className="border border-fuchsia-500/30 bg-fuchsia-500/[0.045] p-3"><span className="block text-[10px] uppercase tracking-[0.12em] text-neutral-500">gradient ∂L/∂w</span><strong className="mt-1 block text-base tabular-nums text-fuchsia-700 dark:text-fuchsia-300">{fmt(computation.gradient, 5)}</strong></div>
          </div>
          <p className="mt-4 font-mono text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">∂L/∂w = (ŷ - y) × (1 - ŷ²) × x = {fmt(computation.gradient, 6)}. Finite difference: {fmt(finiteDifference, 6)}.</p>
        </div>
      </details>

      <DemoFootnote align="left">This is a genuine reverse-mode derivative for one nonlinear neuron, not a trained model or a claim about a larger network. Larger networks repeat this local rule across many parameters.</DemoFootnote>
    </DemoPage>
  );
}
