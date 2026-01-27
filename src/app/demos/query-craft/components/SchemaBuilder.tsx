"use client";

import { useState, memo } from "react";
import type { Schema, QueryCraftAction, Table, Column, SQLDialect } from "../types";
import { PRESET_SCHEMAS, SQL_DIALECTS, COLUMN_TYPES, createDefaultColumn } from "../types";
import { buildSchemaContext } from "../utils/prompts";

interface SchemaBuilderProps {
  schema: Schema;
  dispatch: React.Dispatch<QueryCraftAction>;
  onPresetLoad?: () => void;
}

export default function SchemaBuilder({ schema, dispatch, onPresetLoad }: SchemaBuilderProps) {
  const [ddlCopied, setDdlCopied] = useState(false);

  const addTable = () => {
    dispatch({ type: "ADD_TABLE" });
  };

  const loadPreset = (presetSchema: Schema) => {
    dispatch({ type: "LOAD_PRESET", schema: presetSchema });
    onPresetLoad?.();
  };

  const setDialect = (dialect: SQLDialect) => {
    dispatch({ type: "SET_DIALECT", dialect });
  };

  const copyDDL = async () => {
    const ddl = buildSchemaContext(schema);
    try {
      await navigator.clipboard.writeText(ddl);
      setDdlCopied(true);
      setTimeout(() => setDdlCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = ddl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setDdlCopied(true);
      setTimeout(() => setDdlCopied(false), 2000);
    }
  };

  return (
    <div className="mb-8">
      {/* Header with dialect selector */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Database Schema</h2>
          <p className="text-sm text-neutral-500">
            {schema.tables.length > 0
              ? `${schema.tables.length} table${schema.tables.length !== 1 ? "s" : ""}`
              : "Define your tables or use a preset"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={schema.dialect}
            onChange={(e) => setDialect(e.target.value as SQLDialect)}
            aria-label="SQL dialect"
            className="px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {SQL_DIALECTS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
          {schema.tables.length > 0 && (
            <button
              onClick={copyDDL}
              className="px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition flex items-center gap-1.5"
            >
              {ddlCopied ? (
                <>
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy DDL
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
          <p className="text-sm text-neutral-500 mb-2">Quick start with a preset schema:</p>
          <div className="flex gap-2 flex-wrap">
            {PRESET_SCHEMAS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => loadPreset(preset.schema)}
                className="px-3 py-1.5 text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg hover:border-neutral-500 dark:hover:border-neutral-500 transition"
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
            No tables defined. Add a table or use a preset to get started.
          </p>
        </div>
      )}

      {/* Tables */}
      {schema.tables.length > 0 && (
        <div className="space-y-4">
          {schema.tables.map((table) => (
            <TableCard
              key={table.id}
              table={table}
              schema={schema}
              dispatch={dispatch}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface TableCardProps {
  table: Table;
  schema: Schema;
  dispatch: React.Dispatch<QueryCraftAction>;
}

const TableCard = memo(function TableCard({ table, schema, dispatch }: TableCardProps) {
  const updateTable = (updates: Partial<Table>) => {
    dispatch({ type: "UPDATE_TABLE", tableId: table.id, updates });
  };

  const deleteTable = () => {
    dispatch({ type: "DELETE_TABLE", tableId: table.id });
  };

  const addColumn = () => {
    dispatch({ type: "ADD_COLUMN", tableId: table.id });
  };

  const updateColumn = (columnId: string, updates: Partial<Column>) => {
    dispatch({ type: "UPDATE_COLUMN", tableId: table.id, columnId, updates });
  };

  const deleteColumn = (columnId: string) => {
    dispatch({ type: "DELETE_COLUMN", tableId: table.id, columnId });
  };

  return (
    <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden">
      {/* Table header */}
      <div className="bg-neutral-50 dark:bg-neutral-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <input
            type="text"
            value={table.name}
            onChange={(e) => updateTable({ name: e.target.value })}
            placeholder="table_name"
            aria-label="Table name"
            className="font-mono text-sm font-medium bg-transparent border-none focus:outline-none focus:ring-0 w-32"
          />
          <input
            type="text"
            value={table.description}
            onChange={(e) => updateTable({ description: e.target.value })}
            placeholder="Description (optional)"
            aria-label="Table description"
            className="text-sm text-neutral-500 bg-transparent border-none focus:outline-none focus:ring-0 flex-1"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={addColumn}
            className="px-2 py-1 text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition"
          >
            + Column
          </button>
          <button
            onClick={deleteTable}
            className="p-1 text-neutral-400 hover:text-red-500 transition"
            aria-label={`Delete table ${table.name}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Columns */}
      <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
        {table.columns.map((column) => (
          <ColumnRow
            key={column.id}
            column={column}
            schema={schema}
            currentTableId={table.id}
            onUpdate={(updates) => updateColumn(column.id, updates)}
            onDelete={() => deleteColumn(column.id)}
          />
        ))}
      </div>
    </div>
  );
});

interface ColumnRowProps {
  column: Column;
  schema: Schema;
  currentTableId: string;
  onUpdate: (updates: Partial<Column>) => void;
  onDelete: () => void;
}

const ColumnRow = memo(function ColumnRow({ column, schema, currentTableId, onUpdate, onDelete }: ColumnRowProps) {
  // Get other tables for FK reference
  const otherTables = schema.tables.filter((t) => t.id !== currentTableId);

  return (
    <div className="px-4 py-2 flex items-center gap-2 text-sm">
      {/* Column name */}
      <input
        type="text"
        value={column.name}
        onChange={(e) => onUpdate({ name: e.target.value })}
        placeholder="column_name"
        aria-label="Column name"
        className="font-mono w-28 bg-transparent border border-neutral-200 dark:border-neutral-700 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent"
      />

      {/* Type */}
      <select
        value={column.type}
        onChange={(e) => onUpdate({ type: e.target.value as Column["type"] })}
        aria-label="Column type"
        className="w-32 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent"
      >
        {COLUMN_TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>

      {/* PK checkbox */}
      <label className="flex items-center gap-1 text-xs text-neutral-500 cursor-pointer">
        <input
          type="checkbox"
          checked={column.isPrimaryKey}
          onChange={(e) => onUpdate({ isPrimaryKey: e.target.checked })}
          className="w-3.5 h-3.5 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
        />
        PK
      </label>

      {/* FK checkbox and reference */}
      <label className="flex items-center gap-1 text-xs text-neutral-500 cursor-pointer">
        <input
          type="checkbox"
          checked={column.isForeignKey}
          onChange={(e) =>
            onUpdate({
              isForeignKey: e.target.checked,
              referencesTable: e.target.checked ? undefined : undefined,
              referencesColumn: e.target.checked ? undefined : undefined,
            })
          }
          className="w-3.5 h-3.5 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
        />
        FK
      </label>

      {/* FK reference selector */}
      {column.isForeignKey && (
        <select
          value={column.referencesTable && column.referencesColumn
            ? `${column.referencesTable}.${column.referencesColumn}`
            : ""
          }
          onChange={(e) => {
            if (e.target.value) {
              const [table, col] = e.target.value.split(".");
              onUpdate({ referencesTable: table, referencesColumn: col });
            } else {
              onUpdate({ referencesTable: undefined, referencesColumn: undefined });
            }
          }}
          aria-label="Foreign key reference"
          className="w-36 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Select reference...</option>
          {otherTables.map((t) =>
            t.columns
              .filter((c) => c.isPrimaryKey)
              .map((c) => (
                <option key={`${t.name}.${c.name}`} value={`${t.name}.${c.name}`}>
                  {t.name}.{c.name}
                </option>
              ))
          )}
        </select>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Delete button */}
      <button
        onClick={onDelete}
        className="p-1 text-neutral-400 hover:text-red-500 transition opacity-50 hover:opacity-100"
        aria-label={`Delete column ${column.name}`}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
});
