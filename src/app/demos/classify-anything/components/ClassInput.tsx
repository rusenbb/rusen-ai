"use client";

import { useState } from "react";
import { PRESET_LABELS } from "../utils/examples";

interface ClassInputProps {
  labels: string[];
  onAddLabel: (label: string) => void;
  onRemoveLabel: (index: number) => void;
  onSetLabels: (labels: string[]) => void;
  disabled?: boolean;
}

export default function ClassInput({
  labels,
  onAddLabel,
  onRemoveLabel,
  onSetLabels,
  disabled = false,
}: ClassInputProps) {
  const [inputValue, setInputValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim().toLowerCase();
    if (trimmed && !labels.includes(trimmed)) {
      onAddLabel(trimmed);
      setInputValue("");
    }
  };

  const handlePresetClick = (presetKey: string) => {
    onSetLabels(PRESET_LABELS[presetKey]);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">
          Classification Labels
        </label>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">
          Define the classes you want to classify text into
        </p>

        {/* Current labels as chips */}
        <div className="flex flex-wrap gap-2 mb-3 min-h-[40px]">
          {labels.map((label, index) => (
            <span
              key={`${label}-${index}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-full text-sm"
            >
              {label}
              <button
                onClick={() => onRemoveLabel(index)}
                disabled={disabled || labels.length <= 2}
                className="ml-1 hover:text-indigo-900 dark:hover:text-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
                title={labels.length <= 2 ? "Minimum 2 labels required" : "Remove label"}
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
            </span>
          ))}
        </div>

        {/* Add new label */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Add a label..."
            disabled={disabled}
            className="flex-1 px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={disabled || !inputValue.trim()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Add
          </button>
        </form>
      </div>

      {/* Preset buttons */}
      <div>
        <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-2">
          Quick presets
        </label>
        <div className="flex flex-wrap gap-2">
          {Object.keys(PRESET_LABELS).map((presetKey) => (
            <button
              key={presetKey}
              onClick={() => handlePresetClick(presetKey)}
              disabled={disabled}
              className="px-3 py-1.5 text-xs bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition capitalize disabled:opacity-50"
            >
              {presetKey}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
