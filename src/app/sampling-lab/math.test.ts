import { describe, expect, it } from "vitest";

import { aliasFrequency, reconstructSamples, sineAt, verdict } from "./math";

describe("sampling aliases", () => {
  it("interpolates every measured sample without using the source frequency", () => {
    const samples = [0.4, -1, 0.6, 1, 0];
    samples.forEach((value, index) => expect(reconstructSamples(samples, 4, index / 4)).toBeCloseTo(value, 10));
  });
  it("folds into the baseband while preserving every sampled value and phase", () => {
    for (const frequency of [1, 6, 9, 12, 19]) {
      const alias = aliasFrequency(frequency, 12);
      expect(Math.abs(alias)).toBeLessThanOrEqual(6);
      for (const phase of [0, 0.7, Math.PI / 2]) {
        for (let n = 0; n <= 12; n++) {
          expect(sineAt(n / 12, alias, phase)).toBeCloseTo(
            sineAt(n / 12, frequency, phase),
            10,
          );
        }
      }
    }
  });

  it("exposes the phase ambiguity exactly at Nyquist", () => {
    expect(sineAt(1 / 12, 6, 0)).toBeCloseTo(0);
    expect(sineAt(1 / 12, 6, Math.PI / 2)).toBeCloseTo(-1);
    expect(aliasFrequency(3, 12)).toBe(3);
    expect(aliasFrequency(9, 12)).toBe(-3);
  });

  it("describes the result in one sentence from the state", () => {
    expect(verdict(9, 12, aliasFrequency(9, 12))).toBe("9 Hz sampled at 12 Hz looks like 3 Hz.");
    expect(verdict(12, 12, aliasFrequency(12, 12))).toBe("12 Hz sampled at 12 Hz looks like a constant.");
    expect(verdict(6, 12, aliasFrequency(6, 12))).toMatch(/on the limit/);
    expect(verdict(3, 24, aliasFrequency(3, 24))).toMatch(/is captured/);
  });
});
