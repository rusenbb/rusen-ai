"use client";

import { useState, useCallback } from "react";
import { CATEGORY_COLORS } from "../types";

interface TextInputProps {
  categories: string[];
  onAddText: (text: string, category: string) => void;
  onAddCategory: (category: string) => void;
  disabled?: boolean;
}

export default function TextInput({
  categories,
  onAddText,
  onAddCategory,
  disabled = false,
}: TextInputProps) {
  const [text, setText] = useState("");
  const [category, setCategory] = useState(categories[0] || "default");
  const [newCategory, setNewCategory] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (text.trim() && !disabled) {
        onAddText(text.trim(), category);
        setText("");
      }
    },
    [text, category, disabled, onAddText]
  );

  const handleAddCategory = useCallback(() => {
    if (newCategory.trim()) {
      onAddCategory(newCategory.trim().toLowerCase());
      setCategory(newCategory.trim().toLowerCase());
      setNewCategory("");
      setShowNewCategory(false);
    }
  }, [newCategory, onAddCategory]);

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium mb-1">Add Text</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter a sentence or phrase to embed..."
          className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
          rows={2}
          disabled={disabled}
        />
      </div>

      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Category</label>
          <div className="flex gap-2">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="flex-1 px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={disabled}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowNewCategory(!showNewCategory)}
              className="px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-sm transition"
              disabled={disabled}
            >
              +
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={!text.trim() || disabled}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition"
        >
          Add
        </button>
      </div>

      {showNewCategory && (
        <div className="flex gap-2">
          <input
            type="text"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="New category name..."
            className="flex-1 px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={disabled}
          />
          <button
            type="button"
            onClick={handleAddCategory}
            disabled={!newCategory.trim() || disabled}
            className="px-4 py-2 bg-neutral-600 text-white rounded-lg hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition"
          >
            Create
          </button>
        </div>
      )}

      {/* Category legend */}
      <div className="flex flex-wrap gap-2 pt-2">
        {categories.map((cat) => (
          <span
            key={cat}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded"
            style={{
              backgroundColor:
                (CATEGORY_COLORS[cat.toLowerCase()] || CATEGORY_COLORS.default) + "20",
              color: CATEGORY_COLORS[cat.toLowerCase()] || CATEGORY_COLORS.default,
            }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor:
                  CATEGORY_COLORS[cat.toLowerCase()] || CATEGORY_COLORS.default,
              }}
            />
            {cat}
          </span>
        ))}
      </div>
    </form>
  );
}
