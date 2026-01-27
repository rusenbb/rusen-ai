import {
  initialState,
  type PaperPilotState,
  type PaperPilotAction,
  type FetchProgress,
} from "./types";

/**
 * Reducer for Paper Pilot state management.
 * Handles paper fetching, summary generation, and Q&A.
 */
export function paperPilotReducer(state: PaperPilotState, action: PaperPilotAction): PaperPilotState {
  switch (action.type) {
    case "SET_PAPER":
      return {
        ...state,
        paper: action.paper,
        summaries: [],
        qaHistory: [],
        fetchProgress: { status: "complete", stepsCompleted: [] },
      };

    case "CLEAR_PAPER":
      return {
        ...state,
        paper: null,
        summaries: [],
        qaHistory: [],
        fetchProgress: { status: "idle", stepsCompleted: [] },
      };

    case "ADD_SUMMARY":
      // Replace existing summary of the same type (for regeneration)
      const existingIndex = state.summaries.findIndex(s => s.type === action.summary.type);
      if (existingIndex >= 0) {
        const newSummaries = [...state.summaries];
        newSummaries[existingIndex] = action.summary;
        return { ...state, summaries: newSummaries };
      }
      return {
        ...state,
        summaries: [...state.summaries, action.summary],
      };

    case "CLEAR_SUMMARIES":
      return {
        ...state,
        summaries: [],
      };

    case "ADD_QA":
      return {
        ...state,
        qaHistory: [action.qa, ...state.qaHistory],
      };

    case "CLEAR_QA":
      return {
        ...state,
        qaHistory: [],
      };

    case "SET_GENERATION_PROGRESS":
      return {
        ...state,
        generationProgress: {
          ...state.generationProgress,
          ...action.progress,
        },
      };

    case "SET_FETCH_PROGRESS":
      return {
        ...state,
        fetchProgress: {
          ...state.fetchProgress,
          ...action.progress,
        } as FetchProgress,
      };

    case "RESET":
      return initialState;

    default:
      return state;
  }
}
