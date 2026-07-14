import { describe, expect, it } from "vitest";

import {
  DEFAULT_TARGET,
  INITIAL_WEIGHT,
  LEARNING_RATE,
  SAMPLE_INPUT,
  evaluateNeuron,
  neuronFiniteDifference,
  takeNeuronStep,
  trainNeuron,
} from "./math";

describe("one-neuron backpropagation", () => {
  it("matches a centered finite difference at several weights and targets", () => {
    [
      { target: -0.6, weight: -0.4 },
      { target: 0.1, weight: 0.2 },
      { target: 0.7, weight: -0.55 },
    ].forEach(({ target, weight }) => {
      const analytic = evaluateNeuron(SAMPLE_INPUT, target, weight).gradient;
      const numeric = neuronFiniteDifference(SAMPLE_INPUT, target, weight);
      expect(analytic).toBeCloseTo(numeric, 7);
    });
  });

  it("moves the curve toward the target after one step", () => {
    const before = evaluateNeuron(SAMPLE_INPUT, DEFAULT_TARGET, INITIAL_WEIGHT);
    const nextWeight = takeNeuronStep(SAMPLE_INPUT, DEFAULT_TARGET, INITIAL_WEIGHT, LEARNING_RATE);
    const after = evaluateNeuron(SAMPLE_INPUT, DEFAULT_TARGET, nextWeight);

    expect(after.loss).toBeLessThan(before.loss);
    expect(nextWeight).toBeGreaterThan(INITIAL_WEIGHT);
  });

  it("keeps reducing default loss over several exact gradient steps", () => {
    const training = trainNeuron(SAMPLE_INPUT, DEFAULT_TARGET, INITIAL_WEIGHT, 8);

    expect(training.after.loss).toBeLessThan(training.before.loss);
    expect(training.after.prediction).toBeGreaterThan(training.before.prediction);
    expect(training.steps).toBe(8);
  });
});
