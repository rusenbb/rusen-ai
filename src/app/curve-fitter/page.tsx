"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

import { Button, DemoHeader, DemoPage, Details, Segmented, Slider, Stat } from "@/components/ui";

import {
  classificationAccuracy,
  classificationAccuracyWithHiddenCount,
  createClassificationDataset,
  createPolynomialTrainingTrace,
  createRegressionDataset,
  createTinyNetworkTrainingTrace,
  evaluatePolynomial,
  inspectHiddenLayer,
  meanSquaredError,
  predictTinyNetwork,
  predictTinyNetworkWithHiddenCount,
  type ClassificationKind,
  type ClassificationPoint,
  type CurveKind,
  type RegressionPoint,
  type TinyNetwork,
} from "./math";

type Section = "nonlinearity" | "regression";

const MAX_EPOCHS = 1000;
const PLAYBACK_STEP = 25;
const PLAYBACK_INTERVAL = 90;
/** Regression converges in under 100 updates; open part-way so the fit is visibly underway. */
const REGRESSION_START_EPOCH = 30;

const LABEL = "font-mono text-[0.7rem] uppercase tracking-[0.08em] text-[var(--sub)]";
const SECTIONS = [
  { value: "nonlinearity", label: "Linear vs tanh" },
  { value: "regression", label: "Curve fit" },
] as const;
const CLASSIFICATION_OPTIONS = [
  { value: "xor", label: "XOR" },
  { value: "circles", label: "Circles" },
  { value: "line", label: "Line" },
] as const;
const CURVE_OPTIONS = [
  { value: "arc", label: "Arc" },
  { value: "wave", label: "Wave" },
] as const;

const REGRESSION_VIEWPORTS: Record<CurveKind, { minY: number; maxY: number }> = {
  wave: { minY: -0.9, maxY: 0.9 },
  arc: { minY: -0.75, maxY: 1.25 },
};

const svg = (value: number) => value.toFixed(3);
/** Opaque mix of a colour into the surface, so overlapping cells never show seams. */
const tint = (colour: string, amount: number) => `color-mix(in srgb, ${colour} ${amount.toFixed(1)}%, var(--surface))`;
const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

function pathFromSamples(
  samples: Array<{ x: number; y: number }>,
  toX: (value: number) => number,
  toY: (value: number) => number,
): string {
  return samples
    .map((sample, index) => `${index === 0 ? "M" : "L"}${toX(sample.x).toFixed(2)},${toY(sample.y).toFixed(2)}`)
    .join(" ");
}

/** Epoch state with play, pause and scrub. `autoplay` runs the trace once on arrival unless motion is reduced. */
function useEpochPlayback(maxEpoch: number, initialEpoch: number, autoplay = false) {
  const [epoch, setEpoch] = useState(initialEpoch);
  const [requestedPlayback, setRequestedPlayback] = useState(false);
  const isPlaying = requestedPlayback && epoch < maxEpoch;

  useEffect(() => {
    if (!autoplay) return undefined;
    const timer = window.setTimeout(() => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setEpoch(maxEpoch);
      else setRequestedPlayback(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [autoplay, maxEpoch]);

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

const GRID = 26;

function DecisionMap({
  network,
  points,
  label,
  hiddenCount,
}: {
  network: TinyNetwork;
  points: ClassificationPoint[];
  label: string;
  hiddenCount?: number;
}) {
  const cells = useMemo(
    () =>
      Array.from({ length: GRID * GRID }, (_, index) => {
        const row = Math.floor(index / GRID);
        const column = index % GRID;
        const x = -1 + ((column + 0.5) / GRID) * 2;
        const y = 1 - ((row + 0.5) / GRID) * 2;
        return {
          row,
          column,
          probability:
            hiddenCount === undefined
              ? predictTinyNetwork(network, { x, y })
              : predictTinyNetworkWithHiddenCount(network, { x, y }, hiddenCount),
        };
      }),
    [hiddenCount, network],
  );

  return (
    <svg viewBox="0 0 100 100" className="block aspect-square w-full border border-[var(--line)] bg-[var(--surface)]" role="img" aria-label={`${label} decision map`}>
      {cells.map((cell) => (
        <rect
          key={`${cell.row}-${cell.column}`}
          x={svg((cell.column / GRID) * 100)}
          y={svg((cell.row / GRID) * 100)}
          width={svg(100 / GRID + 0.05)}
          height={svg(100 / GRID + 0.05)}
          shapeRendering="crispEdges"
          style={{ fill: tint(cell.probability >= 0.5 ? "var(--accent)" : "var(--accent-2)", 8 + Math.abs(cell.probability - 0.5) * 50) }}
        />
      ))}
      {points.map((point, index) => {
        const heldOut = index % 5 === 0;
        return (
          <circle
            key={index}
            cx={svg((point.x + 1) * 50)}
            cy={svg((1 - point.y) * 50)}
            r={heldOut ? "1.6" : "1.25"}
            fill={heldOut ? "none" : point.label === 1 ? "var(--accent)" : "var(--accent-2)"}
            stroke={heldOut ? "var(--foreground)" : "var(--surface)"}
            strokeWidth="0.5"
          />
        );
      })}
    </svg>
  );
}

function HiddenGateMap({ network, gateIndex, transformed }: { network: TinyNetwork; gateIndex: number; transformed: boolean }) {
  const cells = useMemo(
    () =>
      Array.from({ length: 24 * 24 }, (_, index) => {
        const row = Math.floor(index / 24);
        const column = index % 24;
        const x = -1 + ((column + 0.5) / 24) * 2;
        const y = 1 - ((row + 0.5) / 24) * 2;
        const values = inspectHiddenLayer(network, { x, y });
        const raw = values.preActivations[gateIndex] ?? 0;
        // The raw score is unbounded; squash it only for display so its sign and slope stay visible.
        const value = transformed ? values.activations[gateIndex] ?? 0 : Math.tanh(raw / 1.5);
        return { row, column, value };
      }),
    [gateIndex, network, transformed],
  );

  return (
    <svg viewBox="0 0 100 100" className="block aspect-square w-full border border-[var(--line)] bg-[var(--surface)]" role="img" aria-label={transformed ? "Hidden unit after tanh" : "Hidden unit before tanh"}>
      {cells.map((cell) => (
        <rect
          key={`${cell.row}-${cell.column}`}
          x={svg((cell.column / 24) * 100)}
          y={svg((cell.row / 24) * 100)}
          width={svg(100 / 24 + 0.05)}
          height={svg(100 / 24 + 0.05)}
          shapeRendering="crispEdges"
          style={{ fill: tint(cell.value >= 0 ? "var(--accent)" : "var(--accent-2)", Math.abs(cell.value) * 75) }}
        />
      ))}
    </svg>
  );
}

function MapColumn({ title, accuracy, children }: { title: string; accuracy: number; children: ReactNode }) {
  return (
    <figure className="min-w-0">
      <figcaption className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3">
        <span className={LABEL}>{title}</span>
        <span className="text-2xl font-semibold tabular-nums text-[var(--foreground)] sm:text-3xl">{percent(accuracy)}</span>
      </figcaption>
      {children}
    </figure>
  );
}

export default function CurveFitterPage() {
  const [section, setSection] = useState<Section>("nonlinearity");
  const [curveKind, setCurveKind] = useState<CurveKind>("arc");
  const [sampleCount, setSampleCount] = useState(34);
  const [noise, setNoise] = useState(0.18);
  const [degree, setDegree] = useState(2);
  const [classificationKind, setClassificationKind] = useState<ClassificationKind>("xor");
  const [selectedGate, setSelectedGate] = useState(0);
  const [combinedGateCount, setCombinedGateCount] = useState(5);
  const networkPlayback = useEpochPlayback(MAX_EPOCHS, 0, true);
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

  const classificationPoints = useMemo(() => createClassificationDataset(classificationKind), [classificationKind]);
  const classificationTrain = useMemo(() => classificationPoints.filter((_, index) => index % 5 !== 0), [classificationPoints]);
  const classificationTest = useMemo(() => classificationPoints.filter((_, index) => index % 5 === 0), [classificationPoints]);
  const linearNetworkTrace = useMemo(
    () => createTinyNetworkTrainingTrace(classificationTrain, "linear", { epochs: MAX_EPOCHS }),
    [classificationTrain],
  );
  const tanhNetworkTrace = useMemo(
    () => createTinyNetworkTrainingTrace(classificationTrain, "tanh", { epochs: MAX_EPOCHS }),
    [classificationTrain],
  );
  const linearNetwork = linearNetworkTrace[networkPlayback.epoch];
  const tanhNetwork = tanhNetworkTrace[networkPlayback.epoch];

  return (
    <DemoPage>
      <DemoHeader
        eyebrow="Neural networks"
        title="Curve Fitter"
        description="Two tiny networks learn XOR from the same start, and only the one with tanh can bend its boundary to solve it."
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="View"
          options={SECTIONS}
          value={section}
          onChange={(next) => {
            networkPlayback.pause();
            regressionPlayback.pause();
            setSection(next);
          }}
        />
        {section === "nonlinearity" ? (
          <Segmented label="Dataset" options={CLASSIFICATION_OPTIONS} value={classificationKind} onChange={setClassificationKind} />
        ) : (
          <Segmented label="Curve" options={CURVE_OPTIONS} value={curveKind} onChange={setCurveKind} />
        )}
      </div>

      {section === "nonlinearity" ? (
        <>
          <div className="mx-auto" style={{ maxWidth: "max(22rem, calc(200svh - 62rem))" }}>
            <div className="grid grid-cols-2 gap-3 sm:gap-6">
              <MapColumn title="Linear hidden layer" accuracy={classificationAccuracy(linearNetwork, classificationTrain)}>
                <DecisionMap network={linearNetwork} points={classificationPoints} label="Linear hidden layer" />
              </MapColumn>
              <MapColumn title="tanh hidden layer" accuracy={classificationAccuracy(tanhNetwork, classificationTrain)}>
                <DecisionMap network={tanhNetwork} points={classificationPoints} label="tanh hidden layer" />
              </MapColumn>
            </div>
            <p className={`mt-2 ${LABEL}`}>
              Training accuracy · filled points train, {classificationTest.length} outlined points are held out
            </p>
            <div className="mt-5">
              <EpochScrubber
                epoch={networkPlayback.epoch}
                maxEpoch={MAX_EPOCHS}
                isPlaying={networkPlayback.isPlaying}
                onToggle={networkPlayback.toggle}
                onScrub={networkPlayback.scrub}
              />
            </div>
          </div>

          <Details summary="Inside the tanh network" className="mt-8">
            <div className="space-y-8">
              <p>
                Both networks have 2 inputs, 5 hidden units and 1 output, and start from the same weights. A stack of
                linear layers is still one straight cut: σ(W₂(W₁x + b₁) + b₂). The tanh network computes
                σ(W₂ tanh(W₁x + b₁) + b₂), so each hidden unit becomes a soft on or off region. Held-out accuracy at this
                step: linear {percent(classificationAccuracy(linearNetwork, classificationTest))}, tanh{" "}
                {percent(classificationAccuracy(tanhNetwork, classificationTest))}.
              </p>
              <LossTrace
                title="Cross-entropy loss"
                epoch={networkPlayback.epoch}
                series={[
                  { label: "linear", values: linearNetworkTrace.map((network) => network.loss), stroke: "var(--accent-2)" },
                  { label: "tanh", values: tanhNetworkTrace.map((network) => network.loss), stroke: "var(--accent)" },
                ]}
              />
              <div>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <span className={LABEL}>One hidden unit, before and after tanh</span>
                  <Segmented
                    label="Hidden unit"
                    options={tanhNetwork.w1.map((_, index) => ({ value: String(index), label: `Unit ${index + 1}` }))}
                    value={String(selectedGate)}
                    onChange={(value) => setSelectedGate(Number(value))}
                  />
                </div>
                <div className="grid max-w-xl grid-cols-2 gap-4">
                  <figure>
                    <figcaption className={`mb-2 ${LABEL}`}>Before: a straight ramp</figcaption>
                    <HiddenGateMap network={tanhNetwork} gateIndex={selectedGate} transformed={false} />
                  </figure>
                  <figure>
                    <figcaption className={`mb-2 ${LABEL}`}>After tanh: flat at ±1</figcaption>
                    <HiddenGateMap network={tanhNetwork} gateIndex={selectedGate} transformed />
                  </figure>
                </div>
              </div>
              <div className="grid max-w-xl gap-4 sm:grid-cols-[1fr_14rem] sm:items-end">
                <div className="space-y-4">
                  <Slider
                    label="Hidden units in the vote"
                    min={1}
                    max={tanhNetwork.w1.length}
                    value={combinedGateCount}
                    display={`${combinedGateCount} / ${tanhNetwork.w1.length}`}
                    onChange={setCombinedGateCount}
                  />
                  <Stat
                    label="Training accuracy"
                    value={percent(classificationAccuracyWithHiddenCount(tanhNetwork, classificationTrain, combinedGateCount))}
                    note={`The trained tanh network using only its first ${combinedGateCount} hidden unit${combinedGateCount === 1 ? "" : "s"}.`}
                  />
                </div>
                <DecisionMap
                  network={tanhNetwork}
                  points={classificationPoints}
                  label={`tanh network with ${combinedGateCount} hidden units`}
                  hiddenCount={combinedGateCount}
                />
              </div>
            </div>
          </Details>
        </>
      ) : (
        <>
          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="min-w-0 space-y-5">
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
        </>
      )}
    </DemoPage>
  );
}
