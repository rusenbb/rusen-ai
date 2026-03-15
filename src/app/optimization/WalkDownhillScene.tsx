"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, DemoPanel } from "@/components/ui";
import OptimizationPlot, {
  type PlotMode,
  type SurfaceInteractionMode,
} from "@/components/optimization/OptimizationPlot";
import {
  MetricGrid,
  SectionTakeaway,
  SeriesChart,
} from "@/components/optimization/OptimizationPrimitives";
import { usePlayback } from "@/components/optimization/usePlayback";
import {
  formatCompact,
  getObjective2D,
  initialPointForObjective,
  runGradientTrace,
  type Objective2D,
  type SimulationTrace,
  type Vector,
} from "@/lib/optimization";

type LandscapeId = "bowl" | "ravine" | "saddle" | "rosenbrock" | "himmelblau";

function currentFrame(trace: SimulationTrace, playhead: number) {
  const index = Math.min(
    trace.frames.length - 1,
    Math.round(playhead * Math.max(0, trace.frames.length - 1)),
  );
  return trace.frames[index] ?? trace.frames[trace.frames.length - 1]!;
}

const LEARNING_RATE_PRESETS = [
  { label: "Too timid", value: 0.03 },
  { label: "Balanced", value: 0.12 },
  { label: "Too bold", value: 0.32 },
] as const;

export default function WalkDownhillScene({ plotMode }: { plotMode: PlotMode }) {
  const [landscapeId, setLandscapeId] = useState<LandscapeId>("bowl");
  const objective = useMemo(
    () => getObjective2D(landscapeId),
    [landscapeId],
  ) as Objective2D;
  const [learningRate, setLearningRate] = useState(0.12);
  const [stepBudget, setStepBudget] = useState(110);
  const [interactionMode, setInteractionMode] =
    useState<SurfaceInteractionMode>("navigate");
  const [startPoint, setStartPoint] = useState<Vector>(
    initialPointForObjective(objective),
  );
  const { playhead, isPlaying, setIsPlaying, reset, replay } = usePlayback(0.2);

  const handleLandscapeChange = (nextLandscapeId: LandscapeId) => {
    const nextObjective = getObjective2D(nextLandscapeId);
    setLandscapeId(nextLandscapeId);
    setStartPoint(initialPointForObjective(nextObjective));
    reset();
  };

  const trace = useMemo(
    () =>
      runGradientTrace({
        objective,
        optimizerId: "gradient-descent",
        start: startPoint,
        steps: stepBudget,
        params: { learningRate },
      }),
    [learningRate, objective, startPoint, stepBudget],
  );

  useEffect(() => {
    reset();
  }, [learningRate, reset, startPoint, stepBudget]);

  const frame = currentFrame(trace, playhead);
  const rhythm =
    learningRate < 0.06
      ? "cautious"
      : learningRate < 0.2
        ? "balanced"
        : "overshooting";

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-[11px] font-mono uppercase tracking-[0.28em] text-neutral-500 dark:text-neutral-400">
          Scene 01
        </p>
        <h2 className="text-2xl font-semibold sm:text-3xl">
          Walking downhill only feels easy until the step size is wrong
        </h2>
        <p className="max-w-3xl text-sm leading-relaxed text-neutral-600 dark:text-neutral-400 sm:text-base">
          Start with the simplest story: one point, one surface, one rule.
          The only control is how aggressively we step downhill.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <DemoPanel
          title="Main figure"
          description="Move the start point, adjust the learning rate, and replay the same descent."
          className="overflow-hidden"
        >
          <div className="space-y-5">
            <OptimizationPlot
              objective={objective}
              traces={[trace]}
              playhead={playhead}
              mode={plotMode}
              onStartChange={setStartPoint}
              onDropComplete={() => setInteractionMode("navigate")}
              interactionMode={interactionMode}
            />

            <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
              <label className="space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
                <span className="font-medium">Landscape</span>
                <div className="flex flex-wrap gap-2">
                  {([
                    { id: "bowl", label: "Friendly bowl" },
                    { id: "ravine", label: "Narrow ravine" },
                    { id: "saddle", label: "Saddle" },
                    { id: "rosenbrock", label: "Twisted valley" },
                    { id: "himmelblau", label: "Multiple basins" },
                  ] as const).map((option) => {
                    const active = option.id === landscapeId;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => handleLandscapeChange(option.id)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-mono uppercase tracking-[0.18em] transition ${
                          active
                            ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                            : "border-neutral-300 text-neutral-700 hover:border-neutral-500 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </label>

              <div className="flex items-end gap-2">
                <div className="inline-flex rounded-full border border-neutral-300/80 bg-white/80 p-1 dark:border-neutral-700/80 dark:bg-neutral-950/60">
                  {(["navigate", "drop"] as const).map((option) => {
                    const active = interactionMode === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setInteractionMode(option)}
                        className={`rounded-full px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.18em] transition ${
                          active
                            ? "bg-neutral-900 text-white shadow-sm dark:bg-neutral-100 dark:text-neutral-900"
                            : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
                        }`}
                      >
                        {option === "navigate" ? "Navigate" : "Drop point"}
                      </button>
                    );
                  })}
                </div>
                <Button onClick={() => setIsPlaying((current) => !current)}>
                  {isPlaying ? "Pause" : "Play"}
                </Button>
                <Button variant="secondary" onClick={replay}>
                  Replay
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm text-neutral-700 dark:text-neutral-300">
                <span className="font-medium">Learning rate</span>
                <span className="font-mono text-xs">{learningRate.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0.01}
                max={0.4}
                step={0.01}
                value={learningRate}
                onChange={(event) => setLearningRate(Number(event.target.value))}
                className="w-full"
              />
              <div className="flex flex-wrap gap-2">
                {LEARNING_RATE_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setLearningRate(preset.value)}
                    className="rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-mono uppercase tracking-[0.18em] text-neutral-700 transition hover:border-neutral-500 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
              <div className="flex items-center justify-between">
                <span className="font-medium">Step budget</span>
                <span className="font-mono text-xs">{stepBudget}</span>
              </div>
              <input
                type="range"
                min={40}
                max={160}
                step={10}
                value={stepBudget}
                onChange={(event) => setStepBudget(Number(event.target.value))}
                className="w-full"
              />
            </label>
          </div>
        </DemoPanel>

        <div className="space-y-6">
          <DemoPanel
            title="What to notice"
            description="The surface did not change. Only the step size did."
          >
            <MetricGrid
              items={[
                {
                  label: "Current objective",
                  value: formatCompact(frame.value),
                  accent: "#0f766e",
                  description: "The loss at the highlighted point right now.",
                },
                {
                  label: "Best seen",
                  value: formatCompact(frame.bestValue),
                  description: "How low plain gradient descent managed to get.",
                },
                {
                  label: "Steepness left",
                  value: formatCompact(frame.gradientNorm ?? 0),
                  description: "How much downhill signal is still available.",
                },
                {
                  label: "Reading",
                  value: rhythm,
                  description: "Cautious means slow progress. Overshooting means the path is wasting motion.",
                },
              ]}
            />
          </DemoPanel>

          <SectionTakeaway>
            Gradient descent is not just “go downhill.” It is “go downhill at a
            pace the landscape can tolerate.”
          </SectionTakeaway>
        </div>
      </div>

      <DemoPanel
        title="Linked chart"
        description="This chart exists to answer one question: are we making steady progress, creeping, or bouncing?"
      >
        <SeriesChart
          series={[
            {
              id: "gd",
              label: "Gradient descent",
              color: "#0f766e",
              values: trace.frames.map((entry) => entry.value),
            },
          ]}
          currentIndex={frame.index}
          xStartLabel="first step"
          xEndLabel={`${stepBudget} steps`}
          yLabel="objective"
          selectionLabel="step"
        />
      </DemoPanel>
    </div>
  );
}
