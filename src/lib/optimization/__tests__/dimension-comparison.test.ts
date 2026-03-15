import { describe, expect, it } from "vitest";
import {
  binSpectrum,
  convergenceCharacterization,
  criticalPointCombinations,
  DEFAULT_DIMENSION_CONFIGS,
  runDimensionComparison,
} from "../dimension-comparison";

describe("runDimensionComparison", () => {
  const results = runDimensionComparison(DEFAULT_DIMENSION_CONFIGS, 130);

  it("produces traces that converge at every dimension", () => {
    for (const result of results) {
      expect(result.trace.endValue).toBeLessThan(result.trace.startValue);
    }
  });

  it("normalizes loss to start at 1", () => {
    for (const result of results) {
      expect(result.normalizedLoss[0]).toBeCloseTo(1, 5);
    }
  });

  it("produces finite values in all frames", () => {
    for (const result of results) {
      for (const frame of result.trace.frames) {
        expect(Number.isFinite(frame.value)).toBe(true);
        expect(frame.point.every(Number.isFinite)).toBe(true);
      }
    }
  });

  it("has eigenvalue spectra matching dimension", () => {
    for (const result of results) {
      expect(result.spectrum.length).toBe(result.config.dimension);
    }
  });
});

describe("criticalPointCombinations", () => {
  it("returns correct values for dimension 2", () => {
    const stats = criticalPointCombinations(2);
    expect(stats.totalCombinations).toBe(BigInt(4));
    expect(stats.localMinima).toBe(BigInt(1));
    expect(stats.fractionMinima).toBeCloseTo(0.25, 5);
  });

  it("returns correct values for dimension 3", () => {
    const stats = criticalPointCombinations(3);
    expect(stats.totalCombinations).toBe(BigInt(8));
    expect(stats.localMinima).toBe(BigInt(1));
    expect(stats.fractionMinima).toBeCloseTo(0.125, 5);
  });

  it("handles dimension 64 without overflow", () => {
    const stats = criticalPointCombinations(64);
    expect(stats.totalCombinations).toBe(BigInt(1) << BigInt(64));
    expect(stats.localMinima).toBe(BigInt(1));
    expect(stats.fractionMinima).toBeLessThan(1e-18);
    expect(stats.formattedTotal.length).toBeGreaterThan(0);
  });
});

describe("binSpectrum", () => {
  it("bins values correctly", () => {
    const spectrum = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const bins = binSpectrum(spectrum, 5);
    expect(bins.length).toBe(5);
    const totalCount = bins.reduce((sum, bin) => sum + bin.count, 0);
    expect(totalCount).toBe(10);
  });

  it("handles empty spectrum", () => {
    expect(binSpectrum([], 5)).toEqual([]);
  });

  it("handles single-value spectrum", () => {
    const bins = binSpectrum([5], 3);
    expect(bins.length).toBe(3);
    const totalCount = bins.reduce((sum, bin) => sum + bin.count, 0);
    expect(totalCount).toBe(1);
  });
});

describe("convergenceCharacterization", () => {
  it("labels fast convergence", () => {
    expect(convergenceCharacterization(3, 130)).toBe("fast");
  });

  it("labels moderate convergence", () => {
    expect(convergenceCharacterization(15, 130)).toBe("moderate");
  });

  it("labels gradual convergence", () => {
    expect(convergenceCharacterization(40, 130)).toBe("gradual");
  });

  it("labels slow when threshold never reached", () => {
    expect(convergenceCharacterization(null, 130)).toBe("slow");
  });
});
