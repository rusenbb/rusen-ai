import { describe, expect, it } from "vitest";

import { chanceOfAtLeast } from "./scoring";

describe("chanceOfAtLeast", () => {
  it("matches exact binomial tails", () => {
    // P(X >= 2 | n = 2, p = 0.5) = 0.25 and P(X >= 1 | n = 2, p = 0.5) = 0.75.
    expect(chanceOfAtLeast(2, 2, 0.5)).toBeCloseTo(0.25, 10);
    expect(chanceOfAtLeast(1, 2, 0.5)).toBeCloseTo(0.75, 10);
    expect(chanceOfAtLeast(0, 10, 0.5)).toBe(1);
  });

  it("separates a lucky streak from a clear pattern", () => {
    // 15 of 20 on a coin flip: about 2.1%. 13 of 20: about 13%.
    expect(chanceOfAtLeast(15, 20, 0.5)).toBeCloseTo(0.0207, 3);
    expect(chanceOfAtLeast(13, 20, 0.5)).toBeCloseTo(0.1316, 3);
    // With four keys, chance is 25%: 10 of 20 is already unlikely by luck.
    expect(chanceOfAtLeast(10, 20, 0.25)).toBeLessThan(0.05);
  });
});
