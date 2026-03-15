"use client";

import { useState } from "react";
import { Button, DemoPanel } from "@/components/ui";
import type {
  ExportBackground,
  MaskCandidate,
  ModelPhase,
  PointMode,
  SegmentPoint,
} from "../types";

interface ControlPanelProps {
  points: SegmentPoint[];
  pointMode: PointMode;
  maskCandidates: MaskCandidate[];
  activeMaskIndex: 0 | 1 | 2;
  maskOpacity: number;
  phase: ModelPhase;
  hasMask: boolean;
  onSetPointMode: (mode: PointMode) => void;
  onUndoPoint: () => void;
  onClearPoints: () => void;
  onSelectMask: (index: 0 | 1 | 2) => void;
  onOpacityChange: (v: number) => void;
  onExportSelection: (bg: ExportBackground) => void;
  onExportRemoval: (fill: ExportBackground) => void;
}

const BG_OPTIONS: { value: ExportBackground; label: string }[] = [
  { value: "transparent", label: "Transparent" },
  { value: "black", label: "Black" },
  { value: "white", label: "White" },
];

export default function ControlPanel({
  points,
  pointMode,
  maskCandidates,
  activeMaskIndex,
  maskOpacity,
  phase,
  hasMask,
  onSetPointMode,
  onUndoPoint,
  onClearPoints,
  onSelectMask,
  onOpacityChange,
  onExportSelection,
  onExportRemoval,
}: ControlPanelProps) {
  const disabled =
    phase === "encoding" || phase === "loading" || phase === "idle";

  const [exportBg, setExportBg] = useState<ExportBackground>("transparent");

  return (
    <div className="flex flex-col gap-4">
      {/* Point mode toggle ────────────────────────────────────── */}
      <DemoPanel title="Click Mode" padding="md">
        <div className="flex gap-2">
          <button
            onClick={() => onSetPointMode("include")}
            className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
              pointMode === "include"
                ? "border-green-500 bg-green-50 text-green-700 dark:border-green-400 dark:bg-green-950 dark:text-green-300"
                : "border-neutral-200 text-neutral-500 hover:border-neutral-300 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-neutral-600"
            }`}
          >
            <span className="mr-1.5">+</span> Include
          </button>
          <button
            onClick={() => onSetPointMode("exclude")}
            className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
              pointMode === "exclude"
                ? "border-red-500 bg-red-50 text-red-700 dark:border-red-400 dark:bg-red-950 dark:text-red-300"
                : "border-neutral-200 text-neutral-500 hover:border-neutral-300 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-neutral-600"
            }`}
          >
            <span className="mr-1.5">&minus;</span> Exclude
          </button>
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-neutral-400 dark:text-neutral-500">
          Include selects objects. Exclude refines by removing parts.
        </p>
      </DemoPanel>

      {/* Points ──────────────────────────────────────────────── */}
      <DemoPanel title="Points" padding="md">
        {points.length === 0 ? (
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            {phase === "encoded"
              ? "Click on the image to add a point."
              : "Load an image first."}
          </p>
        ) : (
          <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
            {points.map((pt, i) => (
              <div
                key={pt.id}
                className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-300"
              >
                <span
                  className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${
                    pt.label === 1 ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                <span className="tabular-nums">
                  #{i + 1} &nbsp; ({(pt.x * 100).toFixed(0)}%,{" "}
                  {(pt.y * 100).toFixed(0)}%)
                </span>
                <span className="ml-auto text-neutral-400 dark:text-neutral-500">
                  {pt.label === 1 ? "+" : "\u2212"}
                </span>
              </div>
            ))}
          </div>
        )}

        {points.length > 0 && (
          <div className="mt-3 flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1"
              onClick={onUndoPoint}
              disabled={disabled}
            >
              Undo last
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1"
              onClick={onClearPoints}
              disabled={disabled}
            >
              Clear all
            </Button>
          </div>
        )}
      </DemoPanel>

      {/* Masks ──────────────────────────────────────────────── */}
      {maskCandidates.length > 0 && (
        <DemoPanel title="Mask Selection" padding="md">
          <div className="flex gap-2">
            {maskCandidates.map((c) => (
              <button
                key={c.index}
                onClick={() => onSelectMask(c.index)}
                className={`flex-1 rounded-lg border px-2 py-2 text-center text-xs transition-colors ${
                  c.index === activeMaskIndex
                    ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-950 dark:text-blue-300"
                    : "border-neutral-200 text-neutral-500 hover:border-neutral-300 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-neutral-600"
                }`}
              >
                <div className="font-medium">#{c.index + 1}</div>
                <div className="mt-0.5 tabular-nums text-[10px]">
                  {(c.iouScore * 100).toFixed(1)}%
                </div>
              </button>
            ))}
          </div>
        </DemoPanel>
      )}

      {/* Opacity ─────────────────────────────────────────────── */}
      <DemoPanel title="Mask Opacity" padding="md">
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={maskOpacity}
            onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
            className="flex-1 accent-blue-500"
            disabled={disabled}
          />
          <span className="w-10 text-right text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
            {Math.round(maskOpacity * 100)}%
          </span>
        </div>
      </DemoPanel>

      {/* Export ───────────────────────────────────────────────── */}
      {hasMask && (
        <DemoPanel title="Export" padding="md">
          {/* Background selector */}
          <div className="mb-3">
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              Background
            </p>
            <div className="flex gap-1.5">
              {BG_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setExportBg(opt.value)}
                  className={`flex-1 rounded-md border px-2 py-1.5 text-[11px] transition-colors ${
                    exportBg === opt.value
                      ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-950 dark:text-blue-300"
                      : "border-neutral-200 text-neutral-500 hover:border-neutral-300 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-neutral-600"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            <Button
              variant="primary"
              size="sm"
              fullWidth
              onClick={() => onExportSelection(exportBg)}
            >
              Download selection
            </Button>
            <Button
              variant="secondary"
              size="sm"
              fullWidth
              onClick={() => onExportRemoval(exportBg)}
            >
              Remove selection
            </Button>
          </div>
        </DemoPanel>
      )}
    </div>
  );
}
