import { describe, expect, it } from "vitest";

import { aliasFrequency, sineAt } from "./math";

describe("sampling aliases", () => {
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
});
