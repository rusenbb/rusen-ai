"use client";

import { type ProjectionMode } from "../types";

interface ProjectionModeToggleProps {
  mode: ProjectionMode;
  onSetMode: (mode: ProjectionMode) => void;
  semanticAxesReady: boolean;
  disabled?: boolean;
}

export default function ProjectionModeToggle({
  mode,
  onSetMode,
  semanticAxesReady,
  disabled = false,
}: ProjectionModeToggleProps) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
        Projection Mode
      </h4>
      <div className="flex rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden">
        <button
          onClick={() => onSetMode("semantic-axes")}
          disabled={disabled}
          className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
            mode === "semantic-axes"
              ? "bg-indigo-600 text-white"
              : "bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800"
          } disabled:opacity-50`}
        >
          <div className="flex flex-col items-center">
            <span>Semantic</span>
            <span className="text-xs opacity-75">Interpretable</span>
          </div>
        </button>
        <button
          onClick={() => onSetMode("umap")}
          disabled={disabled}
          className={`flex-1 px-3 py-2 text-sm font-medium transition-colors border-l border-neutral-200 dark:border-neutral-700 ${
            mode === "umap"
              ? "bg-indigo-600 text-white"
              : "bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800"
          } disabled:opacity-50`}
        >
          <div className="flex flex-col items-center">
            <span>UMAP</span>
            <span className="text-xs opacity-75">Clusters</span>
          </div>
        </button>
      </div>

      {mode === "semantic-axes" && !semanticAxesReady && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Define and assign semantic axes to see the projection.
        </p>
      )}

      <p className="text-xs text-neutral-500">
        {mode === "semantic-axes"
          ? "Project onto user-defined semantic directions."
          : "Automatic dimensionality reduction preserving structure."}
      </p>
    </div>
  );
}
