"use client";

import { Fragment } from "react";
import type { BranchData, TokenData } from "../types";
import { logprobsToProbs } from "../lib/softmax";
import { getForkKey } from "../lib/branches";
import TokenChip, { describeToken } from "./TokenChip";

interface BranchSectionProps {
  branches: BranchData[];
  forkToken: TokenData;
  forkMap: Map<string, BranchData[]>;
  temperature: number;
  selectedBranchId: number;
  selectedTokenIndex: number | null;
  expandedForks: string[];
  onTokenSelect: (branchId: number, tokenIndex: number) => void;
  onToggleFork: (forkKey: string) => void;
  maxTokens?: number;
}

export default function BranchSection({
  branches,
  forkToken,
  forkMap,
  temperature,
  selectedBranchId,
  selectedTokenIndex,
  expandedForks,
  onTokenSelect,
  onToggleFork,
  maxTokens = 30,
}: BranchSectionProps) {
  if (branches.length === 0) return null;

  const winnerDesc = describeToken(forkToken.text);

  return (
    <div className="mt-1.5 mb-2 ml-2 basis-full border-l-2 border-blue-300 pl-3 dark:border-blue-700">
      <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-1">
        Instead of &ldquo;{winnerDesc.display}&rdquo;
      </div>
      {branches.map((branch) => {
        const truncated = branch.tokens.length > maxTokens;
        const displayTokens = truncated
          ? branch.tokens.slice(0, maxTokens)
          : branch.tokens;

        const forkDesc = branch.forkTokenText
          ? describeToken(branch.forkTokenText)
          : null;

        return (
          <div key={branch.id} className="flex flex-wrap items-baseline gap-0.5 mb-1">
            <span className="text-neutral-400 dark:text-neutral-500 text-xs mr-0.5">
              &rarr;
            </span>
            {forkDesc && (
              <span className={`inline-block rounded px-1 py-0.5 font-mono text-sm leading-snug bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold ${forkDesc.isSpecial ? "italic text-[11px]" : ""}`}>
                {forkDesc.display}
              </span>
            )}
            {displayTokens.map((token, idx) => {
              const lps = token.logprobs.map((lp) => lp.logprob);
              const probs = logprobsToProbs(lps, temperature);
              const sampledIdx = token.logprobs.findIndex(
                (lp) => lp.id === token.id,
              );
              const prob = sampledIdx >= 0 ? probs[sampledIdx] : 0;

              const forkKey = getForkKey(branch.id, idx);
              const childBranches = forkMap.get(forkKey);
              const hasBranches = !!childBranches && childBranches.length > 0;
              const isExpanded = expandedForks.includes(forkKey);

              return (
                <Fragment key={`${branch.id}-${idx}`}>
                  <TokenChip
                    text={token.text}
                    probability={prob}
                    isSelected={
                      selectedBranchId === branch.id &&
                      selectedTokenIndex === idx
                    }
                    hasBranches={hasBranches}
                    onClick={() => {
                      onTokenSelect(branch.id, idx);
                      if (hasBranches) onToggleFork(forkKey);
                    }}
                  />
                  {hasBranches && isExpanded && childBranches && (
                    <BranchSection
                      branches={childBranches}
                      forkToken={token}
                      forkMap={forkMap}
                      temperature={temperature}
                      selectedBranchId={selectedBranchId}
                      selectedTokenIndex={selectedTokenIndex}
                      expandedForks={expandedForks}
                      onTokenSelect={onTokenSelect}
                      onToggleFork={onToggleFork}
                      maxTokens={maxTokens}
                    />
                  )}
                </Fragment>
              );
            })}
            {truncated && (
              <span className="text-xs text-neutral-400 dark:text-neutral-500">
                &hellip;
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
