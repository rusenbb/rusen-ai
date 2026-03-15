"use client";

import { Fragment, useMemo } from "react";
import type { PromptData, TemperatureKey } from "../types";
import { buildForkMap, getForkKey } from "../lib/branches";
import { logprobsToProbs } from "../lib/softmax";
import TokenChip, { describeToken } from "./TokenChip";
import BranchSection from "./BranchSection";

interface TokenStreamProps {
  data: PromptData;
  temperature: TemperatureKey;
  selectedBranchId: number;
  selectedTokenIndex: number | null;
  expandedForks: string[];
  onTokenSelect: (branchId: number, tokenIndex: number) => void;
  onToggleFork: (forkKey: string) => void;
}

export default function TokenStream({
  data,
  temperature,
  selectedBranchId,
  selectedTokenIndex,
  expandedForks,
  onTokenSelect,
  onToggleFork,
}: TokenStreamProps) {
  const trees = data.trees[temperature];

  const { mainBranch, forkMap } = useMemo(() => {
    const branchList = trees ?? [];
    const main = branchList.find((b) => b.parentId === null) ?? null;
    const map = buildForkMap(branchList);
    return { mainBranch: main, forkMap: map };
  }, [trees]);

  if (!mainBranch) {
    return (
      <div className="text-sm text-neutral-400 dark:text-neutral-500 py-8 text-center">
        No data available for this temperature.
      </div>
    );
  }

  const tempNum = parseFloat(temperature);

  return (
    <div className="font-mono text-sm leading-relaxed">
      {/* System prompt (user instruction) */}
      {data.system && (
        <div className="mb-2 rounded border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
          <span className="font-semibold text-neutral-600 dark:text-neutral-300">User: </span>
          {data.system}
        </div>
      )}

      {/* Prefill tokens (greyed out) */}
      <span className="flex flex-wrap items-baseline gap-0.5">
        {data.prefillTokens.map((pt, i) => {
          const { display, isSpecial } = describeToken(pt.text);
          return (
            <span
              key={`prefill-${i}`}
              className={`inline-block rounded px-1 py-0.5 bg-neutral-50 dark:bg-neutral-900 ${isSpecial ? "italic text-neutral-300 dark:text-neutral-600 text-[11px]" : "text-neutral-400 dark:text-neutral-500"}`}
            >
              {display}
            </span>
          );
        })}
      </span>

      {/* Main branch tokens with inline fork expansion */}
      <div className="mt-1 flex flex-wrap items-baseline gap-0.5">
        {mainBranch.tokens.map((token, idx) => {
          const lps = token.logprobs.map((lp) => lp.logprob);
          const probs = logprobsToProbs(lps, tempNum);
          const sampledIdx = token.logprobs.findIndex(
            (lp) => lp.id === token.id,
          );
          const prob = sampledIdx >= 0 ? probs[sampledIdx] : 0;

          const forkKey = getForkKey(mainBranch.id, idx);
          const childBranches = forkMap.get(forkKey);
          const hasBranches = !!childBranches && childBranches.length > 0;
          const isExpanded = expandedForks.includes(forkKey);

          return (
            <Fragment key={idx}>
              <TokenChip
                text={token.text}
                probability={prob}
                isSelected={
                  selectedBranchId === mainBranch.id &&
                  selectedTokenIndex === idx
                }
                hasBranches={hasBranches}
                onClick={() => {
                  onTokenSelect(mainBranch.id, idx);
                  if (hasBranches) onToggleFork(forkKey);
                }}
              />
              {hasBranches && isExpanded && childBranches && (
                <BranchSection
                  branches={childBranches}
                  forkToken={token}
                  forkMap={forkMap}
                  temperature={tempNum}
                  selectedBranchId={selectedBranchId}
                  selectedTokenIndex={selectedTokenIndex}
                  expandedForks={expandedForks}
                  onTokenSelect={onTokenSelect}
                  onToggleFork={onToggleFork}
                />
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
