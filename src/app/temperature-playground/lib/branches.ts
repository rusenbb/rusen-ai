import type { BranchData } from "../types";

export function getForkKey(branchId: number, tokenIndex: number): string {
  return `${branchId}-${tokenIndex}`;
}

export function buildForkMap(branches: BranchData[]): Map<string, BranchData[]> {
  const map = new Map<string, BranchData[]>();

  for (const branch of branches) {
    if (branch.parentId === null) continue;

    const key = getForkKey(branch.parentId, branch.forkIndex);
    const existing = map.get(key) ?? [];
    existing.push(branch);
    map.set(key, existing);
  }

  return map;
}

export function buildBranchPreviewText(
  prefill: string,
  branches: BranchData[],
  selectedBranchId: number,
  selectedTokenIndex: number | null,
): string | null {
  if (selectedTokenIndex === null) {
    return null;
  }

  const branchById = new Map(branches.map((branch) => [branch.id, branch]));
  const selectedBranch = branchById.get(selectedBranchId);
  if (!selectedBranch) {
    return null;
  }

  const lineage: BranchData[] = [];
  let branch: BranchData | undefined = selectedBranch;

  while (branch) {
    lineage.unshift(branch);
    branch =
      branch.parentId === null ? undefined : branchById.get(branch.parentId);
  }

  let text = prefill;

  for (let i = 0; i < lineage.length; i++) {
    const current = lineage[i];
    const next = lineage[i + 1];

    if (i > 0 && current.forkTokenText) {
      text += current.forkTokenText;
    }

    const endExclusive = next ? next.forkIndex : selectedTokenIndex + 1;
    text += current.tokens
      .slice(0, endExclusive)
      .map((token) => token.text)
      .join("");
  }

  return text;
}
