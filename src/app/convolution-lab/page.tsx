"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";

import { Button, DemoFootnote, DemoHeader, DemoPage, DemoPanel } from "@/components/ui";

import { RasterCanvas, type RasterFocus } from "./RasterCanvas";
import {
  KERNEL_PRESETS,
  convolve2d,
  convolveRgbDepthwise,
  findResponseAnchor,
  grayscaleMatrixToRgba,
  luminanceMatrix,
  maxPool,
  normaliseMatrix,
  normalisedRgbRasterToRgba,
  receptiveField,
  reluMatrix,
  rgbRasterToRgba,
  signedMatrixToRgba,
  type KernelPreset,
  type Matrix,
  type ResponseAnchorKind,
  type RgbRaster,
} from "./convolution";
import { decodeRaster, imageUploadError, MAX_RASTER_EDGE } from "./raster";

type ImageMode = "rgb" | "luma";
type InspectChannel = "red" | "green" | "blue" | "luma";
type EditableKernel = KernelPreset | "custom";

const PHOTO_SOURCES = [
  { label: "City geometry", url: "/demo-images/street.jpg" },
  { label: "Cat texture", url: "/demo-images/beach.jpg" },
  { label: "Coffee still life", url: "/demo-images/food.jpg" },
  { label: "Portrait", url: "/demo-images/portrait.jpg" },
] as const;

const CHANNELS: Array<{ id: InspectChannel; label: string; color: string; activeColor: string }> = [
  { id: "red", label: "R", color: "text-red-500", activeColor: "border-red-500 bg-red-500/10" },
  { id: "green", label: "G", color: "text-emerald-500", activeColor: "border-emerald-500 bg-emerald-500/10" },
  { id: "blue", label: "B", color: "text-sky-500", activeColor: "border-sky-500 bg-sky-500/10" },
  { id: "luma", label: "Y", color: "text-amber-500", activeColor: "border-amber-500 bg-amber-500/10" },
];

function cloneMatrix(matrix: Matrix): Matrix {
  return matrix.map((row) => [...row]);
}

function format(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

function intensityColor(intensity: number, channel: InspectChannel): string {
  const dark = Math.round(16 + intensity * 48);
  const bright = Math.round(60 + intensity * 195);

  if (channel === "red") return `rgb(${bright} ${dark} ${dark})`;
  if (channel === "green") return `rgb(${dark} ${bright} ${dark})`;
  if (channel === "blue") return `rgb(${dark} ${Math.round(36 + intensity * 92)} ${bright})`;
  return `rgb(${Math.round(24 + intensity * 222)} ${Math.round(28 + intensity * 218)} ${Math.round(34 + intensity * 210)})`;
}

function MatrixWindow({
  matrix,
  label,
  channel,
  lens = false,
}: {
  matrix: Matrix;
  label: string;
  channel: InspectChannel;
  lens?: boolean;
}) {
  const normalized = useMemo(() => normaliseMatrix(matrix), [matrix]);
  const columns = matrix[0]?.length ?? 1;

  return (
    <div>
      <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500">{label}</p>
      <div
        className="grid gap-px overflow-hidden border border-[var(--line)] bg-[var(--line)] p-px"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {matrix.flatMap((row, rowIndex) =>
          row.map((value, columnIndex) => {
            const intensity = normalized[rowIndex][columnIndex];
            return (
              <div
                key={`${rowIndex}:${columnIndex}`}
                className={`grid aspect-square place-items-center text-center font-mono leading-none ${lens ? "min-h-16 p-2 text-sm sm:text-base" : "p-1 text-[9px] sm:text-[10px]"} ${intensity > 0.58 ? "text-neutral-950" : "text-white"}`}
                style={{ backgroundColor: intensityColor(intensity, channel) }}
              >
                {format(value)}
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}

function KernelPreview({ kernel, label = "Kernel weights" }: { kernel: Matrix; label?: string }) {
  const columns = kernel[0]?.length ?? 1;
  const maxMagnitude = Math.max(1, ...kernel.flat().map((value) => Math.abs(value)));

  return (
    <div>
      <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500">{label}</p>
      <div className="grid gap-px overflow-hidden border border-[var(--line)] bg-[var(--line)] p-px" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {kernel.flatMap((row, rowIndex) =>
          row.map((value, columnIndex) => {
            const strength = Math.abs(value) / maxMagnitude;
            const color = value > 0
              ? `rgb(${Math.round(250 - strength * 18)} ${Math.round(225 - strength * 88)} ${Math.round(145 - strength * 88)})`
              : value < 0
                ? `rgb(${Math.round(150 - strength * 72)} ${Math.round(216 - strength * 56)} ${Math.round(245 - strength * 15)})`
                : "rgb(229 231 235)";
            return (
              <div key={`${rowIndex}:${columnIndex}`} className="grid aspect-square min-h-16 place-items-center p-2 font-mono text-sm font-bold text-neutral-950" style={{ backgroundColor: color }}>
                {format(value)}
              </div>
            );
          }),
        )}
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-neutral-500">Amber weights add brightness. Blue weights subtract it. Zero leaves a pixel out of this response.</p>
    </div>
  );
}

function KernelEditor({ kernel, onChange }: { kernel: Matrix; onChange: (row: number, col: number, value: number) => void }) {
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${kernel[0]?.length ?? 1}, minmax(0, 1fr))` }}>
      {kernel.flatMap((row, rowIndex) =>
        row.map((value, columnIndex) => (
          <label key={`${rowIndex}-${columnIndex}`} className="block border border-[var(--line)] bg-[color-mix(in_srgb,var(--foreground)_3%,transparent)] p-1">
            <span className="sr-only">Kernel row {rowIndex + 1}, column {columnIndex + 1}</span>
            <input
              aria-label={`Kernel row ${rowIndex + 1}, column ${columnIndex + 1}`}
              className="w-full bg-transparent text-center font-mono text-sm outline-none"
              type="number"
              min="-9"
              max="9"
              step="0.1"
              value={format(value)}
              onChange={(event) => onChange(rowIndex, columnIndex, Number(event.target.value))}
            />
          </label>
        )),
      )}
    </div>
  );
}

function channelLabel(channel: InspectChannel): string {
  return CHANNELS.find((entry) => entry.id === channel)?.label ?? "Y";
}

export default function ConvolutionLabPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState<string>(PHOTO_SOURCES[0].url);
  const [sourceLabel, setSourceLabel] = useState<string>(PHOTO_SOURCES[0].label);
  const [raster, setRaster] = useState<RgbRaster | null>(null);
  const [decodeError, setDecodeError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [imageMode, setImageMode] = useState<ImageMode>("rgb");
  const [inspectChannel, setInspectChannel] = useState<InspectChannel>("red");
  const [kernelPreset, setKernelPreset] = useState<EditableKernel>("edge");
  const [kernel, setKernel] = useState<Matrix>(() => cloneMatrix(KERNEL_PRESETS.edge.matrix));
  const [stride, setStride] = useState(1);
  const [padding, setPadding] = useState(1);
  const [pool, setPool] = useState(true);
  const [selected, setSelected] = useState({ row: 0, col: 0 });

  useEffect(() => {
    let cancelled = false;

    void decodeRaster(imageUrl)
      .then((nextRaster) => {
        if (!cancelled) {
          setRaster(nextRaster);
          setSelected({
            row: Math.floor(nextRaster.height / 2),
            col: Math.floor(nextRaster.width / 2),
          });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setDecodeError(error instanceof Error ? error.message : "That image could not be processed.");
        }
      });

    return () => {
      cancelled = true;
      if (imageUrl.startsWith("blob:")) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  const isDecoding = raster === null && decodeError === null;

  const luminance = useMemo(() => (raster ? luminanceMatrix(raster) : []), [raster]);
  const lumaFeatureMap = useMemo(
    () => (luminance.length ? convolve2d(luminance, kernel, { stride, padding }) : []),
    [kernel, luminance, padding, stride],
  );
  const rgbFeatureMap = useMemo(
    () => (raster ? convolveRgbDepthwise(raster, kernel, { stride, padding }) : null),
    [kernel, padding, raster, stride],
  );

  const featureHeight = lumaFeatureMap.length;
  const featureWidth = lumaFeatureMap[0]?.length ?? 0;
  const active = {
    row: Math.min(selected.row, Math.max(0, featureHeight - 1)),
    col: Math.min(selected.col, Math.max(0, featureWidth - 1)),
  };
  const kernelRows = kernel.length;
  const kernelColumns = kernel[0]?.length ?? 0;
  const field = useMemo(
    () =>
      raster && featureWidth
        ? receptiveField(active.row, active.col, kernelRows, kernelColumns, stride, padding)
        : [],
    [active.col, active.row, featureWidth, kernelColumns, kernelRows, padding, raster, stride],
  );

  const sourceFocus = useMemo<RasterFocus | undefined>(() => {
    if (!raster || !field.length) return undefined;
    const visible = field.filter(
      ({ row, col }) => row >= 0 && row < raster.height && col >= 0 && col < raster.width,
    );
    if (!visible.length) return undefined;
    const rows = visible.map(({ row }) => row);
    const columns = visible.map(({ col }) => col);
    const row = Math.min(...rows);
    const col = Math.min(...columns);
    return {
      row,
      col,
      rows: Math.max(...rows) - row + 1,
      columns: Math.max(...columns) - col + 1,
    };
  }, [field, raster]);

  const sourcePixels = useMemo(() => {
    if (!raster) return new Uint8ClampedArray();
    return imageMode === "rgb" ? rgbRasterToRgba(raster) : grayscaleMatrixToRgba(luminance);
  }, [imageMode, luminance, raster]);
  const featurePixels = useMemo(() => {
    if (!featureWidth || !featureHeight) return new Uint8ClampedArray();
    return imageMode === "rgb" && rgbFeatureMap
      ? normalisedRgbRasterToRgba(rgbFeatureMap)
      : signedMatrixToRgba(lumaFeatureMap);
  }, [featureHeight, featureWidth, imageMode, lumaFeatureMap, rgbFeatureMap]);
  const rectifiedLumaFeatureMap = useMemo(() => reluMatrix(lumaFeatureMap), [lumaFeatureMap]);
  const pooled = useMemo(() => maxPool(rectifiedLumaFeatureMap), [rectifiedLumaFeatureMap]);
  const pooledPixels = useMemo(() => signedMatrixToRgba(pooled), [pooled]);

  const visibleChannels = imageMode === "rgb" ? CHANNELS.filter(({ id }) => id !== "luma") : CHANNELS.filter(({ id }) => id === "luma");
  const inspectedInput = useMemo<Matrix>(() => {
    if (inspectChannel === "luma") return luminance;
    return raster?.[inspectChannel] ?? [];
  }, [inspectChannel, luminance, raster]);
  const inspectedFeature = useMemo<Matrix>(() => {
    if (inspectChannel === "luma") return lumaFeatureMap;
    return rgbFeatureMap?.[inspectChannel] ?? [];
  }, [inspectChannel, lumaFeatureMap, rgbFeatureMap]);
  const responseAnchors = useMemo(
    () => ({
      positive: findResponseAnchor(inspectedFeature, "positive"),
      negative: findResponseAnchor(inspectedFeature, "negative"),
      flat: findResponseAnchor(inspectedFeature, "flat"),
    }),
    [inspectedFeature],
  );
  const selectedPatch = useMemo<Matrix>(
    () =>
      Array.from({ length: kernelRows }, (_, rowIndex) =>
        Array.from({ length: kernelColumns }, (_, columnIndex) => {
          const cell = field[rowIndex * kernelColumns + columnIndex];
          if (!cell || cell.row < 0 || cell.row >= inspectedInput.length || cell.col < 0 || cell.col >= (inspectedInput[0]?.length ?? 0)) return 0;
          return inspectedInput[cell.row][cell.col];
        }),
      ),
    [field, inspectedInput, kernelColumns, kernelRows],
  );
  const productTerms = selectedPatch.flatMap((row, rowIndex) =>
    row.map((pixel, columnIndex) => ({ pixel, weight: kernel[rowIndex][columnIndex] })),
  );
  const selectedValue = inspectedFeature[active.row]?.[active.col] ?? 0;
  const rgbResponses = rgbFeatureMap
    ? [
        { id: "red" as const, label: "R", value: rgbFeatureMap.red[active.row]?.[active.col] ?? 0 },
        { id: "green" as const, label: "G", value: rgbFeatureMap.green[active.row]?.[active.col] ?? 0 },
        { id: "blue" as const, label: "B", value: rgbFeatureMap.blue[active.row]?.[active.col] ?? 0 },
      ]
    : [];

  const chooseSample = (url: string, label: string) => {
    if (url === imageUrl) {
      setSourceLabel(label);
      setSelected({ row: 0, col: 0 });
      return;
    }
    setRaster(null);
    setDecodeError(null);
    setUploadError(null);
    setImageUrl(url);
    setSourceLabel(label);
    setSelected({ row: 0, col: 0 });
  };

  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;

    const error = imageUploadError(file);
    if (error) {
      setUploadError(error);
      return;
    }

    setRaster(null);
    setDecodeError(null);
    setUploadError(null);
    setImageUrl(URL.createObjectURL(file));
    setSourceLabel(file.name);
    setSelected({ row: 0, col: 0 });
  };

  const loadKernel = (preset: KernelPreset) => {
    setKernelPreset(preset);
    setKernel(cloneMatrix(KERNEL_PRESETS[preset].matrix));
    setSelected({ row: 0, col: 0 });
  };

  const chooseImageMode = (mode: ImageMode) => {
    setImageMode(mode);
    setInspectChannel(mode === "rgb" ? "red" : "luma");
  };

  const jumpToResponse = (kind: ResponseAnchorKind) => {
    const anchor = responseAnchors[kind];
    if (anchor) setSelected({ row: anchor.row, col: anchor.col });
  };

  return (
    <DemoPage width="2xl">
      <DemoHeader
        eyebrow="Computer vision / real pixels, local filters"
        title="Convolution Lab"
        description="Run one editable 3×3 CNN-style cross-correlation over real photos. Switch between depthwise RGB and a true B/W luminance image, then inspect the exact pixels behind any output response."
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.22fr)_minmax(20rem,0.78fr)]">
        <DemoPanel title="Choose a real image" description="Bundled photos work offline. Uploads are decoded and processed only in this browser.">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PHOTO_SOURCES.map((source) => (
              <button
                key={source.url}
                type="button"
                onClick={() => chooseSample(source.url, source.label)}
                className={`overflow-hidden border text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${imageUrl === source.url ? "border-foreground" : "border-[var(--line)] hover:border-foreground"}`}
                aria-pressed={imageUrl === source.url}
              >
                <Image src={source.url} alt="" width={160} height={90} className="h-16 w-full object-cover" />
                <span className="block px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.08em]">{source.label}</span>
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()}>Upload image</Button>
            <input
              ref={fileInputRef}
              className="sr-only"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleUpload}
            />
            <span className="self-center font-mono text-[10px] uppercase tracking-[0.1em] text-neutral-500">JPEG · PNG · WebP · max 12 MB</span>
          </div>

          <div className="mt-5 border-t border-[var(--line)] pt-4">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500">Pixel treatment</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant={imageMode === "rgb" ? "primary" : "secondary"} onClick={() => chooseImageMode("rgb")}>RGB · 3 channels</Button>
              <Button size="sm" variant={imageMode === "luma" ? "primary" : "secondary"} onClick={() => chooseImageMode("luma")}>B/W · luminance</Button>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-neutral-500">
              RGB applies this same spatial kernel independently to red, green, and blue, then visualizes the three responses together. B/W first computes Y = 0.2126R + 0.7152G + 0.0722B and produces one signed response map. CNN libraries conventionally call this cross-correlation operation convolution, even though the kernel is not flipped here.
            </p>
            {uploadError ? <p className="mt-3 text-xs text-red-700 dark:text-red-300" role="alert">{uploadError}</p> : null}
          </div>
        </DemoPanel>

        <DemoPanel title="The kernel controls" description="A single filter is deliberately small enough to edit by hand.">
          <div className="space-y-5">
            <div>
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500">Kernel recipe</p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(KERNEL_PRESETS) as KernelPreset[]).map((preset) => (
                  <Button key={preset} size="sm" variant={kernelPreset === preset ? "primary" : "secondary"} onClick={() => loadKernel(preset)}>
                    {KERNEL_PRESETS[preset].label}
                  </Button>
                ))}
              </div>
            </div>
            <KernelEditor
              kernel={kernel}
              onChange={(row, col, value) => {
                setKernelPreset("custom");
                setKernel((current) => current.map((currentRow, rowIndex) => currentRow.map((entry, columnIndex) => rowIndex === row && columnIndex === col ? value : entry)));
                setSelected({ row: 0, col: 0 });
              }}
            />
            <label className="block border-y border-[var(--line)] py-4">
              <span className="flex justify-between font-mono text-xs uppercase tracking-[0.12em]"><span>Stride</span><strong>{stride}</strong></span>
              <input aria-label="Convolution stride" className="mt-3 w-full accent-foreground" type="range" min="1" max="3" value={stride} onChange={(event) => { setStride(Number(event.target.value)); setSelected({ row: 0, col: 0 }); }} />
              <p className="mt-2 text-xs text-neutral-500">Move the kernel {stride} working pixel{stride === 1 ? "" : "s"} between outputs.</p>
            </label>
            <label className="block">
              <span className="flex justify-between font-mono text-xs uppercase tracking-[0.12em]"><span>Zero padding</span><strong>{padding}</strong></span>
              <input aria-label="Convolution padding" className="mt-3 w-full accent-foreground" type="range" min="0" max="1" value={padding} onChange={(event) => { setPadding(Number(event.target.value)); setSelected({ row: 0, col: 0 }); }} />
              <p className="mt-2 text-xs text-neutral-500">Padding lets the filter visit a photo&apos;s edge pixels.</p>
            </label>
            <label className="flex cursor-pointer items-center justify-between border-t border-[var(--line)] pt-4 text-sm">
              <span><strong>ReLU, then max-pool luminance</strong><span className="mt-1 block text-xs text-neutral-500">First clamp negative responses to 0. Then keep the largest remaining activation in each 2×2 region.</span></span>
              <input aria-label="Enable max pooling" className="size-4 accent-foreground" type="checkbox" checked={pool} onChange={(event) => setPool(event.target.checked)} />
            </label>
          </div>
        </DemoPanel>
      </div>

      <section className="mt-5" aria-labelledby="photo-lab-title">
        <DemoPanel title="Photo field station" description="Click a feature-map pixel or jump to a real extreme. The enlarged lens below follows that exact output position.">
          {isDecoding ? (
            <div className="grid min-h-72 place-items-center border border-dashed border-[var(--line)] bg-[color-mix(in_srgb,var(--foreground)_2%,transparent)] p-6 text-center">
              <div><p className="font-mono text-xs uppercase tracking-[0.14em]">Sampling {sourceLabel}</p><p className="mt-2 text-sm text-neutral-500">Building a compact working raster…</p></div>
            </div>
          ) : decodeError ? (
            <div className="border border-red-400/60 bg-red-500/5 p-5 text-sm text-red-700 dark:text-red-300" role="alert">{decodeError}</div>
          ) : raster && featureWidth && featureHeight ? (
            <>
              <div className="mb-5 border-y border-[var(--line)] py-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500">Inspect one response map</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {visibleChannels.map((channel) => (
                        <button
                          key={channel.id}
                          type="button"
                          onClick={() => setInspectChannel(channel.id)}
                          className={`border px-3 py-1.5 font-mono text-xs font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground ${inspectChannel === channel.id ? channel.activeColor : "border-[var(--line)] hover:border-foreground"} ${channel.color}`}
                          aria-pressed={inspectChannel === channel.id}
                        >
                          {channel.label} channel
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500">Jump to a real response</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={() => jumpToResponse("positive")} disabled={!responseAnchors.positive} title={responseAnchors.positive ? `Jump to ${format(responseAnchors.positive.value)} in the ${channelLabel(inspectChannel)} response.` : "This response map has no positive values."}>Strongest +</Button>
                      <Button size="sm" variant="secondary" onClick={() => jumpToResponse("negative")} disabled={!responseAnchors.negative} title={responseAnchors.negative ? `Jump to ${format(responseAnchors.negative.value)} in the ${channelLabel(inspectChannel)} response.` : "This response map has no negative values."}>Strongest -</Button>
                      <Button size="sm" variant="secondary" onClick={() => jumpToResponse("flat")} disabled={!responseAnchors.flat} title={responseAnchors.flat ? `Jump to ${format(responseAnchors.flat.value)} in the ${channelLabel(inspectChannel)} response.` : "No response is available yet."}>Flattest</Button>
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-neutral-500">The jump buttons compute extrema from the active response map. They are not curated example pixels.</p>
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
                <div className="min-w-0 border border-[var(--line)] bg-neutral-950 p-2 text-white shadow-[0_16px_34px_-26px_rgba(0,0,0,0.85)]">
                  <div className="mb-2 flex items-center justify-between gap-3 px-1 font-mono text-[10px] uppercase tracking-[0.12em] text-neutral-400">
                    <span>input · {imageMode === "rgb" ? "RGB" : "B/W"}</span><span>{raster.width}×{raster.height}</span>
                  </div>
                  <RasterCanvas width={raster.width} height={raster.height} pixels={sourcePixels} label={`${sourceLabel} input image. Amber shows the selected receptive field.`} focus={sourceFocus} pixelated={false} />
                  <p className="px-1 pt-2 text-[11px] leading-relaxed text-neutral-400">{sourceLabel} reduced once to a {raster.width}×{raster.height} working raster. The amber box is the only input region used for the selected response.</p>
                </div>

                <div className="hidden place-items-center font-mono text-2xl text-neutral-400 xl:grid" aria-hidden>→</div>

                <div className="min-w-0 border border-[var(--line)] bg-neutral-950 p-2 text-white shadow-[0_16px_34px_-26px_rgba(0,0,0,0.85)]">
                  <div className="mb-2 flex items-center justify-between gap-3 px-1 font-mono text-[10px] uppercase tracking-[0.12em] text-neutral-400">
                    <span>feature response · click or use arrows</span><span>{featureWidth}×{featureHeight}</span>
                  </div>
                  <RasterCanvas
                    width={featureWidth}
                    height={featureHeight}
                    pixels={featurePixels}
                    label="Feature response image. Click or use arrow keys to select one response position."
                    focus={{ row: active.row, col: active.col, rows: 1, columns: 1 }}
                    focusColor="#f8fafc"
                    onCellSelect={(row, col) => setSelected({ row, col })}
                  />
                  <p className="px-1 pt-2 text-[11px] leading-relaxed text-neutral-400">{imageMode === "rgb" ? "Each channel is independently contrast-normalized only for this visual preview." : "Cyan means a negative response; orange means a positive response. Intensity is scaled only for viewing."}</p>
                </div>
              </div>

              <div className="mt-5 border-t border-[var(--line)] pt-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500">Selected receptive-field lens</p>
                    <h3 className="mt-1 text-lg font-bold">One output is one 3×3 calculation</h3>
                  </div>
                  <p className="font-mono text-xs tabular-nums text-neutral-500">output [{active.row}, {active.col}]</p>
                </div>

                <div className="mt-4 grid items-center gap-4 xl:grid-cols-[minmax(15rem,1fr)_auto_minmax(10rem,0.62fr)_auto_minmax(11rem,0.62fr)]">
                  <div className="border border-[var(--line)] p-4">
                    <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500">1. Read input pixels</p>
                    <MatrixWindow matrix={selectedPatch} label={`${channelLabel(inspectChannel)} values under the amber box`} channel={inspectChannel} lens />
                    <p className="mt-3 text-xs leading-relaxed text-neutral-500">The enlarged cells are raw values from the one input patch. Their shade is locally scaled only to make the patch readable.</p>
                  </div>

                  <div className="hidden place-items-center font-mono text-2xl text-neutral-400 xl:grid" aria-hidden>×</div>

                  <div className="border border-[var(--line)] p-4">
                    <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500">2. Apply shared weights</p>
                    <KernelPreview kernel={kernel} />
                  </div>

                  <div className="hidden place-items-center font-mono text-2xl text-neutral-400 xl:grid" aria-hidden>=</div>

                  <div className="border border-amber-400/60 bg-amber-500/[0.07] p-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-600 dark:text-neutral-300">3. Write one response</p>
                    <p className="mt-3 font-mono text-sm text-neutral-600 dark:text-neutral-300">{channelLabel(inspectChannel)}[{active.row}, {active.col}]</p>
                    <strong className="mt-1 block font-mono text-4xl tabular-nums">{format(selectedValue)}</strong>
                    <p className="mt-3 text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">This raw value is written at the selected feature-map pixel.</p>
                  </div>
                </div>

                <div className="mt-5 border-t border-[var(--line)] pt-5">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500">The raw dot product</p>
                  <p className="mt-2 break-words font-mono text-sm leading-relaxed">
                    {channelLabel(inspectChannel)}[{active.row}, {active.col}] = {productTerms.map(({ pixel, weight }) => `${format(pixel)}×${format(weight)}`).join(" + ")} = <strong>{format(selectedValue)}</strong>
                  </p>
                  {imageMode === "rgb" ? (
                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                      {rgbResponses.map(({ id, label, value }) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setInspectChannel(id)}
                          className={`border p-3 text-left transition hover:border-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground ${inspectChannel === id ? CHANNELS.find((channel) => channel.id === id)?.activeColor : "border-[var(--line)]"}`}
                        >
                          <span className={`font-mono text-xs font-bold ${CHANNELS.find((channel) => channel.id === id)?.color}`}>{label} response</span>
                          <strong className="mt-1 block font-mono text-lg">{format(value)}</strong>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm leading-relaxed text-neutral-500">This is one luminance response: each brightness value is multiplied by the matching kernel weight before all nine terms are added.</p>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </DemoPanel>
      </section>

      {raster && pool && pooled.length && pooled[0]?.length ? (
        <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,0.86fr)_minmax(20rem,1.14fr)]" aria-labelledby="pooling-title">
          <DemoPanel title="After ReLU + max pooling" description="This second stage rectifies the signed luminance response before it pools. It does not revisit the original photo.">
            <div className="mx-auto max-w-xl border border-[var(--line)] bg-neutral-950 p-2 text-white">
              <div className="mb-2 flex items-center justify-between px-1 font-mono text-[10px] uppercase tracking-[0.12em] text-neutral-400"><span>post-ReLU pooled activations</span><span>{pooled[0].length}×{pooled.length}</span></div>
              <RasterCanvas width={pooled[0].length} height={pooled.length} pixels={pooledPixels} label="ReLU then max-pooled luminance feature activations." />
            </div>
          </DemoPanel>
          <DemoPanel title="Read the transformation" description="One photo becomes compact numeric arrays; cross-correlation writes a signed feature response at every output position.">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="border border-[var(--line)] p-4"><p className="font-mono text-lg font-bold">{raster.width}×{raster.height}</p><p className="mt-1 text-xs text-neutral-500">working input pixels</p></div>
              <div className="border border-[var(--line)] p-4"><p className="font-mono text-lg font-bold">{featureWidth}×{featureHeight}</p><p className="mt-1 text-xs text-neutral-500">signed responses</p></div>
              <div className="border border-[var(--line)] p-4"><p className="font-mono text-lg font-bold">{featureWidth}×{featureHeight}</p><p className="mt-1 text-xs text-neutral-500">after ReLU</p></div>
              <div className="border border-[var(--line)] p-4"><p className="font-mono text-lg font-bold">{pooled[0].length}×{pooled.length}</p><p className="mt-1 text-xs text-neutral-500">pooled activations</p></div>
            </div>
            <p id="pooling-title" className="mt-5 max-w-2xl text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">ReLU(x) = max(0, x), so cyan negative responses are clipped before pooling. The pooled value is therefore truly the largest nonnegative activation in each 2×2 region. In a trained CNN, each learned filter normally has weights for all input channels, for example 3×3×3 at the first RGB layer. This lab uses one shared 3×3 spatial kernel per channel so the arithmetic stays inspectable.</p>
          </DemoPanel>
        </section>
      ) : null}

      <DemoFootnote>
        Images are downsampled once to a maximum {MAX_RASTER_EDGE}px edge so the selected receptive field remains interactive. Uploaded files never leave this browser.
      </DemoFootnote>
    </DemoPage>
  );
}
