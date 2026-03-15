// ── Data shapes (from generated JSON) ────────────────────────────────

export interface TokenLogprob {
  /** Token ID in the model vocabulary */
  id: number;
  /** Decoded text of this token */
  text: string;
  /** Log-probability at T=1 (log of softmax of raw logits) */
  logprob: number;
}

export interface TokenData {
  /** Token ID of the actually-sampled token */
  id: number;
  /** Decoded text of the sampled token */
  text: string;
  /** Top-K alternative tokens with their log-probabilities */
  logprobs: TokenLogprob[];
}

export interface BranchData {
  /** Unique branch ID within this tree */
  id: number;
  /** Parent branch ID (null for the main/root branch) */
  parentId: number | null;
  /** Token index in the parent branch where this branch forks */
  forkIndex: number;
  /** The alternative token that was chosen instead of the parent's sampled token */
  forkTokenId?: number;
  /** Decoded text of the fork token */
  forkTokenText?: string;
  /** Sequence of tokens in this branch */
  tokens: TokenData[];
}

export interface PromptData {
  category: string;
  level: "deterministic" | "medium" | "creative";
  label: string;
  /** The user instruction / system message (empty string for code-only prompts) */
  system: string;
  /** Raw prefill text shown greyed-out before generated tokens */
  prefill: string;
  /** Tokenized prefill for display */
  prefillTokens: { id: number; text: string }[];
  /** Trees keyed by temperature string: "0.0", "0.3", "0.6", "1.0" */
  trees: Record<string, BranchData[]>;
}

export interface PromptManifestEntry {
  category: string;
  level: string;
  label: string;
  file: string;
}

// ── Temperature values ───────────────────────────────────────────────

export const TEMPERATURES = ["0.0", "0.3", "0.6", "1.0"] as const;
export type TemperatureKey = (typeof TEMPERATURES)[number];

// ── UI state ─────────────────────────────────────────────────────────

export interface PlaygroundState {
  /** Index into the manifest for the selected prompt */
  promptIndex: number;
  /** Currently viewed temperature */
  temperature: TemperatureKey;
  /** Index of the selected token within the active branch (for inspector) */
  selectedTokenIndex: number | null;
  /** ID of the branch the selected token belongs to */
  selectedBranchId: number;
  /** Expanded fork points keyed by `${branchId}-${tokenIndex}` */
  expandedForks: string[];
  /** Continuous temperature value for the inspector's probability slider (0–2) */
  inspectorTemperature: number;
  /** Whether prompt data is currently loading */
  dataLoading: boolean;
}

export const initialPlaygroundState: PlaygroundState = {
  promptIndex: 0,
  temperature: "0.6",
  selectedTokenIndex: 0,
  selectedBranchId: 0,
  expandedForks: [],
  inspectorTemperature: 0.6,
  dataLoading: true,
};

// ── Actions ──────────────────────────────────────────────────────────

export type PlaygroundAction =
  | { type: "SET_PROMPT"; index: number }
  | { type: "SET_TEMPERATURE"; temperature: TemperatureKey }
  | { type: "SELECT_TOKEN"; branchId: number; tokenIndex: number }
  | { type: "NAVIGATE_TOKEN"; delta: -1 | 1; branchLength: number }
  | { type: "CLEAR_SELECTION" }
  | { type: "TOGGLE_FORK"; forkKey: string }
  | { type: "SET_INSPECTOR_TEMPERATURE"; value: number }
  | { type: "SET_DATA_LOADING"; loading: boolean };

// ── Reducer ──────────────────────────────────────────────────────────

export function playgroundReducer(
  state: PlaygroundState,
  action: PlaygroundAction,
): PlaygroundState {
  switch (action.type) {
    case "SET_PROMPT":
      return {
        ...state,
        promptIndex: action.index,
        selectedTokenIndex: 0,
        selectedBranchId: 0,
        expandedForks: [],
        dataLoading: true,
      };

    case "SET_TEMPERATURE":
      return {
        ...state,
        temperature: action.temperature,
        selectedTokenIndex: 0,
        selectedBranchId: 0,
        expandedForks: [],
        inspectorTemperature: parseFloat(action.temperature),
      };

    case "SELECT_TOKEN":
      return {
        ...state,
        selectedTokenIndex: action.tokenIndex,
        selectedBranchId: action.branchId,
      };

    case "NAVIGATE_TOKEN": {
      const maxIdx = action.branchLength - 1;
      if (maxIdx < 0) return state;

      // If nothing is selected, start at the first or last token
      // on the main branch (id 0)
      if (state.selectedTokenIndex === null) {
        return {
          ...state,
          selectedTokenIndex: action.delta === 1 ? 0 : maxIdx,
        };
      }

      const next = state.selectedTokenIndex + action.delta;
      if (next < 0 || next > maxIdx) return state;

      return {
        ...state,
        selectedTokenIndex: next,
      };
    }

    case "CLEAR_SELECTION":
      return {
        ...state,
        selectedTokenIndex: null,
      };

    case "TOGGLE_FORK": {
      const has = state.expandedForks.includes(action.forkKey);
      return {
        ...state,
        expandedForks: has
          ? state.expandedForks.filter((f) => f !== action.forkKey)
          : [...state.expandedForks, action.forkKey],
      };
    }

    case "SET_INSPECTOR_TEMPERATURE":
      return {
        ...state,
        inspectorTemperature: action.value,
      };

    case "SET_DATA_LOADING":
      return {
        ...state,
        dataLoading: action.loading,
      };

    default:
      return state;
  }
}
