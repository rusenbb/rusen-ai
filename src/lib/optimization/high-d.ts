import { orthonormalize, projectTo2D as projectVectorTo2D, scaleVector, unitVector } from "./math";
import { createRng } from "./rng";
import { createAnisotropicQuadratic, createHighDimensionalSaddle } from "./objectives";
import { runGradientTrace } from "./gradient";
import type {
  GradientOptimizerId,
  Objective2D,
  ObjectiveND,
  Projection2D,
  SimulationTrace,
  Vector,
} from "./types";

export const HIGH_D_DIMENSION = 64;

export function createDefaultHighDimensionalStart(dimension: number): Vector {
  return Array.from({ length: dimension }, (_, index) => {
    const direction = index % 2 === 0 ? 1 : -1;
    const falloff = 1 - index / Math.max(1, dimension);
    return direction * (1.6 + falloff * 0.9);
  });
}

export function createRandomProjection(
  dimension: number,
  seed: number,
): Projection2D {
  const rng = createRng(seed);
  const axisA = unitVector(
    Array.from({ length: dimension }, () => rng.normal()),
  );
  const axisB = unitVector(
    Array.from({ length: dimension }, () => rng.normal()),
  );
  return orthonormalize(axisA, axisB);
}

export function createDominantCoordinateProjection(trace: SimulationTrace): {
  projection: Projection2D;
  axisLabels: { x: string; y: string };
} {
  const dimension = trace.frames[0]?.point.length ?? 2;
  const variances = new Array<number>(dimension).fill(0);
  const means = new Array<number>(dimension).fill(0);

  for (const frame of trace.frames) {
    for (let index = 0; index < dimension; index += 1) {
      means[index] += frame.point[index] ?? 0;
    }
  }
  for (let index = 0; index < dimension; index += 1) {
    means[index] /= Math.max(1, trace.frames.length);
  }
  for (const frame of trace.frames) {
    for (let index = 0; index < dimension; index += 1) {
      const delta = (frame.point[index] ?? 0) - means[index];
      variances[index] += delta * delta;
    }
  }

  const ranked = variances
    .map((value, index) => ({ value, index }))
    .sort((left, right) => right.value - left.value);
  const xIndex = ranked[0]?.index ?? 0;
  const yIndex = ranked[1]?.index ?? Math.min(1, dimension - 1);
  const axisA = Array.from({ length: dimension }, (_, index) =>
    index === xIndex ? 1 : 0,
  );
  const axisB = Array.from({ length: dimension }, (_, index) =>
    index === yIndex ? 1 : 0,
  );

  return {
    projection: { axisA, axisB },
    axisLabels: {
      x: `coordinate ${xIndex + 1}`,
      y: `coordinate ${yIndex + 1}`,
    },
  };
}

export function projectTraceTo2D(
  trace: SimulationTrace,
  projection: Projection2D,
): Array<{ x: number; y: number }> {
  return trace.frames.map((frame) => {
    const projected = projectVectorTo2D(frame.point, projection);
    return { x: projected[0] ?? 0, y: projected[1] ?? 0 };
  });
}

export function highDimensionalQuadratic(): ObjectiveND {
  return createAnisotropicQuadratic(HIGH_D_DIMENSION, 42);
}

export function highDimensionalSaddle(): ObjectiveND {
  return createHighDimensionalSaddle(HIGH_D_DIMENSION, 18);
}

export function highDimensionalQuadraticTrace(
  optimizerId: GradientOptimizerId,
  steps: number,
  overrides?: Parameters<typeof runGradientTrace>[0]["params"],
): SimulationTrace {
  const objective = highDimensionalQuadratic();
  return runGradientTrace({
    objective,
    optimizerId,
    start: createDefaultHighDimensionalStart(objective.dimension),
    steps,
    params: overrides,
  });
}

export function highDimensionalSaddleTrace(
  optimizerId: GradientOptimizerId,
  steps: number,
  overrides?: Parameters<typeof runGradientTrace>[0]["params"],
): SimulationTrace {
  const objective = highDimensionalSaddle();
  return runGradientTrace({
    objective,
    optimizerId,
    start: scaleVector(createDefaultHighDimensionalStart(objective.dimension), 0.75),
    steps,
    params: overrides,
  });
}

export function createCanonicalSlice(
  objective: ObjectiveND,
  span = 3.2,
): { objective: Objective2D; center: Vector; projection: Projection2D } {
  const axisA = Array.from({ length: objective.dimension }, (_, index) =>
    index === 0 ? 1 : 0,
  );
  const axisB = Array.from({ length: objective.dimension }, (_, index) =>
    index === 1 ? 1 : 0,
  );
  const center = new Array(objective.dimension).fill(0);

  return {
    center,
    projection: { axisA, axisB },
    objective: {
      id: `${objective.id}-slice`,
      label: `${objective.label} Slice`,
      shortLabel: "Slice",
      description: objective.description,
      narrative: objective.narrative,
      kind: "smooth",
      dimension: 2,
      domain: { x: [-span, span], y: [-span, span] },
      successThreshold: objective.successThreshold,
      value: ([x = 0, y = 0]) => objective.value([x, y, ...new Array(objective.dimension - 2).fill(0)]),
      gradient: ([x = 0, y = 0]) => {
        const gradient = objective.gradient([x, y, ...new Array(objective.dimension - 2).fill(0)]);
        return [gradient[0] ?? 0, gradient[1] ?? 0];
      },
    },
  };
}
