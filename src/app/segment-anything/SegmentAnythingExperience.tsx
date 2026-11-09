"use client";

import { useReducer, useCallback, useRef, useState } from "react";
import { Button, DemoHeader, DemoPage, Details, Slider } from "@/components/ui";
import { samReducer, initialSAMState, type SegmentPoint, type ExportBackground } from "./types";
import { useSAM } from "./hooks/useSAM";
import { exportSelection, exportWithRemoval } from "./utils/exportMask";
import SegmentCanvas from "./components/SegmentCanvas";
import ControlPanel from "./components/ControlPanel";
import SampleImages, { SAMPLE_IMAGES, sampleHint } from "./components/SampleImages";

const kicker = "font-mono text-[0.7rem] uppercase tracking-[0.08em] text-[var(--sub)]";

export default function SegmentAnythingExperience() {
  // The first sample is on screen at once; the model loads on the first click.
  const [state, dispatch] = useReducer(samReducer, { ...initialSAMState, imageUrl: SAMPLE_IMAGES[0]?.url ?? null });
  const { encodeImage, decodePoints, clearCache } = useSAM(dispatch);
  const [modelLoaded, setModelLoaded] = useState(false);

  // Mask data lives in refs to avoid serializing large Float32Arrays in state.
  const allMasksRef = useRef<Float32Array[] | null>(null);
  const [maskDims, setMaskDims] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [activeMaskData, setActiveMaskData] = useState<Float32Array | null>(null);
  const [maskRenderKey, setMaskRenderKey] = useState(0);

  const requestRef = useRef(0);
  const [operationError, setOperationError] = useState<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const busy = state.phase === "loading" || state.phase === "encoding";

  const clearMask = useCallback(() => {
    allMasksRef.current = null;
    setActiveMaskData(null);
    setMaskRenderKey((k) => k + 1);
  }, []);

  /** Loads the model if needed and computes the image embedding. Returns false if superseded or failed. */
  const encode = useCallback(
    async (url: string): Promise<boolean> => {
      const request = ++requestRef.current;
      setOperationError(null);
      try {
        const encoderMs = await encodeImage(url);
        if (request !== requestRef.current) return false;
        setModelLoaded(true);
        dispatch({ type: "ENCODE_DONE", encoderMs: encoderMs ?? 0 });
        return true;
      } catch (err) {
        if (request !== requestRef.current) return false;
        dispatch({ type: "MODEL_ERROR", error: err instanceof Error ? err.message : "Encoding failed" });
        return false;
      }
    },
    [encodeImage],
  );

  const handleImageSelect = useCallback(
    (url: string) => {
      dispatch({ type: "IMAGE_SELECTED", url });
      clearMask();
      // Before the first click nothing downloads; once the model is in memory, read the new image at once.
      if (modelLoaded) void encode(url);
      else requestRef.current++;
    },
    [clearMask, encode, modelLoaded],
  );

  const handleUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      const url = URL.createObjectURL(file);
      blobUrlRef.current = url;
      handleImageSelect(url);
      e.target.value = "";
    },
    [handleImageSelect],
  );

  const updateMask = useCallback(
    async (points: SegmentPoint[]) => {
      const request = ++requestRef.current;
      setOperationError(null);
      clearMask();
      if (!points.length) return;
      const started = performance.now();
      try {
        const result = await decodePoints(points);
        if (request !== requestRef.current) return;
        if (!result.candidates.length) throw new Error("The model returned no mask candidates.");
        allMasksRef.current = result.masks;
        setMaskDims(result.dims);
        dispatch({ type: "DECODE_DONE", decoderMs: performance.now() - started, candidates: result.candidates });
        const best = result.candidates.reduce((a, b) => (b.iouScore > a.iouScore ? b : a));
        setActiveMaskData(result.masks[best.index] ?? null);
        setMaskRenderKey((key) => key + 1);
      } catch (error) {
        if (request === requestRef.current)
          setOperationError(error instanceof Error ? error.message : "Mask decoding failed. Try the point again.");
      }
    },
    [clearMask, decodePoints],
  );

  const handlePointAdd = useCallback(
    (x: number, y: number, label: 0 | 1) => {
      if (busy || !state.imageUrl) return;
      const point = { id: crypto.randomUUID(), x, y, label };
      dispatch({ type: "ADD_POINT", point });
      if (state.phase === "encoded") {
        void updateMask([...state.points, point]);
        return;
      }
      // First click on this image: load and encode, then answer the click.
      const url = state.imageUrl;
      void encode(url).then((ok) => {
        if (ok) void updateMask([point]);
      });
    },
    [busy, encode, state.imageUrl, state.phase, state.points, updateMask],
  );

  const handleUndoPoint = useCallback(() => {
    const last = state.points.at(-1);
    if (!last) return;
    dispatch({ type: "REMOVE_POINT", id: last.id });
    void updateMask(state.points.slice(0, -1));
  }, [state.points, updateMask]);

  const handleClearPoints = useCallback(() => {
    dispatch({ type: "CLEAR_POINTS" });
    void updateMask([]);
  }, [updateMask]);

  const handleSelectMask = useCallback((index: 0 | 1 | 2) => {
    dispatch({ type: "SET_ACTIVE_MASK", index });
    if (allMasksRef.current?.[index]) {
      setActiveMaskData(allMasksRef.current[index]);
      setMaskRenderKey((k) => k + 1);
    }
  }, []);

  const exportMask = useCallback(
    async (background: ExportBackground, remove: boolean) => {
      if (!activeMaskData || !state.imageUrl) return;
      setOperationError(null);
      try {
        await (remove ? exportWithRemoval : exportSelection)(state.imageUrl, activeMaskData, maskDims.w, maskDims.h, background);
      } catch (error) {
        setOperationError(error instanceof Error ? error.message : "PNG export failed. Please retry.");
      }
    },
    [activeMaskData, state.imageUrl, maskDims],
  );

  const retry = () => {
    if (state.phase === "encoded") void updateMask(state.points);
    else if (state.imageUrl) {
      const url = state.imageUrl;
      const pending = state.points;
      void encode(url).then((ok) => {
        if (ok && pending.length) void updateMask(pending);
      });
    }
  };

  let overlay: React.ReactNode = null;
  if (state.phase === "loading") {
    overlay = (
      <CanvasNote progress={state.loadProgress}>
        {state.loadProgress < 100 ? `Downloading the model · ${state.loadProgress}%` : "Starting the model"}
      </CanvasNote>
    );
  } else if (state.phase === "encoding") {
    overlay = <CanvasNote>Reading the image</CanvasNote>;
  } else if (state.imageUrl && state.points.length === 0 && state.phase !== "error") {
    overlay = <CanvasNote>{sampleHint(state.imageUrl)}</CanvasNote>;
  }

  const timing =
    state.encoderMs !== null
      ? `Image read in ${(state.encoderMs / 1000).toFixed(1)} s${state.decoderMs !== null ? ` · last mask in ${Math.round(state.decoderMs)} ms` : ""}`
      : null;

  return (
    <DemoPage width="2xl">
      <DemoHeader
        eyebrow="Image segmentation"
        title="Segment Anything"
        description="Click an object in the photo to cut it out. The first click downloads a 62 MB model and reads the photo, about half a minute; after that each click takes under a second."
      />

      {(operationError || state.error) && (
        <div role="alert" className="mb-4 flex flex-wrap items-center gap-3 border border-[var(--line-strong)] p-3 text-sm">
          {operationError || state.error}
          <Button size="sm" onClick={retry}>
            Retry
          </Button>
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-8">
        <div className="min-w-0">
          <div className="mb-3">
            <SampleImages activeUrl={state.imageUrl} onSelect={handleImageSelect} disabled={busy}>
              <Button size="sm" className="ml-1 shrink-0" onClick={() => fileInputRef.current?.click()} disabled={busy}>
                Upload
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                aria-label="Image to segment"
                accept="image/*"
                className="sr-only"
                onChange={handleUpload}
              />
            </SampleImages>
          </div>
          <div className="h-[66vw] max-h-[32rem] border border-[var(--line)] bg-[var(--surface)] sm:h-[clamp(16rem,calc(100svh-24rem),40rem)] sm:max-h-none">
            <SegmentCanvas
              imageUrl={state.imageUrl}
              interactive={!busy && !!state.imageUrl}
              busy={busy}
              points={state.points}
              pointMode={state.pointMode}
              maskData={activeMaskData}
              maskWidth={maskDims.w}
              maskHeight={maskDims.h}
              maskOpacity={state.maskOpacity}
              maskRenderKey={maskRenderKey}
              onPointAdd={handlePointAdd}
              overlay={overlay}
            />
          </div>
          <p aria-live="polite" className={`mt-2 min-h-[1rem] ${kicker}`}>
            {timing}
          </p>
        </div>

        <aside className="min-w-0">
          <ControlPanel
            points={state.points}
            pointMode={state.pointMode}
            maskCandidates={state.maskCandidates}
            activeMaskIndex={state.activeMaskIndex}
            busy={busy}
            hasMask={activeMaskData !== null}
            onSetPointMode={(mode) => dispatch({ type: "SET_POINT_MODE", mode })}
            onUndoPoint={handleUndoPoint}
            onClearPoints={handleClearPoints}
            onSelectMask={handleSelectMask}
            onExportSelection={(bg) => void exportMask(bg, false)}
            onExportRemoval={(bg) => void exportMask(bg, true)}
          />
          <Details summary="Advanced and model" className="mt-6">
            <Slider
              label="Mask opacity"
              min={0}
              max={1}
              step={0.05}
              value={state.maskOpacity}
              display={`${Math.round(state.maskOpacity * 100)}%`}
              onChange={(opacity) => dispatch({ type: "SET_OPACITY", opacity })}
            />
            <p className="mt-4">
              SAM 2.1 Tiny (onnx-community/sam2.1-hiera-tiny-ONNX, uint8) runs on WebAssembly in this tab. The image
              encoder runs once per image and is the slow step. Each click then runs only the small mask decoder, which
              returns three candidate masks with its own confidence for each. The browser caches the model files.
            </p>
            <Button variant="ghost" size="sm" className="mt-3 -ml-4" onClick={clearCache}>
              Clear cached model
            </Button>
          </Details>
        </aside>
      </div>
    </DemoPage>
  );
}

function CanvasNote({ children, progress }: { children: React.ReactNode; progress?: number }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center px-4" role="status">
      <div className="border border-[var(--line-strong)] bg-[var(--background)] px-3 py-1.5">
        <span className="font-mono text-[0.7rem] uppercase tracking-[0.08em] text-[var(--foreground)]">{children}</span>
        {progress !== undefined && (
          <div className="mt-1.5 h-px w-40 bg-[var(--line)]">
            <div className="h-px bg-[var(--line-strong)] transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}
