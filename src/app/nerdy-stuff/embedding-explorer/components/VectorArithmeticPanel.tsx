"use client";

import { useState } from "react";
import { type VectorArithmetic } from "../types";
import { CLASSIC_ANALOGIES } from "../utils/vocabulary";

interface VectorArithmeticPanelProps {
  arithmetic: VectorArithmetic | null;
  isComputing: boolean;
  onCompute: (a: string, b: string, c: string) => void;
  onClear: () => void;
  disabled?: boolean;
}

export default function VectorArithmeticPanel({
  arithmetic,
  isComputing,
  onCompute,
  onClear,
  disabled = false,
}: VectorArithmeticPanelProps) {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [c, setC] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!a.trim() || !b.trim() || !c.trim()) return;
    onCompute(a.trim(), b.trim(), c.trim());
  };

  const handleLoadExample = (example: (typeof CLASSIC_ANALOGIES)[0]) => {
    setA(example.a);
    setB(example.b);
    setC(example.c);
  };

  const handleClear = () => {
    setA("");
    setB("");
    setC("");
    onClear();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Vector Arithmetic</h3>
        {isComputing && (
          <span className="text-xs text-amber-600 dark:text-amber-400 animate-pulse">
            Computing...
          </span>
        )}
      </div>

      <p className="text-xs text-neutral-500">
        Explore semantic relationships: A - B + C = ?
      </p>

      {/* Example analogies */}
      <div className="space-y-1">
        <span className="text-xs text-neutral-500">Try an example:</span>
        <div className="flex flex-wrap gap-1">
          {CLASSIC_ANALOGIES.slice(0, 4).map((example, i) => (
            <button
              key={i}
              onClick={() => handleLoadExample(example)}
              disabled={disabled || isComputing}
              className="px-2 py-1 text-xs bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded transition-colors disabled:opacity-50"
              title={`${example.a} - ${example.b} + ${example.c} = ${example.expected}`}
            >
              {example.a} - {example.b} + {example.c}
            </button>
          ))}
        </div>
      </div>

      {/* Input form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={a}
            onChange={(e) => setA(e.target.value)}
            placeholder="king"
            disabled={disabled || isComputing}
            className="flex-1 px-2 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 rounded bg-transparent"
          />
          <span className="text-neutral-400">-</span>
          <input
            type="text"
            value={b}
            onChange={(e) => setB(e.target.value)}
            placeholder="man"
            disabled={disabled || isComputing}
            className="flex-1 px-2 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 rounded bg-transparent"
          />
          <span className="text-neutral-400">+</span>
          <input
            type="text"
            value={c}
            onChange={(e) => setC(e.target.value)}
            placeholder="woman"
            disabled={disabled || isComputing}
            className="flex-1 px-2 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 rounded bg-transparent"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={disabled || isComputing || !a.trim() || !b.trim() || !c.trim()}
            className="flex-1 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isComputing ? "Computing..." : "Compute"}
          </button>
          {(arithmetic || a || b || c) && (
            <button
              type="button"
              onClick={handleClear}
              disabled={disabled || isComputing}
              className="px-3 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              Clear
            </button>
          )}
        </div>
      </form>

      {/* Results */}
      {arithmetic?.nearestNeighbors && arithmetic.nearestNeighbors.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
          <div className="text-xs text-neutral-500">
            <span className="font-medium">{arithmetic.operandA}</span> -{" "}
            <span className="font-medium">{arithmetic.operandB}</span> +{" "}
            <span className="font-medium">{arithmetic.operandC}</span> ≈
          </div>
          <div className="space-y-1">
            {arithmetic.nearestNeighbors.slice(0, 5).map((neighbor, i) => (
              <div
                key={i}
                className={`flex items-center justify-between px-2 py-1 rounded text-sm ${
                  i === 0
                    ? "bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-medium"
                    : "bg-neutral-50 dark:bg-neutral-900"
                }`}
              >
                <span>
                  {i + 1}. {neighbor.text}
                </span>
                <span className="text-xs text-neutral-500">
                  {(neighbor.similarity * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
