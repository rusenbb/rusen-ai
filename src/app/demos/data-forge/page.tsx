"use client";

import { useReducer, useCallback, useState, useEffect } from "react";
import { useAPI } from "@/hooks";
import { Alert } from "@/components/ui";
import SchemaBuilder from "./components/SchemaBuilder";
import GenerationPanel from "./components/GenerationPanel";
import ExportPanel from "./components/ExportPanel";
import {
  initialState,
  type GeneratedData,
  type TableQuality,
} from "./types";
import { dataForgeReducer } from "./reducers";
import { buildGenerationPrompt, parseGeneratedData, getTableGenerationLevels } from "./utils/prompts";
import { encodeSchemaToUrl, decodeSchemaFromUrl, isSchemaUrlSafe } from "./utils/urlCodec";

const DATA_FORGE_SYSTEM_PROMPT = "You are a JSON data generator. Output ONLY valid JSON, nothing else. No explanations, no markdown, no code blocks.";

export default function DataForgePage() {
  const [state, dispatch] = useReducer(dataForgeReducer, initialState);
  const [selectedModel, setSelectedModel] = useState<string>("auto");
  const { isGenerating, error, rateLimitRemaining, lastModelUsed, generate } = useAPI(selectedModel, {
    useCase: "data-forge",
    defaultStream: false,
    defaultMaxTokens: 8192,
    defaultTemperature: 0.3,
  });

  // URL sharing state
  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "error">("idle");
  const [shareError, setShareError] = useState<string | null>(null);

  // Load schema from URL on mount
  useEffect(() => {
    const hash = window.location.hash.slice(1); // Remove #
    if (hash.startsWith("schema=")) {
      const encoded = hash.slice(7); // Remove "schema="
      const schema = decodeSchemaFromUrl(encoded);
      if (schema) {
        dispatch({ type: "LOAD_PRESET", schema });
      }
    }
  }, []);

  // Share handler
  const handleShare = useCallback(async () => {
    if (state.schema.tables.length === 0) {
      setShareError("Add tables before sharing");
      setShareStatus("error");
      setTimeout(() => {
        setShareStatus("idle");
        setShareError(null);
      }, 3000);
      return;
    }

    try {
      const encoded = encodeSchemaToUrl(state.schema);

      if (!isSchemaUrlSafe(encoded)) {
        setShareError("Schema too large to share via URL");
        setShareStatus("error");
        setTimeout(() => {
          setShareStatus("idle");
          setShareError(null);
        }, 3000);
        return;
      }

      const url = `${window.location.origin}${window.location.pathname}#schema=${encoded}`;

      // Update URL without reload
      window.history.replaceState(null, "", `#schema=${encoded}`);

      // Copy to clipboard
      await navigator.clipboard.writeText(url);

      setShareStatus("copied");
      setShareError(null);
      setTimeout(() => setShareStatus("idle"), 2000);
    } catch (err) {
      setShareError(err instanceof Error ? err.message : "Failed to share");
      setShareStatus("error");
      setTimeout(() => {
        setShareStatus("idle");
        setShareError(null);
      }, 3000);
    }
  }, [state.schema]);

  const handleGenerate = useCallback(async (previewMode: boolean = false) => {
    const previewRowCount = 3;

    dispatch({
      type: "SET_GENERATION_PROGRESS",
      progress: {
        status: "generating",
        tablesCompleted: 0,
        totalTables: state.schema.tables.length,
        error: undefined,
        isPreview: previewMode,
      },
    });

    try {
      // Get tables grouped by dependency level for parallel generation
      const levels = getTableGenerationLevels(state.schema);
      const generatedData: GeneratedData = {};
      const qualityReport: TableQuality[] = [];
      let tablesCompleted = 0;

      // Process each level - tables within a level can run in parallel
      for (const levelTables of levels) {
        // Update progress to show which tables are being generated
        const tableNames = levelTables.map(t => t.name).join(", ");
        dispatch({
          type: "SET_GENERATION_PROGRESS",
          progress: {
            currentTable: levelTables.length > 1 ? `${tableNames} (parallel)` : tableNames,
            tablesCompleted,
          },
        });

        // Generate all tables in this level in parallel
        const results = await Promise.all(
          levelTables.map(async (table) => {
            // Override row count for preview mode
            const tableForGeneration = previewMode
              ? { ...table, rowCount: Math.min(table.rowCount, previewRowCount) }
              : table;

            const prompt = buildGenerationPrompt(tableForGeneration, state.schema, generatedData);
            const response = await generate({
              systemPrompt: DATA_FORGE_SYSTEM_PROMPT,
              userPrompt: prompt,
              jsonMode: true,
            });
            return {
              table,
              result: parseGeneratedData(response.content, tableForGeneration, state.schema, generatedData),
            };
          })
        );

        // Collect results (order doesn't matter within a level)
        for (const { table, result } of results) {
          generatedData[table.name] = result.rows;
          qualityReport.push({
            tableName: table.name,
            quality: result.quality,
            issues: result.issues,
          });
        }

        tablesCompleted += levelTables.length;
      }

      dispatch({ type: "SET_GENERATED_DATA", data: generatedData });
      dispatch({
        type: "SET_GENERATION_PROGRESS",
        progress: { qualityReport, isPreview: previewMode },
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

  const handleGenerateFull = useCallback(() => handleGenerate(false), [handleGenerate]);
  const handleGeneratePreview = useCallback(() => handleGenerate(true), [handleGenerate]);

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
        <Alert variant="error" className="mb-6">
          {error}
        </Alert>
      )}

      {/* Schema Builder */}
      <SchemaBuilder
        schema={state.schema}
        dispatch={dispatch}
        onShare={handleShare}
        shareStatus={shareStatus}
        shareError={shareError}
      />

      {/* Generation Panel */}
      <GenerationPanel
        schema={state.schema}
        progress={state.generationProgress}
        isGenerating={isGenerating}
        rateLimitRemaining={rateLimitRemaining}
        lastModelUsed={lastModelUsed}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        onGenerate={handleGenerateFull}
        onPreview={handleGeneratePreview}
      />

      {/* Quality Warnings */}
      {state.generationProgress.qualityReport && state.generationProgress.qualityReport.some(r => r.quality !== "good") && (
        <Alert variant="warning" title="Data Quality Warning" className="mb-6">
          <p className="mb-3">
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
                  <span className="font-mono">{r.tableName}</span>
                  {r.issues.length > 0 && (
                    <span className="ml-2">— {r.issues.join(", ")}</span>
                  )}
                </div>
              ))}
          </div>
        </Alert>
      )}

      {/* Export Panel */}
      {state.generatedData && (
        <ExportPanel
          data={state.generatedData}
          schema={state.schema}
          isPreview={state.generationProgress.isPreview}
        />
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
