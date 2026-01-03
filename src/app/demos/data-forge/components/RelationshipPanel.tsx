"use client";

import { useState } from "react";
import type { Schema, DataForgeAction, ForeignKey } from "../types";

interface RelationshipPanelProps {
  schema: Schema;
  dispatch: React.Dispatch<DataForgeAction>;
}

export default function RelationshipPanel({ schema, dispatch }: RelationshipPanelProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [sourceTableId, setSourceTableId] = useState("");
  const [sourceColumnId, setSourceColumnId] = useState("");
  const [targetTableId, setTargetTableId] = useState("");
  const [targetColumnId, setTargetColumnId] = useState("");

  const sourceTable = schema.tables.find((t) => t.id === sourceTableId);
  const targetTable = schema.tables.find((t) => t.id === targetTableId);

  const resetForm = () => {
    setSourceTableId("");
    setSourceColumnId("");
    setTargetTableId("");
    setTargetColumnId("");
    setIsAdding(false);
  };

  const addForeignKey = () => {
    if (!sourceTableId || !sourceColumnId || !targetTableId || !targetColumnId) return;

    dispatch({
      type: "ADD_FOREIGN_KEY",
      foreignKey: {
        sourceTableId,
        sourceColumnId,
        targetTableId,
        targetColumnId,
      },
    });

    resetForm();
  };

  const deleteForeignKey = (id: string) => {
    dispatch({
      type: "DELETE_FOREIGN_KEY",
      foreignKeyId: id,
    });
  };

  const getTableName = (tableId: string) =>
    schema.tables.find((t) => t.id === tableId)?.name || "?";

  const getColumnName = (tableId: string, columnId: string) =>
    schema.tables
      .find((t) => t.id === tableId)
      ?.columns.find((c) => c.id === columnId)?.name || "?";

  if (schema.tables.length < 2) return null;

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
          Relationships
        </h3>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition"
          >
            + Add relationship
          </button>
        )}
      </div>

      {/* Existing relationships */}
      {schema.foreignKeys.length > 0 && (
        <div className="space-y-2 mb-4">
          {schema.foreignKeys.map((fk) => (
            <div
              key={fk.id}
              className="flex items-center justify-between px-3 py-2 bg-neutral-50 dark:bg-neutral-900 rounded-lg text-sm font-mono"
            >
              <span>
                <span className="text-blue-600 dark:text-blue-400">
                  {getTableName(fk.sourceTableId)}
                </span>
                .{getColumnName(fk.sourceTableId, fk.sourceColumnId)}
                <span className="mx-2 text-neutral-400">→</span>
                <span className="text-green-600 dark:text-green-400">
                  {getTableName(fk.targetTableId)}
                </span>
                .{getColumnName(fk.targetTableId, fk.targetColumnId)}
              </span>
              <button
                onClick={() => deleteForeignKey(fk.id)}
                className="p-1 text-neutral-400 hover:text-red-500 transition"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add relationship form */}
      {isAdding && (
        <div className="p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-900">
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Source */}
            <div>
              <label className="block text-xs text-neutral-500 mb-1">From (source)</label>
              <select
                value={sourceTableId}
                onChange={(e) => {
                  setSourceTableId(e.target.value);
                  setSourceColumnId("");
                }}
                className="w-full px-2 py-1.5 text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded"
              >
                <option value="">Select table...</option>
                {schema.tables.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              {sourceTable && (
                <select
                  value={sourceColumnId}
                  onChange={(e) => setSourceColumnId(e.target.value)}
                  className="w-full mt-2 px-2 py-1.5 text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded"
                >
                  <option value="">Select column...</option>
                  {sourceTable.columns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Target */}
            <div>
              <label className="block text-xs text-neutral-500 mb-1">To (target)</label>
              <select
                value={targetTableId}
                onChange={(e) => {
                  setTargetTableId(e.target.value);
                  setTargetColumnId("");
                }}
                className="w-full px-2 py-1.5 text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded"
              >
                <option value="">Select table...</option>
                {schema.tables
                  .filter((t) => t.id !== sourceTableId)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
              </select>
              {targetTable && (
                <select
                  value={targetColumnId}
                  onChange={(e) => setTargetColumnId(e.target.value)}
                  className="w-full mt-2 px-2 py-1.5 text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded"
                >
                  <option value="">Select column...</option>
                  {targetTable.columns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={addForeignKey}
              disabled={!sourceColumnId || !targetColumnId}
              className="px-3 py-1.5 text-sm bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded hover:opacity-80 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>
            <button
              onClick={resetForm}
              className="px-3 py-1.5 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
