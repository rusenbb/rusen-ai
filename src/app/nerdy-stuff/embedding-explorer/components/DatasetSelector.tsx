"use client";

import { DATASETS } from "../types";

interface DatasetSelectorProps {
  onLoadDataset: (name: string) => void;
  disabled?: boolean;
}

export default function DatasetSelector({ onLoadDataset, disabled = false }: DatasetSelectorProps) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2">Quick Start Datasets</label>
      <div className="grid grid-cols-2 gap-2">
        {DATASETS.map((dataset) => (
          <button
            key={dataset.name}
            onClick={() => onLoadDataset(dataset.name)}
            disabled={disabled}
            className="p-3 text-left border border-neutral-200 dark:border-neutral-800 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 disabled:opacity-50 disabled:cursor-not-allowed transition group"
          >
            <div className="font-medium text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
              {dataset.name}
            </div>
            <div className="text-xs text-neutral-500 mt-0.5">{dataset.description}</div>
            <div className="text-xs text-neutral-400 mt-1">{dataset.items.length} items</div>
          </button>
        ))}
      </div>
    </div>
  );
}
