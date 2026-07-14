import { describe, expect, it } from "vitest";

import {
  DEFAULT_OPTIMIZER_CONFIGS,
  LANDSCAPES,
  finiteDifferenceGradient,
  simulateOptimizer,
} from "./math";

describe("optimizer racetrack math", () => {
  it("matches finite-difference gradients for every landscape", () => {
    (Object.values(LANDSCAPES)).forEach((landscape) => {
      const point = {
        x: landscape.defaultStart.x * 0.67,
        y: landscape.defaultStart.y * 0.53,
      };
      const analytic = landscape.gradient(point);
      const numerical = finiteDifferenceGradient(point, landscape);
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
