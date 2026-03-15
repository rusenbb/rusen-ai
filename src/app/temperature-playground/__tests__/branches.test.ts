import { describe, expect, it } from "vitest";
import {
  buildBranchPreviewText,
  buildForkMap,
  getForkKey,
} from "../lib/branches";
import type { BranchData } from "../types";

const branches: BranchData[] = [
  {
    id: 0,
    parentId: null,
    forkIndex: 0,
    tokens: [
      { id: 1, text: "A", logprobs: [] },
      { id: 2, text: "B", logprobs: [] },
      { id: 3, text: "C", logprobs: [] },
    ],
  },
  {
    id: 1,
    parentId: 0,
    forkIndex: 1,
    forkTokenId: 20,
    forkTokenText: "X",
    tokens: [
      { id: 4, text: "Y", logprobs: [] },
      { id: 5, text: "Z", logprobs: [] },
    ],
  },
  {
    id: 2,
    parentId: 1,
    forkIndex: 1,
    forkTokenId: 30,
    forkTokenText: "Q",
    tokens: [
      { id: 6, text: "R", logprobs: [] },
      { id: 7, text: "S", logprobs: [] },
    ],
  },
];

describe("temperature playground branch helpers", () => {
  it("keys child branches by parent branch and token index", () => {
    const forkMap = buildForkMap(branches);

    expect(forkMap.get(getForkKey(0, 1))?.map((branch) => branch.id)).toEqual([1]);
    expect(forkMap.get(getForkKey(1, 1))?.map((branch) => branch.id)).toEqual([2]);
  });

  it("builds preview text for a main-branch selection", () => {
    const preview = buildBranchPreviewText(">", branches, 0, 2);

    expect(preview).toBe(">ABC");
  });

  it("builds preview text for nested branch selections without overrun", () => {
    const preview = buildBranchPreviewText(">", branches, 2, 1);

    expect(preview).toBe(">AXYQRS");
  });
});
