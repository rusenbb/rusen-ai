"use client";

import dynamic from "next/dynamic";

const OptimizationExperience = dynamic(
  () => import("./OptimizationExperience"),
  {
    ssr: false,
    loading: () => (
      <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <div className="rounded-[1.35rem] border border-neutral-200/80 bg-white/80 p-6 dark:border-neutral-800/80 dark:bg-neutral-950/50">
          <p className="text-[11px] font-mono uppercase tracking-[0.28em] text-neutral-500 dark:text-neutral-400">
            Loading
          </p>
          <h1 className="mt-3 text-3xl font-semibold">Optimization</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
            Preparing the interactive optimization lab.
          </p>
        </div>
      </div>
    ),
  },
);

export default function OptimizationPageClient() {
  return <OptimizationExperience />;
}
