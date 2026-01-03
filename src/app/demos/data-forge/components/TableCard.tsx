"use client";

import type { Table, DataForgeAction } from "../types";
import ColumnRow from "./ColumnRow";

interface TableCardProps {
  table: Table;
  dispatch: React.Dispatch<DataForgeAction>;
}

export default function TableCard({ table, dispatch }: TableCardProps) {
  const updateTable = (updates: Partial<Table>) => {
    dispatch({
      type: "UPDATE_TABLE",
      tableId: table.id,
      updates,
    });
  };

  const deleteTable = () => {
    dispatch({
      type: "DELETE_TABLE",
      tableId: table.id,
    });
  };

  const addColumn = () => {
    dispatch({
      type: "ADD_COLUMN",
      tableId: table.id,
    });
  };

  return (
    <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <input
          type="text"
          value={table.name}
          onChange={(e) => updateTable({ name: e.target.value })}
          placeholder="table_name"
          className="font-mono font-medium bg-transparent border-none focus:outline-none focus:ring-0 text-lg"
        />
        <button
          onClick={deleteTable}
          className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition"
          title="Delete table"
        >
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
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>

      {/* Columns */}
      <div className="p-4 space-y-1">
        {table.columns.map((column) => (
          <ColumnRow
            key={column.id}
            column={column}
            tableId={table.id}
            dispatch={dispatch}
            canDelete={table.columns.length > 1}
          />
        ))}

        {/* Add column button */}
        <button
          onClick={addColumn}
          className="flex items-center gap-1.5 w-full px-2 py-1.5 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded transition mt-2"
        >
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
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add column
        </button>
      </div>

      {/* Row count */}
      <div className="flex items-center gap-2 px-4 py-3 bg-neutral-50 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800">
        <label className="text-sm text-neutral-500">Rows:</label>
        <input
          type="number"
          value={table.rowCount}
          onChange={(e) =>
            updateTable({ rowCount: Math.max(1, Math.min(100, parseInt(e.target.value) || 1)) })
          }
          min={1}
          max={100}
          className="w-16 px-2 py-1 text-sm font-mono bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded focus:outline-none focus:ring-1 focus:ring-neutral-400"
        />
        {table.rowCount > 50 && (
          <span className="text-xs text-yellow-600 dark:text-yellow-400">
            Large counts may be slow
          </span>
        )}
      </div>
    </div>
  );
}
