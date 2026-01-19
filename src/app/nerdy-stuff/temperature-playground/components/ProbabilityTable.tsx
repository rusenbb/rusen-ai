"use client";

import { useState } from "react";
import type { TokenProbability } from "../types";

interface ProbabilityTableProps {
  probabilities: TokenProbability[];
  selectedTokenId: number;
}

const ITEMS_PER_PAGE = 10;
const TOTAL_PAGES = 10;

export default function ProbabilityTable({
  probabilities,
  selectedTokenId,
}: ProbabilityTableProps) {
  const [page, setPage] = useState(0);

  // Take top 100 tokens (or all if less)
  const top100 = probabilities.slice(0, ITEMS_PER_PAGE * TOTAL_PAGES);
  const totalPages = Math.ceil(top100.length / ITEMS_PER_PAGE);

  // Get current page items
  const startIdx = page * ITEMS_PER_PAGE;
  const pageItems = top100.slice(startIdx, startIdx + ITEMS_PER_PAGE);

  // Find max probability for scaling bars
  const maxProb = top100.length > 0 ? top100[0].probability : 1;

  // Find which page the selected token is on
  const selectedIdx = top100.findIndex((p) => p.tokenId === selectedTokenId);
  const selectedPage = selectedIdx >= 0 ? Math.floor(selectedIdx / ITEMS_PER_PAGE) : -1;

  if (probabilities.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-neutral-400 text-sm">
        Click a token to see probabilities
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
          Top {top100.length} tokens
        </span>
        {selectedPage >= 0 && selectedPage !== page && (
          <button
            onClick={() => setPage(selectedPage)}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            Go to selected (page {selectedPage + 1})
          </button>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-neutral-500 border-b border-neutral-200 dark:border-neutral-700">
              <th className="text-left py-1 w-8">#</th>
              <th className="text-left py-1">Token</th>
              <th className="text-left py-1 w-24">Probability</th>
              <th className="text-right py-1 w-16">%</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((item, idx) => {
              const rank = startIdx + idx + 1;
              const isSelected = item.tokenId === selectedTokenId;
              const barWidth = (item.probability / maxProb) * 100;
              const displayToken = item.token
                .replace(/\n/g, "↵")
                .replace(/\t/g, "→")
                .replace(/ /g, "␣");

              return (
                <tr
                  key={idx}
                  className={`
                    border-b border-neutral-100 dark:border-neutral-800
                    ${isSelected ? "bg-green-100 dark:bg-green-900/30" : "hover:bg-neutral-50 dark:hover:bg-neutral-800/50"}
                  `}
                >
                  <td className="py-1.5 text-neutral-400 text-xs">{rank}</td>
                  <td className="py-1.5">
                    <code
                      className={`
                        px-1.5 py-0.5 rounded text-xs
                        ${isSelected
                          ? "bg-green-200 dark:bg-green-800 text-green-900 dark:text-green-100 font-bold"
                          : "bg-neutral-100 dark:bg-neutral-800"}
                      `}
                    >
                      {displayToken || "⎵"}
                    </code>
                    {isSelected && (
                      <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                        ← selected
                      </span>
                    )}
                  </td>
                  <td className="py-1.5">
                    <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          isSelected
                            ? "bg-green-500"
                            : item.probability > 0.1
                            ? "bg-blue-500"
                            : item.probability > 0.01
                            ? "bg-purple-500"
                            : "bg-neutral-400"
                        }`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </td>
                  <td className="py-1.5 text-right font-mono text-xs">
                    {item.probability > 0.01
                      ? (item.probability * 100).toFixed(1)
                      : item.probability > 0.001
                      ? (item.probability * 100).toFixed(2)
                      : (item.probability * 100).toFixed(3)}
                    %
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-center gap-1 mt-2 pt-2 border-t border-neutral-200 dark:border-neutral-700">
        <button
          onClick={() => setPage(0)}
          disabled={page === 0}
          className="px-2 py-1 text-xs border border-neutral-300 dark:border-neutral-600 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ««
        </button>
        <button
          onClick={() => setPage(page - 1)}
          disabled={page === 0}
          className="px-2 py-1 text-xs border border-neutral-300 dark:border-neutral-600 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          «
        </button>

        <span className="px-3 text-xs text-neutral-500">
          Page {page + 1} of {totalPages}
        </span>

        <button
          onClick={() => setPage(page + 1)}
          disabled={page >= totalPages - 1}
          className="px-2 py-1 text-xs border border-neutral-300 dark:border-neutral-600 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          »
        </button>
        <button
          onClick={() => setPage(totalPages - 1)}
          disabled={page >= totalPages - 1}
          className="px-2 py-1 text-xs border border-neutral-300 dark:border-neutral-600 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          »»
        </button>
      </div>
    </div>
  );
}
