"use client";

import { useReducer, useCallback, useState } from "react";
import { useWebLLM } from "./hooks/useWebLLM";
import SchemaBuilder from "./components/SchemaBuilder";
import GenerationPanel from "./components/GenerationPanel";
import ExportPanel from "./components/ExportPanel";
import {
  initialState,
  createDefaultTable,
  createDefaultColumn,
  generateId,
  DEFAULT_MODEL_ID,
  type DataForgeState,
  type DataForgeAction,
  type GeneratedData,
} from "./types";
import { buildGenerationPrompt, parseGeneratedData, getTableGenerationOrder } from "./utils/prompts";

function dataForgeReducer(state: DataForgeState, action: DataForgeAction): DataForgeState {
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

export default function DataForgePage() {
  const [state, dispatch] = useReducer(dataForgeReducer, initialState);
  const [selectedModelId, setSelectedModelId] = useState(DEFAULT_MODEL_ID);
  const { isReady, isLoading, loadProgress, error, isSupported, loadedModelId, loadModel, generate } =
    useWebLLM();

  const handleLoadModel = useCallback(() => {
    loadModel(selectedModelId);
  }, [loadModel, selectedModelId]);

  const handleGenerate = useCallback(async () => {
    if (!isReady || loadedModelId !== selectedModelId) {
      await loadModel(selectedModelId);
    }

    dispatch({
      type: "SET_GENERATION_PROGRESS",
      progress: {
        status: "generating",
        tablesCompleted: 0,
        totalTables: state.schema.tables.length,
        error: undefined,
      },
    });

    try {
      const orderedTables = getTableGenerationOrder(state.schema);
      const generatedData: GeneratedData = {};

      for (let i = 0; i < orderedTables.length; i++) {
        const table = orderedTables[i];

        dispatch({
          type: "SET_GENERATION_PROGRESS",
          progress: {
            currentTable: table.name,
            tablesCompleted: i,
          },
        });

        const prompt = buildGenerationPrompt(table, state.schema, generatedData);
        const response = await generate(prompt);
        const rows = parseGeneratedData(response, table, state.schema, generatedData);

        generatedData[table.name] = rows;
      }

      dispatch({ type: "SET_GENERATED_DATA", data: generatedData });
    } catch (err) {
      dispatch({
        type: "SET_GENERATION_PROGRESS",
        progress: {
          status: "error",
          error: err instanceof Error ? err.message : "Generation failed",
        },
      });
    }
  }, [isReady, loadedModelId, selectedModelId, loadModel, generate, state.schema]);

  // WebGPU not supported error
  if (isSupported === false) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-4">Data Forge</h1>
        <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <h2 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">
            WebGPU Not Supported
          </h2>
          <p className="text-red-600 dark:text-red-400 mb-4">
            Data Forge requires WebGPU to run the AI model in your browser.
          </p>
          <div className="text-sm text-red-500 dark:text-red-400">
            <p className="font-medium mb-1">To use Data Forge, try:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Chrome 113+ or Edge 113+ (recommended)</li>
              <li>Enable WebGPU in browser flags if disabled</li>
              <li>Make sure your device has a compatible GPU</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      {/* Header */}
      <h1 className="text-4xl font-bold mb-4">Data Forge</h1>
      <p className="text-neutral-600 dark:text-neutral-400 mb-8 max-w-2xl">
        Define your database schema visually, then let AI generate realistic fake data for
        testing. Everything runs in your browser &mdash; no data leaves your device.
      </p>

      {/* Error display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Schema Builder */}
      <SchemaBuilder schema={state.schema} dispatch={dispatch} />

      {/* Generation Panel */}
      <GenerationPanel
        schema={state.schema}
        progress={state.generationProgress}
        isModelReady={isReady}
        isModelLoading={isLoading}
        modelLoadProgress={loadProgress}
        loadedModelId={loadedModelId}
        selectedModelId={selectedModelId}
        onModelSelect={setSelectedModelId}
        onGenerate={handleGenerate}
        onLoadModel={handleLoadModel}
      />

      {/* Export Panel */}
      {state.generatedData && (
        <ExportPanel data={state.generatedData} schema={state.schema} />
      )}

      {/* About section */}
      <div className="mt-12 text-sm text-neutral-500">
        <h3 className="font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
          About Data Forge
        </h3>
        <p className="mb-2">
          Data Forge uses Qwen3 AI models running entirely in your browser via WebLLM.
          Choose from three model sizes based on your device capabilities. Models are
          downloaded once and cached locally for future use.
        </p>
        <p>
          Define tables with columns and types, set up foreign key relationships, and generate
          contextually realistic data that respects your constraints. Export to SQL, JSON, or
          CSV for use in your development and testing workflows.
        </p>
      </div>
    </div>
  );
}
