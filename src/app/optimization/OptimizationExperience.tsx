"use client";

import { useState } from "react";
import { DemoHeader, DemoMutedSection, DemoPage } from "@/components/ui";
import {
  PlotModeToggle,
} from "@/components/optimization/OptimizationPrimitives";
import type { PlotMode } from "@/components/optimization/OptimizationPlot";
import BlackBoxScene from "./BlackBoxScene";
import HighDimensionalScene from "./HighDimensionalScene";
import MomentumScene from "./MomentumScene";
import WalkDownhillScene from "./WalkDownhillScene";

type SceneId = "walk" | "momentum" | "black-box" | "shadows";

const SCENES: Array<{
  id: SceneId;
  kicker: string;
  title: string;
  summary: string;
}> = [
  {
    id: "walk",
    kicker: "Start simple",
    title: "Walk downhill",
    summary: "Why step size alone can make the easiest optimization problem feel hard.",
  },
  {
    id: "momentum",
    kicker: "Mechanism",
    title: "Why momentum helps",
    summary: "Same ravine, same gradient, less useless side-to-side motion.",
  },
  {
    id: "black-box",
    kicker: "When slopes vanish",
    title: "Search without gradients",
    summary: "How black-box optimizers spend evaluation budget instead of following derivatives.",
  },
  {
    id: "shadows",
    kicker: "Break the cartoon",
    title: "One run, two views",
    summary: "How the same high-dimensional optimization can look different when you flatten it into 2D.",
  },
];

export default function OptimizationExperience() {
  const [plotMode, setPlotMode] = useState<PlotMode>("contour");
  const [sceneId, setSceneId] = useState<SceneId>("walk");

  const scene = SCENES.find((entry) => entry.id === sceneId) ?? SCENES[0]!;

  return (
    <DemoPage width="2xl" className="space-y-8">
      <DemoHeader
        eyebrow="Optimization / Gradient Methods"
        title="Optimization"
        description="See why optimizers succeed or fail on different landscapes."
        actions={
          sceneId === "shadows" ? null : (
            <PlotModeToggle mode={plotMode} onChange={setPlotMode} />
          )
        }
      />

      <div className="grid gap-3 lg:grid-cols-4">
        {SCENES.map((entry, index) => {
          const active = entry.id === sceneId;
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => setSceneId(entry.id)}
              className={`rounded-[1.25rem] border p-4 text-left transition ${
                active
                  ? "border-neutral-900 bg-neutral-900 text-white shadow-[0_18px_40px_rgba(15,23,42,0.16)] dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-950"
                  : "border-neutral-200/80 bg-white/75 hover:border-neutral-400 dark:border-neutral-800/80 dark:bg-neutral-950/40 dark:hover:border-neutral-600"
              }`}
            >
              <div className={`text-[10px] font-mono uppercase tracking-[0.24em] ${active ? "text-white/70 dark:text-neutral-700" : "text-neutral-500 dark:text-neutral-400"}`}>
                {String(index + 1).padStart(2, "0")} / {entry.kicker}
              </div>
              <h2 className="mt-2 text-base font-semibold">{entry.title}</h2>
              <p className={`mt-2 text-sm leading-relaxed ${active ? "text-white/80 dark:text-neutral-700" : "text-neutral-600 dark:text-neutral-400"}`}>
                {entry.summary}
              </p>
            </button>
          );
        })}
      </div>

      <DemoMutedSection title={scene.title}>
        <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
          {sceneId === "shadows"
            ? `${scene.summary} This scene is not about a 3D surface at all. It is about seeing the same optimization path through two different 2D projections.`
            : `${scene.summary} The figures default to contour view because that is the clearest teaching language. Switch to surface view only when you want to inspect the same geometry in 3D.`}
        </p>
      </DemoMutedSection>

      {sceneId === "walk" ? <WalkDownhillScene plotMode={plotMode} /> : null}
      {sceneId === "momentum" ? <MomentumScene plotMode={plotMode} /> : null}
      {sceneId === "black-box" ? <BlackBoxScene plotMode={plotMode} /> : null}
      {sceneId === "shadows" ? <HighDimensionalScene /> : null}
    </DemoPage>
  );
}
