"use client";

import { useState, useEffect, useRef, memo } from "react";
import type { Table, DataForgeAction, Column } from "../types";
import { COLUMN_TEMPLATES } from "../types";
import ColumnRow from "./ColumnRow";

interface TableCardProps {
  table: Table;
  dispatch: React.Dispatch<DataForgeAction>;
}

const TableCard = memo(function TableCard({ table, dispatch }: TableCardProps) {
  const [templateDropdownOpen, setTemplateDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    if (!templateDropdownOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setTemplateDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [templateDropdownOpen]);
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

  const addTemplate = (templateColumns: Omit<Column, "id">[]) => {
    // Filter out columns that already exist with same name
    const existingNames = new Set(table.columns.map((c) => c.name.toLowerCase()));
    const columnsToAdd = templateColumns.filter(
      (c) => !existingNames.has(c.name.toLowerCase())
    );

    if (columnsToAdd.length > 0) {
      dispatch({
        type: "ADD_COLUMNS_FROM_TEMPLATE",
        tableId: table.id,
        columns: columnsToAdd,
      });
    }
    setTemplateDropdownOpen(false);
  };

  return (
    <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center justify-between mb-2">
          <input
            type="text"
            value={table.name}
            onChange={(e) => updateTable({ name: e.target.value })}
            placeholder="table_name"
            aria-label="Table name"
            className="font-mono font-medium bg-transparent border-none focus:outline-none focus:ring-0 text-lg"
          />
          <button
            onClick={deleteTable}
            className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition"
            aria-label={`Delete table ${table.name}`}
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
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
        <input
          type="text"
          value={table.definition}
          onChange={(e) => updateTable({ definition: e.target.value })}
          placeholder="Describe this table (e.g., 'Premium SaaS subscribers', 'Product inventory for electronics store')"
          aria-label="Table description"
          className="w-full text-sm text-neutral-600 dark:text-neutral-400 bg-transparent border-none focus:outline-none focus:ring-0 placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
        />
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

        {/* Add column buttons */}
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={addColumn}
            className="flex items-center gap-1.5 px-2 py-1.5 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded transition"
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add column
          </button>

          {/* Template dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setTemplateDropdownOpen(!templateDropdownOpen)}
              aria-expanded={templateDropdownOpen}
              aria-haspopup="true"
              className="flex items-center gap-1 px-2 py-1.5 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded transition"
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
                  d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm12 0a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                />
              </svg>
              Templates
              <svg
                className={`w-3 h-3 transition-transform ${templateDropdownOpen ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {templateDropdownOpen && (
              <div className="absolute left-0 mt-1 w-56 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg z-10">
                {COLUMN_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => addTemplate(template.columns)}
                    className="w-full px-3 py-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 transition first:rounded-t-lg last:rounded-b-lg"
                  >
                    <div className="font-medium text-sm">{template.name}</div>
                    <div className="text-xs text-neutral-500">
                      {template.description}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
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
});

export default TableCard;
