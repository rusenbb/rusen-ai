"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";

import { DemoFootnote, DemoHeader, DemoPage, DemoPanel } from "@/components/ui";

import { DIGIT_SAMPLE_COUNT } from "./digits-data";
import {
  DIGIT_DATASET_DESCRIPTION,
  attackDigit,
  classifyDigit,
  createDigitSplit,
  probabilityOfEight,
  randomNudge,
  trainDigitClassifier,
  vulnerableHeldOutSamples,
  type DigitLabel,
  type TinyDigitClassifier,
} from "./model";

const MAX_EPSILON = 0.4;

type HeldOutCandidate = ReturnType<typeof vulnerableHeldOutSamples>[number];

interface ModelSession {
  classifier: TinyDigitClassifier;
  candidates: HeldOutCandidate[];
  trainingCount: number;
  testingCount: number;
}

function percent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatEpsilon(value: number): string {
  return value.toFixed(3);
}

function confidenceOf(label: DigitLabel, probabilityOfEightValue: number): number {
  return label === 8 ? probabilityOfEightValue : 1 - probabilityOfEightValue;
}

function maximumPixelChange(before: readonly number[], after: readonly number[]): number {
  return before.reduce((largest, value, index) => Math.max(largest, Math.abs((after[index] ?? value) - value)), 0);
}

function suggestedEpsilon(minimumEpsilon: number | null): number {
  if (minimumEpsilon === null) return 0.12;
  return Math.min(MAX_EPSILON, Math.max(0.03, Math.ceil((minimumEpsilon + 0.02) * 100) / 100));
}

function digitFill(value: number): string {
  const luminance = Math.round(10 + value * 85);
  return `hsl(196 88% ${luminance}%)`;
}

function perturbationFill(value: number, scale: number): string {
  const amount = Math.min(1, Math.abs(value) / Math.max(scale, 0.001));
  if (amount < 0.01) return "rgb(20 28 42)";
  const lightness = 29 + amount * 40;
  return value > 0
    ? `hsl(187 92% ${lightness}%)`
    : `hsl(343 88% ${lightness}%)`;
}

function PixelImage({
  pixels,
  label,
  perturbation,
  scale = 1,
  compact = false,
}: {
  pixels: readonly number[];
  label: string;
  perturbation?: boolean;
  scale?: number;
  compact?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 8 8"
      className={`mx-auto block w-full rounded-sm bg-[#060a12] p-1 ${compact ? "max-w-[132px]" : "max-w-[230px]"}`}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
    >
      {pixels.map((value, index) => {
        const row = Math.floor(index / 8);
        const column = index % 8;
        return (
          <rect
            key={index}
            x={column + 0.06}
            y={row + 0.06}
            width="0.88"
            height="0.88"
            rx="0.06"
            fill={perturbation ? perturbationFill(value, scale) : digitFill(value)}
          />
        );
      })}
    </svg>
  );
}

function PredictionReadout({
  probability,
  truth,
  label,
}: {
  probability: number;
  truth: DigitLabel;
  label: string;
}) {
  const predicted = classifyDigit(probability);
  const correct = predicted === truth;
  return (
    <div className="mt-4 border-t border-[var(--line)] pt-3">
      <span className="block font-mono text-[10px] uppercase tracking-[0.13em] text-neutral-500">{label}</span>
      <strong className={`mt-1 block text-lg ${correct ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}>model says {predicted}</strong>
      <span className="mt-1 block font-mono text-xs tabular-nums text-neutral-500">confidence {percent(confidenceOf(predicted, probability))} · P(8) {percent(probability)}</span>
    </div>
  );
}

function ImageStage({
  eyebrow,
  title,
  description,
  children,
  tone = "neutral",
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  tone?: "neutral" | "cyan" | "rose";
}) {
  const toneClass = {
    neutral: "border-[var(--line)] bg-[color-mix(in_srgb,var(--foreground)_2%,transparent)]",
    cyan: "border-cyan-500/40 bg-cyan-500/[0.035]",
    rose: "border-rose-500/40 bg-rose-500/[0.035]",
  }[tone];

  return (
    <section className={`border p-4 sm:p-5 ${toneClass}`}>
      <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-neutral-500">{eyebrow}</span>
      <h3 className="mt-2 text-base font-semibold text-neutral-900 dark:text-neutral-100">{title}</h3>
      <p className="mt-1 min-h-10 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">{description}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function TrainingFacts({ session, candidate }: { session: ModelSession; candidate: HeldOutCandidate }) {
  return (
    <div className="grid gap-px border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2 xl:grid-cols-4">
      <div className="bg-[var(--surface)] p-3">
        <span className="block font-mono text-[10px] uppercase tracking-[0.13em] text-neutral-500">real source</span>
        <strong className="mt-1 block text-sm leading-snug text-neutral-800 dark:text-neutral-100">sklearn digits, 8 × 8</strong>
        <span className="mt-1 block text-xs leading-relaxed text-neutral-500">{DIGIT_SAMPLE_COUNT} bundled handwritten 3s and 8s</span>
      </div>
      <div className="bg-[var(--surface)] p-3">
        <span className="block font-mono text-[10px] uppercase tracking-[0.13em] text-neutral-500">model</span>
        <strong className="mt-1 block text-sm leading-snug text-cyan-700 dark:text-cyan-300">trained in this browser</strong>
        <span className="mt-1 block text-xs leading-relaxed text-neutral-500">64-pixel logistic classifier, {session.classifier.epochs} full-batch steps</span>
      </div>
      <div className="bg-[var(--surface)] p-3">
        <span className="block font-mono text-[10px] uppercase tracking-[0.13em] text-neutral-500">held-out result</span>
        <strong className="mt-1 block text-sm leading-snug text-emerald-700 dark:text-emerald-300">correct before attack</strong>
        <span className="mt-1 block text-xs leading-relaxed text-neutral-500">bundled image #{candidate.sample.sourceIndex} was not in the {session.trainingCount}-image training split</span>
      </div>
      <div className="bg-[var(--surface)] p-3">
        <span className="block font-mono text-[10px] uppercase tracking-[0.13em] text-neutral-500">held-out accuracy</span>
        <strong className="mt-1 block font-mono text-lg tabular-nums text-neutral-800 dark:text-neutral-100">{percent(session.classifier.testAccuracy)}</strong>
        <span className="mt-1 block text-xs leading-relaxed text-neutral-500">on {session.testingCount} unseen images</span>
      </div>
    </div>
  );
}

function LoadingState({ error }: { error: string | null }) {
  return (
    <DemoPanel
      title={error ? "Could not prepare the local model" : "Training locally in this browser"}
      description="The page uses real bundled 8 × 8 digit pixels. No model checkpoint is downloaded or hidden."
      padding="md"
    >
      <div className={`border p-5 ${error ? "border-rose-500/45 bg-rose-500/[0.055]" : "border-cyan-500/35 bg-cyan-500/[0.045]"}`} role="status">
        <p className="font-mono text-sm text-neutral-800 dark:text-neutral-100">{error ?? "Fitting a 64-input logistic classifier on the 75% training split..."}</p>
        {!error && <p className="mt-2 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">The held-out image and every attack result will appear as soon as the deterministic local training pass finishes.</p>}
      </div>
    </DemoPanel>
  );
}

export default function AdversarialSketchPage() {
  const [session, setSession] = useState<ModelSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sampleIndex, setSampleIndex] = useState(0);
  const [epsilon, setEpsilon] = useState(0.03);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      try {
        const split = createDigitSplit();
        const classifier = trainDigitClassifier(split.training, split.testing);
        const candidates = vulnerableHeldOutSamples(classifier, split.testing);
        if (!candidates.length) throw new Error("No correctly classified held-out digits were available.");
        if (!active) return;
        setSession({ classifier, candidates, trainingCount: split.training.length, testingCount: split.testing.length });
        setEpsilon(suggestedEpsilon(candidates[0].minimumEpsilon));
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : "Unknown local training error.");
      }
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  const candidate = session?.candidates[sampleIndex] ?? session?.candidates[0] ?? null;
  const sample = candidate?.sample ?? null;
  const attack = useMemo(
    () => session && sample ? attackDigit(session.classifier, sample, epsilon) : null,
    [epsilon, sample, session],
  );
  const randomPixels = useMemo(
    () => sample ? randomNudge(sample, epsilon) : null,
    [epsilon, sample],
  );

  const chooseExample = (direction: -1 | 1) => {
    if (!session) return;
    const nextIndex = (sampleIndex + direction + session.candidates.length) % session.candidates.length;
    setSampleIndex(nextIndex);
    setEpsilon(suggestedEpsilon(session.candidates[nextIndex].minimumEpsilon));
  };

  if (!session || !candidate || !sample || !attack || !randomPixels) {
    return (
      <DemoPage width="2xl">
        <DemoHeader
          eyebrow="Adversarial examples / real 8 × 8 digits"
          title="Pixel Nudge"
          description="A tiny, model-directed change can make a real held-out digit cross a classifier boundary. This page trains its small classifier in your browser before showing the result."
        />
        <LoadingState error={error} />
        <DemoFootnote align="left">Source: {DIGIT_DATASET_DESCRIPTION}</DemoFootnote>
      </DemoPage>
    );
  }

  const originalProbability = attack.originalProbabilityOfEight;
  const attackedProbability = attack.attackedProbabilityOfEight;
  const randomProbability = probabilityOfEight(session.classifier, randomPixels);
  const originalPrediction = attack.originalLabel;
  const attackedPrediction = attack.attackedLabel;
  const randomPrediction = classifyDigit(randomProbability);
  const attackFlipped = attackedPrediction !== sample.label;
  const randomFlipped = randomPrediction !== sample.label;
  const randomActualEpsilon = maximumPixelChange(sample.pixels, randomPixels);

  return (
    <DemoPage width="2xl">
      <DemoHeader
        eyebrow="Adversarial examples / real 8 × 8 digits"
        title="Pixel Nudge"
        description="The classifier gets this real held-out digit right. Slide epsilon to add a bounded pixel nudge chosen from its own gradient, then compare it with equally sized random noise."
      />

      <TrainingFacts session={session} candidate={candidate} />

      <DemoPanel title={`One held-out handwritten ${sample.label}`} description="The three pictures are the same 8 × 8 image before, during, and after an input-gradient attack. The middle view exaggerates direction so a small nudge is visible." padding="md" className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-4">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500">example {sampleIndex + 1} of {session.candidates.length}</span>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">Bundled image #{sample.sourceIndex}, true label {sample.label}, and correctly predicted as {originalPrediction} before any change.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => chooseExample(-1)} className="border border-[var(--line)] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-neutral-600 transition hover:border-cyan-500/60 hover:text-cyan-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 dark:text-neutral-300 dark:hover:text-cyan-300">Previous</button>
            <button type="button" onClick={() => chooseExample(1)} className="border border-[var(--line)] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-neutral-600 transition hover:border-cyan-500/60 hover:text-cyan-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 dark:text-neutral-300 dark:hover:text-cyan-300">Next digit</button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <ImageStage eyebrow="01 / original" title={`Real digit ${sample.label}`} description="A held-out source image at its original 8 × 8 resolution.">
            <PixelImage pixels={sample.pixels} label={`Original held-out handwritten digit ${sample.label}`} />
            <PredictionReadout probability={originalProbability} truth={sample.label} label="before nudge" />
          </ImageStage>
          <ImageStage eyebrow="02 / gradient nudge" title="Magnified pixel changes" description="Cyan pixels brighten; rose pixels darken. The color strength is magnified only for viewing." tone="cyan">
            <PixelImage pixels={attack.perturbation} perturbation scale={epsilon} label="Magnified signed gradient perturbation" />
            <div className="mt-4 border-t border-[var(--line)] pt-3 font-mono text-xs tabular-nums text-neutral-500"><span className="block">requested ε {formatEpsilon(epsilon)}</span><span className="mt-1 block">actual max change {formatEpsilon(attack.epsilon)}</span></div>
          </ImageStage>
          <ImageStage eyebrow="03 / after nudge" title="Same digit, nudged pixels" description="The image is clipped to valid 0 to 1 pixel values before the classifier reads it." tone="rose">
            <PixelImage pixels={attack.pixels} label="Digit after the model-directed pixel nudge" />
            <PredictionReadout probability={attackedProbability} truth={sample.label} label="after nudge" />
          </ImageStage>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.68fr)] lg:items-center">
          <label className="block border border-cyan-500/35 bg-cyan-500/[0.045] p-4 sm:p-5">
            <span className="flex items-baseline justify-between gap-3 font-mono text-xs uppercase tracking-[0.14em] text-neutral-600 dark:text-neutral-300"><span>Nudge size ε</span><strong className="text-xl text-cyan-700 dark:text-cyan-300">{formatEpsilon(epsilon)}</strong></span>
            <input aria-label="Pixel attack epsilon" type="range" min="0" max={MAX_EPSILON} step="0.005" value={epsilon} onChange={(event) => setEpsilon(Number(event.target.value))} className="mt-4 block w-full accent-cyan-500" />
            <span className="mt-2 flex justify-between font-mono text-[10px] uppercase tracking-[0.1em] text-neutral-500"><span>no pixel change</span><span>max {MAX_EPSILON}</span></span>
            <p className="mt-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{candidate.minimumEpsilon === null ? `No gradient-sign flip was found for this held-out image by ε = ${MAX_EPSILON}. That is a valid no-flip case.` : `This held-out image first crosses the model boundary at about ε = ${formatEpsilon(candidate.minimumEpsilon)}.`}</p>
          </label>

          <div className={`border p-5 ${attackFlipped ? "border-rose-500/55 bg-rose-500/[0.06]" : "border-amber-500/50 bg-amber-500/[0.055]"}`}>
            <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-neutral-500">held-out attack result</span>
            <h3 className={`mt-2 text-xl font-semibold ${attackFlipped ? "text-rose-700 dark:text-rose-300" : "text-amber-700 dark:text-amber-300"}`}>{attackFlipped ? `${sample.label} → ${attackedPrediction}: label flipped` : `No flip at ε = ${formatEpsilon(epsilon)}`}</h3>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{attackFlipped ? "The bounded, model-directed nudge crosses this classifier's decision threshold." : "This is still a valid result. The nudge is changing confidence, but it has not crossed the classifier threshold at this budget."}</p>
            <p className="mt-3 font-mono text-xs tabular-nums text-neutral-500">P(8): {percent(originalProbability)} → {percent(attackedProbability)}</p>
          </div>
        </div>
      </DemoPanel>

      <DemoPanel title="Same size, random direction" description="This baseline uses the same requested epsilon and a fixed random plus-or-minus direction for each pixel. It is one comparison, not a guarantee about all random noise." padding="md" className="mt-6">
        <div className="grid gap-5 sm:grid-cols-[150px_minmax(0,1fr)] sm:items-center">
          <PixelImage pixels={randomPixels} compact label="Digit after a same-size random pixel nudge" />
          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div><span className="font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500">randomly nudged result</span><h3 className={`mt-1 text-xl font-semibold ${randomFlipped ? "text-rose-700 dark:text-rose-300" : "text-emerald-700 dark:text-emerald-300"}`}>{randomFlipped ? `${sample.label} → ${randomPrediction} for this pattern` : `still read as ${randomPrediction} for this pattern`}</h3></div>
              <span className="font-mono text-xs tabular-nums text-neutral-500">max change {formatEpsilon(randomActualEpsilon)}</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{randomFlipped ? "This particular random direction also crosses the threshold, which can happen for a fragile example. The gradient nudge is still special because each of its directions is chosen from this model's loss." : "This particular same-size noise pattern does not flip the digit. The gradient nudge has the same requested budget, but spends it in loss-increasing directions."}</p>
            <p className="mt-3 font-mono text-xs tabular-nums text-neutral-500">P(8): original {percent(originalProbability)} · random {percent(randomProbability)} · gradient {percent(attackedProbability)}</p>
          </div>
        </div>
      </DemoPanel>

      <details className="mt-6 border border-[var(--line)] bg-[var(--surface)]">
        <summary className="cursor-pointer px-4 py-3 font-mono text-xs uppercase tracking-[0.14em] text-neutral-600 transition hover:text-cyan-700 dark:text-neutral-300 dark:hover:text-cyan-300">Inspect the exact calculation</summary>
        <div className="border-t border-[var(--line)] p-4">
          <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">The browser trains a binary logistic classifier on the training split, then differentiates its cross-entropy loss with respect to this held-out image. For pixel i, the exact input derivative is <span className="font-mono">∂L/∂xᵢ = (p - y)wᵢ</span>.</p>
          <div className="mt-4 border border-[var(--line)] bg-[color-mix(in_srgb,var(--foreground)_3%,transparent)] p-4 font-mono text-sm leading-relaxed text-neutral-700 dark:text-neutral-200">x<sub>adv</sub> = clip(x + ε · sign(∇<sub>x</sub>L), 0, 1)</div>
          <p className="mt-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">No 2D decision drawing or saved classifier is involved. The model was fit locally from the {session.trainingCount} training images; this page evaluates image #{sample.sourceIndex} only after training.</p>
        </div>
      </details>

      <DemoFootnote align="left">Source: {DIGIT_DATASET_DESCRIPTION} This is a small, binary real-image demonstration, not evidence that every classifier or every image has the same vulnerability.</DemoFootnote>
    </DemoPage>
  );
}
