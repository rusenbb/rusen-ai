"use client";

import { useEffect, useMemo, useState } from "react";

import { Button, DemoHeader, DemoPage, Details, Segmented, Slider, Stat } from "@/components/ui";

import {
  createPolynomialTrainingTrace,
  createRegressionDataset,
  evaluatePolynomial,
  meanSquaredError,
  type CurveKind,
  type RegressionPoint,
} from "./math";

const MAX_EPOCHS = 1000;
const PLAYBACK_STEP = 25;
const PLAYBACK_INTERVAL = 90;
/** Regression converges in under 100 updates; open part-way so the fit is visibly underway. */
const REGRESSION_START_EPOCH = 30;

const LABEL = "font-mono text-[0.7rem] uppercase tracking-[0.08em] text-[var(--sub)]";
const CURVE_OPTIONS = [
  { value: "arc", label: "Arc" },
  { value: "wave", label: "Wave" },
] as const;

const REGRESSION_VIEWPORTS: Record<CurveKind, { minY: number; maxY: number }> = {
  wave: { minY: -0.9, maxY: 0.9 },
  arc: { minY: -0.75, maxY: 1.25 },
};

const svg = (value: number) => value.toFixed(3);

function pathFromSamples(
  samples: Array<{ x: number; y: number }>,
  toX: (value: number) => number,
  toY: (value: number) => number,
): string {
  return samples
    .map((sample, index) => `${index === 0 ? "M" : "L"}${toX(sample.x).toFixed(2)},${toY(sample.y).toFixed(2)}`)
    .join(" ");
}

/** Epoch state with play, pause and scrub. */
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

  const toggle = () => {
    if (epoch >= maxEpoch) {
      setEpoch(0);
      setRequestedPlayback(true);
      return;
    }
    setRequestedPlayback((current) => !current);
  };

  const pause = () => setRequestedPlayback(false);

  return { epoch, isPlaying, pause, scrub, toggle };
}

function EpochScrubber({
  epoch,
  maxEpoch,
  isPlaying,
  onToggle,
  onScrub,
}: {
  epoch: number;
  maxEpoch: number;
  isPlaying: boolean;
  onToggle: () => void;
  onScrub: (epoch: number) => void;
}) {
  return (
    <div className="flex items-center gap-4">
      <Button type="button" size="sm" variant="primary" className="w-24 shrink-0" onClick={onToggle}>
        {isPlaying ? "Pause" : epoch >= maxEpoch ? "Replay" : "Play"}
      </Button>
      <Slider
        className="flex-1"
        label="Training step"
        min={0}
        max={maxEpoch}
        value={epoch}
        display={`${epoch.toLocaleString("en-US")} / ${maxEpoch.toLocaleString("en-US")}`}
        onChange={onScrub}
      />
    </div>
  );
}

interface LossSeries {
  label: string;
  values: number[];
  stroke: string;
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
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className={LABEL}>{title}, log scale</p>
        <div className="flex flex-wrap gap-x-4 font-mono text-xs tabular-nums">
          {series.map((item) => (
            <span key={item.label} style={{ color: item.stroke }}>
              {item.label} {item.values[Math.min(safeEpoch, item.values.length - 1)].toFixed(3)}
            </span>
          ))}
        </div>
      </div>
      <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="mt-2 block h-16 w-full" role="img" aria-label={`${title}. The marker shows step ${safeEpoch}.`}>
        <line x1="0" x2="100" y1="28" y2="28" stroke="var(--line)" strokeWidth="0.5" />
        {series.map((item) => {
          const path = sampledIndices
            .map((sampleEpoch, index) => `${index === 0 ? "M" : "L"}${toX(sampleEpoch).toFixed(3)},${toY(item.values[Math.min(sampleEpoch, item.values.length - 1)]).toFixed(3)}`)
            .join(" ");
          return <path key={item.label} d={path} fill="none" stroke={item.stroke} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />;
        })}
        <line x1={toX(safeEpoch)} x2={toX(safeEpoch)} y1="2" y2="29" stroke="var(--foreground)" strokeOpacity="0.5" strokeWidth="1" vectorEffect="non-scaling-stroke" strokeDasharray="2 2" />
      </svg>
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
  const toX = (value: number) => ((value + 1.2) / 2.4) * 160;
  const toY = (value: number) => 100 - ((value - minY) / (maxY - minY)) * 100;
  const linearPath = pathFromSamples(samples.map((sample) => ({ ...sample, y: evaluatePolynomial(linear, sample.x) })), toX, toY);
  const polynomialPath = pathFromSamples(samples.map((sample) => ({ ...sample, y: evaluatePolynomial(polynomial, sample.x) })), toX, toY);

  return (
    <div className="border border-[var(--line)] bg-[var(--surface)]">
      <div className={`flex flex-wrap gap-x-4 gap-y-1 px-3 pt-2 ${LABEL}`}>
        <span style={{ color: "var(--accent-2)" }}>— straight line</span>
        <span style={{ color: "var(--accent)" }}>— degree {degree}</span>
        <span>● training</span>
        <span>○ held out</span>
      </div>
      <svg viewBox="0 0 160 100" className="block w-full" role="img" aria-label={`Regression data with the current straight-line and degree ${degree} fits`}>
        {Array.from({ length: 5 }, (_, index) => (
          <line key={index} x1="0" x2="160" y1={svg((index + 1) * (100 / 6))} y2={svg((index + 1) * (100 / 6))} stroke="var(--line)" strokeWidth="0.25" />
        ))}
        <line x1={svg(toX(0))} x2={svg(toX(0))} y1="0" y2="100" stroke="var(--line)" strokeWidth="0.35" />
        <path d={linearPath} fill="none" stroke="var(--accent-2)" strokeWidth="1" strokeLinecap="round" />
        <path d={polynomialPath} fill="none" stroke="var(--accent)" strokeWidth="1" strokeLinecap="round" />
        {points.map((point, index) => (
          <circle
            key={`${point.x}-${index}`}
            cx={svg(toX(point.x))}
            cy={svg(toY(point.y))}
            r={point.split === "train" ? "1.1" : "1.4"}
            fill={point.split === "train" ? "var(--foreground)" : "none"}
            stroke="var(--foreground)"
            strokeWidth="0.5"
          />
        ))}
      </svg>
    </div>
  );
}

export default function CurveFitterPage() {
  const [curveKind, setCurveKind] = useState<CurveKind>("arc");
  const [sampleCount, setSampleCount] = useState(34);
  const [noise, setNoise] = useState(0.18);
  const [degree, setDegree] = useState(2);
  const regressionPlayback = useEpochPlayback(MAX_EPOCHS, REGRESSION_START_EPOCH);

  const regressionPoints = useMemo(() => createRegressionDataset(curveKind, sampleCount, noise), [curveKind, sampleCount, noise]);
  const trainPoints = useMemo(() => regressionPoints.filter((point) => point.split === "train"), [regressionPoints]);
  const testPoints = useMemo(() => regressionPoints.filter((point) => point.split === "test"), [regressionPoints]);
  const linearTrainingTrace = useMemo(() => createPolynomialTrainingTrace(trainPoints, 1, { epochs: MAX_EPOCHS }), [trainPoints]);
  const polynomialTrainingTrace = useMemo(
    () => createPolynomialTrainingTrace(trainPoints, degree, { epochs: MAX_EPOCHS }),
    [degree, trainPoints],
  );
  const linearFit = linearTrainingTrace[regressionPlayback.epoch];
  const polynomialFit = polynomialTrainingTrace[regressionPlayback.epoch];

  return (
    <DemoPage>
      <DemoHeader
        eyebrow="Gradient descent"
        title="Curve Fitter"
        description="A straight line and a polynomial learn the same noisy points step by step; the outlined points show which one fits data it never saw."
      />

      <div className="mb-4">
        <Segmented label="Curve" options={CURVE_OPTIONS} value={curveKind} onChange={setCurveKind} />
      </div>

          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
            {/* The chart is 1.6:1, so cap its width to keep the Play control in the first screen. */}
            <div className="min-w-0 space-y-5" style={{ maxWidth: "max(20rem, calc((100svh - 28rem) * 1.6))" }}>
              <RegressionChart curveKind={curveKind} points={regressionPoints} linear={linearFit.coefficients} polynomial={polynomialFit.coefficients} degree={degree} />
              <EpochScrubber
                epoch={regressionPlayback.epoch}
                maxEpoch={MAX_EPOCHS}
                isPlaying={regressionPlayback.isPlaying}
                onToggle={regressionPlayback.toggle}
                onScrub={regressionPlayback.scrub}
              />
            </div>
            <aside className="space-y-7">
              <Slider label="Polynomial degree" min={2} max={8} value={degree} onChange={setDegree} />
              <p className={LABEL}>Error on held-out points</p>
              <div className="grid grid-cols-2 gap-4">
                <Stat label="Straight line" value={meanSquaredError(testPoints, linearFit.coefficients).toFixed(4)} />
                <Stat label={`Degree ${degree}`} value={meanSquaredError(testPoints, polynomialFit.coefficients).toFixed(4)} />
              </div>
            </aside>
          </div>
          <Details summary="Advanced" className="mt-8">
            <div className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <Slider label="Examples" min={15} max={80} value={sampleCount} onChange={setSampleCount} />
                <Slider label="Noise" min={0} max={1} step={0.02} value={noise} display={noise.toFixed(2)} onChange={setNoise} />
              </div>
              <LossTrace
                title="Training loss"
                epoch={regressionPlayback.epoch}
                series={[
                  { label: "straight line", values: linearTrainingTrace.map((state) => state.loss), stroke: "var(--accent-2)" },
                  { label: `degree ${degree}`, values: polynomialTrainingTrace.map((state) => state.loss), stroke: "var(--accent)" },
                ]}
              />
              <p>
                Both fits use batch gradient descent on the filled points; one step is one update. Degree {degree} learns{" "}
                {degree + 1} coefficients. More flexibility can lower training loss without lowering held-out error. The
                straight line is now y = {linearFit.coefficients[0].toFixed(2)} {linearFit.coefficients[1] >= 0 ? "+" : "−"}{" "}
                {Math.abs(linearFit.coefficients[1]).toFixed(2)}x.
              </p>
            </div>
          </Details>
    </DemoPage>
  );
}
