"use client";

import { useCallback, useRef, useState } from "react";
import type {
  BoxPrompt,
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

type IntegerTensorType = "int32" | "int64";
type ExecutionProvider = "webgpu" | "wasm";
type ModelVariantId = "balanced-672" | "compact";

type ModelBuffers = {
  imageEncoder: ArrayBuffer;
  languageEncoder: ArrayBuffer;
  decoder: ArrayBuffer;
};

type ModelFiles = {
  imageEncoder: string;
  languageEncoder: string;
  decoder: string;
};

type ModelVariant = {
  id: ModelVariantId;
  label: string;
  inputSize: number;
  baseUrl: string;
  files: ModelFiles;
};

type WebGPUCapabilities = {
  available: boolean;
  device?: string;
  hasShaderF16: boolean;
  maxBufferSize: number;
  maxStorageBufferBindingSize: number;
  note?: string;
};

type ModelLoadPlan = {
  id: string;
  provider: ExecutionProvider;
  variant: ModelVariant;
  reason: string;
};

type SegmentRunOptions = {
  tokens: Int32Array;
  imageRgb?: Uint8Array;
  originalWidth?: number;
  originalHeight?: number;
  boxPrompt?: BoxPrompt | null;
};

const MB = 1024 * 1024;
const WEBGPU_BALANCED_LIMITS = {
  maxBufferSize: 256 * MB,
  maxStorageBufferBindingSize: 128 * MB,
};
const WEBGPU_COMPACT_LIMITS = {
  maxBufferSize: 128 * MB,
  maxStorageBufferBindingSize: 64 * MB,
};

const DEFAULT_MODEL_VARIANT: ModelVariant = {
  id: "balanced-672",
  label: "Balanced 672",
  inputSize: 672,
  baseUrl: "https://huggingface.co/rusen/sam3-browser-int8/resolve/main",
  files: {
    imageEncoder: "sam3_image_encoder_fp16.onnx",
    languageEncoder: "sam3_language_encoder.onnx",
    decoder: "sam3_decoder.onnx",
  },
};

const DEFAULT_COMPACT_MODEL_BASE_URL =
  "https://huggingface.co/rusen/sam3-browser-int8/resolve/main/compact-448";
const COMPACT_MODEL_BASE_URL =
  process.env.NEXT_PUBLIC_SAM3_COMPACT_MODEL_BASE_URL?.trim() ||
  DEFAULT_COMPACT_MODEL_BASE_URL;
const COMPACT_MODEL_INPUT_SIZE = Number.parseInt(
  process.env.NEXT_PUBLIC_SAM3_COMPACT_INPUT_SIZE ?? "448",
  10,
);

const COMPACT_MODEL_VARIANT: ModelVariant | null = COMPACT_MODEL_BASE_URL
  ? {
      id: "compact",
      label: `Compact ${COMPACT_MODEL_INPUT_SIZE}`,
      inputSize: COMPACT_MODEL_INPUT_SIZE,
      baseUrl: COMPACT_MODEL_BASE_URL,
      files: {
        imageEncoder: "sam3_image_encoder_fp16.onnx",
        languageEncoder: "sam3_language_encoder.onnx",
        decoder: "sam3_decoder.onnx",
      },
    }
  : null;

function resetDownloadProgress(
  dispatch: React.Dispatch<SegmentAction>,
): void {
  dispatch({
    type: "SET_DOWNLOAD_PROGRESS",
    progress: {
      imageEncoder: 0,
      languageEncoder: 0,
      decoder: 0,
    },
  });
}

function isLikelyLowMemoryDevice(): boolean {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const deviceMemory = nav.deviceMemory ?? Number.POSITIVE_INFINITY;
  const userAgent = navigator.userAgent.toLowerCase();
  return (
    deviceMemory <= 8 ||
    /android|iphone|ipad|mobile/.test(userAgent) ||
    window.innerWidth < 900
  );
}

function supportsWebGPUPlan(
  gpu: WebGPUCapabilities,
  limits: { maxBufferSize: number; maxStorageBufferBindingSize: number },
): boolean {
  return (
    gpu.available &&
    gpu.hasShaderF16 &&
    gpu.maxBufferSize >= limits.maxBufferSize &&
    gpu.maxStorageBufferBindingSize >= limits.maxStorageBufferBindingSize
  );
}

function getPlanLabel(plan: ModelLoadPlan, gpu: WebGPUCapabilities): string {
  const device = gpu.device ?? "Browser";
  if (plan.provider === "webgpu") {
    return `${device} · ${plan.variant.label}`;
  }

  return `${device} (${plan.reason}; ${plan.variant.label})`;
}

function buildLoadPlans(gpu: WebGPUCapabilities): ModelLoadPlan[] {
  const plans: ModelLoadPlan[] = [];
  const lowMemoryDevice = isLikelyLowMemoryDevice();

  if (supportsWebGPUPlan(gpu, WEBGPU_BALANCED_LIMITS)) {
    plans.push({
      id: "balanced-672-webgpu",
      provider: "webgpu",
      variant: DEFAULT_MODEL_VARIANT,
      reason: "using balanced WebGPU profile",
    });
  }

  if (
    COMPACT_MODEL_VARIANT &&
    supportsWebGPUPlan(gpu, WEBGPU_COMPACT_LIMITS) &&
    (lowMemoryDevice || !supportsWebGPUPlan(gpu, WEBGPU_BALANCED_LIMITS))
  ) {
    plans.push({
      id: "compact-webgpu",
      provider: "webgpu",
      variant: COMPACT_MODEL_VARIANT,
      reason: "using compact WebGPU profile for broader compatibility",
    });
  }

  if (COMPACT_MODEL_VARIANT && lowMemoryDevice) {
    plans.push({
      id: "compact-wasm",
      provider: "wasm",
      variant: COMPACT_MODEL_VARIANT,
      reason: gpu.available
        ? "using compact fallback"
        : "WebGPU unavailable; using compact fallback",
    });
  }

  const wasmReason = !gpu.available
    ? (gpu.note ?? "WebGPU unavailable")
    : !gpu.hasShaderF16
      ? "shader-f16 unavailable; using WASM"
      : gpu.maxStorageBufferBindingSize <
            WEBGPU_BALANCED_LIMITS.maxStorageBufferBindingSize ||
          gpu.maxBufferSize < WEBGPU_BALANCED_LIMITS.maxBufferSize
        ? "adapter limits are below the balanced WebGPU profile; using WASM"
        : "WebGPU session fallback";

  plans.push({
    id: "balanced-672-wasm",
    provider: "wasm",
    variant: DEFAULT_MODEL_VARIANT,
    reason: wasmReason,
  });

  return plans.filter(
    (plan, index, allPlans) =>
      allPlans.findIndex((candidate) => candidate.id === plan.id) === index,
  );
}

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

async function detectWebGPU(): Promise<WebGPUCapabilities> {
  if (!navigator.gpu) {
    return {
      available: false,
      hasShaderF16: false,
      maxBufferSize: 0,
      maxStorageBufferBindingSize: 0,
      note: "WebGPU unavailable",
    };
  }

  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      return {
        available: false,
        hasShaderF16: false,
        maxBufferSize: 0,
        maxStorageBufferBindingSize: 0,
        note: "No compatible WebGPU adapter found",
      };
    }

    const info = adapter.info;
    return {
      available: true,
      hasShaderF16: adapter.features.has("shader-f16"),
      maxBufferSize: Number(adapter.limits.maxBufferSize ?? 0),
      maxStorageBufferBindingSize: Number(
        adapter.limits.maxStorageBufferBindingSize ?? 0,
      ),
      device: info.description || info.device || info.vendor || "WebGPU",
    };
  } catch {
    return {
      available: false,
      hasShaderF16: false,
      maxBufferSize: 0,
      maxStorageBufferBindingSize: 0,
      note: "WebGPU initialization failed",
    };
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

function getImageInputSize(session: OrtInferenceSession): number {
  const metadata = session.inputMetadata.find((input) => input.name === "image");
  const shape = metadata?.shape;
  if (!shape) return 1008;

  for (let index = shape.length - 1; index >= 0; index -= 1) {
    const value = shape[index];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  return 1008;
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
  const providerRef = useRef<ExecutionProvider | null>(null);
  const gpuDeviceRef = useRef<string | null>(null);
  const activePlanRef = useRef<ModelLoadPlan | null>(null);

  // Cached image encoder outputs for re-prompting
  const cachedEncOutputs = useRef<Record<string, OrtTensor> | null>(null);
  const cachedImageWidth = useRef<number>(0);
  const cachedImageHeight = useRef<number>(0);
  const [modelInputSize, setModelInputSize] = useState(1008);

  const createSessions = useCallback(
    async (buffers: ModelBuffers, executionProviders: string[]) => {
      const ort = ortRef.current;
      if (!ort) throw new Error("ORT not loaded");

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
    },
    [],
  );

  const downloadPlanModels = useCallback(
    async (plan: ModelLoadPlan): Promise<ModelBuffers> => {
      const imageEncoder = await fetchModel(
        `${plan.variant.baseUrl}/${plan.variant.files.imageEncoder}`,
        (loaded, total) =>
          dispatch({
            type: "SET_DOWNLOAD_PROGRESS",
            progress: {
              imageEncoder: total > 0 ? (loaded / total) * 100 : 0,
            },
          }),
      );
      dispatch({
        type: "SET_DOWNLOAD_PROGRESS",
        progress: { imageEncoder: 100 },
      });

      const languageEncoder = await fetchModel(
        `${plan.variant.baseUrl}/${plan.variant.files.languageEncoder}`,
        (loaded, total) =>
          dispatch({
            type: "SET_DOWNLOAD_PROGRESS",
            progress: {
              languageEncoder: total > 0 ? (loaded / total) * 100 : 0,
            },
          }),
      );
      dispatch({
        type: "SET_DOWNLOAD_PROGRESS",
        progress: { languageEncoder: 100 },
      });

      const decoder = await fetchModel(
        `${plan.variant.baseUrl}/${plan.variant.files.decoder}`,
        (loaded, total) =>
          dispatch({
            type: "SET_DOWNLOAD_PROGRESS",
            progress: {
              decoder: total > 0 ? (loaded / total) * 100 : 0,
            },
          }),
      );
      dispatch({
        type: "SET_DOWNLOAD_PROGRESS",
        progress: { decoder: 100 },
      });

      return {
        imageEncoder,
        languageEncoder,
        decoder,
      };
    },
    [dispatch],
  );

  const attachSessions = useCallback(
    (
      sessions: {
        imageEncoder: OrtInferenceSession;
        languageEncoder: OrtInferenceSession;
        decoder: OrtInferenceSession;
      },
      provider: ExecutionProvider,
      device?: string,
      plan?: ModelLoadPlan | null,
    ) => {
      imgEncSession.current = sessions.imageEncoder;
      langEncSession.current = sessions.languageEncoder;
      decSession.current = sessions.decoder;
      setModelInputSize(getImageInputSize(sessions.imageEncoder));
      providerRef.current = provider;
      gpuDeviceRef.current = device ?? null;
      activePlanRef.current = plan ?? null;
      dispatch({ type: "SET_EXECUTION_PROVIDER", provider, device });
    },
    [dispatch],
  );

  const switchToWasm = useCallback(
    async (reason?: string) => {
      const currentBuffers = modelBuffersRef.current;
      if (!currentBuffers) throw new Error("Model buffers not available");

      await releaseSessions(
        imgEncSession.current,
        langEncSession.current,
        decSession.current,
      );
      const sessions = await createSessions(currentBuffers, ["wasm"]);
      const activePlan = activePlanRef.current;
      const fallbackPlan = activePlan
        ? { ...activePlan, provider: "wasm" as const }
        : null;
      attachSessions(
        sessions,
        "wasm",
        reason
          ? `${gpuDeviceRef.current ?? "WebGPU"} (${reason})`
          : (gpuDeviceRef.current ?? undefined),
        fallbackPlan,
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
      const plans = buildLoadPlans(gpu);

      await releaseSessions(
        imgEncSession.current,
        langEncSession.current,
        decSession.current,
      );
      imgEncSession.current = null;
      langEncSession.current = null;
      decSession.current = null;
      activePlanRef.current = null;
      modelBuffersRef.current = null;

      let lastError: Error | null = null;

      for (const plan of plans) {
        try {
          resetDownloadProgress(dispatch);
          const buffers = await downloadPlanModels(plan);
          modelBuffersRef.current = buffers;

          dispatch({ type: "SET_MODELS_STATUS", status: "creating-sessions" });
          const sessions = await createSessions(
            buffers,
            plan.provider === "webgpu" ? ["webgpu", "wasm"] : ["wasm"],
          );

          const hasInt64Inputs =
            sessionHasInt64Inputs(sessions.languageEncoder) ||
            sessionHasInt64Inputs(sessions.decoder);

          if (plan.provider === "webgpu" && hasInt64Inputs) {
            await releaseSessions(
              sessions.imageEncoder,
              sessions.languageEncoder,
              sessions.decoder,
            );
            throw new Error(
              "WebGPU candidate still exposes int64 inputs to the browser",
            );
          }

          attachSessions(sessions, plan.provider, getPlanLabel(plan, gpu), plan);
          dispatch({ type: "SET_MODELS_STATUS", status: "ready" });
          return;
        } catch (error) {
          lastError = normalizeError(error);
          await releaseSessions(
            imgEncSession.current,
            langEncSession.current,
            decSession.current,
          );
          imgEncSession.current = null;
          langEncSession.current = null;
          decSession.current = null;
        }
      }

      throw lastError ?? new Error("No compatible SAM3 model plan succeeded");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load models";
      dispatch({ type: "SET_ERROR", error: message });
      dispatch({ type: "SET_MODELS_STATUS", status: "error" });
    }
  }, [attachSessions, createSessions, dispatch, downloadPlanModels]);

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

      const inputSize = getImageInputSize(session);
      const imageTensor = new ort.Tensor("uint8", imageRgb, [
        3,
        inputSize,
        inputSize,
      ]);

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
    async ({
      tokens,
      imageRgb,
      originalWidth,
      originalHeight,
      boxPrompt,
    }: SegmentRunOptions): Promise<SegmentResult> => {
      const ort = ortRef.current;
      if (!ort) throw new Error("Models not loaded");

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
        const langSession = langEncSession.current;
        const decoder = decSession.current;
        if (!langSession || !decoder) {
          throw new Error("Models not loaded");
        }

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
            const coords = boxPrompt
              ? [
                  Math.min(boxPrompt.x1, boxPrompt.x2),
                  Math.min(boxPrompt.y1, boxPrompt.y2),
                  Math.max(boxPrompt.x1, boxPrompt.x2),
                  Math.max(boxPrompt.y1, boxPrompt.y2),
                ]
              : [0, 0, 0, 0];
            decoderInputs[name] = new ort.Tensor(
              "float32",
              new Float32Array(coords),
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
              Uint8Array.from([boxPrompt ? 0 : 1]),
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
          boxPromptUsed: !!boxPrompt,
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

  return { loadModels, encodeImage, segment, clearCache, modelInputSize };
}
