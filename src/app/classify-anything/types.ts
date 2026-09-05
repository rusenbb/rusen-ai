// Classification result from the model
export interface ClassificationResult {
  label: string;
  score: number;
}

// Model status
export type ModelStatus = "idle" | "loading" | "ready" | "error";

// Main state
export interface ClassifyState {
  labels: string[];
  inputText: string;
  results: ClassificationResult[] | null;
  isClassifying: boolean;
  error: string | null;
}

// Actions
export type ClassifyAction =
  | { type: "ADD_LABEL"; label: string }
  | { type: "REMOVE_LABEL"; index: number }
  | { type: "SET_LABELS"; labels: string[] }
  | { type: "SET_INPUT_TEXT"; text: string }
  | { type: "SET_RESULTS"; results: ClassificationResult[] }
  | { type: "SET_CLASSIFYING"; isClassifying: boolean }
  | { type: "SET_ERROR"; error: string | null };

// Initial state
export const initialState: ClassifyState = {
  labels: ["positive", "negative", "neutral"],
  inputText: "",
  results: null,
  isClassifying: false,
  error: null,
};

// Reducer
export function classifyReducer(
  state: ClassifyState,
  action: ClassifyAction
): ClassifyState {
  switch (action.type) {
    case "ADD_LABEL":
      if (state.labels.includes(action.label.toLowerCase().trim())) {
        return state;
      }
      return {
        ...state,
        labels: [...state.labels, action.label.toLowerCase().trim()],
        results: null,
      };

    case "REMOVE_LABEL":
      return {
        ...state,
        labels: state.labels.filter((_, i) => i !== action.index),
        results: null,
      };

    case "SET_LABELS":
      return {
        ...state,
        labels: action.labels,
        results: null,
      };

    case "SET_INPUT_TEXT":
      return {
        ...state,
        inputText: action.text,
        results: null,
      };

    case "SET_RESULTS":
      return {
        ...state,
        results: action.results,
        isClassifying: false,
      };

    case "SET_CLASSIFYING":
      return {
        ...state,
        isClassifying: action.isClassifying,
        error: null,
      };

    case "SET_ERROR":
      return {
        ...state,
        error: action.error,
        isClassifying: false,
      };

    default:
      return state;
  }
}
