"use client";

import { useEffect, useMemo, useState } from "react";

import { Button, DemoFootnote, DemoHeader, DemoPage, DemoPanel } from "@/components/ui";

import {
  classificationAccuracy,
  createClassificationDataset,
  createPolynomialTrainingTrace,
  createRegressionDataset,
  createTinyNetworkTrainingTrace,
  evaluatePolynomial,
  meanSquaredError,
  predictTinyNetwork,
  type ClassificationKind,
  type CurveKind,
  type RegressionPoint,
  type TinyNetwork,
} from "./math";

type Section = "regression" | "nonlinearity";

const REGRESSION_MAX_EPOCHS = 1000;
const NETWORK_MAX_EPOCHS = 1000;
const PLAYBACK_STEP = 25;
const PLAYBACK_INTERVAL = 90;

const CURVE_OPTIONS: Array<{ id: CurveKind; label: string; detail: string }> = [
  { id: "arc", label: "Parabolic arc", detail: "A curved, non-periodic relationship." },
  { id: "wave", label: "Wavy signal", detail: "A smooth periodic signal with light deterministic noise." },
];

const CLASSIFICATION_OPTIONS: Array<{ id: ClassificationKind; label: string; detail: string }> = [
  { id: "xor", label: "XOR", detail: "Diagonal corners share a class." },
  { id: "circles", label: "Circles", detail: "One class encloses the other." },
  { id: "line", label: "Line", detail: "A sanity check where a straight boundary is enough." },
];

const REGRESSION_VIEWPORTS: Record<CurveKind, { minY: number; maxY: number }> = {
  wave: { minY: -0.9, maxY: 0.9 },
  arc: { minY: -0.75, maxY: 1.25 },
};

interface LossSeries {
  label: string;
  values: number[];
  stroke: string;
  dot: string;
}

function pathFromSamples(
  samples: Array<{ x: number; y: number }>,
  toX: (value: number) => number,
  toY: (value: number) => number,
): string {
  return samples
    .map((sample, index) => `${index === 0 ? "M" : "L"}${toX(sample.x).toFixed(2)},${toY(sample.y).toFixed(2)}`)
    .join(" ");
}

function useEpochPlayback(maxEpoch: number, initialEpoch: number) {
  const [epoch, setEpoch] = useState(initialEpoch);
  const [requestedPlayback, setRequestedPlayback] = useState(false);
  const isPlaying = requestedPlayback && epoch < maxEpoch;

  useEffect(() => {
    if (!isPlaying) return undefined;

    const timer = window.setTimeout(() => {
      setEpoch((current) => Math.min(maxEpoch, current + PLAYBACK_STEP));
    }, PLAYBACK_INTERVAL);

    return () => window.clearTimeout(timer);
  }, [epoch, isPlaying, maxEpoch]);

  const scrub = (nextEpoch: number) => {
    setRequestedPlayback(false);
    setEpoch(Math.max(0, Math.min(maxEpoch, Math.floor(nextEpoch))));
  };

  const reset = () => {
    setRequestedPlayback(false);
    setEpoch(0);
  };

  const step = () => {
    setRequestedPlayback(false);
    setEpoch((current) => Math.min(maxEpoch, current + PLAYBACK_STEP));
  };

  const toggle = () => {
    if (epoch >= maxEpoch) {
      setEpoch(0);
      setRequestedPlayback(true);
      return;
    }
    setRequestedPlayback((current) => !current);
  };

  const pause = () => setRequestedPlayback(false);

  return { epoch, isPlaying, pause, reset, scrub, step, toggle };
}

function EpochScrubber({
  label,
  epoch,
  maxEpoch,
  isPlaying,
  onReset,
  onStep,
  onToggle,
  onScrub,
}: {
  label: string;
  epoch: number;
  maxEpoch: number;
  isPlaying: boolean;
  onReset: () => void;
  onStep: () => void;
  onToggle: () => void;
  onScrub: (epoch: number) => void;
}) {
  return (
    <div className="border-t border-[var(--line)] pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-neutral-500">{label}</p>
          <p className="mt-1 text-sm font-semibold tabular-nums">epoch {epoch.toLocaleString()} of {maxEpoch.toLocaleString()}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="ghost" onClick={onReset}>Reset</Button>
          <Button type="button" size="sm" variant="primary" onClick={onToggle}>{isPlaying ? "Pause" : epoch >= maxEpoch ? "Replay" : "Play"}</Button>
          <Button type="button" size="sm" variant="secondary" onClick={onStep}>Step {PLAYBACK_STEP}</Button>
        </div>
      </div>
      <label className="mt-4 block">
        <span className="sr-only">{label} epoch</span>
        <input
          aria-label={`${label} epoch`}
          className="w-full accent-foreground"
          type="range"
          min="0"
          max={maxEpoch}
          step="1"
          value={epoch}
          onChange={(event) => onScrub(Number(event.target.value))}
        />
      </label>
      <div className="mt-1 flex justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-neutral-500">
        <span>start</span><span>scrub the real updates</span><span>budget</span>
      </div>
    </div>
  );
}

function LossTrace({ title, series, epoch }: { title: string; series: LossSeries[]; epoch: number }) {
  const lastEpoch = Math.max(0, ...series.map((item) => item.values.length - 1));
  const safeEpoch = Math.min(epoch, lastEpoch);
  const sampledIndices = Array.from({ length: 72 }, (_, index) => Math.round((index / 71) * lastEpoch));
  const transformedValues = series.flatMap((item) => item.values.map((value) => Math.log10(value + 1e-5)));
  const minValue = Math.min(...transformedValues);
  const maxValue = Math.max(...transformedValues);
  const span = Math.max(1e-6, maxValue - minValue);
  const toY = (value: number) => 28 - ((Math.log10(value + 1e-5) - minValue) / span) * 24;
  const toX = (value: number) => (lastEpoch === 0 ? 0 : (value / lastEpoch) * 100);

  return (
    <div className="border-t border-[var(--line)] pt-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-neutral-500">{title}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs tabular-nums text-neutral-600 dark:text-neutral-400">
          {series.map((item) => (
            <span key={item.label} className="flex items-center gap-1.5">
              <i className={`size-2 rounded-full ${item.dot}`} />
              {item.label} {item.values[Math.min(safeEpoch, item.values.length - 1)].toFixed(3)}
            </span>
          ))}
        </div>
      </div>
      <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="mt-2 block h-16 w-full" role="img" aria-label={`${title}. The vertical marker shows epoch ${safeEpoch}.`}>
        <title>{title}</title>
        <line x1="0" x2="100" y1="28" y2="28" stroke="currentColor" strokeOpacity="0.12" strokeWidth="0.5" />
        {series.map((item) => {
          const path = sampledIndices
            .map((sampleEpoch, index) => `${index === 0 ? "M" : "L"}${toX(sampleEpoch).toFixed(3)},${toY(item.values[Math.min(sampleEpoch, item.values.length - 1)]).toFixed(3)}`)
            .join(" ");
          return <path key={item.label} d={path} fill="none" stroke={item.stroke} strokeWidth="1.2" strokeLinecap="round" />;
        })}
        <line x1={toX(safeEpoch)} x2={toX(safeEpoch)} y1="2" y2="29" stroke="currentColor" strokeOpacity="0.55" strokeWidth="0.6" strokeDasharray="1.5 1.5" />
        {series.map((item) => (
          <circle
            key={`${item.label}-marker`}
            cx={toX(safeEpoch)}
            cy={toY(item.values[Math.min(safeEpoch, item.values.length - 1)])}
            r="1.5"
            fill={item.stroke}
            stroke="var(--background)"
            strokeWidth="0.7"
          />
        ))}
      </svg>
      <p className="mt-1 text-xs text-neutral-500">Each line is a real loss history. The marker follows the scrubber.</p>
    </div>
  );
}

function RegressionChart({
  curveKind,
  points,
  linear,
  polynomial,
  degree,
}: {
  curveKind: CurveKind;
  points: RegressionPoint[];
  linear: number[];
  polynomial: number[];
  degree: number;
}) {
  const samples = Array.from({ length: 100 }, (_, index) => ({ x: -1.2 + (index / 99) * 2.4 }));
  const { minY, maxY } = REGRESSION_VIEWPORTS[curveKind];
  const toX = (value: number) => ((value + 1.2) / 2.4) * 100;
  const toY = (value: number) => 100 - ((value - minY) / (maxY - minY)) * 100;
  const svg = (value: number) => value.toFixed(3);
  const linearPath = pathFromSamples(samples.map((sample) => ({ ...sample, y: evaluatePolynomial(linear, sample.x) })), toX, toY);
  const polynomialPath = pathFromSamples(samples.map((sample) => ({ ...sample, y: evaluatePolynomial(polynomial, sample.x) })), toX, toY);

  return (
    <div className="overflow-hidden border border-[var(--line)] bg-[#0c1117] shadow-[0_18px_50px_rgba(2,8,23,0.18)]">
      <svg viewBox="0 0 100 100" className="block aspect-[16/10] w-full" role="img" aria-label="Regression data with the current linear and polynomial fits">
        <title>Current linear and polynomial fits</title>
        {Array.from({ length: 5 }, (_, index) => (
          <line key={index} x1="0" x2="100" y1={svg((index + 1) * (100 / 6))} y2={svg((index + 1) * (100 / 6))} stroke="white" strokeOpacity="0.10" strokeWidth="0.25" />
        ))}
        <line x1={svg(toX(0))} x2={svg(toX(0))} y1="0" y2="100" stroke="white" strokeOpacity="0.16" strokeWidth="0.35" />
        <path d={linearPath} fill="none" stroke="#fbbf24" strokeWidth="1.25" strokeLinecap="round" />
        <path d={polynomialPath} fill="none" stroke="#22d3ee" strokeWidth="1.25" strokeLinecap="round" />
        {points.map((point, index) => (
          <circle
            key={`${point.x}-${index}`}
            cx={svg(toX(point.x))}
            cy={svg(toY(point.y))}
            r={point.split === "train" ? "1.35" : "1.65"}
            fill={point.split === "train" ? "#f8fafc" : "transparent"}
            stroke={point.split === "train" ? "#f8fafc" : "#fb7185"}
            strokeWidth="0.7"
          />
        ))}
      </svg>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/10 bg-black/35 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.11em] text-white/75">
        <span className="flex items-center gap-1.5"><i className="h-0.5 w-3 bg-amber-300" />linear</span>
        <span className="flex items-center gap-1.5"><i className="h-0.5 w-3 bg-cyan-300" />degree {degree}</span>
        <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-white" />train</span>
        <span className="flex items-center gap-1.5"><i className="size-2 rounded-full border border-rose-400" />held out</span>
      </div>
    </div>
  );
}

function DecisionMap({ network, points, label }: { network: TinyNetwork; points: ReturnType<typeof createClassificationDataset>; label: string }) {
  const cells = useMemo(
    () =>
      Array.from({ length: 26 * 26 }, (_, index) => {
        const row = Math.floor(index / 26);
        const column = index % 26;
        const x = -1 + ((column + 0.5) / 26) * 2;
        const y = 1 - ((row + 0.5) / 26) * 2;
        return { row, column, probability: predictTinyNetwork(network, { x, y }) };
      }),
    [network],
  );
  const svg = (value: number) => value.toFixed(3);

  return (
    <div className="overflow-hidden border border-[var(--line)] bg-[#0c1117]">
      <svg viewBox="0 0 100 100" className="block aspect-square w-full" role="img" aria-label={`${label} decision boundary`}>
        <title>{label} decision boundary</title>
        {cells.map((cell) => {
          const cyan = cell.probability >= 0.5;
          return <rect key={`${cell.row}-${cell.column}`} x={svg((cell.column / 26) * 100)} y={svg((cell.row / 26) * 100)} width={svg(100 / 26 + 0.05)} height={svg(100 / 26 + 0.05)} fill={cyan ? "#22d3ee" : "#f59e0b"} opacity={svg(0.16 + Math.abs(cell.probability - 0.5) * 0.55)} />;
        })}
        {points.map((point, index) => (
          <circle key={index} cx={svg((point.x + 1) * 50)} cy={svg((1 - point.y) * 50)} r="1.25" fill={point.label === 1 ? "#67e8f9" : "#fcd34d"} stroke="#0c1117" strokeWidth="0.6" />
        ))}
      </svg>
    </div>
  );
}

function ErrorStat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="border border-[var(--line)] p-3">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className={`mt-1 font-mono text-xl font-bold tabular-nums ${accent}`}>{value.toFixed(4)}</p>
    </div>
  );
}

export default function CurveFitterPage() {
  const [section, setSection] = useState<Section>("regression");
  const [curveKind, setCurveKind] = useState<CurveKind>("arc");
  const [degree, setDegree] = useState(2);
  const [classificationKind, setClassificationKind] = useState<ClassificationKind>("xor");
  const regressionPlayback = useEpochPlayback(REGRESSION_MAX_EPOCHS, 0);
  const networkPlayback = useEpochPlayback(NETWORK_MAX_EPOCHS, 0);

  const regressionPoints = useMemo(() => createRegressionDataset(curveKind), [curveKind]);
  const trainPoints = useMemo(() => regressionPoints.filter((point) => point.split === "train"), [regressionPoints]);
  const testPoints = useMemo(() => regressionPoints.filter((point) => point.split === "test"), [regressionPoints]);
  const linearTrainingTrace = useMemo(
    () => createPolynomialTrainingTrace(trainPoints, 1, { epochs: REGRESSION_MAX_EPOCHS }),
    [trainPoints],
  );
  const polynomialTrainingTrace = useMemo(
    () => createPolynomialTrainingTrace(trainPoints, degree, { epochs: REGRESSION_MAX_EPOCHS }),
    [degree, trainPoints],
  );
  const linearFit = linearTrainingTrace[regressionPlayback.epoch];
  const polynomialFit = polynomialTrainingTrace[regressionPlayback.epoch];
  const regressionMetrics = useMemo(
    () => ({
      linearTrain: linearFit.loss,
      linearTest: meanSquaredError(testPoints, linearFit.coefficients),
      polynomialTrain: polynomialFit.loss,
      polynomialTest: meanSquaredError(testPoints, polynomialFit.coefficients),
    }),
    [linearFit, polynomialFit, testPoints],
  );

  const classificationPoints = useMemo(() => createClassificationDataset(classificationKind), [classificationKind]);
  const linearNetworkTrace = useMemo(
    () => createTinyNetworkTrainingTrace(classificationPoints, "linear", { epochs: NETWORK_MAX_EPOCHS }),
    [classificationPoints],
  );
  const tanhNetworkTrace = useMemo(
    () => createTinyNetworkTrainingTrace(classificationPoints, "tanh", { epochs: NETWORK_MAX_EPOCHS }),
    [classificationPoints],
  );
  const linearNetwork = linearNetworkTrace[networkPlayback.epoch];
  const nonlinearNetwork = tanhNetworkTrace[networkPlayback.epoch];
  const linearAccuracy = classificationAccuracy(linearNetwork, classificationPoints);
  const nonlinearAccuracy = classificationAccuracy(nonlinearNetwork, classificationPoints);

  return (
    <DemoPage width="2xl">
      <DemoHeader
        eyebrow="Learning systems / fit versus represent"
        title="Curve Fitter"
        description="A model does not jump to its answer. Scrub through the real updates to see how a curve settles, and why an activation lets the same tiny network bend a boundary."
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant={section === "regression" ? "primary" : "secondary"} onClick={() => { networkPlayback.pause(); setSection("regression"); }}>Regression</Button>
            <Button size="sm" variant={section === "nonlinearity" ? "primary" : "secondary"} onClick={() => { regressionPlayback.pause(); setSection("nonlinearity"); }}>Nonlinearity</Button>
          </div>
        }
      />

      {section === "regression" ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
          <DemoPanel title="Watch two hypotheses learn" description="Both models see the white training dots. Outlined dots stay hidden from fitting and test whether the curve learned something useful.">
            <div className="space-y-4">
              <RegressionChart curveKind={curveKind} points={regressionPoints} linear={linearFit.coefficients} polynomial={polynomialFit.coefficients} degree={degree} />
              <EpochScrubber
                label="Fit progress"
                epoch={regressionPlayback.epoch}
                maxEpoch={REGRESSION_MAX_EPOCHS}
                isPlaying={regressionPlayback.isPlaying}
                onReset={regressionPlayback.reset}
                onStep={regressionPlayback.step}
                onToggle={regressionPlayback.toggle}
                onScrub={regressionPlayback.scrub}
              />
              <LossTrace
                title="Training loss"
                epoch={regressionPlayback.epoch}
                series={[
                  { label: "linear", values: linearTrainingTrace.map((state) => state.loss), stroke: "#fbbf24", dot: "bg-amber-300" },
                  { label: `degree ${degree}`, values: polynomialTrainingTrace.map((state) => state.loss), stroke: "#22d3ee", dot: "bg-cyan-300" },
                ]}
              />
            </div>
          </DemoPanel>

          <DemoPanel title="Change the hypothesis" description="Degree adds coefficients. The epoch stays put when you change it, so you can compare how much each hypothesis learned with the same budget.">
            <div className="space-y-5">
              <div className="flex flex-wrap gap-2">
                {CURVE_OPTIONS.map((option) => (
                  <Button key={option.id} size="sm" variant={curveKind === option.id ? "primary" : "secondary"} onClick={() => setCurveKind(option.id)} title={option.detail}>{option.label}</Button>
                ))}
              </div>
              <label className="block border-y border-[var(--line)] py-4">
                <span className="flex items-baseline justify-between font-mono text-xs uppercase tracking-[0.13em]"><span>Polynomial degree</span><strong className="text-lg">{degree}</strong></span>
                <input aria-label="Polynomial degree" className="mt-3 w-full accent-foreground" type="range" min="2" max="8" value={degree} onChange={(event) => setDegree(Number(event.target.value))} />
                <p className="mt-2 text-xs leading-relaxed text-neutral-500">degree {degree} learns {degree + 1} coefficients. More flexibility can reduce training loss without improving held-out loss.</p>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div className="border border-[var(--line)] p-3"><p className="text-xs text-neutral-500">linear now</p><p data-allow-select className="mt-2 font-mono text-xs leading-relaxed">y = {linearFit.coefficients[0].toFixed(2)} {linearFit.coefficients[1] >= 0 ? "+" : "−"} {Math.abs(linearFit.coefficients[1]).toFixed(2)}x</p></div>
                <div className="border border-[var(--line)] p-3"><p className="text-xs text-neutral-500">polynomial now</p><p data-allow-select className="mt-2 font-mono text-xs leading-relaxed">{degree + 1} changing coefficients</p><p className="mt-1 text-xs text-neutral-500">gradient descent, not a jump to the answer</p></div>
              </div>
              <div className="grid grid-cols-2 gap-3 border-t border-[var(--line)] pt-5">
                <ErrorStat label="Linear / held out" value={regressionMetrics.linearTest} accent="text-amber-600 dark:text-amber-300" />
                <ErrorStat label={`Degree ${degree} / held out`} value={regressionMetrics.polynomialTest} accent="text-cyan-700 dark:text-cyan-300" />
              </div>
            </div>
          </DemoPanel>
        </div>
      ) : (
        <>
          <DemoPanel title="The same network, one decisive change" description="Both models have a 2 to 5 to 1 shape and start from the same deterministic weights. The amber model keeps its hidden layer linear; the cyan model uses tanh.">
            <div className="space-y-5">
              <div className="flex flex-wrap gap-2">
                {CLASSIFICATION_OPTIONS.map((option) => (
                  <Button key={option.id} size="sm" variant={classificationKind === option.id ? "primary" : "secondary"} onClick={() => setClassificationKind(option.id)} title={option.detail}>{option.label}</Button>
                ))}
              </div>
              <p className="max-w-3xl text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                {classificationKind === "xor" ? "XOR needs two diagonal islands. One straight boundary cannot isolate both." : classificationKind === "circles" ? "The inner class needs a boundary that wraps around it. A line cannot close that loop." : "This is the control case: a straight boundary is enough, so both models should learn it."}
              </p>
              <EpochScrubber
                label="Shared training progress"
                epoch={networkPlayback.epoch}
                maxEpoch={NETWORK_MAX_EPOCHS}
                isPlaying={networkPlayback.isPlaying}
                onReset={networkPlayback.reset}
                onStep={networkPlayback.step}
                onToggle={networkPlayback.toggle}
                onScrub={networkPlayback.scrub}
              />
              <LossTrace
                title="Cross-entropy loss"
                epoch={networkPlayback.epoch}
                series={[
                  { label: "linear", values: linearNetworkTrace.map((network) => network.loss), stroke: "#fbbf24", dot: "bg-amber-300" },
                  { label: "tanh", values: tanhNetworkTrace.map((network) => network.loss), stroke: "#22d3ee", dot: "bg-cyan-300" },
                ]}
              />
            </div>
          </DemoPanel>

          <section className="mt-5 grid gap-5 md:grid-cols-2" aria-labelledby="network-boundaries">
            <DemoPanel title="Hidden layer without an activation" description="It can rotate and shift a boundary, but the whole stack still acts like one linear transformation.">
              <div className="space-y-4">
                <DecisionMap network={linearNetwork} points={classificationPoints} label="Linear hidden-layer model" />
                <div className="flex items-end justify-between border-t border-[var(--line)] pt-3"><span className="text-xs text-neutral-500">accuracy at this epoch</span><strong className="font-mono text-2xl tabular-nums text-amber-600 dark:text-amber-300">{(linearAccuracy * 100).toFixed(1)}%</strong></div>
              </div>
            </DemoPanel>
            <DemoPanel title="The same network with tanh" description="tanh lets the hidden units bend and combine regions that a single line cannot express.">
              <div className="space-y-4">
                <DecisionMap network={nonlinearNetwork} points={classificationPoints} label="Tanh hidden-layer model" />
                <div className="flex items-end justify-between border-t border-[var(--line)] pt-3"><span className="text-xs text-neutral-500">accuracy at this epoch</span><strong className="font-mono text-2xl tabular-nums text-cyan-700 dark:text-cyan-300">{(nonlinearAccuracy * 100).toFixed(1)}%</strong></div>
              </div>
            </DemoPanel>
          </section>

          <details className="mt-5 border border-[var(--line)] p-4">
            <summary className="cursor-pointer font-mono text-xs font-bold uppercase tracking-[0.13em]">Inspect the one changed ingredient</summary>
            <p data-allow-select className="mt-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">A linear stack remains linear: σ(W₂(W₁x + b₁) + b₂). Adding tanh changes the representation: σ(W₂ tanh(W₁x + b₁) + b₂).</p>
          </details>
        </>
      )}
      <DemoFootnote>
        Every frame is computed in this browser from deterministic data and real batch-gradient updates. The displayed accuracy is a geometry illustration, not a production generalization claim.
      </DemoFootnote>
    </DemoPage>
  );
}
