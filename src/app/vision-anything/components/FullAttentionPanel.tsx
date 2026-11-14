"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AttentionMask, UseClipSeg } from "../hooks/useClipSeg";
import { Button, Details, Segmented, Slider } from "@/components/ui";
import HeatmapCanvas from "./HeatmapCanvas";

const kicker = "font-mono text-[0.7rem] uppercase tracking-[0.08em] text-[var(--sub)]";

type LabeledMask = { label: string; mask: AttentionMask };

type Mode = "overlay" | "heatmap";

type Selection = { kind: "label"; label: string } | { kind: "average" };

function computeAverage(masks: AttentionMask[]): AttentionMask | null {
  if (masks.length === 0) return null;
  const { width, height } = masks[0];
  const total = width * height;
  const data = new Float32Array(total);
  for (const m of masks) {
    if (m.width !== width || m.height !== height) continue;
    for (let i = 0; i < total; i++) data[i] += m.data[i];
  }
  // Mean.
  for (let i = 0; i < total; i++) data[i] /= masks.length;
  return { data, width, height };
}

interface Props {
  imageUrl: string;
  imageAspect?: number;
  labels: string[];
  initialLabel: string | null;
  clipSeg: UseClipSeg;
  onClose: () => void;
}

export default function FullAttentionPanel({
  imageUrl,
  imageAspect = 4 / 3,
  labels,
  initialLabel,
  clipSeg,
  onClose,
}: Props) {
  const [allMasks, setAllMasks] = useState<LabeledMask[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection>(
    initialLabel ? { kind: "label", label: initialLabel } : { kind: "average" },
  );
  const [mode, setMode] = useState<Mode>("overlay");
  const [imageOpacity, setImageOpacity] = useState(60);

  const { segmentBatch } = clipSeg;
  const panelRef = useRef<HTMLElement>(null);

  // The panel opens above the main view, so bring it on screen.
  useEffect(() => {
    panelRef.current?.scrollIntoView?.({ block: "start", behavior: "smooth" });
  }, []);

  // Progress updates must not restart inference for the same image and labels.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBusy(true);
      setError(null);
      try {
        const masks = await segmentBatch(imageUrl, labels);
        if (cancelled) return;
        const labeled = labels.map((label, i) => ({ label, mask: masks[i] }));
        setAllMasks(labeled);
        if (!initialLabel && labeled.length > 0) {
          setSelection({ kind: "label", label: labeled[0].label });
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Attention computation failed");
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [imageUrl, labels, segmentBatch, initialLabel]);

  const averageMask = useMemo(
    () => computeAverage(allMasks.map((m) => m.mask)),
    [allMasks],
  );

  const activeMask: AttentionMask | null = useMemo(() => {
    if (selection.kind === "average") return averageMask;
    return allMasks.find((m) => m.label === selection.label)?.mask ?? null;
  }, [selection, allMasks, averageMask]);

  const activeTitle =
    selection.kind === "average" ? "Average across all labels" : selection.label;

  return (
    <section ref={panelRef} className="mb-8 scroll-mt-24 border border-[var(--line-strong)] bg-[var(--surface)] p-4 sm:p-6">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <p className={kicker}>All maps</p>
          <h2 className="mt-0.5 truncate text-lg font-semibold sm:text-xl">{activeTitle}</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>

      {busy && (
        <div role="status" className="mb-4">
          <p className={kicker}>
            {clipSeg.status === "loading"
              ? `Downloading the map model · ${clipSeg.progress}%`
              : `Computing maps for ${labels.length} ${labels.length === 1 ? "label" : "labels"}`}
          </p>
          <div className="mt-2 h-px w-full bg-[var(--line)]">
            <div
              className="h-px bg-[var(--line-strong)] transition-all duration-300"
              style={{ width: `${clipSeg.status === "loading" ? clipSeg.progress : 100}%` }}
            />
          </div>
        </div>
      )}
      {error && <p role="alert" className="mb-3 text-sm text-[var(--muted)]">{error}</p>}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="relative aspect-[4/3] w-full overflow-hidden border border-[var(--line)] bg-[var(--surface)]">
          {mode === "overlay" && (
            <Image
              src={imageUrl}
              alt="Segmentation source"
              fill
              className="object-contain"
              style={{ opacity: imageOpacity / 100 }}
              unoptimized
            />
          )}
          {activeMask && (
            <HeatmapCanvas
              mask={activeMask}
              imageAspect={imageAspect}
              palette={mode === "heatmap" ? "viridis" : "accent"}
              blend={mode === "heatmap" ? "alpha" : "overlay"}
            />
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Segmented
            label="View"
            options={[
              { value: "overlay", label: "On the photo" },
              { value: "heatmap", label: "Heatmap only" },
            ]}
            value={mode}
            onChange={setMode}
          />
          {mode === "overlay" && (
            <Slider
              label="Photo opacity"
              min={0}
              max={100}
              value={imageOpacity}
              display={`${imageOpacity}%`}
              onChange={setImageOpacity}
            />
          )}
          <ul className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
            {averageMask && (
              <li>
                <MapRow
                  mask={averageMask}
                  label="Average of all labels"
                  active={selection.kind === "average"}
                  onClick={() => setSelection({ kind: "average" })}
                />
              </li>
            )}
            {allMasks.map(({ label, mask }) => (
              <li key={label}>
                <MapRow
                  mask={mask}
                  label={label}
                  active={selection.kind === "label" && selection.label === label}
                  onClick={() => setSelection({ kind: "label", label })}
                />
              </li>
            ))}
          </ul>
        </div>
      </div>

      <Details summary="How the maps are made" className="mt-5">
        <p>
          CLIP gives one score per label for the whole image. CLIPSeg adds a small decoder, trained on the PhraseCut
          dataset, that scores every pixel against one label. The page applies a sigmoid and paints the 0 to 1 result on
          the same scale for every label: dark is 0, bright is 1. These are model scores, not calibrated probabilities.
          The average entry is the per-pixel mean over all labels.
        </p>
      </Details>
    </section>
  );
}

function MapRow({ mask, label, active, onClick }: { mask: AttentionMask; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex w-full cursor-pointer items-center gap-3 border p-1.5 text-left transition-colors ${
        active ? "border-[var(--line-strong)]" : "border-[var(--line)] hover:border-[var(--line-strong)]"
      }`}
    >
      <ThumbHeatmap mask={mask} />
      <span className="truncate font-mono text-xs">{label}</span>
    </button>
  );
}

function ThumbHeatmap({ mask }: { mask: AttentionMask }) {
  return (
    <div className="relative h-9 w-12 shrink-0 overflow-hidden bg-[var(--surface)]">
      <HeatmapCanvas
        mask={mask}
        palette="viridis"
        blend="alpha"
        className="absolute inset-0 w-full h-full"
      />
    </div>
  );
}
