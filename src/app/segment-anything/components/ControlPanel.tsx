"use client";

import { useState } from "react";
import { Button, Segmented } from "@/components/ui";
import type { ExportBackground, MaskCandidate, PointMode, SegmentPoint } from "../types";

interface ControlPanelProps {
  points: SegmentPoint[];
  pointMode: PointMode;
  maskCandidates: MaskCandidate[];
  activeMaskIndex: 0 | 1 | 2;
  busy: boolean;
  hasMask: boolean;
  onSetPointMode: (mode: PointMode) => void;
  onUndoPoint: () => void;
  onClearPoints: () => void;
  onSelectMask: (index: 0 | 1 | 2) => void;
  onExportSelection: (bg: ExportBackground) => void;
  onExportRemoval: (fill: ExportBackground) => void;
}

const kicker = "mb-2 font-mono text-[0.7rem] uppercase tracking-[0.08em] text-[var(--sub)]";

const BG_OPTIONS = [
  { value: "transparent", label: "Transparent" },
  { value: "black", label: "Black" },
  { value: "white", label: "White" },
] as const;

export default function ControlPanel({
  points,
  pointMode,
  maskCandidates,
  activeMaskIndex,
  busy,
  hasMask,
  onSetPointMode,
  onUndoPoint,
  onClearPoints,
  onSelectMask,
  onExportSelection,
  onExportRemoval,
}: ControlPanelProps) {
  const [exportBg, setExportBg] = useState<ExportBackground>("transparent");

  return (
    <div className="space-y-6">
      <div>
        <p className={kicker}>Select</p>
        <ul className="space-y-1.5 text-sm text-[var(--muted)]">
          <li className="flex items-center gap-2">
            <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full bg-accent" />
            Click adds to the cut-out
          </li>
          <li className="flex items-center gap-2 pointer-coarse:hidden">
            <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 bg-accent-2" />
            Shift-click or right-click removes
          </li>
        </ul>
        {/* Touch screens have no shift or right click, so they get a toggle. */}
        <div className="mt-3 hidden pointer-coarse:block">
        <Segmented
          label="What a tap does"
          options={[
            { value: "include", label: "Tap adds" },
            { value: "exclude", label: "Tap removes" },
          ]}
          value={pointMode}
          onChange={onSetPointMode}
        />
        </div>
      </div>

      {maskCandidates.length > 1 && (
        <div>
          <p className={kicker}>Mask · model confidence</p>
          <Segmented
            label="Mask candidate"
            options={maskCandidates.map((c) => ({
              value: String(c.index) as "0" | "1" | "2",
              label: `${c.index + 1} · ${Math.round(c.iouScore * 100)}%`,
            }))}
            value={String(activeMaskIndex) as "0" | "1" | "2"}
            onChange={(value) => onSelectMask(Number(value) as 0 | 1 | 2)}
          />
        </div>
      )}

      {points.length > 0 && (
        <div className="flex gap-2">
          <Button size="sm" onClick={onUndoPoint} disabled={busy}>
            Undo point
          </Button>
          <Button size="sm" onClick={onClearPoints} disabled={busy}>
            Clear
          </Button>
        </div>
      )}

      {hasMask && (
        <div>
          <p className={kicker}>Export PNG · background</p>
          <Segmented label="Export background" options={BG_OPTIONS} value={exportBg} onChange={setExportBg} />
          <div className="mt-3 flex flex-col gap-2">
            <Button variant="primary" size="sm" fullWidth onClick={() => onExportSelection(exportBg)}>
              Download cut-out
            </Button>
            <Button size="sm" fullWidth onClick={() => onExportRemoval(exportBg)}>
              Download without it
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
