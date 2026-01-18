"use client";

import { useState, useCallback } from "react";
import type { SearchResult } from "../types";
import { getCategoryColor } from "../types";

interface SearchPanelProps {
  searchResults: SearchResult[];
  onSearch: (query: string) => void;
  onClearSearch: () => void;
  onSelectResult: (id: string) => void;
  disabled?: boolean;
}

export default function SearchPanel({
  searchResults,
  onSearch,
  onClearSearch,
  onSelectResult,
  disabled = false,
}: SearchPanelProps) {
  const [query, setQuery] = useState("");

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim() && !disabled) {
        onSearch(query.trim());
      }
    },
    [query, disabled, onSearch]
  );

  const handleClear = useCallback(() => {
    setQuery("");
    onClearSearch();
  }, [onClearSearch]);

  return (
    <div className="space-y-3">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for similar texts..."
          className="flex-1 px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          disabled={disabled}
        />
        <button
          type="submit"
          disabled={!query.trim() || disabled}
          className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition"
        >
          Search
        </button>
        {searchResults.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-sm transition"
          >
            Clear
          </button>
        )}
      </form>

      {searchResults.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-neutral-500 mb-2">
            Top {searchResults.length} most similar:
          </div>
          {searchResults.map((result, index) => (
            <button
              key={result.item.id}
              onClick={() => onSelectResult(result.item.id)}
              className="w-full p-2 text-left border border-neutral-200 dark:border-neutral-800 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition"
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: getCategoryColor(result.item.category) }}
                >
                  {index + 1}
                </span>
                <span className="flex-1 text-sm truncate">{result.item.text}</span>
                <span className="text-xs text-neutral-500 tabular-nums">
                  {(result.similarity * 100).toFixed(1)}%
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
