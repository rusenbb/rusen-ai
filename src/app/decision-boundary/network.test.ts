import { describe, expect, it } from "vitest";

import { makeDataset } from "./math";
import {
  classificationAccuracy,
  classificationAccuracyWithHiddenCount,
  createTinyNetworkTrainingTrace,
  initializeTinyNetwork,
  inspectHiddenLayer,
  predictTinyNetwork,
  predictTinyNetworkWithHiddenCount,
  stepTinyNetwork,
  trainTinyNetwork,
} from "./network";

describe("tiny network", () => {
  it("shows that a tanh hidden layer can solve XOR unlike a linear hidden layer", () => {
    const xor = makeDataset("xor");
    const linear = trainTinyNetwork(xor, "linear");
    const nonlinear = trainTinyNetwork(xor, "tanh");

    expect(classificationAccuracy(linear, xor)).toBeLessThan(0.8);
    expect(classificationAccuracy(nonlinear, xor)).toBeGreaterThan(0.95);
  });

  it("exposes each learned tanh gate and lets the illustration combine a real subset", () => {
    const xor = makeDataset("xor");
    const nonlinear = trainTinyNetwork(xor, "tanh");
    const inspection = inspectHiddenLayer(nonlinear, { x: 0.5, y: -0.5 });

    expect(inspection.preActivations).toHaveLength(nonlinear.w1.length);
    expect(inspection.activations.every((value) => value >= -1 && value <= 1)).toBe(true);
    expect(predictTinyNetworkWithHiddenCount(nonlinear, { x: 0.5, y: -0.5 }, 99)).toBeCloseTo(
      predictTinyNetwork(nonlinear, { x: 0.5, y: -0.5 }),
    );
    expect(classificationAccuracyWithHiddenCount(nonlinear, xor, 99)).toBeCloseTo(
      classificationAccuracy(nonlinear, xor),
    );
  });

  it("stores network snapshots from the same real updates used by training", () => {
    const xor = makeDataset("xor");
    const trace = createTinyNetworkTrainingTrace(xor, "tanh", { epochs: 250 });
    const fresh = initializeTinyNetwork(xor, "tanh");
    const oneStep = stepTinyNetwork(xor, trace[0]);

    expect(trace).toHaveLength(251);
    expect(trace[0]).toEqual(fresh);
    expect(trace[0].w1).not.toBe(trace[1].w1);
    expect(trace[0].w1[0]).not.toBe(trace[1].w1[0]);
    expect(trace[1]).toEqual(oneStep);
    expect(trace[250].loss).toBeLessThan(trace[0].loss);
  });
});
