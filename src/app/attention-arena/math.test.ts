import { describe, expect, it } from "vitest";

import { MEMORY_CARDS, computeAttentionLookup, encodeAttributes, softmax } from "./math";

describe("transparent attention lookup", () => {
  it("encodes visible attributes as a tiny query/key vector", () => {
    expect(encodeAttributes({ color: "red", shape: "circle" })).toEqual([1, 0, 1, 0]);
    expect(encodeAttributes({ color: "blue", shape: "square" })).toEqual([0, 1, 0, 1]);
  });

  it("scores the exact attribute match above partial and missing matches", () => {
    const lookup = computeAttentionLookup({ color: "red", shape: "circle" }, 1);

    expect(lookup.scores).toEqual([2, 1, 1, 0]);
  });

  it("normalizes weights and forms the output from weighted values", () => {
    const lookup = computeAttentionLookup({ color: "blue", shape: "circle" }, 1.5);
    const reconstructed = lookup.weights.reduce(
      (sum, weight, index) => sum + weight * MEMORY_CARDS[index].value,
      0,
    );

    expect(lookup.weights.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 12);
    expect(lookup.output).toBeCloseTo(reconstructed, 12);
  });

  it("makes the strongest matching card more dominant as focus rises", () => {
    const broad = computeAttentionLookup({ color: "red", shape: "circle" }, 0.5);
    const sharp = computeAttentionLookup({ color: "red", shape: "circle" }, 4);

    expect(sharp.weights[0]).toBeGreaterThan(broad.weights[0]);
    expect(sharp.weights[0]).toBeGreaterThan(0.9);
  });

  it("is stable even with a high focus multiplier", () => {
    const weights = softmax([2, 1, 1, 0], 1000);

    expect(weights[0]).toBeCloseTo(1, 12);
    expect(weights.slice(1).reduce((sum, value) => sum + value, 0)).toBeCloseTo(0, 12);
  });
});
