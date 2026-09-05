import { describe, expect, it } from "vitest";

import {
  DEFAULT_OPTIMIZER_CONFIGS,
  LANDSCAPES,
  simulateOptimizer,
} from "./math";

describe("optimizer racetrack math", () => {
  it("distinguishes a display exit, a stationary point, and invalid arithmetic", () => {
    const config = DEFAULT_OPTIMIZER_CONFIGS.sgd;
    expect(simulateOptimizer("sgd", { x: 2, y: 1 }, { ...config, learningRate: 10 }, 10, LANDSCAPES.bowl)).toMatchObject({ diverged: false, stopReason: "out-of-view" });
    expect(simulateOptimizer("sgd", { x: 0, y: 0 }, config, 10, LANDSCAPES.bowl).stopReason).toBe("stationary");
    expect(simulateOptimizer("sgd", { x: 2, y: 1 }, { ...config, learningRate: Infinity }, 10, LANDSCAPES.bowl)).toMatchObject({ diverged: true, stopReason: "non-finite" });
  });
  it("matches finite-difference gradients for every landscape", () => {
    (Object.values(LANDSCAPES)).forEach((landscape) => {
      const point = {
        x: landscape.defaultStart.x * 0.67,
        y: landscape.defaultStart.y * 0.53,
      };
      const analytic = landscape.gradient(point);
      const epsilon = 1e-5;
      const numerical = {
        x: (landscape.loss({ ...point, x: point.x + epsilon }) - landscape.loss({ ...point, x: point.x - epsilon })) / (2 * epsilon),
        y: (landscape.loss({ ...point, y: point.y + epsilon }) - landscape.loss({ ...point, y: point.y - epsilon })) / (2 * epsilon),
      };
      expect(analytic.x).toBeCloseTo(numerical.x, 7);
      expect(analytic.y).toBeCloseTo(numerical.y, 7);
    });
  });

  it("lets Adam descend from the default curved-ravine start", () => {
    const landscape = LANDSCAPES.ravine;
    const trajectory = simulateOptimizer("adam", landscape.defaultStart, DEFAULT_OPTIMIZER_CONFIGS.adam, 80, landscape);
    expect(trajectory.diverged).toBe(false);
    expect(trajectory.losses.at(-1)!).toBeLessThan(landscape.loss(landscape.defaultStart));
  });

  it("changes the trajectory when an optimizer-specific setting changes", () => {
    const landscape = LANDSCAPES.ravine;
    const slowMemory = simulateOptimizer("momentum", landscape.defaultStart, { ...DEFAULT_OPTIMIZER_CONFIGS.momentum, momentumBeta: 0.2 }, 24, landscape);
    const longMemory = simulateOptimizer("momentum", landscape.defaultStart, { ...DEFAULT_OPTIMIZER_CONFIGS.momentum, momentumBeta: 0.95 }, 24, landscape);
    const slowEnd = slowMemory.points.at(-1)!;
    const longEnd = longMemory.points.at(-1)!;
    expect(Math.hypot(slowEnd.x - longEnd.x, slowEnd.y - longEnd.y)).toBeGreaterThan(1e-4);
  });
});
