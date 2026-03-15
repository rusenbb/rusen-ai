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
  runZerothOrderTrace,
  type Objective2D,
  type SimulationTrace,
  type Vector,
  type ZerothOrderOptimizerId,
} from "@/lib/optimization";

type ChallengeId =
  | "rastrigin"
  | "noisy-bowl"
  | "cliff"
  | "himmelblau"
  | "rosenbrock";

function currentFrame(trace: SimulationTrace, playhead: number) {
  const index = Math.min(
    trace.frames.length - 1,
    Math.round(playhead * Math.max(0, trace.frames.length - 1)),
  );
  return trace.frames[index] ?? trace.frames[trace.frames.length - 1]!;
}

const METHOD_COPY: Record<ZerothOrderOptimizerId, string> = {
  "random-search":
    "The honest baseline. Sample candidates, keep the best, and accept that brute force is sometimes a reasonable teacher.",
  "nelder-mead":
    "A moving simplex: reflect, stretch, and contract a small geometric probe instead of following gradients.",
  "simulated-annealing":
    "Allows some bad moves on purpose, so local traps stop being the whole story.",
  "particle-swarm":
    "A flock of guesses balancing private memory with social pressure.",
  "cma-es":
    "Learns a search distribution so the covariance itself becomes part of the optimizer.",
};

const CHALLENGE_COPY: Record<ChallengeId, string> = {
  rastrigin:
    "Smooth but full of repeating traps. Great for seeing why naive local decisions can mislead search.",
  "noisy-bowl":
    "The underlying bowl is simple, but each evaluation arrives with static on top.",
  cliff:
    "A hidden step discontinuity. The objective is real, but its slope story breaks down.",
  himmelblau:
    "Several attractive basins compete with one another, so where you search first really matters.",
  rosenbrock:
    "A narrow curved valley where improvement exists, but it is annoyingly hard to follow.",
};

export default function BlackBoxScene({ plotMode }: { plotMode: PlotMode }) {
  const [challengeId, setChallengeId] = useState<ChallengeId>("rastrigin");
  const objective = useMemo(
    () => getObjective2D(challengeId),
    [challengeId],
  ) as Objective2D;
  const [methodId, setMethodId] = useState<ZerothOrderOptimizerId>("nelder-mead");
  const [evaluationBudget, setEvaluationBudget] = useState(220);
  const [interactionMode, setInteractionMode] =
    useState<SurfaceInteractionMode>("navigate");
  const [startPoint, setStartPoint] = useState<Vector>(
    initialPointForObjective(objective),
  );
  const { playhead, isPlaying, setIsPlaying, reset, replay } = usePlayback(0.2);

  const handleChallengeChange = (nextChallengeId: ChallengeId) => {
    const nextObjective = getObjective2D(nextChallengeId);
    setChallengeId(nextChallengeId);
    setStartPoint(initialPointForObjective(nextObjective));
    reset();
  };

  const selectedTrace = useMemo(
    () =>
      runZerothOrderTrace({
        objective,
        optimizerId: methodId,
        start: startPoint,
        evaluationBudget,
        seed: 19,
      }),
    [evaluationBudget, methodId, objective, startPoint],
  );

  const baselineTrace = useMemo(
    () =>
      runZerothOrderTrace({
        objective,
        optimizerId: "random-search",
        start: startPoint,
        evaluationBudget,
        seed: 19,
      }),
    [evaluationBudget, objective, startPoint],
  );

  useEffect(() => {
    reset();
  }, [evaluationBudget, methodId, reset, startPoint]);

  const selectedFrame = currentFrame(selectedTrace, playhead);
  const baselineFrame = currentFrame(baselineTrace, playhead);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-[11px] font-mono uppercase tracking-[0.28em] text-neutral-500 dark:text-neutral-400">
          Scene 03
        </p>
        <h2 className="text-2xl font-semibold sm:text-3xl">
          When gradients disappear, the optimizer has to spend evaluations wisely
        </h2>
        <p className="max-w-3xl text-sm leading-relaxed text-neutral-600 dark:text-neutral-400 sm:text-base">
          Think less about “slope” and more about “which candidate is worth
          paying to evaluate next?” That is the black-box optimization mindset.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <DemoPanel
          title="Main figure"
          description="The selected method is compared against plain random search on the same black-box objective."
          className="overflow-hidden"
        >
          <div className="space-y-5">
            <OptimizationPlot
              objective={objective}
              traces={[baselineTrace, selectedTrace]}
              playhead={playhead}
              mode={plotMode}
              onStartChange={setStartPoint}
              onDropComplete={() => setInteractionMode("navigate")}
              focusedOptimizerId={methodId}
              interactionMode={interactionMode}
            />

            <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
              <label className="space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
                <span className="font-medium">Challenge</span>
                <div className="flex flex-wrap gap-2">
                  {([
                    { id: "rastrigin", label: "Smooth traps" },
                    { id: "noisy-bowl", label: "Noisy bowl" },
                    { id: "cliff", label: "Discontinuous cliff" },
                    { id: "himmelblau", label: "Many basins" },
                    { id: "rosenbrock", label: "Narrow valley" },
                  ] as const).map((option) => {
                    const active = option.id === challengeId;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => handleChallengeChange(option.id)}
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

              <label className="space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
                <span className="font-medium">Method</span>
                <select
                  value={methodId}
                  onChange={(event) =>
                    setMethodId(event.target.value as ZerothOrderOptimizerId)
                  }
                  className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-950"
                >
                  <option value="nelder-mead">Nelder-Mead</option>
                  <option value="simulated-annealing">Simulated Annealing</option>
                  <option value="particle-swarm">Particle Swarm</option>
                  <option value="cma-es">CMA-ES</option>
                </select>
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

            <label className="space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
              <div className="flex items-center justify-between">
                <span className="font-medium">Evaluation budget</span>
                <span className="font-mono text-xs">{evaluationBudget}</span>
              </div>
              <input
                type="range"
                min={80}
                max={320}
                step={20}
                value={evaluationBudget}
                onChange={(event) =>
                  setEvaluationBudget(Number(event.target.value))
                }
                className="w-full"
              />
            </label>
          </div>
        </DemoPanel>

        <div className="space-y-6">
          <DemoPanel
            title="Why this scene matters"
            description={CHALLENGE_COPY[challengeId]}
          >
            <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
              {METHOD_COPY[methodId]}
            </p>
          </DemoPanel>

          <DemoPanel
            title="Compare against the baseline"
            description="Random search is here on purpose. It gives the fancy method something honest to beat."
          >
            <MetricGrid
              items={[
                {
                  label: "Selected method",
                  value: formatCompact(selectedFrame.bestValue),
                  accent: selectedTrace.color,
                  description: "Best objective value found so far.",
                },
                {
                  label: "Random search",
                  value: formatCompact(baselineFrame.bestValue),
                  accent: baselineTrace.color,
                  description: "What blind search achieved with the same budget.",
                },
                {
                  label: "Evaluations used",
                  value: String(selectedFrame.evaluations),
                  description: "Black-box optimization spends evaluations like currency.",
                },
                {
                  label: "Spread",
                  value: formatCompact(
                    selectedTrace.finalSpread ?? selectedFrame.stepSize,
                  ),
                  description: "How broad the search remained near the end.",
                },
              ]}
            />
          </DemoPanel>

          <SectionTakeaway>
            Gradient-free optimization is not a fallback. It is the right
            mental model whenever you can measure outcomes but cannot
            differentiate them cleanly.
          </SectionTakeaway>
        </div>
      </div>

      <DemoPanel
        title="Linked chart"
        description="Budget is the x-axis here. The question is how much best-so-far improves as evaluations are spent."
      >
        <SeriesChart
          series={[
            {
              id: "baseline",
              label: "Random search",
              color: baselineTrace.color,
              values: baselineTrace.frames.map((entry) => entry.bestValue),
            },
            {
              id: "selected",
              label: "Selected method",
              color: selectedTrace.color,
              values: selectedTrace.frames.map((entry) => entry.bestValue),
            },
          ]}
          currentIndex={selectedFrame.index}
          xStartLabel="few evals"
          xEndLabel={`${evaluationBudget} evals`}
          yLabel="best-so-far"
          selectionLabel="checkpoint"
        />
      </DemoPanel>
    </div>
  );
}
