"use client";

import { useState, useEffect } from "react";

interface AIStatusPanelProps {
  isGenerating: boolean;
  rateLimitRemaining: number | null;
  lastModelUsed: string | null;
}

export default function AIStatusPanel({
  isGenerating,
  rateLimitRemaining,
  lastModelUsed,
}: AIStatusPanelProps) {
  const [countdown, setCountdown] = useState<number | null>(null);

  // Start countdown when rate limit hits 0
  useEffect(() => {
    if (rateLimitRemaining === 0 && countdown === null) {
      setCountdown(60);
    } else if (rateLimitRemaining !== null && rateLimitRemaining > 0) {
      setCountdown(null);
    }
  }, [rateLimitRemaining, countdown]);

  // Countdown timer
  useEffect(() => {
    if (countdown === null || countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown(prev => (prev !== null && prev > 0 ? prev - 1 : null));
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  // Extract model name from full model ID (e.g., "google/gemini-2.5-flash" -> "Gemini 2.5 Flash")
  const formatModelName = (modelId: string | null): string => {
    if (!modelId) return "AI";
    const name = modelId.split("/").pop() || modelId;
    return name
      .replace(/-/g, " ")
      .replace(/\b\w/g, c => c.toUpperCase());
  };

  return (
    <div className="mb-6 p-6 border border-neutral-200 dark:border-neutral-800 rounded-lg">
      <h3 className="font-medium mb-4">AI Model</h3>

      {/* Status Display */}
      <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${isGenerating ? "bg-yellow-500 animate-pulse" : "bg-green-500"}`} />
          <div>
            <div className="font-medium text-sm">
              {isGenerating ? "Processing..." : "Ready"}
            </div>
            <div className="text-xs text-neutral-500">
              Using OpenRouter free models (auto-selected)
            </div>
          </div>
        </div>
      </div>

      {/* Status info */}
      <div className="mt-3 text-xs text-neutral-500 space-y-1">
        {lastModelUsed && (
          <p className="text-green-600 dark:text-green-400">
            Last used: {formatModelName(lastModelUsed)}
          </p>
        )}
        {countdown !== null && countdown > 0 ? (
          <p className="text-amber-600 dark:text-amber-400">
            Rate limited · Try again in {countdown}s
          </p>
        ) : rateLimitRemaining !== null ? (
          <p className={rateLimitRemaining <= 5 ? "text-amber-600 dark:text-amber-400" : ""}>
            Rate limit: {rateLimitRemaining} requests remaining this minute
          </p>
        ) : null}
        <p>All models are free via OpenRouter</p>
      </div>
    </div>
  );
}
