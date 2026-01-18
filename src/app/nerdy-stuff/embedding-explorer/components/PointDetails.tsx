"use client";

import type { TextItem } from "../types";
import { getCategoryColor } from "../types";

interface PointDetailsProps {
  item: TextItem | null;
  onClose: () => void;
  onDelete: (id: string) => void;
}

export default function PointDetails({ item, onClose, onDelete }: PointDetailsProps) {
  if (!item) return null;

  return (
    <div className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: getCategoryColor(item.category) }}
          />
          <span className="text-sm font-medium">{item.category}</span>
        </div>
        <button
          onClick={onClose}
          className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      <p className="text-sm mb-3 whitespace-pre-wrap">{item.text}</p>

      {item.x !== null && item.y !== null && (
        <div className="text-xs text-neutral-500 mb-3">
          Position: ({item.x.toFixed(3)}, {item.y.toFixed(3)})
        </div>
      )}

      {item.embedding && (
        <div className="text-xs text-neutral-500 mb-3">
          Embedding: {item.embedding.length} dimensions
        </div>
      )}

      <button
        onClick={() => onDelete(item.id)}
        className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
      >
        Remove this text
      </button>
    </div>
  );
}
