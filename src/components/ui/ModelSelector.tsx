"use client";

/**
 * Model selector dropdown component.
 * Replaces duplicated model selection UI across all demos.
 */

import { useState, useEffect, useRef } from "react";
import { AVAILABLE_MODELS, TIMEOUTS, type ModelOption } from "@/lib/config";

interface ModelSelectorProps {
  /** Currently selected model ID */
  selectedModel: string;
  /** Callback when model selection changes */
  onModelChange: (modelId: string) => void;
  /** Whether the selector should be disabled */
  disabled?: boolean;
  /** Optional custom model list (defaults to AVAILABLE_MODELS) */
  models?: ModelOption[];
  /** Show descriptions in dropdown */
  showDescriptions?: boolean;
  /** Rate limit remaining (shows indicator when low) */
  rateLimitRemaining?: number | null;
  /** Last model that was actually used (for "Used: X" indicator) */
  lastModelUsed?: string | null;
  /** Compact mode for inline usage */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Model selector dropdown with consistent styling.
 *
 * @example
 * ```tsx
 * <ModelSelector
 *   selectedModel={model}
 *   onModelChange={setModel}
 *   rateLimitRemaining={rateLimit}
 * />
 * ```
 */
export function ModelSelector({
  selectedModel,
  onModelChange,
  disabled = false,
  models = AVAILABLE_MODELS,
  showDescriptions = true,
  rateLimitRemaining,
  lastModelUsed,
  compact = false,
  className = "",
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentModel = models.find((m) => m.id === selectedModel) || models[0];
  const usedModel = lastModelUsed ? models.find((m) => m.id === lastModelUsed) : null;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Start countdown when rate limit hits 0
  useEffect(() => {
    if (rateLimitRemaining === 0 && countdown === null) {
      setCountdown(TIMEOUTS.rateLimitCountdown);
    } else if (rateLimitRemaining != null && rateLimitRemaining > 0) {
      setCountdown(null);
    }
  }, [rateLimitRemaining, countdown]);

  // Countdown timer
  useEffect(() => {
    if (countdown === null || countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => (prev !== null && prev > 0 ? prev - 1 : null));
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  // Compact mode uses a simple select
  if (compact) {
    return (
      <select
        value={selectedModel}
        onChange={(e) => onModelChange(e.target.value)}
        disabled={disabled}
        className={`px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        aria-label="Select AI model"
      >
        {models.map((model) => (
          <option key={model.id} value={model.id}>
            {model.name}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Selector Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full p-4 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-left transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Select AI model. Currently selected: ${currentModel.name}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                disabled ? "bg-yellow-500 animate-pulse" : "bg-green-500"
              }`}
            />
            <div>
              <div className="font-medium text-sm">{currentModel.name}</div>
              {showDescriptions && currentModel.description && (
                <div className="text-xs text-neutral-500">{currentModel.description}</div>
              )}
            </div>
          </div>
          <svg
            className={`w-5 h-5 text-neutral-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div
          className="absolute z-10 w-full mt-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg overflow-hidden"
          role="listbox"
        >
          {models.map((model) => (
            <button
              key={model.id}
              onClick={() => {
                onModelChange(model.id);
                setIsOpen(false);
              }}
              className={`w-full p-3 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 transition focus:outline-none focus:bg-neutral-50 dark:focus:bg-neutral-800 ${
                selectedModel === model.id ? "bg-blue-50 dark:bg-blue-900/20" : ""
              }`}
              role="option"
              aria-selected={selectedModel === model.id}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-2 h-2 rounded-full ${
                    selectedModel === model.id ? "bg-blue-500" : "bg-neutral-300 dark:bg-neutral-600"
                  }`}
                />
                <div>
                  <div className="font-medium text-sm">{model.name}</div>
                  {showDescriptions && model.description && (
                    <div className="text-xs text-neutral-500">{model.description}</div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Status indicators */}
      <div className="mt-2 text-xs text-neutral-500 space-y-1">
        {usedModel && (
          <p className="text-green-600 dark:text-green-400">Last used: {usedModel.name}</p>
        )}
        {countdown != null && countdown > 0 ? (
          <p className="text-amber-600 dark:text-amber-400">
            Rate limited · Try again in {countdown}s
          </p>
        ) : rateLimitRemaining != null ? (
          <p className={rateLimitRemaining <= 5 ? "text-amber-600 dark:text-amber-400" : ""}>
            {rateLimitRemaining} requests remaining this minute
          </p>
        ) : null}
      </div>
    </div>
  );
}
