"use client";

import { useMemo } from "react";
import { DemoPanel } from "@/components/ui";
import {
  MetricGrid,
  SectionTakeaway,
  SignedSpectrumChart,
} from "@/components/optimization/OptimizationPrimitives";
import { CriticalPointCombinatorics } from "@/components/optimization/CriticalPointCombinatorics";
import {
  saddleForDimension,
} from "@/lib/optimization";

export default function SaddlePointScene() {
  const saddle = useMemo(() => saddleForDimension(64, 18), []);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-[11px] font-mono uppercase tracking-[0.28em] text-neutral-500 dark:text-neutral-400">
          Scene 05
        </p>
        <h2 className="text-2xl font-semibold sm:text-3xl">
          Why saddle points outnumber minima
        </h2>
        <p className="max-w-3xl text-sm leading-relaxed text-neutral-600 dark:text-neutral-400 sm:text-base">
          At a critical point the gradient is zero, but that does not mean the
          optimizer is stuck at a minimum. The Hessian tells you which directions
          curve up and which curve down. In high dimensions, combinatorics makes
          true local minima vanishingly rare.
        </p>
      </div>

      <DemoPanel
        title="The counting argument"
        description="Each Hessian eigenvalue can be positive (+) or negative (\u2212). A local minimum needs all positive. Count the combinations."
      >
        <CriticalPointCombinatorics />
      </DemoPanel>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <DemoPanel
          title="A 64D saddle in practice"
          description="This is what the Hessian spectrum actually looks like at a saddle point in 64 dimensions."
        >
          <SignedSpectrumChart values={saddle.spectrum} />
        </DemoPanel>

        <div className="space-y-6">
          <MetricGrid
            items={[
              {
                label: "Escape directions",
                value: String(saddle.negativeCount),
                accent: "#f43f5e",
                description: "Axes where the surface curves downward. The optimizer can slide away along any of these.",
              },
              {
                label: "Stabilizing directions",
                value: String(saddle.positiveCount),
                accent: "#14b8a6",
                description: "Axes where the surface curves upward, pushing back toward the critical point.",
              },
            ]}
          />

          <SectionTakeaway>
            An optimizer that appears stuck in high dimensions is almost certainly
            at a saddle point, not a local minimum. Escape routes exist &mdash; the
            challenge is finding them, not proving they are there.
          </SectionTakeaway>
        </div>
      </div>
    </div>
  );
}
