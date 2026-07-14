import { describe, expect, it } from "vitest";

import {
  buildDecisionTree,
  buildRandomForest,
  createOutdoorPlayDataset,
  entropyFromCounts,
  findSplitCandidates,
  forestProbability,
  forestVotes,
  predictTree,
  traceTree,
  type WeatherProfile,
} from "./tree";

const sunnyHighWeak: WeatherProfile = {
  outlook: "sunny",
  humidity: "high",
  wind: "weak",
};

describe("categorical decision tree utilities", () => {
  it("computes entropy for pure and balanced categorical outcomes", () => {
    expect(entropyFromCounts([4, 0])).toBe(0);
    expect(entropyFromCounts([4, 4])).toBeCloseTo(1, 8);
  });

  it("ranks categorical root questions by exact information gain", () => {
    const candidates = findSplitCandidates(createOutdoorPlayDataset());
    const [best] = candidates;

    expect(best.feature).toBe("outlook");
    expect(best.parentEntropy).toBeCloseTo(0.9402859587, 8);
    expect(best.weightedEntropy).toBeCloseTo(0.6935361389, 8);
    expect(best.gain).toBeCloseTo(0.2467498198, 8);
    expect(best.groups.map((group) => [group.value, group.counts])).toEqual([
      ["sunny", [3, 2]],
      ["overcast", [0, 4]],
      ["rain", [2, 3]],
    ]);
    expect(candidates.map((candidate) => candidate.feature)).toEqual(["outlook", "humidity", "wind"]);
  });

  it("builds multiway categorical branches and traces a weather profile", () => {
    const tree = buildDecisionTree(createOutdoorPlayDataset(), 2);
    const trace = traceTree(tree, sunnyHighWeak);

    expect(tree.kind).toBe("split");
    if (tree.kind !== "split") throw new Error("expected a root split");
    expect(tree.feature).toBe("outlook");
    expect(tree.branches.sunny?.kind).toBe("split");
    expect(predictTree(tree, sunnyHighWeak)).toBe("stay");
    expect(trace.prediction).toBe("stay");
    expect(trace.steps.map((step) => step.feature)).toEqual(["outlook", "humidity"]);
    expect(trace.steps.every((step) => !step.usedFallback)).toBe(true);
  });

  it("makes a deterministic bootstrap forest with a visible consensus", () => {
    const rows = createOutdoorPlayDataset();
    const first = buildRandomForest(rows, 11, 2, 2);
    const second = buildRandomForest(rows, 11, 2, 2);
    const firstVotes = forestVotes(first, sunnyHighWeak);

    expect(first.featuresPerSplit).toBe(2);
    expect(first.samplesPerTree).toHaveLength(11);
    expect(firstVotes).toHaveLength(11);
    expect(firstVotes).toEqual(forestVotes(second, sunnyHighWeak));
    expect(new Set(firstVotes).size).toBeGreaterThan(1);
    expect(forestProbability(first, sunnyHighWeak)).toBeLessThan(0.5);
  });
});
