// ── ORT types (loaded from CDN, not bundled) ────────────────────────

export interface OrtTensor {
  data: Float32Array | Int32Array | BigInt64Array | Uint8Array;
  dims: readonly number[];
  type: string;
}

export interface OrtValueMetadata {
  name: string;
  isTensor: boolean;
  type?: string;
  shape?: readonly (number | string)[];
}

export interface OrtInferenceSession {
  inputNames: readonly string[];
  outputNames: readonly string[];
  inputMetadata: readonly OrtValueMetadata[];
  run(feeds: Record<string, OrtTensor>): Promise<Record<string, OrtTensor>>;
  release(): Promise<void>;
}

// ── Domain types ────────────────────────────────────────────────────

export interface SegmentResult {
  scores: number[];
  boxes: number[][];
  maskData: Float32Array | null;
  maskDims: number[] | null;
  timings: {
    imageEncoder: number;
    languageEncoder: number;
    decoder: number;
  };
}

export interface DownloadProgress {
  imageEncoder: number;
  languageEncoder: number;
  decoder: number;
}

export type ModelsStatus =
  | "idle"
  | "downloading"
  | "creating-sessions"
  | "ready"
  | "error";

export type InferenceStatus =
  | "idle"
  | "preparing"
  | "encoding-image"
  | "encoding-text"
  | "decoding"
  | "done"
  | "error";

// ── State ───────────────────────────────────────────────────────────

export interface SegmentState {
  modelsStatus: ModelsStatus;
  downloadProgress: DownloadProgress;
  executionProvider: "webgpu" | "wasm" | null;
  gpuDevice: string | null;

  imageFile: File | null;
  imagePreviewUrl: string | null;
  originalWidth: number | null;
  originalHeight: number | null;
  imageEncoded: boolean;

  textPrompt: string;

  inferenceStatus: InferenceStatus;
  results: SegmentResult | null;

  error: string | null;
}

// ── Actions ─────────────────────────────────────────────────────────

export type SegmentAction =
  | { type: "SET_MODELS_STATUS"; status: ModelsStatus }
  | { type: "SET_DOWNLOAD_PROGRESS"; progress: Partial<DownloadProgress> }
  | {
      type: "SET_EXECUTION_PROVIDER";
      provider: "webgpu" | "wasm";
      device?: string;
    }
  | {
      type: "SET_IMAGE";
      file: File;
      previewUrl: string;
      width: number;
      height: number;
    }
  | { type: "CLEAR_IMAGE" }
  | { type: "SET_IMAGE_ENCODED"; encoded: boolean }
  | { type: "SET_TEXT_PROMPT"; prompt: string }
  | { type: "SET_INFERENCE_STATUS"; status: InferenceStatus }
  | { type: "SET_RESULTS"; results: SegmentResult }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "RESET" };

// ── Initial state ───────────────────────────────────────────────────

export const initialState: SegmentState = {
  modelsStatus: "idle",
  downloadProgress: { imageEncoder: 0, languageEncoder: 0, decoder: 0 },
  executionProvider: null,
  gpuDevice: null,

  imageFile: null,
  imagePreviewUrl: null,
  originalWidth: null,
  originalHeight: null,
  imageEncoded: false,

  textPrompt: "",

  inferenceStatus: "idle",
  results: null,

  error: null,
};

// ── Reducer ─────────────────────────────────────────────────────────

export function segmentReducer(
  state: SegmentState,
  action: SegmentAction,
): SegmentState {
  switch (action.type) {
    case "SET_MODELS_STATUS":
      return { ...state, modelsStatus: action.status };

    case "SET_DOWNLOAD_PROGRESS":
      return {
        ...state,
        downloadProgress: { ...state.downloadProgress, ...action.progress },
      };

    case "SET_EXECUTION_PROVIDER":
      return {
        ...state,
        executionProvider: action.provider,
        gpuDevice: action.device ?? null,
      };

    case "SET_IMAGE":
      return {
        ...state,
        imageFile: action.file,
        imagePreviewUrl: action.previewUrl,
        originalWidth: action.width,
        originalHeight: action.height,
        imageEncoded: false,
        results: null,
      };

    case "CLEAR_IMAGE":
      return {
        ...state,
        imageFile: null,
        imagePreviewUrl: state.imagePreviewUrl
          ? (URL.revokeObjectURL(state.imagePreviewUrl), null)
          : null,
        originalWidth: null,
        originalHeight: null,
        imageEncoded: false,
        results: null,
      };

    case "SET_IMAGE_ENCODED":
      return { ...state, imageEncoded: action.encoded };

    case "SET_TEXT_PROMPT":
      return { ...state, textPrompt: action.prompt };

    case "SET_INFERENCE_STATUS":
      return { ...state, inferenceStatus: action.status };

    case "SET_RESULTS":
      return { ...state, results: action.results, inferenceStatus: "done" };

    case "SET_ERROR":
      return { ...state, error: action.error, inferenceStatus: "error" };

    case "RESET":
      if (state.imagePreviewUrl) URL.revokeObjectURL(state.imagePreviewUrl);
      return initialState;

    default:
      return state;
  }
}
