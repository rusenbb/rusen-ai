"use client";

import { useReducer, useCallback, useState } from "react";
import { useAPILLM } from "./hooks/useAPILLM";
import SchemaBuilder from "./components/SchemaBuilder";
import GenerationPanel from "./components/GenerationPanel";
import ExportPanel from "./components/ExportPanel";
import {
  initialState,
  createDefaultTable,
  createDefaultColumn,
  generateId,
  type DataForgeState,
  type DataForgeAction,
  type GeneratedData,
  type TableQuality,
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
  const [selectedModel, setSelectedModel] = useState<string>("auto");
  const { isGenerating, error, rateLimitRemaining, lastModelUsed, generate } = useAPILLM(selectedModel);

  const handleGenerate = useCallback(async () => {
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
      const qualityReport: TableQuality[] = [];

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
        const result = parseGeneratedData(response, table, state.schema, generatedData);

        generatedData[table.name] = result.rows;
        qualityReport.push({
          tableName: table.name,
          quality: result.quality,
          issues: result.issues,
        });
      }

      dispatch({ type: "SET_GENERATED_DATA", data: generatedData });
      dispatch({
        type: "SET_GENERATION_PROGRESS",
        progress: { qualityReport },
      });
    } catch (err) {
      dispatch({
        type: "SET_GENERATION_PROGRESS",
        progress: {
          status: "error",
          error: err instanceof Error ? err.message : "Generation failed",
        },
      });
    }
  }, [generate, state.schema]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      {/* Header */}
      <h1 className="text-4xl font-bold mb-4">Data Forge</h1>
      <p className="text-neutral-600 dark:text-neutral-400 mb-8 max-w-2xl">
        Define your database schema visually, then let AI generate realistic fake data for
        testing. Powered by Gemini 2.0 Flash for intelligent, contextual data generation.
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
        isGenerating={isGenerating}
        rateLimitRemaining={rateLimitRemaining}
        lastModelUsed={lastModelUsed}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        onGenerate={handleGenerate}
      />

      {/* Quality Warnings */}
      {state.generationProgress.qualityReport && state.generationProgress.qualityReport.some(r => r.quality !== "good") && (
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <h3 className="font-medium text-yellow-800 dark:text-yellow-300 mb-2">
            Data Quality Warning
          </h3>
          <p className="text-sm text-yellow-700 dark:text-yellow-400 mb-3">
            Some data may have been generated with fallback values due to model response parsing.
          </p>
          <div className="space-y-2">
            {state.generationProgress.qualityReport
              .filter(r => r.quality !== "good")
              .map(r => (
                <div key={r.tableName} className="text-sm">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mr-2 ${
                    r.quality === "fallback"
                      ? "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300"
                      : "bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300"
                  }`}>
                    {r.quality === "fallback" ? "Fallback" : "Partial"}
                  </span>
                  <span className="font-mono text-yellow-800 dark:text-yellow-300">{r.tableName}</span>
                  {r.issues.length > 0 && (
                    <span className="text-yellow-600 dark:text-yellow-500 ml-2">
                      — {r.issues.join(", ")}
                    </span>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

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
          Data Forge uses Gemini 2.0 Flash via API to generate contextually realistic fake data
          based on your schema definitions. Define tables with columns and types, set up foreign
          key relationships, and generate data that respects your constraints.
        </p>
        <p>
          Export to SQL, JSON, or CSV for use in your development and testing workflows.
          {rateLimitRemaining !== null && (
            <span className="ml-2 text-neutral-400">
              ({rateLimitRemaining} API requests remaining this minute)
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
