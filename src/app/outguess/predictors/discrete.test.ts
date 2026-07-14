import { afterEach, describe, expect, it, vi } from "vitest";

import { makeRandomPredictor } from "./discrete";

describe("makeRandomPredictor", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses a stable random tie-breaker instead of always selecting the first symbol", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const predictor = makeRandomPredictor(2);

    const guesses = Array.from(
      { length: 10 },
      (_, trial) => predictor.predict(new Array(trial).fill(0)).argmax,
    );

    expect(predictor.predict([0, 1, 0]).argmax).toBe(
      predictor.predict([1, 1, 1]).argmax,
    );
    expect(new Set(guesses)).toEqual(new Set([0, 1]));
  });
});
