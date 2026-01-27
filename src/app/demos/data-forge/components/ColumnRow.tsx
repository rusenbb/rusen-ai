"use client";

import { memo } from "react";
import type { Column, ColumnType, DataForgeAction } from "../types";
import { COLUMN_TYPES } from "../types";

interface ColumnRowProps {
  column: Column;
  tableId: string;
  dispatch: React.Dispatch<DataForgeAction>;
  canDelete: boolean;
}

const ColumnRow = memo(function ColumnRow({ column, tableId, dispatch, canDelete }: ColumnRowProps) {
  const updateColumn = (updates: Partial<Column>) => {
    dispatch({
      type: "UPDATE_COLUMN",
      tableId,
      columnId: column.id,
      updates,
    });
  };

  const deleteColumn = () => {
    dispatch({
      type: "DELETE_COLUMN",
      tableId,
      columnId: column.id,
    });
  };

  return (
    <div className="flex items-center gap-2 py-1.5 group">
      {/* Column name */}
      <input
        type="text"
        value={column.name}
        onChange={(e) => updateColumn({ name: e.target.value })}
        placeholder="column_name"
        aria-label="Column name"
        className="flex-1 min-w-0 px-2 py-1 text-sm font-mono bg-transparent border border-neutral-200 dark:border-neutral-700 rounded focus:outline-none focus:ring-1 focus:ring-neutral-400"
      />

      {/* Type dropdown */}
      <select
        value={column.type}
        onChange={(e) => updateColumn({ type: e.target.value as ColumnType })}
        aria-label="Column type"
        className="px-2 py-1 text-sm bg-transparent border border-neutral-200 dark:border-neutral-700 rounded focus:outline-none focus:ring-1 focus:ring-neutral-400 cursor-pointer"
      >
        {COLUMN_TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>

      {/* Primary key toggle */}
      <button
        onClick={() => updateColumn({ isPrimaryKey: !column.isPrimaryKey })}
        className={`px-2 py-1 text-xs font-mono rounded transition ${
          column.isPrimaryKey
            ? "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200"
            : "bg-neutral-100 dark:bg-neutral-800 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
        }`}
        aria-label={column.isPrimaryKey ? "Remove primary key" : "Set as primary key"}
        aria-pressed={column.isPrimaryKey}
      >
        PK
      </button>

      {/* Nullable toggle */}
      <button
        onClick={() => updateColumn({ nullable: !column.nullable })}
        className={`px-2 py-1 text-xs font-mono rounded transition ${
          column.nullable
            ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
            : "bg-neutral-100 dark:bg-neutral-800 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
        }`}
        aria-label={column.nullable ? "Set as not nullable" : "Set as nullable"}
        aria-pressed={column.nullable}
      >
        NULL
      </button>

      {/* Delete button */}
      <button
        onClick={deleteColumn}
        disabled={!canDelete}
        className={`p-1 rounded transition ${
          canDelete
            ? "text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
            : "text-neutral-200 dark:text-neutral-700 cursor-not-allowed"
        }`}
        aria-label={canDelete ? `Delete column ${column.name}` : "Cannot delete last column"}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
});

export default ColumnRow;
