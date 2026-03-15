"use client";

import { useReducer, useCallback, useRef, useState, useEffect } from "react";
import {
  Button,
  DemoFootnote,
  DemoHeader,
  DemoMutedSection,
  DemoPage,
} from "@/components/ui";
import {
  samReducer,
  initialSAMState,
  type SegmentPoint,
  type ExportBackground,
} from "./types";
import { useSAM } from "./hooks/useSAM";
import type { DecodeResult } from "./hooks/useSAM";
import { exportSelection, exportWithRemoval } from "./utils/exportMask";
import SegmentCanvas from "./components/SegmentCanvas";
import ControlPanel from "./components/ControlPanel";
import StatusBar from "./components/StatusBar";
import SampleImages, { SAMPLE_IMAGES } from "./components/SampleImages";

export default function SegmentAnythingExperience() {
  const [state, dispatch] = useReducer(samReducer, initialSAMState);
  const { encodeImage, decodePoints, clearCache } = useSAM(dispatch);

  // Mask data lives in refs to avoid serializing large Float32Arrays in state.
  // maskDims is state (not a ref) because the React Compiler forbids ref access during render.
  const allMasksRef = useRef<Float32Array[] | null>(null);
  const [maskDims, setMaskDims] = useState<{ w: number; h: number }>({
    w: 0,
    h: 0,
  });
  const [activeMaskData, setActiveMaskData] = useState<Float32Array | null>(
    null
  );
  const [maskRenderKey, setMaskRenderKey] = useState(0);

  // Track blob URLs for cleanup
  const blobUrlRef = useRef<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Image selection ──────────────────────────────────────────────

  const handleImageSelect = useCallback(
    async (url: string) => {
      dispatch({ type: "IMAGE_SELECTED", url });
      allMasksRef.current = null;
      setActiveMaskData(null);
      setMaskRenderKey((k) => k + 1);

      const t0 = performance.now();
      try {
        await encodeImage(url);
        dispatch({
          type: "ENCODE_DONE",
          encoderMs: performance.now() - t0,
        });
      } catch (err) {
        dispatch({
          type: "MODEL_ERROR",
          error: err instanceof Error ? err.message : "Encoding failed",
        });
      }
    },
    [encodeImage]
  );

  // ── File upload ──────────────────────────────────────────────────

  const handleUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }

      const url = URL.createObjectURL(file);
      blobUrlRef.current = url;
      handleImageSelect(url);

      e.target.value = "";
    },
    [handleImageSelect]
  );

  // ── Auto-load first sample when model becomes ready ──────────────

  useEffect(() => {
    if (state.phase === "ready" && !state.imageUrl) {
      const t = setTimeout(() => handleImageSelect(SAMPLE_IMAGES[0].url), 0);
      return () => clearTimeout(t);
    }
  }, [state.phase, state.imageUrl, handleImageSelect]);

  // ── Point added ──────────────────────────────────────────────────

  const handlePointAdd = useCallback(
    async (nx: number, ny: number, label: 1 | 0) => {
      if (state.phase !== "encoded") return;

      const newPoint: SegmentPoint = {
        id: crypto.randomUUID(),
        x: nx,
        y: ny,
        label,
      };
      const updatedPoints = [...state.points, newPoint];
      dispatch({ type: "ADD_POINT", point: newPoint });

      const t0 = performance.now();
      try {
        const result: DecodeResult = await decodePoints(updatedPoints);
        const ms = performance.now() - t0;

        allMasksRef.current = result.masks;
        setMaskDims(result.dims);

        dispatch({
          type: "DECODE_DONE",
          decoderMs: ms,
          candidates: result.candidates,
        });

        const best = result.candidates.reduce((a, b) =>
          b.iouScore > a.iouScore ? b : a
        );
        setActiveMaskData(result.masks[best.index] ?? null);
        setMaskRenderKey((k) => k + 1);
      } catch (err) {
        console.error("Decode failed:", err);
      }
    },
    [state.phase, state.points, decodePoints]
  );

  // ── Undo last point ──────────────────────────────────────────────

  const handleUndoPoint = useCallback(async () => {
    if (state.points.length === 0) return;

    const lastPoint = state.points[state.points.length - 1];
    const remaining = state.points.slice(0, -1);
    dispatch({ type: "REMOVE_POINT", id: lastPoint.id });

    if (remaining.length === 0) {
      allMasksRef.current = null;
      setActiveMaskData(null);
      setMaskRenderKey((k) => k + 1);
      return;
    }

    try {
      const result: DecodeResult = await decodePoints(remaining);
      allMasksRef.current = result.masks;
      setMaskDims(result.dims);

      dispatch({
        type: "DECODE_DONE",
        decoderMs: 0,
        candidates: result.candidates,
      });

      const best = result.candidates.reduce((a, b) =>
        b.iouScore > a.iouScore ? b : a
      );
      setActiveMaskData(result.masks[best.index] ?? null);
      setMaskRenderKey((k) => k + 1);
    } catch (err) {
      console.error("Decode after undo failed:", err);
    }
  }, [state.points, decodePoints]);

  // ── Clear points ─────────────────────────────────────────────────

  const handleClearPoints = useCallback(() => {
    dispatch({ type: "CLEAR_POINTS" });
    allMasksRef.current = null;
    setActiveMaskData(null);
    setMaskRenderKey((k) => k + 1);
  }, []);

  // ── Switch active mask ───────────────────────────────────────────

  const handleSelectMask = useCallback((index: 0 | 1 | 2) => {
    dispatch({ type: "SET_ACTIVE_MASK", index });
    if (allMasksRef.current && allMasksRef.current[index]) {
      setActiveMaskData(allMasksRef.current[index]);
      setMaskRenderKey((k) => k + 1);
    }
  }, []);

  // ── Export handlers ──────────────────────────────────────────────

  const handleExportSelection = useCallback(
    (bg: ExportBackground) => {
      if (!activeMaskData || !state.imageUrl) return;
      exportSelection(
        state.imageUrl,
        activeMaskData,
        maskDims.w,
        maskDims.h,
        bg
      );
    },
    [activeMaskData, state.imageUrl, maskDims]
  );

  const handleExportRemoval = useCallback(
    (fill: ExportBackground) => {
      if (!activeMaskData || !state.imageUrl) return;
      exportWithRemoval(
        state.imageUrl,
        activeMaskData,
        maskDims.w,
        maskDims.h,
        fill
      );
    },
    [activeMaskData, state.imageUrl, maskDims]
  );

  // ── Render ───────────────────────────────────────────────────────

  return (
    <DemoPage width="2xl">
      <DemoHeader
        eyebrow="Computer Vision / Segmentation"
        title="Segment Anything"
        description="Click anywhere on an image to instantly segment objects — SAM 2.1 running entirely in your browser via WebAssembly."
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={
                state.phase === "loading" ||
                state.phase === "idle" ||
                state.phase === "encoding"
              }
            >
              Upload image
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleUpload}
            />
          </>
        }
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
        {/* Canvas + status */}
        <div className="min-w-0 flex-1 flex flex-col gap-0">
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
            <SegmentCanvas
              imageUrl={state.imageUrl}
              phase={state.phase}
              points={state.points}
              pointMode={state.pointMode}
              maskData={activeMaskData}
              maskWidth={maskDims.w}
              maskHeight={maskDims.h}
              maskOpacity={state.maskOpacity}
              maskRenderKey={maskRenderKey}
              onPointAdd={handlePointAdd}
            />
          </div>
          <StatusBar
            phase={state.phase}
            loadProgress={state.loadProgress}
            encoderMs={state.encoderMs}
            decoderMs={state.decoderMs}
          />
        </div>

        {/* Side controls */}
        <div className="w-full shrink-0 lg:w-64">
          <ControlPanel
            points={state.points}
            pointMode={state.pointMode}
            maskCandidates={state.maskCandidates}
            activeMaskIndex={state.activeMaskIndex}
            maskOpacity={state.maskOpacity}
            phase={state.phase}
            hasMask={activeMaskData !== null}
            onSetPointMode={(mode) =>
              dispatch({ type: "SET_POINT_MODE", mode })
            }
            onUndoPoint={handleUndoPoint}
            onClearPoints={handleClearPoints}
            onSelectMask={handleSelectMask}
            onOpacityChange={(v) =>
              dispatch({ type: "SET_OPACITY", opacity: v })
            }
            onExportSelection={handleExportSelection}
            onExportRemoval={handleExportRemoval}
          />
        </div>
      </div>

      <SampleImages
        activeUrl={state.imageUrl}
        onSelect={handleImageSelect}
        disabled={
          state.phase === "loading" ||
          state.phase === "idle" ||
          state.phase === "encoding"
        }
      />

      <DemoMutedSection className="mt-8" title="How it works">
        <div className="grid gap-4 text-sm text-neutral-600 dark:text-neutral-400 md:grid-cols-3">
          <div>
            <h3 className="mb-1 font-medium text-neutral-900 dark:text-neutral-100">
              1. Image Encoding
            </h3>
            <p>
              When you load an image, the Hiera-Tiny vision encoder processes it
              into dense feature maps. This is the heavy step (~5–15 s on WASM)
              and runs once per image.
            </p>
          </div>
          <div>
            <h3 className="mb-1 font-medium text-neutral-900 dark:text-neutral-100">
              2. Point Prompts
            </h3>
            <p>
              Each click becomes a prompt. Use <strong>Include</strong> mode to
              select objects and <strong>Exclude</strong> mode to refine by
              removing parts. The mask decoder runs in ~100–300 ms.
            </p>
          </div>
          <div>
            <h3 className="mb-1 font-medium text-neutral-900 dark:text-neutral-100">
              3. Export
            </h3>
            <p>
              Once segmented, download just the selection or remove it from the
              image. Choose transparent, black, or white backgrounds for the
              exported PNG.
            </p>
          </div>
        </div>
      </DemoMutedSection>

      <DemoFootnote>
        SAM 2.1 Tiny · onnx-community/sam2.1-hiera-tiny-ONNX · uint8
        quantization · ~61 MB · runs entirely in your browser via WebAssembly ·
        no data leaves your device
      </DemoFootnote>

      <div className="mt-4 flex justify-center">
        <Button variant="ghost" size="sm" onClick={clearCache}>
          Clear cached model
        </Button>
      </div>
    </DemoPage>
  );
}
