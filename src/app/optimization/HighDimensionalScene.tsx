"use client";

import { useMemo, useState } from "react";
import { DemoPanel } from "@/components/ui";
import {
  MetricGrid,
  SectionTakeaway,
  SeriesChart,
  SignedSpectrumChart,
} from "@/components/optimization/OptimizationPrimitives";
import { usePlayback } from "@/components/optimization/usePlayback";
import {
  createDominantCoordinateProjection,
  createRandomProjection,
  formatCompact,
  highDimensionalQuadratic,
  highDimensionalQuadraticTrace,
  highDimensionalSaddle,
  projectTraceTo2D,
  type SimulationTrace,
} from "@/lib/optimization";

function currentFrame(trace: SimulationTrace, playhead: number) {
  const index = Math.min(
    trace.frames.length - 1,
    Math.round(playhead * Math.max(0, trace.frames.length - 1)),
  );
  return trace.frames[index] ?? trace.frames[trace.frames.length - 1]!;
}

function ProjectionFigure({
  title,
  badge,
  points,
  bounds,
  color,
  xLabel,
  yLabel,
  caption,
}: {
  title: string;
  badge: string;
  points: Array<{ x: number; y: number }>;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  color: string;
  xLabel: string;
  yLabel: string;
  caption: string;
}) {
  const { minX, maxX, minY, maxY } = bounds;

  const polyline = points
    .map((point) => {
      const x = 28 + ((point.x - minX) / Math.max(1e-6, maxX - minX)) * 564;
      const y = 184 - ((point.y - minY) / Math.max(1e-6, maxY - minY)) * 140;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const current = points[points.length - 1] ?? { x: 0, y: 0 };
  const currentX =
    28 + ((current.x - minX) / Math.max(1e-6, maxX - minX)) * 564;
  const currentY =
    184 - ((current.y - minY) / Math.max(1e-6, maxY - minY)) * 140;

  return (
    <div className="rounded-[1.2rem] border border-neutral-200/80 bg-white/80 p-4 dark:border-neutral-800/80 dark:bg-neutral-950/45">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-[10px] font-mono uppercase tracking-[0.24em] text-neutral-500 dark:text-neutral-400">
          {title}
        </div>
        <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-500">
          {badge}
        </div>
      </div>
      <svg width="100%" viewBox="0 0 620 210">
        <rect
          x="14"
          y="14"
          width="592"
          height="182"
          rx="20"
          fill="transparent"
          stroke="rgba(115,115,115,0.2)"
        />
        {[0, 1, 2, 3].map((tick) => (
          <line
            key={tick}
            x1="28"
            x2="592"
            y1={44 + tick * 36}
            y2={44 + tick * 36}
            stroke="rgba(115,115,115,0.16)"
            strokeDasharray="4 6"
          />
        ))}
        <polyline
          points={polyline}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={currentX} cy={currentY} r="6.5" fill={color} />
        <text x="300" y="206" textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.72">
          x = {xLabel}
        </text>
        <text
          x="18"
          y="110"
          fontSize="11"
          fill="currentColor"
          opacity="0.72"
          transform="rotate(-90 18 110)"
          textAnchor="middle"
        >
          y = {yLabel}
        </text>
      </svg>
      <p className="mt-3 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
        {caption}
      </p>
    </div>
  );
}

export default function HighDimensionalScene() {
  const { playhead, isPlaying, setIsPlaying, replay } = usePlayback(0.18);
  const [projectionSeed, setProjectionSeed] = useState(11);

  const quadratic = useMemo(() => highDimensionalQuadratic(), []);
  const quadraticTrace = useMemo(
    () => highDimensionalQuadraticTrace("gradient-descent", 130),
    [],
  );
  const dominantProjection = useMemo(
    () => createDominantCoordinateProjection(quadraticTrace),
    [quadraticTrace],
  );
  const projectionA = dominantProjection.projection;
  const projectionB = useMemo(
    () => createRandomProjection(quadratic.dimension, projectionSeed + 97),
    [projectionSeed, quadratic.dimension],
  );
  const projectedA = useMemo(
    () => projectTraceTo2D(quadraticTrace, projectionA),
    [projectionA, quadraticTrace],
  );
  const projectedB = useMemo(
    () => projectTraceTo2D(quadraticTrace, projectionB),
    [projectionB, quadraticTrace],
  );
  const visiblePointCount = Math.max(
    2,
    Math.round(playhead * (projectedA.length - 1)),
  );
  const frame = currentFrame(quadraticTrace, playhead);
  const projectedABounds = useMemo(() => {
    const xs = projectedA.map((point) => point.x);
    const ys = projectedA.map((point) => point.y);
    return {
      minX: Math.min(...xs, -1),
      maxX: Math.max(...xs, 1),
      minY: Math.min(...ys, -1),
      maxY: Math.max(...ys, 1),
    };
  }, [projectedA]);
  const projectedBBounds = useMemo(() => {
    const xs = projectedB.map((point) => point.x);
    const ys = projectedB.map((point) => point.y);
    return {
      minX: Math.min(...xs, -1),
      maxX: Math.max(...xs, 1),
      minY: Math.min(...ys, -1),
      maxY: Math.max(...ys, 1),
    };
  }, [projectedB]);

  const saddle = useMemo(() => highDimensionalSaddle(), []);
  const positiveSpectrum = quadratic.hessianSpectrum?.filter((value) => value > 0) ?? [1];
  const conditionNumber =
    Math.max(...positiveSpectrum) / Math.max(1e-6, Math.min(...positiveSpectrum));
  const lossRemoved =
    ((quadraticTrace.startValue - frame.value) /
      Math.max(1e-6, quadraticTrace.startValue)) *
    100;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-[11px] font-mono uppercase tracking-[0.28em] text-neutral-500 dark:text-neutral-400">
          Scene 04
        </p>
        <h2 className="text-2xl font-semibold sm:text-3xl">
          One optimization run can produce more than one honest 2D picture
        </h2>
        <p className="max-w-3xl text-sm leading-relaxed text-neutral-600 dark:text-neutral-400 sm:text-base">
          This is one 64-dimensional gradient-descent run. The two panels below
          show different 2D projections of that exact same path. The optimizer
          did not change. Only the way we flattened the path into 2D changed.
        </p>
      </div>

      <DemoPanel
        title="One run, two views"
        description="Left: the most informative quick summary. Right: another valid 2D slice of the same exact run."
      >
        <div className="space-y-5">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-[1.1rem] border border-neutral-200/80 bg-white/80 p-4 dark:border-neutral-800/80 dark:bg-neutral-950/45">
              <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-neutral-500 dark:text-neutral-400">
                What changes
              </div>
              <p className="mt-2 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
                The 2D projection. We are choosing a different pair of
                directions to look along.
              </p>
            </div>
            <div className="rounded-[1.1rem] border border-neutral-200/80 bg-white/80 p-4 dark:border-neutral-800/80 dark:bg-neutral-950/45">
              <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-neutral-500 dark:text-neutral-400">
                What stays the same
              </div>
              <p className="mt-2 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
                The actual 64D optimization run and its loss curve.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setProjectionSeed((value) => value + 1)}
              className="rounded-full border border-neutral-300 px-4 py-2 text-sm transition hover:border-neutral-500 dark:border-neutral-700 dark:hover:border-neutral-500"
            >
              Randomize right view
            </button>
            <button
              type="button"
              onClick={() => setIsPlaying((current) => !current)}
              className="rounded-full border border-neutral-900 bg-neutral-900 px-4 py-2 text-sm text-white transition hover:opacity-90 dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
            >
              {isPlaying ? "Pause" : "Play"}
            </button>
            <button
              type="button"
              onClick={replay}
              className="rounded-full border border-neutral-300 px-4 py-2 text-sm transition hover:border-neutral-500 dark:border-neutral-700 dark:hover:border-neutral-500"
            >
              Replay
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <ProjectionFigure
              title="Best 2D summary"
              badge="same run"
              points={projectedA.slice(0, visiblePointCount)}
              bounds={projectedABounds}
              color="#c2410c"
              xLabel={dominantProjection.axisLabels.x}
              yLabel={dominantProjection.axisLabels.y}
              caption="This uses the two coordinates that changed the most during the run, so it is the clearest quick summary of what moved."
            />
            <ProjectionFigure
              title="Another 2D slice"
              badge="same run"
              points={projectedB.slice(0, visiblePointCount)}
              bounds={projectedBBounds}
              color="#0f766e"
              xLabel="random axis u"
              yLabel="random axis v"
              caption="This uses a different pair of directions in the same space. It can look like a different story even though nothing about the optimizer changed."
            />
          </div>
        </div>
      </DemoPanel>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <DemoPanel
          title="The reliable signal"
          description="No matter how the two projections look, this is the real progress made by the 64D run."
        >
          <div className="space-y-4">
            <MetricGrid
              items={[
                {
                  label: "Loss removed",
                  value: `${Math.max(0, lossRemoved).toFixed(1)}%`,
                  accent: "#c2410c",
                  description: "How much of the original 64D loss has actually been removed.",
                },
                {
                  label: "Best objective",
                  value: formatCompact(frame.bestValue),
                  description: "This value is the same no matter which projection you inspect.",
                },
                {
                  label: "Steepness left",
                  value: formatCompact(frame.gradientNorm ?? 0),
                  description: "How much downhill signal remains in the full problem.",
                },
                {
                  label: "Condition number",
                  value: formatCompact(conditionNumber),
                  description: "One direction is much stiffer than another, which is why projections can feel misleading.",
                },
              ]}
            />

            <SeriesChart
              series={[
                {
                  id: "loss",
                  label: "True 64D loss",
                  color: "#334155",
                  values: quadraticTrace.frames.map((entry) => entry.value),
                },
              ]}
              currentIndex={frame.index}
              xStartLabel="start"
              xEndLabel="same run"
              yLabel="true 64D loss"
              selectionLabel="step"
            />
          </div>
        </DemoPanel>

        <div className="space-y-6">
          <DemoPanel
            title="Why saddles matter"
            description="High-dimensional geometry is not just a bowl with more knobs."
          >
            <SignedSpectrumChart values={saddle.hessianSpectrum ?? []} />
          </DemoPanel>

          <SectionTakeaway>
            In high dimensions, a 2D plot is a view, not the whole landscape.
            The loss curve is the reliable progress signal.
          </SectionTakeaway>
        </div>
      </div>
    </div>
  );
}
