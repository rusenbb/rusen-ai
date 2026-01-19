"use client";

import { useState, useEffect } from "react";
import type { FetchProgress } from "../types";
import { getLastDoi, saveLastDoi } from "../utils/storage";

interface DOIInputProps {
  onSubmit: (input: string) => void;
  fetchProgress: FetchProgress;
}

// Example papers for quick testing (mix of arXiv and DOI)
const EXAMPLE_PAPERS = [
  { id: "1706.03762", label: "Attention Is All You Need" },
  { id: "2312.00752", label: "Mamba (arXiv)" },
  { id: "2005.14165", label: "GPT-3 (arXiv)" },
  { id: "10.1001/jama.2020.1585", label: "COVID-19 (JAMA)" },
];

// Validation patterns
const DOI_PATTERN = /^10\.\d{4,}/;
const ARXIV_PATTERN = /^\d{4}\.\d{4,}/;
const ARXIV_URL_PATTERN = /arxiv\.org\/abs\/(\d{4}\.\d{4,})/;

function validateInput(value: string): { valid: boolean; error?: string } {
  const trimmed = value.trim();
  if (!trimmed) return { valid: false };

  // Check for arXiv URL
  const arxivUrlMatch = trimmed.match(ARXIV_URL_PATTERN);
  if (arxivUrlMatch) return { valid: true };

  // Check for DOI format (starts with 10.)
  if (DOI_PATTERN.test(trimmed)) return { valid: true };

  // Check for arXiv ID format (YYMM.NNNNN)
  if (ARXIV_PATTERN.test(trimmed)) return { valid: true };

  return {
    valid: false,
    error: "Invalid format. Expected: 10.xxxx/xxxxx (DOI) or 2301.12345 (arXiv)",
  };
}

export default function DOIInput({ onSubmit, fetchProgress }: DOIInputProps) {
  const [input, setInput] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [lastDoi, setLastDoi] = useState<string | null>(null);
  const isLoading = fetchProgress.status === "fetching";

  // Load last DOI from localStorage on mount
  useEffect(() => {
    const stored = getLastDoi();
    if (stored) {
      setLastDoi(stored);
    }
  }, []);

  const handleInputChange = (value: string) => {
    setInput(value);
    // Clear validation error when user starts typing
    if (validationError) {
      setValidationError(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    const validation = validateInput(input);
    if (!validation.valid) {
      setValidationError(validation.error || "Please enter a valid DOI or arXiv ID");
      return;
    }

    setValidationError(null);
    saveLastDoi(input.trim());
    setLastDoi(input.trim());
    onSubmit(input.trim());
  };

  const handleLoadLast = () => {
    if (lastDoi) {
      setInput(lastDoi);
      setValidationError(null);
    }
  };

  const handleExampleClick = (id: string) => {
    setInput(id);
    setValidationError(null);
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
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="10.1000/xyz123 or 2301.12345 or https://arxiv.org/abs/..."
            disabled={isLoading}
            className={`flex-1 px-4 py-3 border rounded-lg bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 disabled:opacity-50 ${
              validationError
                ? "border-red-400 dark:border-red-600 focus:ring-red-500"
                : "border-neutral-300 dark:border-neutral-700 focus:ring-blue-500"
            }`}
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
        {/* Validation error */}
        {validationError && (
          <p className="mt-2 text-sm text-red-500 dark:text-red-400">{validationError}</p>
        )}
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
          {lastDoi && (
            <button
              onClick={handleLoadLast}
              disabled={isLoading}
              className="px-3 py-1.5 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition disabled:opacity-50"
              title={`Load: ${lastDoi}`}
            >
              Last used
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
