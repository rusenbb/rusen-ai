"use client";

import { useMemo } from "react";
import { DemoPanel } from "@/components/ui";
import {
  MetricGrid,
  SectionTakeaway,
  SeriesChart,
} from "@/components/optimization/OptimizationPrimitives";
import { SpectrumComparisonChart } from "@/components/optimization/SpectrumComparisonChart";
import { DimensionComparisonTable } from "@/components/optimization/DimensionComparisonTable";
import {
  convergenceCharacterization,
  DEFAULT_DIMENSION_CONFIGS,
  formatCompact,
  runDimensionComparison,
} from "@/lib/optimization";

const STEPS = 130;

export default function HighDimensionalScene() {
  const results = useMemo(
    () => runDimensionComparison(DEFAULT_DIMENSION_CONFIGS, STEPS),
    [],
  );

  const longestNormalized = Math.max(...results.map((r) => r.normalizedLoss.length));

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-[11px] font-mono uppercase tracking-[0.28em] text-neutral-500 dark:text-neutral-400">
          Scene 04
        </p>
        <h2 className="text-2xl font-semibold sm:text-3xl">
          Higher dimensions change the character, not just the size
        </h2>
        <p className="max-w-3xl text-sm leading-relaxed text-neutral-600 dark:text-neutral-400 sm:text-base">
          This is the same gradient-descent optimizer running on the same kind of
          quadratic objective at four different dimensions. No 2D picture of the
          landscape is shown because no honest one exists. The loss curves are the
          real signal.
        </p>
      </div>

      <DemoPanel
        title="Same optimizer, rising dimensions"
        description="Four quadratic objectives with increasing dimension. Each loss curve is normalized so 1.0 means starting loss and 0 means fully converged."
      >
        <SeriesChart
          series={results.map((r) => ({
            id: r.config.label,
            label: r.config.label,
            color: r.config.color,
            values: r.normalizedLoss,
          }))}
          height={220}
          formatValue={(v) => v.toFixed(2)}
          xStartLabel="step 0"
          xEndLabel={`step ${longestNormalized - 1}`}
          yLabel="fraction of initial loss"
          selectionLabel="step"
        />
      </DemoPanel>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <DimensionComparisonTable
          rows={results.map((r) => ({
            label: r.config.label,
            color: r.config.color,
            dimension: r.config.dimension,
            conditionNumber: r.config.conditionNumber,
            stepsToHalfLoss: r.stepsToHalfLoss,
            characterization: convergenceCharacterization(r.stepsToHalfLoss, STEPS),
          }))}
        />

        <MetricGrid
          items={[
            {
              label: "Fastest to 50%",
              value: results.find((r) => r.stepsToHalfLoss !== null)?.config.label ?? "\u2014",
              accent: results.find((r) => r.stepsToHalfLoss !== null)?.config.color,
              description: "The dimension where loss halves soonest.",
            },
            {
              label: "Slowest final loss",
              value: formatCompact(
                results[results.length - 1]?.normalizedLoss[results[results.length - 1]!.normalizedLoss.length - 1] ?? 1,
              ),
              description: `What fraction of the initial loss remains in ${results[results.length - 1]?.config.label ?? "the highest"} dimension after ${STEPS} steps.`,
            },
          ]}
        />
      </div>

      <SpectrumComparisonChart
        rows={results.map((r) => ({
          label: r.config.label,
          color: r.config.color,
          spectrum: r.spectrum,
        }))}
      />

      <details className="rounded-[1.2rem] border border-neutral-200/80 bg-white/72 p-4 dark:border-neutral-800/80 dark:bg-neutral-950/50">
        <summary className="cursor-pointer text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          Why not show the landscape?
        </summary>
        <div className="mt-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
          <p>
            Scenes 01&ndash;03 used 2D contour and surface plots because the
            optimizer lived in 2D, so you could see the entire landscape.
            In 64 or 500 dimensions, any 2D picture is a projection &mdash; a
            shadow of the real geometry. Different projections of the same run
            can look wildly different, which is why they mislead more than they
            teach.
          </p>
          <p className="mt-2">
            The loss curve does not lie. It shows the optimizer&rsquo;s actual
            progress in the full space, regardless of how you flatten the picture.
          </p>
        </div>
      </details>

      <SectionTakeaway>
        As dimensions grow, convergence slows and the eigenvalue spread widens.
        You cannot see a 500D landscape, but you can read its loss curve and its
        spectrum. Those are the honest instruments.
      </SectionTakeaway>
    </div>
  );
}
