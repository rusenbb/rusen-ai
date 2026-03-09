"use client";

import { useReducer, useCallback } from "react";
import { segmentReducer, initialState } from "./types";
import { useSAM3 } from "./hooks/useSAM3";
import { tokenize } from "./utils/tokenizer";
import { loadImage, preprocessImage } from "./utils/imageProcessing";
import ModelLoader from "./components/ModelLoader";
import ImageCanvas from "./components/ImageCanvas";
import PromptInput from "./components/PromptInput";
import ResultsPanel from "./components/ResultsPanel";

export default function SegmentAnythingPage() {
  const [state, dispatch] = useReducer(segmentReducer, initialState);
  const { loadModels, segment, clearCache } = useSAM3(dispatch);

  const handleImageDrop = useCallback(
    async (file: File) => {
      if (!file) {
        clearCache();
        dispatch({ type: "CLEAR_IMAGE" });
        return;
      }

      try {
        const img = await loadImage(file);
        const previewUrl = URL.createObjectURL(file);
        dispatch({
          type: "SET_IMAGE",
          file,
          previewUrl,
          width: img.width,
          height: img.height,
        });
        clearCache();
      } catch {
        dispatch({ type: "SET_ERROR", error: "Failed to load image" });
      }
    },
    [clearCache],
  );

  const handleSegment = useCallback(async () => {
    if (!state.imageFile || !state.textPrompt.trim()) return;

    dispatch({ type: "SET_ERROR", error: null });
    dispatch({ type: "SET_INFERENCE_STATUS", status: "preparing" });

    try {
      const tokens = await tokenize(state.textPrompt.trim());

      if (!state.imageEncoded) {
        // Need to encode image first
        const img = await loadImage(state.imageFile);
        const imageRgb = preprocessImage(img);
        await segment(
          tokens,
          state.textPrompt.trim(),
          imageRgb,
          state.originalWidth!,
          state.originalHeight!,
        );
      } else {
        // Image already encoded, just run text + decoder
        await segment(tokens, state.textPrompt.trim());
      }
    } catch (e) {
      console.error("Segment Anything failed", e);
      const message =
        e instanceof Error
          ? e.message
          : typeof e === "object" &&
              e !== null &&
              "message" in e &&
              typeof (e as { message?: unknown }).message === "string"
            ? (e as { message: string }).message
            : String(e);
      dispatch({ type: "SET_ERROR", error: message });
    }
  }, [
    state.imageFile,
    state.textPrompt,
    state.imageEncoded,
    state.originalWidth,
    state.originalHeight,
    segment,
  ]);

  const isRunning =
    state.inferenceStatus === "preparing" ||
    state.inferenceStatus === "encoding-image" ||
    state.inferenceStatus === "encoding-text" ||
    state.inferenceStatus === "decoding";

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Segment Anything</h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Type what you see in the image. Get pixel-perfect segmentation masks.
          840M-parameter SAM3 running entirely in your browser.
        </p>
      </div>

      {/* Model loader */}
      <div className="mb-6 p-4 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
        <ModelLoader
          status={state.modelsStatus}
          progress={state.downloadProgress}
          provider={state.executionProvider}
          gpuDevice={state.gpuDevice}
          error={state.modelsStatus === "error" ? state.error : null}
          onLoad={loadModels}
        />
      </div>

      {/* Main content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Canvas — 2 columns */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
            <ImageCanvas
              imageUrl={state.imagePreviewUrl}
              originalWidth={state.originalWidth}
              originalHeight={state.originalHeight}
              results={state.results}
              textPrompt={state.textPrompt}
              onImageDrop={handleImageDrop}
              disabled={state.modelsStatus !== "ready"}
            />
          </div>
        </div>

        {/* Sidebar — 1 column */}
        <div className="space-y-4">
          {/* Prompt input */}
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
            <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
              Text Prompt
            </h2>
            <PromptInput
              value={state.textPrompt}
              onChange={(prompt) =>
                dispatch({ type: "SET_TEXT_PROMPT", prompt })
              }
              onSegment={handleSegment}
              disabled={isRunning}
              isRunning={isRunning}
              modelsReady={state.modelsStatus === "ready"}
              imageReady={!!state.imageFile}
              inferenceStatus={state.inferenceStatus}
              imageEncoded={state.imageEncoded}
            />
          </div>

          {/* Results */}
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
            <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
              Results
            </h2>
            <ResultsPanel
              results={state.results}
              inferenceStatus={state.inferenceStatus}
              imageEncoded={state.imageEncoded}
            />
            {!state.results &&
              state.inferenceStatus === "idle" &&
              !state.imageEncoded && (
                <p className="text-sm text-neutral-400 dark:text-neutral-500">
                  Load models, upload an image, and type a prompt to see
                  results.
                </p>
              )}
          </div>

          {/* Error */}
          {state.error && state.modelsStatus !== "error" && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <p className="text-sm text-red-600 dark:text-red-400">
                {state.error}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* How it works */}
      <div className="mt-8 p-6 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
        <h2 className="text-lg font-semibold mb-3">How it works</h2>
        <div className="grid md:grid-cols-3 gap-4 text-sm text-neutral-600 dark:text-neutral-400">
          <div>
            <h3 className="font-medium text-neutral-900 dark:text-neutral-100 mb-1">
              1. Load Models
            </h3>
            <p>
              Three quantized ONNX models (888 MB total) are downloaded and
              cached by your browser. This only happens once.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-neutral-900 dark:text-neutral-100 mb-1">
              2. Upload & Prompt
            </h3>
            <p>
              Drop any image and type what you want to find. The image is
              encoded once — trying different prompts on the same image is fast.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-neutral-900 dark:text-neutral-100 mb-1">
              3. See Results
            </h3>
            <p>
              SAM3 produces pixel-perfect segmentation masks with confidence
              scores. Everything runs locally — no data leaves your browser.
            </p>
          </div>
        </div>
      </div>

      {/* Technical note */}
      <div className="mt-4 text-xs text-neutral-500 dark:text-neutral-400 text-center">
        SAM3 (Segment Anything Model 3) by Meta, INT8 quantized, via ONNX
        Runtime Web.
        {state.executionProvider === "wasm" && (
          <span>
            {" "}
            Running on WASM.{" "}
            <a
              href="chrome://flags/#enable-unsafe-webgpu"
              className="underline"
            >
              Enable WebGPU
            </a>{" "}
            for faster inference.
          </span>
        )}
      </div>
    </div>
  );
}
