import {
  initialState,
  createDefaultTable,
  createDefaultColumn,
  generateId,
  type DataForgeState,
  type DataForgeAction,
} from "./types";

/**
 * Reducer for Data Forge state management.
 * Handles schema building, data generation, and export.
 */
export function dataForgeReducer(state: DataForgeState, action: DataForgeAction): DataForgeState {
  switch (action.type) {
    case "ADD_TABLE":
      return {
        ...state,
        schema: {
          ...state.schema,
          tables: [...state.schema.tables, createDefaultTable()],
        },
        generatedData: null,
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
        generatedData: null,
      };

    case "DELETE_TABLE": {
      const newForeignKeys = state.schema.foreignKeys.filter(
        (fk) =>
          fk.sourceTableId !== action.tableId && fk.targetTableId !== action.tableId
      );
      return {
        ...state,
        schema: {
          tables: state.schema.tables.filter((t) => t.id !== action.tableId),
          foreignKeys: newForeignKeys,
        },
        generatedData: null,
      };
    }

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
        generatedData: null,
      };

    case "ADD_COLUMNS_FROM_TEMPLATE":
      return {
        ...state,
        schema: {
          ...state.schema,
          tables: state.schema.tables.map((t) =>
            t.id === action.tableId
              ? {
                  ...t,
                  columns: [
                    ...t.columns,
                    ...action.columns.map((col) => ({ ...col, id: generateId() })),
                  ],
                }
              : t
          ),
        },
        generatedData: null,
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
        generatedData: null,
      };

    case "DELETE_COLUMN": {
      const newForeignKeys = state.schema.foreignKeys.filter(
        (fk) =>
          !(fk.sourceTableId === action.tableId && fk.sourceColumnId === action.columnId) &&
          !(fk.targetTableId === action.tableId && fk.targetColumnId === action.columnId)
      );
      return {
        ...state,
        schema: {
          tables: state.schema.tables.map((t) =>
            t.id === action.tableId
              ? { ...t, columns: t.columns.filter((c) => c.id !== action.columnId) }
              : t
          ),
          foreignKeys: newForeignKeys,
        },
        generatedData: null,
      };
    }

    case "ADD_FOREIGN_KEY":
      return {
        ...state,
        schema: {
          ...state.schema,
          foreignKeys: [
            ...state.schema.foreignKeys,
            { ...action.foreignKey, id: generateId() },
          ],
        },
        generatedData: null,
      };

    case "DELETE_FOREIGN_KEY":
      return {
        ...state,
        schema: {
          ...state.schema,
          foreignKeys: state.schema.foreignKeys.filter(
            (fk) => fk.id !== action.foreignKeyId
          ),
        },
        generatedData: null,
      };

    case "SET_GENERATED_DATA":
      return {
        ...state,
        generatedData: action.data,
        generationProgress: {
          ...state.generationProgress,
          status: "complete",
        },
      };

    case "CLEAR_GENERATED_DATA":
      return {
        ...state,
        generatedData: null,
        generationProgress: {
          ...state.generationProgress,
          status: "idle",
        },
      };

    case "SET_GENERATION_PROGRESS":
      return {
        ...state,
        generationProgress: {
          ...state.generationProgress,
          ...action.progress,
        },
      };

    case "SET_EXPORT_FORMAT":
      return {
        ...state,
        exportFormat: action.format,
      };

    case "LOAD_PRESET":
      return {
        ...state,
        schema: action.schema,
        generatedData: null,
        generationProgress: {
          ...state.generationProgress,
          status: "idle",
        },
      };

    case "RESET":
      return initialState;

    default:
      return state;
  }
}
