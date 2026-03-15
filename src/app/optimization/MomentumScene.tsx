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
  type SimulationTrace,
  type Vector,
} from "@/lib/optimization";

function currentFrame(trace: SimulationTrace, playhead: number) {
  const index = Math.min(
    trace.frames.length - 1,
    Math.round(playhead * Math.max(0, trace.frames.length - 1)),
  );
  return trace.frames[index] ?? trace.frames[trace.frames.length - 1]!;
}

const MOMENTUM_PRESETS = [
  {
    label: "Stable",
    gdLearningRate: 0.12,
    momentumLearningRate: 0.03,
    momentum: 0.72,
  },
  {
    label: "Show zig-zag",
    gdLearningRate: 0.28,
    momentumLearningRate: 0.05,
    momentum: 0.8,
  },
  {
    label: "Overcook GD",
    gdLearningRate: 0.34,
    momentumLearningRate: 0.05,
    momentum: 0.85,
  },
] as const;

export default function MomentumScene({ plotMode }: { plotMode: PlotMode }) {
  const objective = useMemo(() => getObjective2D("ravine"), []);
  const [startPoint, setStartPoint] = useState<Vector>(
    initialPointForObjective(objective),
  );
  const [gdLearningRate, setGdLearningRate] = useState(0.28);
  const [momentumLearningRate, setMomentumLearningRate] = useState(0.05);
  const [momentum, setMomentum] = useState(0.8);
  const stepBudget = 140;
  const [interactionMode, setInteractionMode] =
    useState<SurfaceInteractionMode>("navigate");
  const { playhead, isPlaying, setIsPlaying, reset, replay } = usePlayback(0.22);

  const vanillaTrace = useMemo(
    () =>
      runGradientTrace({
        objective,
        optimizerId: "gradient-descent",
        start: startPoint,
        steps: stepBudget,
        params: { learningRate: gdLearningRate },
      }),
    [gdLearningRate, objective, startPoint, stepBudget],
  );

  const momentumTrace = useMemo(
    () =>
      runGradientTrace({
        objective,
        optimizerId: "momentum",
        start: startPoint,
        steps: stepBudget,
        params: { learningRate: momentumLearningRate, momentum },
      }),
    [momentum, momentumLearningRate, objective, startPoint, stepBudget],
  );

  useEffect(() => {
    reset();
  }, [
    gdLearningRate,
    momentum,
    momentumLearningRate,
    reset,
    startPoint,
    stepBudget,
  ]);

  const vanillaFrame = currentFrame(vanillaTrace, playhead);
  const momentumFrame = currentFrame(momentumTrace, playhead);

  const applyPreset = (preset: (typeof MOMENTUM_PRESETS)[number]) => {
    setGdLearningRate(preset.gdLearningRate);
    setMomentumLearningRate(preset.momentumLearningRate);
    setMomentum(preset.momentum);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-[11px] font-mono uppercase tracking-[0.28em] text-neutral-500 dark:text-neutral-400">
          Scene 02
        </p>
        <h2 className="text-2xl font-semibold sm:text-3xl">
          Momentum matters when the valley is narrow and the path wants to zig-zag
        </h2>
        <p className="max-w-3xl text-sm leading-relaxed text-neutral-600 dark:text-neutral-400 sm:text-base">
          This scene works best when you dial the hyperparameters yourself.
          Increase plain GD until it bounces across the ravine walls, then tune
          momentum to see how memory changes the same downhill information.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <DemoPanel
          title="Shared ravine"
          description="The same narrow valley, the same start point, and two optimizers whose hyperparameters you can steer."
          className="overflow-hidden"
        >
          <div className="space-y-5">
            <OptimizationPlot
              objective={objective}
              traces={[vanillaTrace, momentumTrace]}
              playhead={playhead}
              mode={plotMode}
              onStartChange={setStartPoint}
              onDropComplete={() => setInteractionMode("navigate")}
              focusedOptimizerId="momentum"
              interactionMode={interactionMode}
            />

            <div className="space-y-3">
              <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-neutral-500 dark:text-neutral-400">
                Presets
              </div>
              <div className="flex flex-wrap gap-2">
                {MOMENTUM_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-mono uppercase tracking-[0.18em] text-neutral-700 transition hover:border-neutral-500 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3">
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

            <label className="space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
              <div className="flex items-center justify-between">
                <span className="font-medium">Plain GD learning rate</span>
                <span className="font-mono text-xs">{gdLearningRate.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0.05}
                max={0.38}
                step={0.01}
                value={gdLearningRate}
                onChange={(event) => setGdLearningRate(Number(event.target.value))}
                className="w-full"
              />
            </label>

            <label className="space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
              <div className="flex items-center justify-between">
                <span className="font-medium">Momentum learning rate</span>
                <span className="font-mono text-xs">{momentumLearningRate.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0.01}
                max={0.08}
                step={0.005}
                value={momentumLearningRate}
                onChange={(event) =>
                  setMomentumLearningRate(Number(event.target.value))
                }
                className="w-full"
              />
            </label>

            <label className="space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
              <div className="flex items-center justify-between">
                <span className="font-medium">Momentum strength</span>
                <span className="font-mono text-xs">{momentum.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0.2}
                max={0.98}
                step={0.01}
                value={momentum}
                onChange={(event) => setMomentum(Number(event.target.value))}
                className="w-full"
              />
            </label>
          </div>
        </DemoPanel>

        <div className="space-y-6">
          <DemoPanel
            title="Compare the result"
            description="The surface and start stay fixed. Only the update rules and hyperparameters are changing."
          >
            <MetricGrid
              items={[
                {
                  label: "Plain GD",
                  value: formatCompact(vanillaFrame.bestValue),
                  accent: "#b45309",
                  description:
                    "Best objective plain gradient descent reaches with its current learning rate.",
                },
                {
                  label: "Momentum",
                  value: formatCompact(momentumFrame.bestValue),
                  accent: "#0f766e",
                  description: "Best objective momentum reaches with the same start and budget.",
                },
                {
                  label: "GD oscillations",
                  value: String(vanillaFrame.oscillationCount),
                  description: "Raise GD learning rate to watch this count climb.",
                },
                {
                  label: "Momentum oscillations",
                  value: String(momentumFrame.oscillationCount),
                  description: "Tune momentum and its learning rate to change how much wall-bounce remains.",
                },
              ]}
            />
          </DemoPanel>

          <SectionTakeaway>
            Momentum is easiest to understand when you can make plain GD fail on
            purpose, then see how much of that wasted sideways motion memory can
            smooth out.
          </SectionTakeaway>
        </div>
      </div>

      <DemoPanel
        title="Linked chart"
        description="Try a gentle setting, then a zig-zag setting. The point is to see how the shape of progress changes, not to crown one line in every regime."
      >
        <SeriesChart
          series={[
            {
              id: "gd",
              label: "Plain GD",
              color: "#b45309",
              values: vanillaTrace.frames.map((entry) => entry.value),
            },
            {
              id: "momentum",
              label: "Momentum",
              color: "#0f766e",
              values: momentumTrace.frames.map((entry) => entry.value),
            },
          ]}
          currentIndex={momentumFrame.index}
          xStartLabel="start"
          xEndLabel={`${stepBudget} steps`}
          yLabel="objective"
          selectionLabel="step"
        />
      </DemoPanel>
    </div>
  );
}
