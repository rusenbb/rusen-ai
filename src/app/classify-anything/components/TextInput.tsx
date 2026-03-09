"use client";

import { Spinner } from "@/components/ui";
import { EXAMPLE_TEXTS } from "../utils/examples";

interface TextInputProps {
  value: string;
  onChange: (text: string) => void;
  onClassify: () => void;
  isClassifying: boolean;
  isModelReady: boolean;
  disabled?: boolean;
}

export default function TextInput({
  value,
  onChange,
  onClassify,
  isClassifying,
  isModelReady,
  disabled = false,
}: TextInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (!isClassifying && isModelReady && value.trim()) {
        onClassify();
      }
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="classify-text-input" className="block text-sm font-medium mb-2">
          Text to Classify
        </label>
        <textarea
          id="classify-text-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter or paste text to classify..."
          disabled={disabled}
          rows={6}
          className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 resize-none"
        />
        <div className="flex justify-between items-center mt-2">
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            {value.length} characters
          </span>
          {value && (
            <button
              onClick={() => onChange("")}
              className="text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Classify button */}
      <button
        onClick={onClassify}
        disabled={disabled || isClassifying || !isModelReady || !value.trim()}
        className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
      >
        {isClassifying ? (
          <>
            <Spinner size="md" color="white" />
            Classifying...
          </>
        ) : !isModelReady ? (
          "Loading model..."
        ) : (
          <>
            Classify
            <span className="text-xs opacity-75">(Cmd+Enter)</span>
          </>
        )}
      </button>

      {/* Example texts */}
      <div>
        <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-2">
          Try an example
        </label>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_TEXTS.map((example) => (
            <button
              key={example.label}
              onClick={() => onChange(example.text)}
              disabled={disabled}
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
