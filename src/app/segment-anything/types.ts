// ── State machine phases ─────────────────────────────────────────────
//   idle → loading → ready → encoding → encoded ↔ (clicks)
//                      ↑         ↓
//                      └── error ←┘

export type ModelPhase =
  | "idle"
  | "loading"
  | "ready"
  | "encoding"
  | "encoded"
  | "error";

// ── Domain types ─────────────────────────────────────────────────────

export type PointMode = "include" | "exclude";

export type ExportBackground = "transparent" | "black" | "white";

export interface SegmentPoint {
  id: string;
  /** Normalized x coordinate [0,1] relative to displayed image */
  x: number;
  /** Normalized y coordinate [0,1] relative to displayed image */
  y: number;
  /** 1 = positive (include), 0 = negative (exclude) */
  label: 1 | 0;
}

export interface MaskCandidate {
  index: 0 | 1 | 2;
  iouScore: number;
}

// ── Reducer state ────────────────────────────────────────────────────

export interface SAMState {
  phase: ModelPhase;
  loadProgress: number;
  error: string | null;
  imageUrl: string | null;
  encoderMs: number | null;
  decoderMs: number | null;
  points: SegmentPoint[];
  pointMode: PointMode;
  maskCandidates: MaskCandidate[];
  activeMaskIndex: 0 | 1 | 2;
  maskOpacity: number;
}

export const initialSAMState: SAMState = {
  phase: "idle",
  loadProgress: 0,
  error: null,
  imageUrl: null,
  encoderMs: null,
  decoderMs: null,
  points: [],
  pointMode: "include",
  maskCandidates: [],
  activeMaskIndex: 0,
  maskOpacity: 0.4,
};

// ── Actions ──────────────────────────────────────────────────────────

export type SAMAction =
  | { type: "MODEL_LOADING" }
  | { type: "MODEL_PROGRESS"; progress: number }
  | { type: "MODEL_READY" }
  | { type: "MODEL_ERROR"; error: string }
  | { type: "IMAGE_SELECTED"; url: string }
  | { type: "ENCODE_START" }
  | { type: "ENCODE_DONE"; encoderMs: number }
  | { type: "DECODE_DONE"; decoderMs: number; candidates: MaskCandidate[] }
  | { type: "ADD_POINT"; point: SegmentPoint }
  | { type: "REMOVE_POINT"; id: string }
  | { type: "CLEAR_POINTS" }
  | { type: "SET_ACTIVE_MASK"; index: 0 | 1 | 2 }
  | { type: "SET_OPACITY"; opacity: number }
  | { type: "SET_POINT_MODE"; mode: PointMode };

// ── Reducer ──────────────────────────────────────────────────────────

export function samReducer(state: SAMState, action: SAMAction): SAMState {
  switch (action.type) {
    case "MODEL_LOADING":
      return { ...state, phase: "loading", error: null, loadProgress: 0 };

    case "MODEL_PROGRESS":
      return { ...state, loadProgress: action.progress };

    case "MODEL_READY":
      return { ...state, phase: "ready", loadProgress: 100 };

    case "MODEL_ERROR":
      return { ...state, phase: "error", error: action.error };

    case "IMAGE_SELECTED":
      return {
        ...state,
        imageUrl: action.url,
        points: [],
        maskCandidates: [],
        activeMaskIndex: 0,
        encoderMs: null,
        decoderMs: null,
      };

    case "ENCODE_START":
      return { ...state, phase: "encoding" };

    case "ENCODE_DONE":
      return { ...state, phase: "encoded", encoderMs: action.encoderMs };

    case "DECODE_DONE": {
      // Auto-select the mask with the highest IoU
      const best = action.candidates.reduce((a, b) =>
        b.iouScore > a.iouScore ? b : a
      );
      return {
        ...state,
        decoderMs: action.decoderMs,
        maskCandidates: action.candidates,
        activeMaskIndex: best.index,
      };
    }

    case "ADD_POINT":
      return { ...state, points: [...state.points, action.point] };

    case "REMOVE_POINT":
      return {
        ...state,
        points: state.points.filter((p) => p.id !== action.id),
      };

    case "CLEAR_POINTS":
      return {
        ...state,
        points: [],
        maskCandidates: [],
        activeMaskIndex: 0,
        decoderMs: null,
      };

    case "SET_ACTIVE_MASK":
      return { ...state, activeMaskIndex: action.index };

    case "SET_OPACITY":
      return { ...state, maskOpacity: action.opacity };

    case "SET_POINT_MODE":
      return { ...state, pointMode: action.mode };

    default:
      return state;
  }
}
