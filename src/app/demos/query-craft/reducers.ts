import {
  initialState,
  createDefaultTable,
  createDefaultColumn,
  generateId,
  type QueryCraftState,
  type QueryCraftAction,
} from "./types";

/**
 * Reducer for Query Craft state management.
 * Handles schema building, query generation, and history tracking.
 */
export function queryCraftReducer(
  state: QueryCraftState,
  action: QueryCraftAction
): QueryCraftState {
  switch (action.type) {
    case "ADD_TABLE":
      return {
        ...state,
        schema: {
          ...state.schema,
          tables: [...state.schema.tables, createDefaultTable()],
        },
      };

    case "UPDATE_TABLE":
      return {
        ...state,
        schema: {
          ...state.schema,
          tables: state.schema.tables.map((t) =>
            t.id === action.tableId ? { ...t, ...action.updates } : t
          ),
        },
      };

    case "DELETE_TABLE":
      return {
        ...state,
        schema: {
          ...state.schema,
          tables: state.schema.tables.filter((t) => t.id !== action.tableId),
        },
      };

    case "ADD_COLUMN":
      return {
        ...state,
        schema: {
          ...state.schema,
          tables: state.schema.tables.map((t) =>
            t.id === action.tableId
              ? { ...t, columns: [...t.columns, createDefaultColumn()] }
              : t
          ),
        },
      };

    case "UPDATE_COLUMN":
      return {
        ...state,
        schema: {
          ...state.schema,
          tables: state.schema.tables.map((t) =>
            t.id === action.tableId
              ? {
                  ...t,
                  columns: t.columns.map((c) =>
                    c.id === action.columnId ? { ...c, ...action.updates } : c
                  ),
                }
              : t
          ),
        },
      };

    case "DELETE_COLUMN":
      return {
        ...state,
        schema: {
          ...state.schema,
          tables: state.schema.tables.map((t) =>
            t.id === action.tableId
              ? { ...t, columns: t.columns.filter((c) => c.id !== action.columnId) }
              : t
          ),
        },
      };

    case "SET_DIALECT":
      return {
        ...state,
        schema: {
          ...state.schema,
          dialect: action.dialect,
        },
      };

    case "SET_QUERY":
      return {
        ...state,
        query: action.query,
      };

    case "SET_GENERATED_SQL":
      return {
        ...state,
        generatedSQL: action.sql,
        explanation: action.explanation || null,
        generationProgress: { status: "complete" },
        history: [
          {
            id: generateId(),
            naturalLanguage: state.query,
            sql: action.sql,
            explanation: action.explanation,
            timestamp: Date.now(),
          },
          ...state.history.slice(0, 9), // Keep last 10
        ],
      };

    case "CLEAR_GENERATED_SQL":
      return {
        ...state,
        generatedSQL: null,
        explanation: null,
        generationProgress: { status: "idle" },
      };

    case "SET_GENERATION_PROGRESS":
      return {
        ...state,
        generationProgress: {
          ...state.generationProgress,
          ...action.progress,
        },
      };

    case "ADD_TO_HISTORY":
      return {
        ...state,
        history: [action.entry, ...state.history.slice(0, 9)],
      };

    case "CLEAR_HISTORY":
      return {
        ...state,
        history: [],
      };

    case "LOAD_PRESET":
      return {
        ...state,
        schema: action.schema,
        generatedSQL: null,
        query: "",
        generationProgress: { status: "idle" },
      };

    case "RESET":
      return initialState;

    default:
      return state;
  }
}
