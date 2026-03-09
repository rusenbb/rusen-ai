import { useRef, useEffect, useCallback, useState } from "react";
import type { SegmentResult } from "../types";
import type { MaskFill } from "../utils/imageProcessing";
import {
  renderMaskOverlay,
  renderBoundingBox,
  applyMask,
  downloadCanvasAsPng,
} from "../utils/imageProcessing";

interface ImageCanvasProps {
  imageUrl: string | null;
  originalWidth: number | null;
  originalHeight: number | null;
  results: SegmentResult | null;
  textPrompt: string;
  onImageDrop: (file: File) => void;
  disabled: boolean;
}

type KeepMode = "subject" | "background";

const PRESET_FILLS: { label: string; fill: MaskFill; swatch: string }[] = [
  {
    label: "Transparent",
    fill: { type: "transparent" },
    swatch: "checkerboard",
  },
  {
    label: "White",
    fill: { type: "color", r: 255, g: 255, b: 255 },
    swatch: "bg-white",
  },
  {
    label: "Black",
    fill: { type: "color", r: 0, g: 0, b: 0 },
    swatch: "bg-black",
  },
];

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export default function ImageCanvas({
  imageUrl,
  originalWidth,
  originalHeight,
  results,
  textPrompt,
  onImageDrop,
  disabled,
}: ImageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showMask, setShowMask] = useState(true);

  // Export state
  const [keepMode, setKeepMode] = useState<KeepMode>("subject");
  const [fillIndex, setFillIndex] = useState(0); // index into PRESET_FILLS, or -1 for custom
  const [customColor, setCustomColor] = useState("#ff0000");

  // Draw image + overlays
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageUrl || !originalWidth || !originalHeight) return;

    const ctx = canvas.getContext("2d")!;
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      canvas.width = originalWidth;
      canvas.height = originalHeight;
      ctx.drawImage(img, 0, 0);

      if (!results || !showMask) return;

      const threshold = 0.3;

      if (
        results.maskData &&
        results.maskDims &&
        results.scores[0] > threshold
      ) {
        const dims = results.maskDims;
        const maskH = dims[dims.length - 2];
        const maskW = dims[dims.length - 1];
        renderMaskOverlay(
          ctx,
          results.maskData,
          maskW,
          maskH,
          originalWidth,
          originalHeight
        );
      }

      for (let i = 0; i < results.scores.length; i++) {
        if (results.scores[i] < threshold) break;
        renderBoundingBox(
          ctx,
          results.boxes[i],
          results.scores[i],
          textPrompt || "object"
        );
      }
    };
    img.src = imageUrl;
  }, [imageUrl, originalWidth, originalHeight, results, textPrompt, showMask]);

  const handleExport = useCallback(() => {
    const img = imgRef.current;
    if (!img || !results?.maskData || !results.maskDims) return;

    const dims = results.maskDims;
    const maskH = dims[dims.length - 2];
    const maskW = dims[dims.length - 1];

    const fill: MaskFill =
      fillIndex >= 0
        ? PRESET_FILLS[fillIndex].fill
        : { type: "color", ...hexToRgb(customColor) };

    const canvas = applyMask(
      img,
      results.maskData,
      maskW,
      maskH,
      keepMode,
      fill
    );
    const label = textPrompt.trim().replace(/\s+/g, "-") || "object";
    const suffix = keepMode === "subject" ? "extracted" : "bg-removed";
    downloadCanvasAsPng(canvas, `${label}-${suffix}.png`);
  }, [results, textPrompt, keepMode, fillIndex, customColor]);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      onImageDrop(file);
    },
    [onImageDrop]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [disabled, handleFile]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) setIsDragging(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleClick = useCallback(() => {
    if (disabled || imageUrl) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handleFile(file);
    };
    input.click();
  }, [disabled, imageUrl, handleFile]);

  if (!imageUrl) {
    return (
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        className={`relative w-full aspect-[4/3] rounded-lg border-2 border-dashed transition-colors cursor-pointer flex items-center justify-center ${
          isDragging
            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
            : "border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <div className="text-center p-6">
          <svg
            className="w-10 h-10 mx-auto mb-3 text-neutral-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Drop an image here or click to upload
          </p>
          <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
            JPG, PNG, WebP
          </p>
        </div>
      </div>
    );
  }

  const hasMask =
    results &&
    results.maskData &&
    results.maskDims &&
    results.scores[0] > 0.3;

  return (
    <div className="space-y-3">
      {/* Canvas */}
      <div
        className="relative w-full overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <canvas ref={canvasRef} className="w-full h-auto" />
        {isDragging && (
          <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
            <p className="text-white font-medium text-sm bg-blue-600 px-3 py-1.5 rounded">
              Drop to replace
            </p>
          </div>
        )}
      </div>

      {/* Toolbar row */}
      <div className="flex items-center gap-2 flex-wrap">
        {results && (
          <label className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 cursor-pointer">
            <input
              type="checkbox"
              checked={showMask}
              onChange={(e) => setShowMask(e.target.checked)}
              className="rounded"
            />
            Show mask
          </label>
        )}
        <div className="flex-1" />
        <button
          onClick={() => onImageDrop(null as unknown as File)}
          className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
        >
          Clear image
        </button>
      </div>

      {/* Export panel */}
      {hasMask && (
        <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg space-y-3">
          <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300 uppercase tracking-wide">
            Export
          </p>

          {/* Keep toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500 dark:text-neutral-400 w-8 shrink-0">
              Keep
            </span>
            <div className="flex rounded-md overflow-hidden border border-neutral-200 dark:border-neutral-700">
              <button
                onClick={() => setKeepMode("subject")}
                className={`px-3 py-1 text-xs transition-colors ${
                  keepMode === "subject"
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                }`}
              >
                Subject
              </button>
              <button
                onClick={() => setKeepMode("background")}
                className={`px-3 py-1 text-xs transition-colors border-l border-neutral-200 dark:border-neutral-700 ${
                  keepMode === "background"
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                }`}
              >
                Background
              </button>
            </div>
          </div>

          {/* Fill options */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500 dark:text-neutral-400 w-8 shrink-0">
              Fill
            </span>
            <div className="flex items-center gap-1.5">
              {PRESET_FILLS.map((preset, i) => (
                <button
                  key={preset.label}
                  onClick={() => setFillIndex(i)}
                  title={preset.label}
                  className={`w-6 h-6 rounded border transition-shadow ${
                    fillIndex === i
                      ? "ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-neutral-900"
                      : "border-neutral-300 dark:border-neutral-600 hover:border-neutral-400"
                  } ${preset.swatch === "checkerboard" ? "" : preset.swatch}`}
                  style={
                    preset.swatch === "checkerboard"
                      ? {
                          background:
                            "repeating-conic-gradient(#d1d5db 0% 25%, transparent 0% 50%) 50% / 8px 8px",
                        }
                      : undefined
                  }
                />
              ))}
              {/* Custom color */}
              <div className="relative">
                <button
                  onClick={() => setFillIndex(-1)}
                  title={`Custom (${customColor})`}
                  className={`w-6 h-6 rounded border transition-shadow ${
                    fillIndex === -1
                      ? "ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-neutral-900"
                      : "border-neutral-300 dark:border-neutral-600 hover:border-neutral-400"
                  }`}
                  style={{ backgroundColor: customColor }}
                />
                <input
                  type="color"
                  value={customColor}
                  onChange={(e) => {
                    setCustomColor(e.target.value);
                    setFillIndex(-1);
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Download button */}
          <button
            onClick={handleExport}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md transition-colors"
          >
            <DownloadIcon />
            Download PNG
          </button>
        </div>
      )}
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg
      className="w-3.5 h-3.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
      />
    </svg>
  );
}
