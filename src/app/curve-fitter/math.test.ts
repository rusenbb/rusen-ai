import { describe, expect, it } from "vitest";

import {
  classificationAccuracy,
  createClassificationDataset,
  createPolynomialTrainingTrace,
  createRegressionDataset,
  createTinyNetworkTrainingTrace,
  evaluatePolynomial,
  fitPolynomial,
  initializeTinyNetwork,
  meanSquaredError,
  stepTinyNetwork,
  trainTinyNetwork,
} from "./math";

describe("curve fitter mathematics", () => {
  it("fits a quadratic dataset with a second-degree polynomial", () => {
    const points = [
      { x: -1, y: 3, split: "train" as const },
      { x: 0, y: 1, split: "train" as const },
      { x: 1, y: 1, split: "train" as const },
      { x: 2, y: 3, split: "train" as const },
    ];
    const coefficients = fitPolynomial(points, 2);

    expect(evaluatePolynomial(coefficients, 3)).toBeCloseTo(7, 5);
    expect(meanSquaredError(points, coefficients)).toBeLessThan(1e-8);
  });

  it("keeps train and test errors measurable for generated data", () => {
    const points = createRegressionDataset("wave");
    const coefficients = fitPolynomial(points.filter((point) => point.split === "train"), 5);

    expect(meanSquaredError(points.filter((point) => point.split === "test"), coefficients)).toBeGreaterThan(0);
  });

  it("records real, independent gradient-descent polynomial updates", () => {
    const points = [
      { x: -1, y: 3, split: "train" as const },
      { x: 0, y: 1, split: "train" as const },
      { x: 1, y: 1, split: "train" as const },
      { x: 2, y: 3, split: "train" as const },
    ];
    const trace = createPolynomialTrainingTrace(points, 2, { epochs: 1000 });
    const closedForm = fitPolynomial(points, 2);

    expect(trace).toHaveLength(1001);
    expect(trace[0].epoch).toBe(0);
    expect(trace[250].epoch).toBe(250);
    expect(trace[0].coefficients).not.toBe(trace[1].coefficients);
    expect(trace[1000].loss).toBeLessThan(trace[0].loss);
    expect(meanSquaredError(points, trace[1000].coefficients)).toBeCloseTo(
      meanSquaredError(points, closedForm),
      8,
    );
  });

  it("shows that a tanh hidden layer can solve XOR unlike a linear hidden layer", () => {
    const xor = createClassificationDataset("xor");
    const linear = trainTinyNetwork(xor, "linear");
    const nonlinear = trainTinyNetwork(xor, "tanh");

    expect(classificationAccuracy(linear, xor)).toBeLessThan(0.8);
    expect(classificationAccuracy(nonlinear, xor)).toBeGreaterThan(0.95);
  });

  it("stores network snapshots from the same real updates used by training", () => {
    const xor = createClassificationDataset("xor");
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
