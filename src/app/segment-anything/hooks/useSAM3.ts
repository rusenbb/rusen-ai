"use client";

import { useCallback, useRef } from "react";
import type {
  OrtTensor,
  OrtInferenceSession,
  SegmentResult,
  SegmentAction,
} from "../types";

// CDN-loaded ORT global
interface OrtAPI {
  env: {
    wasm: { wasmPaths: string; numThreads: number };
  };
  Tensor: new (
    type: string,
    data:
      | ArrayLike<number>
      | BigInt64Array
      | Int32Array
      | Uint8Array
      | Float32Array,
    dims: number[],
  ) => OrtTensor;
  InferenceSession: {
    create(
      buffer: ArrayBuffer,
      options?: { executionProviders: string[] },
    ): Promise<OrtInferenceSession>;
  };
}

declare global {
  interface Window {
    ort?: OrtAPI;
  }
}

const ORT_VERSION = "1.24.2";
const ORT_CDN = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/ort.all.min.js`;
const ORT_WASM_CDN = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`;

const MODEL_BASE_URL =
  "https://huggingface.co/rusen/sam3-browser-int8/resolve/main";

const MODEL_FILES = {
  imageEncoder: "sam3_image_encoder_fp16.onnx",
  languageEncoder: "sam3_language_encoder.onnx",
  decoder: "sam3_decoder.onnx",
} as const;

type IntegerTensorType = "int32" | "int64";

type ModelBuffers = {
  imageEncoder: ArrayBuffer;
  languageEncoder: ArrayBuffer;
  decoder: ArrayBuffer;
};

// ── Load ORT from CDN ───────────────────────────────────────────────

async function loadOrt(): Promise<OrtAPI> {
  if (window.ort) return window.ort;

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = ORT_CDN;
    script.onload = () => {
      if (!window.ort) {
        reject(new Error("onnxruntime-web loaded but ort global not found"));
        return;
      }
      window.ort.env.wasm.wasmPaths = ORT_WASM_CDN;
      window.ort.env.wasm.numThreads = navigator.hardwareConcurrency || 4;
      resolve(window.ort);
    };
    script.onerror = () => reject(new Error("Failed to load onnxruntime-web"));
    document.head.appendChild(script);
  });
}

// ── Model caching via Cache API ─────────────────────────────────────

const CACHE_NAME = "sam3-models-v3";

async function fetchModel(
  url: string,
  onProgress: (loaded: number, total: number) => void,
): Promise<ArrayBuffer> {
  // Check Cache API first
  if ("caches" in window) {
    try {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(url);
      if (cached) {
        const buffer = await cached.arrayBuffer();
        onProgress(buffer.byteLength, buffer.byteLength);
        return buffer;
      }
    } catch {
      // Cache miss or error — fall through to network
    }
  }

  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status} fetching ${url}`);

  const contentLength = response.headers.get("content-length");
  const total = contentLength ? parseInt(contentLength) : 0;
  const reader = response.body!.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    if (total > 0) onProgress(loaded, total);
  }

  const buffer = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.length;
  }

  // Store in Cache API for next time
  if ("caches" in window) {
    try {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(url, new Response(buffer.buffer));
    } catch {
      // Storage might be full — not critical
    }
  }

  return buffer.buffer;
}

// ── Detect WebGPU ───────────────────────────────────────────────────

async function detectWebGPU(): Promise<{
  available: boolean;
  device?: string;
}> {
  if (!navigator.gpu) return { available: false };

  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) return { available: false };
    const info = adapter.info;
    return {
      available: true,
      device: info.description || info.device || info.vendor || "WebGPU",
    };
  } catch {
    return { available: false };
  }
}

async function releaseSessions(
  ...sessions: Array<OrtInferenceSession | null>
): Promise<void> {
  await Promise.all(
    sessions.map(async (session) => {
      if (!session) return;
      try {
        await session.release();
      } catch {
        // Best-effort cleanup only.
      }
    }),
  );
}

function getInputTensorType(
  session: OrtInferenceSession,
  name: string,
  fallback: IntegerTensorType,
): IntegerTensorType {
  const metadata = session.inputMetadata.find((input) => input.name === name);
  return metadata?.isTensor && metadata.type === "int32" ? "int32" : fallback;
}

function sessionHasInt64Inputs(session: OrtInferenceSession): boolean {
  return session.inputMetadata.some(
    (input) => input.isTensor && input.type === "int64",
  );
}

function createIntegerTensor(
  ort: OrtAPI,
  type: IntegerTensorType,
  values: readonly number[],
  dims: number[],
): OrtTensor {
  if (type === "int32") {
    return new ort.Tensor("int32", Int32Array.from(values), dims);
  }

  return new ort.Tensor(
    "int64",
    BigInt64Array.from(values, (value) => BigInt(value)),
    dims,
  );
}

function normalizeError(error: unknown): Error {
  if (error instanceof Error) return error;
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return new Error((error as { message: string }).message);
  }
  return new Error(String(error));
}

// ── Hook ────────────────────────────────────────────────────────────

export function useSAM3(dispatch: React.Dispatch<SegmentAction>) {
  const imgEncSession = useRef<OrtInferenceSession | null>(null);
  const langEncSession = useRef<OrtInferenceSession | null>(null);
  const decSession = useRef<OrtInferenceSession | null>(null);
  const ortRef = useRef<OrtAPI | null>(null);
  const modelBuffersRef = useRef<ModelBuffers | null>(null);
  const providerRef = useRef<"webgpu" | "wasm" | null>(null);
  const gpuDeviceRef = useRef<string | null>(null);

  // Cached image encoder outputs for re-prompting
  const cachedEncOutputs = useRef<Record<string, OrtTensor> | null>(null);
  const cachedImageWidth = useRef<number>(0);
  const cachedImageHeight = useRef<number>(0);

  const createSessions = useCallback(async (executionProviders: string[]) => {
    const ort = ortRef.current;
    const buffers = modelBuffersRef.current;
    if (!ort || !buffers) throw new Error("Model buffers not available");

    const imageEncoder = await ort.InferenceSession.create(
      buffers.imageEncoder,
      { executionProviders },
    );
    const languageEncoder = await ort.InferenceSession.create(
      buffers.languageEncoder,
      { executionProviders },
    );
    const decoder = await ort.InferenceSession.create(buffers.decoder, {
      executionProviders,
    });

    return { imageEncoder, languageEncoder, decoder };
  }, []);

  const attachSessions = useCallback(
    (
      sessions: {
        imageEncoder: OrtInferenceSession;
        languageEncoder: OrtInferenceSession;
        decoder: OrtInferenceSession;
      },
      provider: "webgpu" | "wasm",
      device?: string,
    ) => {
      imgEncSession.current = sessions.imageEncoder;
      langEncSession.current = sessions.languageEncoder;
      decSession.current = sessions.decoder;
      providerRef.current = provider;
      gpuDeviceRef.current = device ?? null;
      dispatch({ type: "SET_EXECUTION_PROVIDER", provider, device });
    },
    [dispatch],
  );

  const switchToWasm = useCallback(
    async (reason?: string) => {
      await releaseSessions(
        imgEncSession.current,
        langEncSession.current,
        decSession.current,
      );
      const sessions = await createSessions(["wasm"]);
      attachSessions(
        sessions,
        "wasm",
        reason
          ? `${gpuDeviceRef.current ?? "WebGPU"} (${reason})`
          : (gpuDeviceRef.current ?? undefined),
      );
    },
    [attachSessions, createSessions],
  );

  const loadModels = useCallback(async () => {
    dispatch({ type: "SET_MODELS_STATUS", status: "downloading" });
    dispatch({ type: "SET_ERROR", error: null });

    try {
      // Load ORT
      const ort = await loadOrt();
      ortRef.current = ort;
      const gpu = await detectWebGPU();

      await releaseSessions(
        imgEncSession.current,
        langEncSession.current,
        decSession.current,
      );
      imgEncSession.current = null;
      langEncSession.current = null;
      decSession.current = null;

      // Download models
      const imgEncBuffer = await fetchModel(
        `${MODEL_BASE_URL}/${MODEL_FILES.imageEncoder}`,
        (loaded, total) =>
          dispatch({
            type: "SET_DOWNLOAD_PROGRESS",
            progress: { imageEncoder: (loaded / total) * 100 },
          }),
      );
      dispatch({
        type: "SET_DOWNLOAD_PROGRESS",
        progress: { imageEncoder: 100 },
      });

      const langEncBuffer = await fetchModel(
        `${MODEL_BASE_URL}/${MODEL_FILES.languageEncoder}`,
        (loaded, total) =>
          dispatch({
            type: "SET_DOWNLOAD_PROGRESS",
            progress: { languageEncoder: (loaded / total) * 100 },
          }),
      );
      dispatch({
        type: "SET_DOWNLOAD_PROGRESS",
        progress: { languageEncoder: 100 },
      });

      const decBuffer = await fetchModel(
        `${MODEL_BASE_URL}/${MODEL_FILES.decoder}`,
        (loaded, total) =>
          dispatch({
            type: "SET_DOWNLOAD_PROGRESS",
            progress: { decoder: (loaded / total) * 100 },
          }),
      );
      dispatch({
        type: "SET_DOWNLOAD_PROGRESS",
        progress: { decoder: 100 },
      });

      modelBuffersRef.current = {
        imageEncoder: imgEncBuffer,
        languageEncoder: langEncBuffer,
        decoder: decBuffer,
      };

      // Create sessions
      dispatch({ type: "SET_MODELS_STATUS", status: "creating-sessions" });

      if (!gpu.available) {
        const sessions = await createSessions(["wasm"]);
        attachSessions(sessions, "wasm");
      } else {
        try {
          const sessions = await createSessions(["webgpu", "wasm"]);
          const hasInt64Inputs =
            sessionHasInt64Inputs(sessions.languageEncoder) ||
            sessionHasInt64Inputs(sessions.decoder);

          if (hasInt64Inputs) {
            await releaseSessions(
              sessions.imageEncoder,
              sessions.languageEncoder,
              sessions.decoder,
            );
            const wasmSessions = await createSessions(["wasm"]);
            attachSessions(
              wasmSessions,
              "wasm",
              `${gpu.device} (model inputs still use int64; upload the WebGPU-patched models to enable GPU inference)`,
            );
          } else {
            attachSessions(sessions, "webgpu", gpu.device);
          }
        } catch {
          const sessions = await createSessions(["wasm"]);
          attachSessions(
            sessions,
            "wasm",
            `${gpu.device} (WebGPU session init failed; using WASM)`,
          );
        }
      }

      dispatch({ type: "SET_MODELS_STATUS", status: "ready" });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load models";
      dispatch({ type: "SET_ERROR", error: message });
      dispatch({ type: "SET_MODELS_STATUS", status: "error" });
    }
  }, [attachSessions, createSessions, dispatch]);

  const encodeImage = useCallback(
    async (
      imageRgb: Uint8Array,
      originalWidth: number,
      originalHeight: number,
    ) => {
      const ort = ortRef.current;
      const session = imgEncSession.current;
      if (!ort || !session) throw new Error("Models not loaded");

      dispatch({ type: "SET_INFERENCE_STATUS", status: "encoding-image" });

      const imageTensor = new ort.Tensor("uint8", imageRgb, [3, 1008, 1008]);

      const t0 = performance.now();
      const result = await session.run({ image: imageTensor });
      const time = (performance.now() - t0) / 1000;

      cachedEncOutputs.current = result;
      cachedImageWidth.current = originalWidth;
      cachedImageHeight.current = originalHeight;
      dispatch({ type: "SET_IMAGE_ENCODED", encoded: true });

      return { result, time };
    },
    [dispatch],
  );

  const segment = useCallback(
    async (
      tokens: Int32Array,
      textPrompt: string,
      imageRgb?: Uint8Array,
      originalWidth?: number,
      originalHeight?: number,
    ): Promise<SegmentResult> => {
      const ort = ortRef.current;
      const langSession = langEncSession.current;
      const decoder = decSession.current;
      if (!ort || !langSession || !decoder)
        throw new Error("Models not loaded");

      let encResult = cachedEncOutputs.current;
      let encTime = 0;
      const imgW = originalWidth ?? cachedImageWidth.current;
      const imgH = originalHeight ?? cachedImageHeight.current;

      // Encode image if not cached
      if (!encResult && imageRgb && originalWidth && originalHeight) {
        const enc = await encodeImage(imageRgb, originalWidth, originalHeight);
        encResult = enc.result;
        encTime = enc.time;
      }

      if (!encResult)
        throw new Error("No image encoded. Upload an image first.");

      const runSegment = async (): Promise<SegmentResult> => {
        // Language encoder
        dispatch({ type: "SET_INFERENCE_STATUS", status: "encoding-text" });
        const tokenTensor = createIntegerTensor(
          ort,
          getInputTensorType(langSession, "tokens", "int64"),
          Array.from(tokens),
          [1, 32],
        );
        const t1 = performance.now();
        const langResult = await langSession.run({ tokens: tokenTensor });
        const langTime = (performance.now() - t1) / 1000;

        // Decoder
        dispatch({ type: "SET_INFERENCE_STATUS", status: "decoding" });

        const decoderInputs: Record<string, OrtTensor> = {};
        for (const name of decoder.inputNames) {
          if (name === "original_height") {
            decoderInputs[name] = createIntegerTensor(
              ort,
              getInputTensorType(decoder, name, "int64"),
              [imgH],
              [],
            );
          } else if (name === "original_width") {
            decoderInputs[name] = createIntegerTensor(
              ort,
              getInputTensorType(decoder, name, "int64"),
              [imgW],
              [],
            );
          } else if (name in encResult) {
            decoderInputs[name] = encResult[name];
          } else if (name === "language_mask") {
            decoderInputs[name] = langResult["text_attention_mask"];
          } else if (name === "language_features") {
            decoderInputs[name] = langResult["text_memory"];
          } else if (name === "box_coords") {
            decoderInputs[name] = new ort.Tensor(
              "float32",
              new Float32Array(4),
              [1, 1, 4],
            );
          } else if (name === "box_labels") {
            decoderInputs[name] = createIntegerTensor(
              ort,
              getInputTensorType(decoder, name, "int64"),
              [1],
              [1, 1],
            );
          } else if (name === "box_masks") {
            decoderInputs[name] = new ort.Tensor(
              "bool" as string,
              Uint8Array.from([1]),
              [1, 1],
            );
          }
        }

        const t2 = performance.now();
        const decResult = await decoder.run(decoderInputs);
        const decTime = (performance.now() - t2) / 1000;

        // Parse results
        const scoresData = decResult["scores"]?.data as Float32Array;
        const boxesData = decResult["boxes"]?.data as Float32Array;
        const masksData = decResult["masks"]?.data as Float32Array | null;
        const masksDims = decResult["masks"]?.dims as readonly number[] | null;

        const scores = Array.from(scoresData ?? []);
        const boxes: number[][] = [];
        if (boxesData) {
          for (let i = 0; i < boxesData.length; i += 4) {
            boxes.push([
              boxesData[i],
              boxesData[i + 1],
              boxesData[i + 2],
              boxesData[i + 3],
            ]);
          }
        }

        const result: SegmentResult = {
          scores,
          boxes,
          maskData: masksData ?? null,
          maskDims: masksDims ? Array.from(masksDims) : null,
          timings: {
            imageEncoder: encTime,
            languageEncoder: langTime,
            decoder: decTime,
          },
        };

        dispatch({ type: "SET_RESULTS", results: result });
        return result;
      };

      try {
        return await runSegment();
      } catch (error) {
        const normalized = normalizeError(error);
        console.error("SAM3 inference failed", normalized, error);

        if (providerRef.current === "webgpu") {
          await switchToWasm("WebGPU inference failed; using WASM");
          return runSegment();
        }

        throw normalized;
      }
    },
    [dispatch, encodeImage, switchToWasm],
  );

  const clearCache = useCallback(() => {
    cachedEncOutputs.current = null;
    cachedImageWidth.current = 0;
    cachedImageHeight.current = 0;
    dispatch({ type: "SET_IMAGE_ENCODED", encoded: false });
  }, [dispatch]);

  return { loadModels, encodeImage, segment, clearCache };
}
