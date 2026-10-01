import { afterEach, describe, expect, it, vi } from "vitest";

import { makeRandomPredictor, makeFrequencyPredictor, makePPMPredictor } from "./discrete";

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

describe("predictor explanations", () => {
  it("explains Frequency with whole-session counts and the same smoothed prediction", () => {
    const predictor = makeFrequencyPredictor(2);
    const history = [...new Array(25).fill(0), 1];
    history.forEach((symbol, index) => predictor.observe(history.slice(0, index), symbol));
    const explanation = predictor.inspect(history);
    expect(explanation.contexts).toEqual([{ context: [], counts: [25, 1] }]);
    expect(explanation.prediction).toEqual(predictor.predict(history));
    expect(explanation.prediction.pmf).toEqual([26 / 28, 2 / 28]);
    predictor.reset();
    expect(predictor.inspect([]).contexts[0].counts).toEqual([0, 0]);
    // Inspection returns snapshots, not mutable internal count arrays.
    expect(explanation.contexts[0].counts).toEqual([25, 1]);
  });

  it("retains all eight PPM context symbols and its actual backoff distribution", () => {
    const predictor = makePPMPredictor(2, 8);
    const history = [0, 1, 0, 1, 1, 0, 1, 0];
    predictor.observe(history, 1);
    const explanation = predictor.inspect(history);
    expect(explanation.contexts).toHaveLength(9);
    expect(explanation.contexts[0]).toEqual({ context: history, counts: [0, 1] });
    expect(explanation.contexts[8]).toEqual({ context: [], counts: [0, 1] });
    expect(explanation.prediction).toEqual(predictor.predict(history));
    expect(predictor.inspect(history)).toEqual(explanation);
    explanation.contexts[0].counts[1] = 999;
    expect(predictor.inspect(history).contexts[0].counts[1]).toBe(1);
  });
});
