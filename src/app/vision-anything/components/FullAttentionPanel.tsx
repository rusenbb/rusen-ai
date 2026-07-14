"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { AttentionMask, UseClipSeg } from "../hooks/useClipSeg";
import HeatmapCanvas from "./HeatmapCanvas";

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
  // Renormalise to [0,1] so the average isn't always dim.
  let mn = Infinity;
  let mx = -Infinity;
  for (let i = 0; i < total; i++) {
    if (data[i] < mn) mn = data[i];
    if (data[i] > mx) mx = data[i];
  }
  const range = mx - mn || 1;
  for (let i = 0; i < total; i++) data[i] = (data[i] - mn) / range;
  return { data, width, height };
}

interface Props {
  imageUrl: string;
  labels: string[];
  initialLabel: string | null;
  clipSeg: UseClipSeg;
  onClose: () => void;
}

export default function FullAttentionPanel({
  imageUrl,
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

  // Run CLIPSeg for every label in one batch, exactly once on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBusy(true);
      setError(null);
      try {
        const masks = await clipSeg.segmentBatch(imageUrl, labels);
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
  }, [imageUrl, labels, clipSeg, initialLabel]);

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
    <div className="rounded-xl border border-cyan-500/40 bg-neutral-950 text-neutral-100 p-4 sm:p-6 mb-6">
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-cyan-400">
            Full attention
          </p>
          <h2 className="text-lg sm:text-xl font-semibold mt-0.5">{activeTitle}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-mono uppercase tracking-[0.18em] text-neutral-400 hover:text-neutral-200 transition"
        >
          ✕ Close
        </button>
      </div>

      {busy && (
        <div className="mb-4 rounded-lg border border-cyan-500/40 bg-cyan-500/5 p-3">
          <div className="flex items-center justify-between gap-3 text-xs font-mono text-cyan-300">
            <span className="flex items-center gap-2">
              <span className="relative inline-flex h-2 w-2">
                <span className="absolute inset-0 rounded-full bg-cyan-400 animate-ping" />
                <span className="relative inline-block h-2 w-2 rounded-full bg-cyan-400" />
              </span>
              {clipSeg.status === "loading"
                ? `Loading attention model · ${clipSeg.progress}%`
                : `Computing attention for ${labels.length} ${labels.length === 1 ? "label" : "labels"}…`}
            </span>
            <span className="hidden sm:inline text-cyan-500/60">browser may pause briefly</span>
          </div>
          <div className="relative mt-2 h-1 bg-neutral-800 rounded-full overflow-hidden">
            {clipSeg.status === "loading" ? (
              <div
                className="absolute inset-y-0 left-0 bg-cyan-500 transition-all"
                style={{ width: `${clipSeg.progress}%` }}
              />
            ) : (
              <div className="absolute inset-y-0 left-0 right-0 bg-cyan-500/60 animate-pulse" />
            )}
          </div>
        </div>
      )}
      {error && (
        <p className="text-xs font-mono text-red-400 mb-3">{error}</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-5">
        {/* Image / heatmap viewport */}
        <div className="relative aspect-[4/3] w-full bg-black rounded-lg overflow-hidden border border-neutral-800">
          {mode === "overlay" && (
            <Image
              src={imageUrl}
              alt="Attention base"
              fill
              className="object-contain"
              style={{ opacity: imageOpacity / 100 }}
              unoptimized
            />
          )}
          {mode === "heatmap" && (
            // Plain dark backdrop so the heatmap reads as a standalone image.
            <div className="absolute inset-0 bg-black" />
          )}
          {activeMask && (
            <HeatmapCanvas
              mask={activeMask}
              palette={mode === "heatmap" ? "viridis" : "cyan"}
              blend={mode === "heatmap" ? "alpha" : "screen"}
            />
          )}
        </div>

        {/* Controls + label list */}
        <div className="flex flex-col gap-4">
          {/* Mode toggle */}
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-neutral-500 mb-2">
              View
            </p>
            <div className="flex gap-1 rounded-md border border-neutral-700 p-1 w-fit">
              {(["overlay", "heatmap"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`px-3 py-1 text-xs font-mono uppercase tracking-[0.16em] rounded transition ${
                    mode === m
                      ? "bg-cyan-500 text-neutral-950"
                      : "text-neutral-400 hover:text-neutral-100"
                  }`}
                >
                  {m === "overlay" ? "Overlay" : "Heatmap only"}
                </button>
              ))}
            </div>
          </div>

          {/* Image opacity (only meaningful in overlay mode) */}
          {mode === "overlay" && (
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-neutral-500">
                  Image opacity
                </p>
                <span className="text-xs font-mono text-neutral-400 tabular-nums">
                  {imageOpacity}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={imageOpacity}
                onChange={(e) => setImageOpacity(parseInt(e.target.value, 10))}
                className="w-full accent-cyan-500"
              />
              <p className="text-[10px] text-neutral-500 mt-1">
                Drag toward 0% to see the heatmap by itself.
              </p>
            </div>
          )}

          {/* Label list with mini heatmaps */}
          <div className="flex-1 min-h-0">
            <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-neutral-500 mb-2">
              Concepts ({labels.length})
            </p>
            <ul className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {/* Average pseudo-entry first so it's easy to find */}
              {averageMask && (
                <li>
                  <button
                    type="button"
                    onClick={() => setSelection({ kind: "average" })}
                    className={`w-full flex items-center gap-3 p-2 rounded-md border transition ${
                      selection.kind === "average"
                        ? "border-cyan-500 bg-cyan-500/10"
                        : "border-neutral-800 hover:border-neutral-600"
                    }`}
                  >
                    <ThumbHeatmap mask={averageMask} />
                    <span className="text-sm font-mono">★ Average</span>
                  </button>
                </li>
              )}
              {allMasks.map(({ label, mask }) => {
                const isActive =
                  selection.kind === "label" && selection.label === label;
                return (
                  <li key={label}>
                    <button
                      type="button"
                      onClick={() => setSelection({ kind: "label", label })}
                      className={`w-full flex items-center gap-3 p-2 rounded-md border transition text-left ${
                        isActive
                          ? "border-cyan-500 bg-cyan-500/10"
                          : "border-neutral-800 hover:border-neutral-600"
                      }`}
                    >
                      <ThumbHeatmap mask={mask} />
                      <span className="text-xs font-mono truncate">{label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

      <details className="mt-5 text-xs text-neutral-400">
        <summary className="cursor-pointer text-neutral-300 font-mono uppercase tracking-[0.18em] text-[10px]">
          How is this computed?
        </summary>
        <div className="mt-2 leading-relaxed space-y-2">
          <p>
            CLIP, the model behind classification, encodes the image and each text label
            into a shared embedding space and measures cosine similarity. That gives one
            number per label - useful for ranking, but it doesn&apos;t say <em>where</em>{" "}
            in the image the label applies.
          </p>
          <p>
            CLIPSeg adds a small Transformer decoder on top of CLIP that, given the same
            image and a text prompt, predicts a per-pixel logit map - &ldquo;does this pixel
            match this concept?&rdquo;. We pass it the sigmoid, normalise to [0, 1] for
            visibility, and paint the result. This is not classical attention rollout
            from the image encoder - CLIPSeg is its own decoder trained on the PhraseCut
            dataset.
          </p>
          <p>
            <strong className="text-neutral-200">Per-label maps</strong> show what the
            model finds for one concept; the{" "}
            <strong className="text-neutral-200">average</strong> entry is the per-pixel
            mean across every label, renormalised - a rough &ldquo;saliency&rdquo; pass
            highlighting regions the model finds informative no matter what you&apos;re
            looking for.
          </p>
        </div>
      </details>
    </div>
  );
}

function ThumbHeatmap({ mask }: { mask: AttentionMask }) {
  return (
    <div className="relative w-12 h-9 rounded-sm overflow-hidden bg-black flex-shrink-0">
      <HeatmapCanvas
        mask={mask}
        palette="viridis"
        blend="alpha"
        className="absolute inset-0 w-full h-full"
      />
    </div>
  );
}
