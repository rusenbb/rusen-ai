"use client";

import { useState } from "react";
import type { FetchProgress } from "../types";

interface DOIInputProps {
  onSubmit: (input: string) => void;
  fetchProgress: FetchProgress;
}

// Example papers for quick testing
const EXAMPLE_PAPERS = [
  { id: "10.1038/nature14539", label: "Deep Learning (Nature)" },
  { id: "2312.00752", label: "Mamba (arXiv)" },
  { id: "10.1001/jama.2020.1585", label: "COVID-19 (JAMA)" },
  { id: "1706.03762", label: "Attention Is All You Need" },
];

export default function DOIInput({ onSubmit, fetchProgress }: DOIInputProps) {
  const [input, setInput] = useState("");
  const isLoading = fetchProgress.status === "fetching";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSubmit(input.trim());
    }
  };

  const handleExampleClick = (id: string) => {
    setInput(id);
    onSubmit(id);
  };

  return (
    <div className="mb-8">
      <form onSubmit={handleSubmit} className="mb-4">
        <label className="block text-sm font-medium mb-2">
          Enter DOI or arXiv ID
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="10.1000/xyz123 or 2301.12345 or https://arxiv.org/abs/..."
            disabled={isLoading}
            className="flex-1 px-4 py-3 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className={`px-6 py-3 rounded-lg font-medium transition ${
              !isLoading && input.trim()
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-neutral-200 dark:bg-neutral-700 text-neutral-400 cursor-not-allowed"
            }`}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Fetching
              </span>
            ) : (
              "Fetch Paper"
            )}
          </button>
        </div>
      </form>

      {/* Fetch progress */}
      {isLoading && fetchProgress.currentStep && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>{fetchProgress.currentStep}</span>
          </div>
          {fetchProgress.stepsCompleted.length > 0 && (
            <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
              Completed: {fetchProgress.stepsCompleted.join(" → ")}
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {fetchProgress.status === "error" && fetchProgress.error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
          {fetchProgress.error}
        </div>
      )}

      <div className="text-sm text-neutral-500">
        <p className="mb-2">Try an example:</p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_PAPERS.map((example) => (
            <button
              key={example.id}
              onClick={() => handleExampleClick(example.id)}
              disabled={isLoading}
              className="px-3 py-1.5 text-xs bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition disabled:opacity-50"
            >
              {example.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
