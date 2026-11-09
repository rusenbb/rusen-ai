"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";

import { Button, DemoHeader, DemoPage, Details, Segmented, Slider } from "@/components/ui";

import { RasterCanvas, type RasterFocus } from "./RasterCanvas";
import { KernelWeightInput } from "./KernelWeightInput";
import {
  KERNEL_PRESETS,
  convolve2d,
  convolveRgbDepthwise,
  findResponseAnchor,
  grayscaleMatrixToRgba,
  luminanceMatrix,
  maxPool,
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
  { label: "City street", url: "/demo-images/street.jpg" },
  { label: "Cat fur", url: "/demo-images/cat-nose.jpg" },
  { label: "Coffee", url: "/demo-images/food.jpg" },
  { label: "Portrait", url: "/demo-images/portrait.jpg" },
] as const;

const CHANNEL_LABEL: Record<InspectChannel, string> = { red: "R", green: "G", blue: "B", luma: "Y" };

const kicker = "font-mono text-[0.7rem] uppercase tracking-[0.08em] text-[var(--sub)]";

function cloneMatrix(matrix: Matrix): Matrix {
  return matrix.map((row) => [...row]);
}

function format(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

function formatWeight(value: number): string {
  return Number(value.toPrecision(8)).toString();
}

/** Input pixels of the selected patch, shaded by their own value. */
function PatchGrid({ matrix, label }: { matrix: Matrix; label: string }) {
  return (
    <div>
      <p className={`mb-2 ${kicker}`}>{label}</p>
      <div className="grid grid-cols-3 gap-px border border-[var(--line)] bg-[var(--line)]">
        {matrix.flatMap((row, rowIndex) =>
          row.map((value, columnIndex) => {
            // Pixel values are 0 to 255, so the cell shows the pixel's own grey.
            const grey = Math.round(Math.max(0, Math.min(255, value)));
            return (
              <div
                key={`${rowIndex}:${columnIndex}`}
                className={`grid aspect-square place-items-center font-mono text-sm tabular-nums ${grey > 140 ? "text-neutral-950" : "text-white"}`}
                style={{ backgroundColor: `rgb(${grey} ${grey} ${grey})` }}
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

/** The editable kernel. Positive weights are tinted with --accent-2, negative ones with --accent. */
function KernelGrid({ kernel, onChange }: { kernel: Matrix; onChange: (row: number, col: number, value: number) => void }) {
  const maxMagnitude = Math.max(1, ...kernel.flat().map((value) => Math.abs(value)));
  return (
    <div className="max-w-[14rem] sm:max-w-none">
      <p className={`mb-2 ${kicker}`}>Filter weights</p>
      <div className="grid grid-cols-3 gap-px border border-[var(--line)] bg-[var(--line)]">
        {kernel.flatMap((row, rowIndex) =>
          row.map((value, columnIndex) => {
            const strength = Math.round((Math.abs(value) / maxMagnitude) * 45);
            const tint = value > 0 ? "var(--accent-2)" : value < 0 ? "var(--accent)" : "transparent";
            return (
              <label
                key={`${rowIndex}-${columnIndex}`}
                className="grid aspect-square place-items-center bg-[var(--surface)] px-1"
                style={{ backgroundImage: `linear-gradient(color-mix(in srgb, ${tint} ${strength}%, transparent), color-mix(in srgb, ${tint} ${strength}%, transparent))` }}
              >
                <span className="sr-only">Kernel row {rowIndex + 1}, column {columnIndex + 1}</span>
                <KernelWeightInput
                  label={`Kernel row ${rowIndex + 1}, column ${columnIndex + 1}`}
                  value={value}
                  onChange={(next) => onChange(rowIndex, columnIndex, next)}
                />
              </label>
            );
          }),
        )}
      </div>
      <p id="kernel-input-help" className="mt-2 text-xs text-[var(--sub)]">
        Type any weight from −9 to 9.
      </p>
    </div>
  );
}

export default function ConvolutionLabPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState<string>(PHOTO_SOURCES[0].url);
  const [sourceLabel, setSourceLabel] = useState<string>(PHOTO_SOURCES[0].label);
  const [raster, setRaster] = useState<RgbRaster | null>(null);
  const [decodeError, setDecodeError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [imageMode, setImageMode] = useState<ImageMode>("luma");
  const [inspectChannel, setInspectChannel] = useState<InspectChannel>("luma");
  const [kernelPreset, setKernelPreset] = useState<EditableKernel>("edge");
  const [kernel, setKernel] = useState<Matrix>(() => cloneMatrix(KERNEL_PRESETS.edge.matrix));
  const [stride, setStride] = useState(1);
  const [padding, setPadding] = useState(1);
  const [fixedScale, setFixedScale] = useState(false);
  const [poolCell, setPoolCell] = useState({ row: 0, col: 0 });
  const [pool, setPool] = useState(false);
  // null follows the strongest positive response, so the lens opens on something the filter found.
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null);

  useEffect(() => {
    let cancelled = false;

    void decodeRaster(imageUrl)
      .then((nextRaster) => {
        if (!cancelled) {
          setRaster(nextRaster);
          setSelected(null);
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

  const luminance = useMemo(() => (raster ? luminanceMatrix(raster) : []), [raster]);
  const lumaFeatureMap = useMemo(
    () => (luminance.length ? convolve2d(luminance, kernel, { stride, padding }) : []),
    [kernel, luminance, padding, stride],
  );
  const rgbFeatureMap = useMemo(
    () => (raster && imageMode === "rgb" ? convolveRgbDepthwise(raster, kernel, { stride, padding }) : null),
    [imageMode, kernel, padding, raster, stride],
  );

  const featureHeight = lumaFeatureMap.length;
  const featureWidth = lumaFeatureMap[0]?.length ?? 0;
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
  const target = selected ?? responseAnchors.positive ?? { row: Math.floor(featureHeight / 2), col: Math.floor(featureWidth / 2) };
  const active = {
    row: Math.min(target.row, Math.max(0, featureHeight - 1)),
    col: Math.min(target.col, Math.max(0, featureWidth - 1)),
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
      ? (fixedScale ? rgbRasterToRgba(rgbFeatureMap) : normalisedRgbRasterToRgba(rgbFeatureMap))
      : signedMatrixToRgba(lumaFeatureMap, fixedScale ? 255 : undefined);
  }, [featureHeight, featureWidth, fixedScale, imageMode, lumaFeatureMap, rgbFeatureMap]);
  const rectifiedLumaFeatureMap = useMemo(() => reluMatrix(lumaFeatureMap), [lumaFeatureMap]);
  const pooled = useMemo(() => maxPool(rectifiedLumaFeatureMap), [rectifiedLumaFeatureMap]);
  const pooledPixels = useMemo(() => signedMatrixToRgba(pooled, fixedScale ? 255 : undefined), [pooled, fixedScale]);
  const poolRow = Math.min(poolCell.row, Math.max(0, pooled.length - 1));
  const poolCol = Math.min(poolCell.col, Math.max(0, (pooled[0]?.length ?? 1) - 1));
  const poolingWindow = rectifiedLumaFeatureMap.slice(poolRow * 2, poolRow * 2 + 2).map((row) => row.slice(poolCol * 2, poolCol * 2 + 2));

  const inspectedInput = useMemo<Matrix>(() => {
    if (inspectChannel === "luma") return luminance;
    return raster?.[inspectChannel] ?? [];
  }, [inspectChannel, luminance, raster]);
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
  const channel = CHANNEL_LABEL[inspectChannel];

  const chooseSample = (url: string, label: string) => {
    if (url === imageUrl) return;
    setRaster(null);
    setDecodeError(null);
    setUploadError(null);
    setImageUrl(url);
    setSourceLabel(label);
    setSelected(null);
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
    setSelected(null);
  };

  const loadKernel = (preset: EditableKernel) => {
    if (preset === "custom") return;
    setKernelPreset(preset);
    setKernel(cloneMatrix(KERNEL_PRESETS[preset].matrix));
  };

  const chooseImageMode = (mode: ImageMode) => {
    setImageMode(mode);
    setInspectChannel(mode === "rgb" ? "red" : "luma");
  };

  const jumpToResponse = (kind: ResponseAnchorKind) => {
    const anchor = responseAnchors[kind];
    if (anchor) setSelected({ row: anchor.row, col: anchor.col });
  };

  const recipeOptions = [
    ...(Object.keys(KERNEL_PRESETS) as KernelPreset[]).map((preset) => ({ value: preset as EditableKernel, label: KERNEL_PRESETS[preset].label })),
    ...(kernelPreset === "custom" ? [{ value: "custom" as const, label: "Custom" }] : []),
  ];

  return (
    <DemoPage>
      <DemoHeader
        eyebrow="Convolution"
        title="Convolution Lab"
        description="Slide a 3×3 filter over a photo and see what it detects."
      />

      <div className="grid gap-6 md:grid-cols-2">
        <div className="min-w-0">
          <div className="mb-3 flex min-h-9 flex-wrap items-center gap-2">
            {PHOTO_SOURCES.map((source) => (
              <button
                key={source.url}
                type="button"
                onClick={() => chooseSample(source.url, source.label)}
                aria-pressed={imageUrl === source.url}
                aria-label={source.label}
                className={`shrink-0 cursor-pointer border p-0.5 transition-colors ${imageUrl === source.url ? "border-[var(--line-strong)]" : "border-[var(--line)] hover:border-[var(--line-strong)]"}`}
              >
                <Image src={source.url} alt="" width={96} height={64} className="block h-8 w-12 object-cover" />
              </button>
            ))}
            <Button size="sm" className="ml-1" onClick={() => fileInputRef.current?.click()}>
              Upload
            </Button>
            <input
              ref={fileInputRef}
              className="sr-only"
              type="file"
              aria-label="Convolution source image"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleUpload}
            />
          </div>
          {uploadError && <p role="alert" className="mb-2 text-sm text-[var(--muted)]">{uploadError}</p>}
          <p className={`mb-1.5 ${kicker}`}>Input · {imageMode === "rgb" ? "colour" : "brightness"}</p>
          {raster ? (
            <RasterCanvas
              width={raster.width}
              height={raster.height}
              pixels={sourcePixels}
              label={`${sourceLabel} input image. The box marks the 3×3 patch behind the selected output.`}
              focus={sourceFocus}
              pixelated={false}
            />
          ) : (
            <Placeholder text={decodeError ?? `Reading ${sourceLabel}`} />
          )}
        </div>

        <div className="min-w-0">
          <div className="mb-3 flex min-h-9 flex-wrap items-center gap-2">
            <Segmented label="Filter" options={recipeOptions} value={kernelPreset} onChange={loadKernel} />
          </div>
          <p className={`mb-1.5 flex justify-between gap-3 ${kicker}`}>
            <span>What the filter finds · click a pixel</span>
            {imageMode === "luma" && (
              <span>
                <span className="text-accent-2">■</span> positive <span className="text-accent">■</span> negative
              </span>
            )}
          </p>
          {raster && featureWidth && featureHeight ? (
            <RasterCanvas
              width={featureWidth}
              height={featureHeight}
              pixels={featurePixels}
              label="Filter response. Click or use arrow keys to pick one output pixel."
              focus={{ row: active.row, col: active.col, rows: 1, columns: 1 }}
              focusToken="--foreground"
              onCellSelect={(row, col) => setSelected({ row, col })}
            />
          ) : (
            <Placeholder text={decodeError ? "No response" : "Computing"} />
          )}
        </div>
      </div>

      <section aria-label="How one output pixel is computed" className="mt-8 border-t border-[var(--line)] pt-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className={kicker}>
            Output pixel [{active.row}, {active.col}]{imageMode === "rgb" ? ` · ${channel} channel` : ""}
          </p>
          <div className="flex flex-wrap items-center gap-1">
            {imageMode === "rgb" && (
              <Segmented
                label="Channel"
                className="mr-2"
                options={[
                  { value: "red", label: "R" },
                  { value: "green", label: "G" },
                  { value: "blue", label: "B" },
                ]}
                value={inspectChannel as "red" | "green" | "blue"}
                onChange={setInspectChannel}
              />
            )}
            <span className={`mr-1 ${kicker}`}>Jump to</span>
            <Button variant="ghost" size="sm" onClick={() => jumpToResponse("positive")} disabled={!responseAnchors.positive}>
              Strongest +
            </Button>
            <Button variant="ghost" size="sm" onClick={() => jumpToResponse("negative")} disabled={!responseAnchors.negative}>
              Strongest −
            </Button>
            <Button variant="ghost" size="sm" onClick={() => jumpToResponse("flat")} disabled={!responseAnchors.flat}>
              Flattest
            </Button>
          </div>
        </div>

        <div className="grid items-center gap-4 sm:grid-cols-[minmax(0,11rem)_auto_minmax(0,11rem)_auto_minmax(0,1fr)]">
          <div className="hidden sm:block">
            <PatchGrid matrix={selectedPatch} label="Pixels under the box" />
          </div>
          <div className="hidden font-mono text-2xl text-[var(--sub)] sm:block" aria-hidden>×</div>
          <KernelGrid
            kernel={kernel}
            onChange={(row, col, value) => {
              setKernelPreset("custom");
              setKernel((current) => current.map((currentRow, rowIndex) => currentRow.map((entry, columnIndex) => (rowIndex === row && columnIndex === col ? value : entry))));
            }}
          />
          <div className="hidden font-mono text-2xl text-[var(--sub)] sm:block" aria-hidden>=</div>
          <div className="hidden sm:block">
            <p className={kicker}>Output</p>
            <p className="mt-1 font-mono text-4xl font-semibold tabular-nums">{format(selectedValue)}</p>
          </div>
        </div>

        <p data-allow-select className="mt-5 break-words font-mono text-sm leading-relaxed text-[var(--muted)]">
          {channel}[{active.row}, {active.col}] = {productTerms.map(({ pixel, weight }) => `${format(pixel)}×${formatWeight(weight)}`).join(" + ")} ≈{" "}
          <strong className="text-[var(--foreground)]">{format(selectedValue)}</strong>
        </p>
      </section>

      {pool && pooled.length && pooled[0]?.length ? (
        <section aria-label="ReLU and max pooling" className="mt-8 grid gap-6 border-t border-[var(--line)] pt-6 md:grid-cols-2">
          <div className="min-w-0 max-w-md">
            <p className={`mb-1.5 ${kicker}`}>
              After ReLU and 2×2 max pooling · {pooled[0].length}×{pooled.length}
            </p>
            <RasterCanvas
              width={pooled[0].length}
              height={pooled.length}
              pixels={pooledPixels}
              label="Brightness response after ReLU and max pooling. Click to pick one pooled pixel."
              focus={{ row: poolRow, col: poolCol, rows: 1, columns: 1 }}
              focusToken="--foreground"
              onCellSelect={(row, col) => setPoolCell({ row, col })}
            />
          </div>
          <div className="min-w-0 text-sm text-[var(--muted)]">
            <p className={`mb-2 ${kicker}`}>Pooled pixel [{poolRow}, {poolCol}] keeps the largest of four</p>
            <div className="grid max-w-xs grid-cols-2 gap-px border border-[var(--line)] bg-[var(--line)]">
              {poolingWindow.flat().map((value, i) => {
                const isMax = value === pooled[poolRow]?.[poolCol];
                return (
                  <span key={i} className={`bg-[var(--surface)] p-2 font-mono tabular-nums ${isMax ? "text-[var(--foreground)] underline underline-offset-4" : ""}`}>
                    {value.toFixed(2)}
                  </span>
                );
              })}
            </div>
            <p className="mt-3">ReLU sets every negative response to 0 first, so pooling keeps the strongest positive response in each 2×2 block.</p>
          </div>
        </section>
      ) : null}

      <Details summary="Advanced" className="mt-8">
        <div className="grid gap-6 text-[var(--foreground)] sm:grid-cols-2">
          <div className="space-y-5">
            <div>
              <p className={`mb-2 ${kicker}`}>Pixels</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant={imageMode === "luma" ? "primary" : "secondary"} onClick={() => chooseImageMode("luma")}>
                  B/W · luminance
                </Button>
                <Button size="sm" variant={imageMode === "rgb" ? "primary" : "secondary"} onClick={() => chooseImageMode("rgb")}>
                  RGB · 3 channels
                </Button>
              </div>
            </div>
            <Slider label="Stride" min={1} max={3} value={stride} onChange={(value) => { setStride(value); setSelected(null); }} />
            <Slider label="Zero padding" min={0} max={1} value={padding} onChange={(value) => { setPadding(value); setSelected(null); }} />
          </div>
          <div className="space-y-3 text-sm">
            <label className="flex items-start gap-2">
              <input type="checkbox" className="mt-1" checked={pool} onChange={(event) => setPool(event.target.checked)} />
              <span>Show ReLU and 2×2 max pooling of the brightness response</span>
            </label>
            <label className="flex items-start gap-2">
              <input type="checkbox" className="mt-1" checked={fixedScale} onChange={(event) => setFixedScale(event.target.checked)} />
              <span>Fixed colour scale (−255 to +255) instead of automatic contrast</span>
            </label>
          </div>
        </div>
        <p className="mt-5">
          B/W first turns each pixel into brightness, Y = 0.2126R + 0.7152G + 0.0722B, and runs the filter once. RGB runs
          the same filter on red, green and blue separately. Photos are scaled down to at most {MAX_RASTER_EDGE} pixels
          on the long edge. Like CNN libraries, the lab does not flip the filter, so strictly it computes a
          cross-correlation. A trained CNN learns its filter weights and has one weight per input channel. Uploads stay in
          this browser.
        </p>
      </Details>
    </DemoPage>
  );
}

function Placeholder({ text }: { text: string }) {
  return (
    <div role="status" className="grid aspect-[3/2] place-items-center border border-[var(--line)] bg-[var(--surface)]">
      <p className={kicker}>{text}</p>
    </div>
  );
}
