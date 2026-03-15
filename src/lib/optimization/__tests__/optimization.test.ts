import { describe, expect, it } from "vitest";
import {
  getGradientObjectives,
  getObjective2D,
  getZerothOptimizerList,
  initialPointForObjective,
  runGradientTrace,
  runZerothOrderTrace,
  trainTwoMoonsTrace,
  type Objective2D,
} from "@/lib/optimization";

function finiteDifferenceGradient(
  objective: Objective2D,
  point: [number, number],
): [number, number] {
  const epsilon = 1e-5;
  const baseX: [number, number] = [point[0] + epsilon, point[1]];
  const baseY: [number, number] = [point[0], point[1] + epsilon];
  const negX: [number, number] = [point[0] - epsilon, point[1]];
  const negY: [number, number] = [point[0], point[1] - epsilon];

  return [
    (objective.value(baseX) - objective.value(negX)) / (2 * epsilon),
    (objective.value(baseY) - objective.value(negY)) / (2 * epsilon),
  ];
}

describe("optimization objectives", () => {
  it("matches analytic gradients to finite differences on smooth 2D surfaces", () => {
    const smoothObjectives = getGradientObjectives().concat(getObjective2D("rastrigin"));
    for (const objective of smoothObjectives) {
      const point: [number, number] = [0.73, -0.41];
      const analytic = objective.gradient?.(point);
      const finite = finiteDifferenceGradient(objective, point);

      expect(analytic).toBeDefined();
      expect(analytic?.[0]).toBeCloseTo(finite[0], 3);
      expect(analytic?.[1]).toBeCloseTo(finite[1], 3);
    }
  });
});

describe("gradient traces", () => {
  it("improves every gradient optimizer on the bowl and ravine presets", () => {
    for (const objective of [getObjective2D("bowl"), getObjective2D("ravine")]) {
      for (const optimizerId of [
        "gradient-descent",
        "momentum",
        "nesterov",
        "adagrad",
        "rmsprop",
        "adam",
      ] as const) {
        const trace = runGradientTrace({
          objective,
          optimizerId,
          start: initialPointForObjective(objective),
          steps: 140,
        });

        expect(trace.endValue).toBeLessThan(trace.startValue);
        expect(trace.frames.every((frame) => Number.isFinite(frame.value))).toBe(true);
        expect(trace.frames.every((frame) => frame.point.every(Number.isFinite))).toBe(true);
      }
    }
  });
});

describe("zeroth-order traces", () => {
  it("improves each zeroth-order optimizer on bowl and himmelblau", () => {
    const bowl = getObjective2D("bowl");
    const multimodal = getObjective2D("himmelblau");

    for (const optimizer of getZerothOptimizerList()) {
      const bowlTrace = runZerothOrderTrace({
        objective: bowl,
        optimizerId: optimizer.id,
        start: initialPointForObjective(bowl),
        evaluationBudget: 220,
        seed: 17,
      });
      const multiTrace = runZerothOrderTrace({
        objective: multimodal,
        optimizerId: optimizer.id,
        start: initialPointForObjective(multimodal),
        evaluationBudget: 260,
        seed: 17,
      });

      expect(bowlTrace.frames.at(-1)?.bestValue ?? Infinity).toBeLessThan(
        bowlTrace.startValue,
      );
      expect(multiTrace.frames.at(-1)?.bestValue ?? Infinity).toBeLessThan(
        multiTrace.startValue,
      );
      expect(
        bowlTrace.frames.every(
          (frame) =>
            Number.isFinite(frame.value) &&
            frame.point.every(Number.isFinite) &&
            frame.bestPoint.every(Number.isFinite),
        ),
      ).toBe(true);
    }
  });
});

describe("tiny in-browser mlp", () => {
  it("reduces loss and reaches useful accuracy on the wider network", () => {
    const trace = trainTwoMoonsTrace({
      width: 64,
      batchSize: 32,
      steps: 180,
      optimizerId: "adam",
      seed: 9,
    });

    const first = trace.snapshots[0]!;
    const last = trace.snapshots[trace.snapshots.length - 1]!;

    expect(last.loss).toBeLessThan(first.loss);
    expect(last.accuracy).toBeGreaterThan(0.84);
  });
});
