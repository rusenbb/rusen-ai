"use client";

import type { Schema, DataForgeAction } from "../types";
import { PRESET_SCHEMAS } from "../types";
import TableCard from "./TableCard";
import RelationshipPanel from "./RelationshipPanel";

interface SchemaBuilderProps {
  schema: Schema;
  dispatch: React.Dispatch<DataForgeAction>;
}

export default function SchemaBuilder({ schema, dispatch }: SchemaBuilderProps) {
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
        <button
          onClick={addTable}
          className="px-4 py-2 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-lg hover:opacity-80 transition text-sm font-medium"
        >
          + Add Table
        </button>
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
