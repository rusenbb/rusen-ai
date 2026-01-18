"use client";

import { useReducer, useCallback, useState } from "react";
import { useAPILLM } from "./hooks/useAPILLM";
import SchemaBuilder from "./components/SchemaBuilder";
import QueryInput from "./components/QueryInput";
import SQLOutput from "./components/SQLOutput";
import {
  initialState,
  createDefaultTable,
  createDefaultColumn,
  generateId,
  PRESET_SCHEMAS,
  type QueryCraftState,
  type QueryCraftAction,
} from "./types";
import { getSystemPrompt, buildUserPrompt } from "./utils/prompts";

function queryCraftReducer(state: QueryCraftState, action: QueryCraftAction): QueryCraftState {
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
        generationProgress: { status: "complete" },
        history: [
          {
            id: generateId(),
            naturalLanguage: state.query,
            sql: action.sql,
            timestamp: Date.now(),
          },
          ...state.history.slice(0, 9), // Keep last 10
        ],
      };

    case "CLEAR_GENERATED_SQL":
      return {
        ...state,
        generatedSQL: null,
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

export default function QueryCraftPage() {
  const [state, dispatch] = useReducer(queryCraftReducer, initialState);
  const [selectedModel, setSelectedModel] = useState<string>("auto");
  const [streamingSQL, setStreamingSQL] = useState<string>("");
  const { isGenerating, error, rateLimitRemaining, lastModelUsed, generate } = useAPILLM(selectedModel);

  // Detect current preset for example queries
  const currentPreset = PRESET_SCHEMAS.find(
    (preset) =>
      preset.schema.tables.length === state.schema.tables.length &&
      preset.schema.tables.every((pt) =>
        state.schema.tables.some((st) => st.name === pt.name)
      )
  )?.name ?? null;

  const handleGenerate = useCallback(async () => {
    if (!state.query.trim() || state.schema.tables.length === 0) return;

    dispatch({
      type: "SET_GENERATION_PROGRESS",
      progress: { status: "generating", error: undefined },
    });
    setStreamingSQL("");

    try {
      const systemPrompt = getSystemPrompt(state.schema.dialect);
      const userPrompt = buildUserPrompt(state.schema, state.query);

      const sql = await generate(systemPrompt, userPrompt, (text) => {
        setStreamingSQL(text);
      });

      dispatch({ type: "SET_GENERATED_SQL", sql });
    } catch (err) {
      dispatch({
        type: "SET_GENERATION_PROGRESS",
        progress: {
          status: "error",
          error: err instanceof Error ? err.message : "Generation failed",
        },
      });
    }
  }, [generate, state.query, state.schema]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-16">
      {/* Header */}
      <h1 className="text-4xl font-bold mb-4">Query Craft</h1>
      <p className="text-neutral-600 dark:text-neutral-400 mb-8 max-w-2xl">
        Describe what data you need in plain English, get SQL queries instantly.
        Define your database schema below, then write natural language questions.
      </p>

      {/* Error display */}
      {(error || state.generationProgress.error) && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
          {error || state.generationProgress.error}
        </div>
      )}

      {/* Schema Builder */}
      <SchemaBuilder schema={state.schema} dispatch={dispatch} />

      {/* Query Input */}
      <QueryInput
        query={state.query}
        onQueryChange={(q) => dispatch({ type: "SET_QUERY", query: q })}
        onSubmit={handleGenerate}
        isGenerating={isGenerating}
        hasSchema={state.schema.tables.length > 0}
        rateLimitRemaining={rateLimitRemaining}
        lastModelUsed={lastModelUsed}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        currentPreset={currentPreset}
      />

      {/* SQL Output */}
      <SQLOutput
        sql={state.generatedSQL}
        isGenerating={isGenerating}
        streamingSQL={streamingSQL}
      />

      {/* Query History */}
      {state.history.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-3">Recent Queries</h2>
          <div className="space-y-2">
            {state.history.slice(0, 5).map((entry) => (
              <button
                key={entry.id}
                onClick={() => {
                  dispatch({ type: "SET_QUERY", query: entry.naturalLanguage });
                  dispatch({ type: "SET_GENERATED_SQL", sql: entry.sql });
                }}
                className="w-full text-left p-3 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition"
              >
                <p className="text-sm font-medium truncate">{entry.naturalLanguage}</p>
                <p className="text-xs text-neutral-500 font-mono truncate mt-1">
                  {entry.sql.substring(0, 80)}...
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* About section */}
      <div className="mt-12 text-sm text-neutral-500">
        <h3 className="font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
          About Query Craft
        </h3>
        <p className="mb-2">
          Query Craft uses Gemini 2.0 Flash via API to translate natural language questions
          into SQL queries. Define your database schema, describe what you want in plain English,
          and get instant, executable SQL.
        </p>
        <p>
          Supports PostgreSQL, MySQL, SQLite, and SQL Server dialects with appropriate syntax adjustments.
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
