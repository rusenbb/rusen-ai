"use client";

import { VOCABULARY_COUNT } from "../utils/vocabulary";

interface VocabularyPanelProps {
  vocabularyLoaded: boolean;
  vocabularyCount: number;
  isLoading: boolean;
  progress: number;
  onLoadVocabulary: () => void;
  onClearVocabulary: () => void;
  disabled?: boolean;
}

export default function VocabularyPanel({
  vocabularyLoaded,
  vocabularyCount,
  isLoading,
  progress,
  onLoadVocabulary,
  onClearVocabulary,
  disabled = false,
}: VocabularyPanelProps) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
        Vocabulary
      </h4>

      {!vocabularyLoaded ? (
        <button
          onClick={onLoadVocabulary}
          disabled={disabled}
          className="w-full px-3 py-2 text-sm border border-dashed border-neutral-300 dark:border-neutral-600 rounded hover:border-neutral-400 dark:hover:border-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors disabled:opacity-50"
        >
          <div className="flex flex-col items-center gap-1">
            <span>Load {VOCABULARY_COUNT.toLocaleString()} common words</span>
            <span className="text-xs text-neutral-500">
              Explore semantic space with a rich vocabulary
            </span>
          </div>
        </button>
      ) : (
        <div className="space-y-2">
          {isLoading ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span>Embedding words...</span>
                <span className="text-neutral-500">{progress}%</span>
              </div>
              <div className="h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="font-medium">{vocabularyCount.toLocaleString()}</span>{" "}
                <span className="text-neutral-500">words loaded</span>
              </div>
              <button
                onClick={onClearVocabulary}
                disabled={disabled}
                className="text-xs text-red-600 hover:text-red-700 dark:text-red-400"
              >
                Clear
              </button>
            </div>
          )}

          <p className="text-xs text-neutral-500">
            Words appear as smaller points in the visualization.
          </p>
        </div>
      )}
    </div>
  );
}
