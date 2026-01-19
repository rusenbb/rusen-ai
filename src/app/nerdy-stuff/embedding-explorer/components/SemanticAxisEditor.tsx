"use client";

import { useState } from "react";
import { type SemanticAxis, PRESET_AXES } from "../types";

interface SemanticAxisEditorProps {
  axes: SemanticAxis[];
  onAddAxis: (name: string, positiveWords: string[], negativeWords: string[]) => void;
  onRemoveAxis: (id: string) => void;
  isComputing: boolean;
  disabled?: boolean;
}

export default function SemanticAxisEditor({
  axes,
  onAddAxis,
  onRemoveAxis,
  isComputing,
  disabled = false,
}: SemanticAxisEditorProps) {
  const [name, setName] = useState("");
  const [positiveWords, setPositiveWords] = useState("");
  const [negativeWords, setNegativeWords] = useState("");
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !positiveWords.trim() || !negativeWords.trim()) return;

    const positive = positiveWords
      .split(",")
      .map((w) => w.trim())
      .filter((w) => w.length > 0);
    const negative = negativeWords
      .split(",")
      .map((w) => w.trim())
      .filter((w) => w.length > 0);

    if (positive.length === 0 || negative.length === 0) return;

    onAddAxis(name.trim(), positive, negative);
    setName("");
    setPositiveWords("");
    setNegativeWords("");
    setShowForm(false);
  };

  const handleLoadPreset = (preset: (typeof PRESET_AXES)[0]) => {
    // Check if axis with this name already exists
    if (axes.some((a) => a.name.toLowerCase() === preset.name.toLowerCase())) {
      return;
    }
    onAddAxis(preset.name, preset.positiveWords, preset.negativeWords);
  };

  const unusedPresets = PRESET_AXES.filter(
    (p) => !axes.some((a) => a.name.toLowerCase() === p.name.toLowerCase())
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Semantic Axes</h3>
        {isComputing && (
          <span className="text-xs text-amber-600 dark:text-amber-400 animate-pulse">
            Computing...
          </span>
        )}
      </div>

      {/* Existing axes */}
      {axes.length > 0 && (
        <div className="space-y-2">
          {axes.map((axis) => (
            <div
              key={axis.id}
              className="flex items-center justify-between p-2 bg-neutral-50 dark:bg-neutral-900 rounded text-sm"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    axis.axisVector ? "bg-green-500" : "bg-amber-500 animate-pulse"
                  }`}
                  title={axis.axisVector ? "Ready" : "Computing..."}
                />
                <span className="font-medium">{axis.name}</span>
                <span className="text-xs text-neutral-500">
                  ({axis.positiveWords.length}+ / {axis.negativeWords.length}-)
                </span>
              </div>
              <button
                onClick={() => onRemoveAxis(axis.id)}
                className="text-neutral-400 hover:text-red-500 transition-colors"
                disabled={disabled}
                title="Remove axis"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

      {/* Quick presets */}
      {unusedPresets.length > 0 && (
        <div className="space-y-1">
          <span className="text-xs text-neutral-500">Quick add:</span>
          <div className="flex flex-wrap gap-1">
            {unusedPresets.slice(0, 4).map((preset) => (
              <button
                key={preset.name}
                onClick={() => handleLoadPreset(preset)}
                disabled={disabled || isComputing}
                className="px-2 py-1 text-xs bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded transition-colors disabled:opacity-50"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add custom axis form */}
      {showForm ? (
        <form onSubmit={handleSubmit} className="space-y-2 p-2 border border-neutral-200 dark:border-neutral-700 rounded">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Axis name (e.g., Age)"
            className="w-full px-2 py-1 text-sm border border-neutral-200 dark:border-neutral-700 rounded bg-transparent"
            disabled={disabled}
          />
          <div className="space-y-1">
            <label className="text-xs text-neutral-500">Positive pole (comma-separated):</label>
            <input
              type="text"
              value={positiveWords}
              onChange={(e) => setPositiveWords(e.target.value)}
              placeholder="old, elderly, ancient, senior"
              className="w-full px-2 py-1 text-sm border border-neutral-200 dark:border-neutral-700 rounded bg-transparent"
              disabled={disabled}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-neutral-500">Negative pole (comma-separated):</label>
            <input
              type="text"
              value={negativeWords}
              onChange={(e) => setNegativeWords(e.target.value)}
              placeholder="young, youthful, new, fresh"
              className="w-full px-2 py-1 text-sm border border-neutral-200 dark:border-neutral-700 rounded bg-transparent"
              disabled={disabled}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={disabled || !name.trim() || !positiveWords.trim() || !negativeWords.trim()}
              className="flex-1 px-2 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Axis
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-2 py-1 text-sm border border-neutral-200 dark:border-neutral-700 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          disabled={disabled}
          className="w-full px-2 py-1.5 text-sm border border-dashed border-neutral-300 dark:border-neutral-600 rounded hover:border-neutral-400 dark:hover:border-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors disabled:opacity-50"
        >
          + Add Custom Axis
        </button>
      )}

      {axes.length === 0 && (
        <p className="text-xs text-neutral-500">
          Define axes to project embeddings onto interpretable dimensions.
        </p>
      )}
    </div>
  );
}
