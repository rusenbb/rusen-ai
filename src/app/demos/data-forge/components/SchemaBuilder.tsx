"use client";

import type { Schema, DataForgeAction } from "../types";
import { PRESET_SCHEMAS } from "../types";
import TableCard from "./TableCard";
import RelationshipPanel from "./RelationshipPanel";

interface SchemaBuilderProps {
  schema: Schema;
  dispatch: React.Dispatch<DataForgeAction>;
  onShare?: () => void;
  shareStatus?: "idle" | "copied" | "error";
  shareError?: string | null;
}

export default function SchemaBuilder({
  schema,
  dispatch,
  onShare,
  shareStatus = "idle",
  shareError,
}: SchemaBuilderProps) {
  const addTable = () => {
    dispatch({ type: "ADD_TABLE" });
  };

  const loadPreset = (presetSchema: Schema) => {
    dispatch({ type: "LOAD_PRESET", schema: presetSchema });
  };

  const totalRows = schema.tables.reduce((sum, t) => sum + t.rowCount, 0);

  return (
    <div className="mb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Schema</h2>
          {schema.tables.length > 0 && (
            <p className="text-sm text-neutral-500">
              {schema.tables.length} table{schema.tables.length !== 1 ? "s" : ""} &middot;{" "}
              {totalRows} total rows
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {schema.tables.length > 0 && onShare && (
            <button
              onClick={onShare}
              className={`px-4 py-2 border rounded-lg hover:border-neutral-500 transition text-sm font-medium flex items-center gap-2 ${
                shareStatus === "error"
                  ? "border-red-300 dark:border-red-700 text-red-600 dark:text-red-400"
                  : shareStatus === "copied"
                  ? "border-green-300 dark:border-green-700 text-green-600 dark:text-green-400"
                  : "border-neutral-300 dark:border-neutral-700"
              }`}
              title={shareError || "Copy shareable URL to clipboard"}
            >
              {shareStatus === "copied" ? (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Copied!
                </>
              ) : shareStatus === "error" ? (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Error
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                    />
                  </svg>
                  Share
                </>
              )}
            </button>
          )}
          <button
            onClick={addTable}
            className="px-4 py-2 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-lg hover:opacity-80 transition text-sm font-medium"
          >
            + Add Table
          </button>
        </div>
      </div>

      {/* Presets */}
      {schema.tables.length === 0 && (
        <div className="mb-6">
          <p className="text-sm text-neutral-500 mb-2">
            Start with a preset or add tables manually:
          </p>
          <div className="flex gap-2">
            {PRESET_SCHEMAS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => loadPreset(preset.schema)}
                className="px-3 py-1.5 text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg hover:border-neutral-500 transition"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {schema.tables.length === 0 && (
        <div className="border border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg p-8 text-center">
          <div className="text-neutral-400 mb-2">
            <svg
              className="w-12 h-12 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
              />
            </svg>
          </div>
          <p className="text-neutral-500">
            No tables yet. Add a table or use a preset to get started.
          </p>
        </div>
      )}

      {/* Tables grid */}
      {schema.tables.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {schema.tables.map((table) => (
            <TableCard key={table.id} table={table} dispatch={dispatch} />
          ))}
        </div>
      )}

      {/* Relationships */}
      <RelationshipPanel schema={schema} dispatch={dispatch} />
    </div>
  );
}
