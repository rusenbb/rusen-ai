import { clampPointToDomain, coordinateNoise, createGrid, generateLogSpectrum, rotate2D } from "./math";
import type { GridSample, Objective2D, ObjectiveND, Vector } from "./types";

function makeObjective2D(config: Omit<Objective2D, "dimension">): Objective2D {
  return {
    ...config,
    dimension: 2,
  };
}

const ravineAngle = Math.PI / 5;

export const OBJECTIVES_2D: Record<string, Objective2D> = {
  bowl: makeObjective2D({
    id: "bowl",
    label: "Isotropic Bowl",
    shortLabel: "Bowl",
    description: "A smooth convex surface where every downhill step tells the truth.",
    narrative: "Use this when you want the cleanest possible convergence story.",
    kind: "smooth",
    domain: { x: [-3.5, 3.5], y: [-3.5, 3.5] },
    successThreshold: 0.015,
    value: ([x = 0, y = 0]) => 0.18 * (x * x + y * y),
    gradient: ([x = 0, y = 0]) => [0.36 * x, 0.36 * y],
  }),
  ravine: makeObjective2D({
    id: "ravine",
    label: "Ill-Conditioned Ravine",
    shortLabel: "Ravine",
    description: "A rotated narrow valley where one axis is forgiving and the other is brutal.",
    narrative: "Conditioning matters more than the pretty picture suggests.",
    kind: "smooth",
    domain: { x: [-3.2, 3.2], y: [-3.2, 3.2] },
    successThreshold: 0.02,
    value: ([x = 0, y = 0]) => {
      const [u, v] = rotate2D([x, y], ravineAngle);
      return 0.09 * u * u + 2.8 * v * v;
    },
    gradient: ([x = 0, y = 0]) => {
      const [u, v] = rotate2D([x, y], ravineAngle);
      const gradRotated = [0.18 * u, 5.6 * v];
      return rotate2D(gradRotated, -ravineAngle);
    },
  }),
  saddle: makeObjective2D({
    id: "saddle",
    label: "Saddle Plateau",
    shortLabel: "Saddle",
    description: "The cartoon villain is not always a local minimum. Sometimes the trouble is curvature.",
    narrative: "The slope can vanish while the escape routes stay open.",
    kind: "smooth",
    domain: { x: [-2.8, 2.8], y: [-2.8, 2.8] },
    successThreshold: -0.02,
    value: ([x = 0, y = 0]) =>
      0.42 * (x * x - y * y) + 0.06 * (x ** 4 + y ** 4),
    gradient: ([x = 0, y = 0]) => [
      0.84 * x + 0.24 * x ** 3,
      -0.84 * y + 0.24 * y ** 3,
    ],
  }),
  rosenbrock: makeObjective2D({
    id: "rosenbrock",
    label: "Rosenbrock Valley",
    shortLabel: "Rosenbrock",
    description: "The classic banana valley: the bottom is easy to describe and annoying to follow.",
    narrative: "This is the narrow-valley test that makes momentum and adaptivity feel concrete.",
    kind: "smooth",
    domain: { x: [-2.2, 2.2], y: [-1.2, 3.2] },
    successThreshold: 0.04,
    value: ([x = 0, y = 0]) => 0.02 * ((1 - x) ** 2 + 90 * (y - x * x) ** 2),
    gradient: ([x = 0, y = 0]) => [
      0.02 * (-2 * (1 - x) - 360 * x * (y - x * x)),
      0.02 * 180 * (y - x * x),
    ],
  }),
  himmelblau: makeObjective2D({
    id: "himmelblau",
    label: "Himmelblau Basin Field",
    shortLabel: "Himmelblau",
    description: "Multiple attractive basins, multiple stories, and no single global-looking answer from the picture alone.",
    narrative: "Multimodality is where local rules and initial conditions start arguing.",
    kind: "smooth",
    domain: { x: [-5, 5], y: [-5, 5] },
    successThreshold: 0.15,
    value: ([x = 0, y = 0]) => {
      const a = x * x + y - 11;
      const b = x + y * y - 7;
      return 0.01 * (a * a + b * b);
    },
    gradient: ([x = 0, y = 0]) => {
      const a = x * x + y - 11;
      const b = x + y * y - 7;
      return [0.01 * (4 * x * a + 2 * b), 0.01 * (2 * a + 4 * y * b)];
    },
  }),
  rastrigin: makeObjective2D({
    id: "rastrigin",
    label: "Rastrigin Ripples",
    shortLabel: "Rastrigin",
    description: "A field of repeating temptations that punishes naive search strategies.",
    narrative: "Multimodal surfaces look playful until you have to optimize them.",
    kind: "smooth",
    domain: { x: [-4.5, 4.5], y: [-4.5, 4.5] },
    successThreshold: 0.2,
    value: ([x = 0, y = 0]) =>
      0.04 *
      (20 +
        x * x -
        10 * Math.cos(2 * Math.PI * x) +
        y * y -
        10 * Math.cos(2 * Math.PI * y)),
    gradient: ([x = 0, y = 0]) => [
      0.04 * (2 * x + 20 * Math.PI * Math.sin(2 * Math.PI * x)),
      0.04 * (2 * y + 20 * Math.PI * Math.sin(2 * Math.PI * y)),
    ],
  }),
  "noisy-bowl": makeObjective2D({
    id: "noisy-bowl",
    label: "Noisy Bowl",
    shortLabel: "Noisy Bowl",
    description: "The bowl is still there, but every measurement arrives wearing static.",
    narrative: "Black-box optimization starts to make sense when the function stops being polite.",
    kind: "noisy",
    domain: { x: [-3.5, 3.5], y: [-3.5, 3.5] },
    successThreshold: 0.08,
    value: ([x = 0, y = 0]) =>
      0.18 * (x * x + y * y) + (coordinateNoise(x, y, 19) - 0.5) * 0.25,
  }),
  cliff: makeObjective2D({
    id: "cliff",
    label: "Discontinuous Cliff",
    shortLabel: "Cliff",
    description: "A smooth basin with a hidden step penalty where gradients stop being helpful or even well-defined.",
    narrative: "Sometimes the objective is not broken. It is just not differentiable.",
    kind: "discontinuous",
    domain: { x: [-3.5, 3.5], y: [-3.5, 3.5] },
    successThreshold: 0.12,
    value: ([x = 0, y = 0]) => {
      const base = 0.14 * ((x + 1.1) ** 2 + (y + 1.2) ** 2);
      const penalty = x + y > 0.55 ? 1.1 : 0;
      return base + penalty;
    },
  }),
};

export const GRADIENT_OBJECTIVE_IDS = [
  "bowl",
  "ravine",
  "saddle",
  "rosenbrock",
  "himmelblau",
] as const;

export const ZEROTH_ORDER_OBJECTIVE_IDS = [
  "bowl",
  "ravine",
  "rosenbrock",
  "himmelblau",
  "rastrigin",
  "noisy-bowl",
  "cliff",
] as const;

export function sampleObjectiveGrid(
  objective: Objective2D,
  resolution = 76,
): GridSample {
  const { xValues, yValues } = createGrid(objective.domain, resolution);
  const values = new Array<number[]>(resolution);
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  for (let row = 0; row < resolution; row += 1) {
    const y = yValues[row] ?? 0;
    const line = new Array<number>(resolution);
    for (let col = 0; col < resolution; col += 1) {
      const x = xValues[col] ?? 0;
      const value = objective.value([x, y]);
      line[col] = value;
      if (value < min) min = value;
      if (value > max) max = value;
    }
    values[row] = line;
  }

  return { values, min, max, xValues, yValues };
}

export function getObjective2D(id: string): Objective2D {
  return OBJECTIVES_2D[id] ?? OBJECTIVES_2D.bowl;
}

export function getGradientObjectives(): Objective2D[] {
  return GRADIENT_OBJECTIVE_IDS.map((id) => OBJECTIVES_2D[id]);
}

export function getZerothOrderObjectives(): Objective2D[] {
  return ZEROTH_ORDER_OBJECTIVE_IDS.map((id) => OBJECTIVES_2D[id]);
}

export function clampObjectivePoint(objective: Objective2D, point: Vector): Vector {
  return clampPointToDomain(point, objective.domain);
}

export function createAnisotropicQuadratic(
  dimension: number,
  conditionNumber: number,
): ObjectiveND {
  const spectrum = generateLogSpectrum(dimension, 1, conditionNumber);

  return {
    id: "anisotropic-quadratic",
    label: "64D Anisotropic Quadratic",
    description: "A high-dimensional bowl where every axis bends at a different rate.",
    narrative: "The loss falls smoothly even when every projection tells a different story.",
    dimension,
    successThreshold: 0.08,
    hessianSpectrum: spectrum,
    value: (point) =>
      point.reduce((sum, value, index) => sum + 0.5 * (spectrum[index] ?? 1) * value * value, 0),
    gradient: (point) =>
      point.map((value, index) => (spectrum[index] ?? 1) * value),
  };
}

export function createHighDimensionalSaddle(
  dimension: number,
  negativeDirections: number,
): ObjectiveND {
  const positive = generateLogSpectrum(Math.max(1, dimension - negativeDirections), 1.2, 18);
  const negative = generateLogSpectrum(Math.max(1, negativeDirections), 1.5, 9).map(
    (value) => -value,
  );
  const spectrum = [...negative, ...positive].slice(0, dimension);

  return {
    id: "high-dimensional-saddle",
    label: "64D Saddle",
    description: "Some directions curve upward, others curve downward, and the gradient alone does not tell the whole story.",
    narrative: "High dimensions add more than places to get stuck. They add more escape routes too.",
    dimension,
    successThreshold: -0.5,
    hessianSpectrum: spectrum,
    value: (point) =>
      point.reduce(
        (sum, value, index) =>
          sum + 0.35 * (spectrum[index] ?? 1) * value * value + 0.02 * value ** 4,
        0,
      ),
    gradient: (point) =>
      point.map(
        (value, index) => 0.7 * (spectrum[index] ?? 1) * value + 0.08 * value ** 3,
      ),
  };
}

export function initialPointForObjective(objective: Objective2D): Vector {
  switch (objective.id) {
    case "bowl":
      return [2.7, -2.3];
    case "ravine":
      return [2.3, 2.4];
    case "saddle":
      return [2.0, -1.8];
    case "rosenbrock":
      return [-1.6, 1.8];
    case "himmelblau":
      return [4.2, -3.6];
    case "rastrigin":
      return [3.6, 3.3];
    case "noisy-bowl":
      return [2.8, -2.1];
    case "cliff":
      return [2.2, 2.1];
    default:
      return [2.5, -2.5];
  }
}

export function sliceObjective2D(
  objective: ObjectiveND,
  domain: Objective2D["domain"],
  center: Vector,
  axisA: Vector,
  axisB: Vector,
): Objective2D {
  return makeObjective2D({
    id: `${objective.id}-slice`,
    label: `${objective.label} Slice`,
    shortLabel: "Slice",
    description: objective.description,
    narrative: objective.narrative,
    kind: "smooth",
    domain,
    successThreshold: objective.successThreshold,
    value: ([x = 0, y = 0]) => {
      const point = center.map(
        (value, index) => value + x * (axisA[index] ?? 0) + y * (axisB[index] ?? 0),
      );
      return objective.value(point);
    },
    gradient: ([x = 0, y = 0]) => {
      const point = center.map(
        (value, index) => value + x * (axisA[index] ?? 0) + y * (axisB[index] ?? 0),
      );
      const gradient = objective.gradient(point);
      return [
        gradient.reduce((sum, value, index) => sum + value * (axisA[index] ?? 0), 0),
        gradient.reduce((sum, value, index) => sum + value * (axisB[index] ?? 0), 0),
      ];
    },
  });
}
