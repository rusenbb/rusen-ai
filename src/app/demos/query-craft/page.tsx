"use client";

import { useReducer, useCallback, useState, useEffect } from "react";
import { useAPI } from "@/hooks";
import { Alert } from "@/components/ui";
import SchemaBuilder from "./components/SchemaBuilder";
import QueryInput from "./components/QueryInput";
import SQLOutput from "./components/SQLOutput";
import {
  initialState,
  PRESET_SCHEMAS,
  type QueryCraftState,
  type Schema,
} from "./types";
import { queryCraftReducer } from "./reducers";
import { getSystemPrompt, buildUserPrompt } from "./utils/prompts";

const SCHEMA_STORAGE_KEY = "query-craft-schema";

// URL encoding/decoding for shareable links
function encodeShareableState(schema: Schema, query: string): string {
  try {
    const data = JSON.stringify({ schema, query });
    return btoa(encodeURIComponent(data));
  } catch {
    return "";
  }
}

function decodeShareableState(hash: string): { schema: Schema; query: string } | null {
  try {
    const data = decodeURIComponent(atob(hash));
    return JSON.parse(data);
  } catch {
    return null;
  }
}

// Helper for relative timestamps
function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// Load initial state, checking localStorage for saved schema
function getInitialState(): QueryCraftState {
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem(SCHEMA_STORAGE_KEY);
      if (saved) {
        const schema = JSON.parse(saved) as Schema;
        if (schema.tables && schema.tables.length > 0) {
          return { ...initialState, schema };
        }
      }
    } catch {
      // Ignore parse errors
    }
  }
  return initialState;
}

export default function QueryCraftPage() {
  const [state, dispatch] = useReducer(queryCraftReducer, initialState, getInitialState);
  const [selectedModel, setSelectedModel] = useState<string>("auto");
  const [streamingSQL, setStreamingSQL] = useState<string>("");
  const [autoFocusKey, setAutoFocusKey] = useState(0);
  const [includeExplanation, setIncludeExplanation] = useState(false);
  const { isGenerating, error, rateLimitRemaining, lastModelUsed, generate } = useAPI(selectedModel, {
    useCase: "query-craft",
    defaultStream: true,
    defaultMaxTokens: 4096,
    defaultTemperature: 0.2,
  });

  // Persist schema to localStorage when it changes
  useEffect(() => {
    if (state.schema.tables.length > 0) {
      localStorage.setItem(SCHEMA_STORAGE_KEY, JSON.stringify(state.schema));
    } else {
      localStorage.removeItem(SCHEMA_STORAGE_KEY);
    }
  }, [state.schema]);

  // Load from URL hash on mount (takes precedence over localStorage)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.slice(1);
      if (hash) {
        const decoded = decodeShareableState(hash);
        if (decoded && decoded.schema.tables.length > 0) {
          dispatch({ type: "LOAD_PRESET", schema: decoded.schema });
          if (decoded.query) {
            dispatch({ type: "SET_QUERY", query: decoded.query });
          }
          // Clear the hash after loading
          window.history.replaceState(null, "", window.location.pathname);
        }
      }
    }
  }, []);

  // Generate shareable URL
  const getShareableURL = useCallback(() => {
    const hash = encodeShareableState(state.schema, state.query);
    return `${window.location.origin}${window.location.pathname}#${hash}`;
  }, [state.schema, state.query]);

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
      const systemPrompt = getSystemPrompt(state.schema.dialect, includeExplanation);
      const userPrompt = buildUserPrompt(state.schema, state.query);

      const result = await generate({
        systemPrompt,
        userPrompt,
        onStream: (text) => setStreamingSQL(text),
        jsonMode: includeExplanation,
      });

      dispatch({ type: "SET_GENERATED_SQL", sql: result.sql || result.content, explanation: result.explanation });
    } catch (err) {
      dispatch({
        type: "SET_GENERATION_PROGRESS",
        progress: {
          status: "error",
          error: err instanceof Error ? err.message : "Generation failed",
        },
      });
    }
  }, [generate, state.query, state.schema, includeExplanation]);

  // Handle example click - generates directly with the example query
  const handleExampleClick = useCallback(
    async (exampleQuery: string) => {
      if (!exampleQuery.trim() || state.schema.tables.length === 0) return;

      dispatch({
        type: "SET_GENERATION_PROGRESS",
        progress: { status: "generating", error: undefined },
      });
      setStreamingSQL("");

      try {
        const systemPrompt = getSystemPrompt(state.schema.dialect, includeExplanation);
        const userPrompt = buildUserPrompt(state.schema, exampleQuery);

        const result = await generate({
          systemPrompt,
          userPrompt,
          onStream: (text) => setStreamingSQL(text),
          jsonMode: includeExplanation,
        });

        // Dispatch with the example query to update history correctly
        dispatch({ type: "SET_QUERY", query: exampleQuery });
        dispatch({ type: "SET_GENERATED_SQL", sql: result.sql || result.content, explanation: result.explanation });
      } catch (err) {
        dispatch({
          type: "SET_GENERATION_PROGRESS",
          progress: {
            status: "error",
            error: err instanceof Error ? err.message : "Generation failed",
          },
        });
      }
    },
    [generate, state.schema, includeExplanation]
  );

  // Handle "New query" click - clears output and focuses textarea
  const handleNewQuery = useCallback(() => {
    dispatch({ type: "CLEAR_GENERATED_SQL" });
    dispatch({ type: "SET_QUERY", query: "" });
    setAutoFocusKey((k) => k + 1);
  }, []);

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
        <Alert variant="error" className="mb-6">
          {error || state.generationProgress.error}
        </Alert>
      )}

      {/* Schema Builder */}
      <SchemaBuilder
        schema={state.schema}
        dispatch={dispatch}
        onPresetLoad={() => setAutoFocusKey((k) => k + 1)}
      />

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
        autoFocusKey={autoFocusKey}
        onExampleClick={handleExampleClick}
        includeExplanation={includeExplanation}
        onIncludeExplanationChange={setIncludeExplanation}
      />

      {/* SQL Output */}
      <SQLOutput
        sql={state.generatedSQL}
        explanation={state.explanation}
        isGenerating={isGenerating}
        streamingSQL={streamingSQL}
        onNewQuery={handleNewQuery}
        getShareableURL={state.schema.tables.length > 0 ? getShareableURL : undefined}
      />

      {/* Query History */}
      {state.history.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Recent Queries</h2>
            <button
              onClick={() => dispatch({ type: "CLEAR_HISTORY" })}
              className="text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition"
            >
              Clear all
            </button>
          </div>
          <div className="space-y-2">
            {state.history.slice(0, 5).map((entry) => {
              const isActive = entry.naturalLanguage === state.query;
              return (
                <button
                  key={entry.id}
                  onClick={() => {
                    dispatch({ type: "SET_QUERY", query: entry.naturalLanguage });
                    dispatch({ type: "SET_GENERATED_SQL", sql: entry.sql, explanation: entry.explanation });
                  }}
                  className={`w-full text-left p-3 border rounded-lg transition ${
                    isActive
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate">{entry.naturalLanguage}</p>
                    <span className="text-xs text-neutral-400 shrink-0">{timeAgo(entry.timestamp)}</span>
                  </div>
                  <p className="text-xs text-neutral-500 font-mono truncate mt-1">
                    {entry.sql.substring(0, 80)}...
                  </p>
                </button>
              );
            })}
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
