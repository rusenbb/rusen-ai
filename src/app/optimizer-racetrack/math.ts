export type OptimizerName = "sgd" | "momentum" | "rmsprop" | "adam";
export type LandscapeId = "ravine" | "bowl" | "double-well" | "ripple";

export interface Point {
  x: number;
  y: number;
}

export interface LandscapeBounds {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export interface LossLandscape {
  id: LandscapeId;
  label: string;
  shortLabel: string;
  description: string;
  equation: string;
  bounds: LandscapeBounds;
  defaultStart: Point;
  minima: Point[];
  loss: (point: Point) => number;
  gradient: (point: Point) => Point;
}

export interface OptimizerConfig {
  learningRate: number;
  momentumBeta: number;
  rmspropDecay: number;
  rmspropEpsilon: number;
  adamBeta1: number;
  adamBeta2: number;
  adamEpsilon: number;
}

export type OptimizerConfigs = Record<OptimizerName, OptimizerConfig>;

export interface OptimizerState {
  point: Point;
  velocity: Point;
  squareAverage: Point;
  firstMoment: Point;
  secondMoment: Point;
  step: number;
}

export interface Trajectory {
  name: OptimizerName;
  points: Point[];
  losses: number[];
  diverged: boolean;
}

export const OPTIMIZER_META: Record<OptimizerName, { label: string; color: string; description: string }> = {
  sgd: { label: "SGD", color: "#06b6d4", description: "Follows the raw slope." },
  momentum: { label: "Momentum", color: "#f59e0b", description: "Accumulates a running direction." },
  rmsprop: { label: "RMSProp", color: "#a855f7", description: "Scales directions by recent gradient size." },
  adam: { label: "Adam", color: "#ec4899", description: "Combines momentum with adaptive scaling." },
};

export const LANDSCAPES: Record<LandscapeId, LossLandscape> = {
  ravine: {
    id: "ravine",
    label: "Curved ravine",
    shortLabel: "Ravine",
    description: "A steep, curved valley makes side-to-side gradients much larger than the useful downhill direction.",
    equation: "0.12θ₁² + 3(θ₂ − 0.35θ₁²)²",
    bounds: { xMin: -2.15, xMax: 2.15, yMin: -0.75, yMax: 2.45 },
    defaultStart: { x: -1.7, y: 2 },
    minima: [{ x: 0, y: 0 }],
    loss: (point) => {
      const valleyOffset = point.y - 0.35 * point.x * point.x;
      return 0.12 * point.x * point.x + 3 * valleyOffset * valleyOffset;
    },
    gradient: (point) => {
      const valleyOffset = point.y - 0.35 * point.x * point.x;
      return { x: 0.24 * point.x - 4.2 * point.x * valleyOffset, y: 6 * valleyOffset };
    },
  },
  bowl: {
    id: "bowl",
    label: "Stretched bowl",
    shortLabel: "Bowl",
    description: "A simple convex bowl with one direction that is much steeper than the other.",
    equation: "0.18θ₁² + 3θ₂²",
    bounds: { xMin: -3, xMax: 3, yMin: -1.7, yMax: 1.7 },
    defaultStart: { x: -2.4, y: 1.25 },
    minima: [{ x: 0, y: 0 }],
    loss: (point) => 0.18 * point.x * point.x + 3 * point.y * point.y,
    gradient: (point) => ({ x: 0.36 * point.x, y: 6 * point.y }),
  },
  "double-well": {
    id: "double-well",
    label: "Double well",
    shortLabel: "Double well",
    description: "Two equally good minima make the starting point and update path matter.",
    equation: "0.5(θ₁² − 1)² + 0.8θ₂²",
    bounds: { xMin: -2.2, xMax: 2.2, yMin: -1.7, yMax: 1.7 },
    defaultStart: { x: -1.7, y: 1.2 },
    minima: [{ x: -1, y: 0 }, { x: 1, y: 0 }],
    loss: (point) => 0.5 * (point.x * point.x - 1) ** 2 + 0.8 * point.y * point.y,
    gradient: (point) => ({ x: 2 * point.x * (point.x * point.x - 1), y: 1.6 * point.y }),
  },
  ripple: {
    id: "ripple",
    label: "Ripple basin",
    shortLabel: "Ripple",
    description: "Small ripples create local traps inside a broad basin, so an update rule can take a very different route.",
    equation: "0.08(θ₁² + θ₂²) + 0.16(2 − cos 3θ₁ − cos 3θ₂)",
    bounds: { xMin: -2.8, xMax: 2.8, yMin: -2.8, yMax: 2.8 },
    defaultStart: { x: -2.25, y: 1.9 },
    minima: [{ x: 0, y: 0 }],
    loss: (point) => 0.08 * (point.x * point.x + point.y * point.y) + 0.16 * (2 - Math.cos(3 * point.x) - Math.cos(3 * point.y)),
    gradient: (point) => ({ x: 0.16 * point.x + 0.48 * Math.sin(3 * point.x), y: 0.16 * point.y + 0.48 * Math.sin(3 * point.y) }),
  },
};

export const DEFAULT_OPTIMIZER_CONFIGS: OptimizerConfigs = {
  sgd: {
    learningRate: 0.07,
    momentumBeta: 0.87,
    rmspropDecay: 0.93,
    rmspropEpsilon: 1e-7,
    adamBeta1: 0.9,
    adamBeta2: 0.999,
    adamEpsilon: 1e-7,
  },
  momentum: {
    learningRate: 0.05,
    momentumBeta: 0.87,
    rmspropDecay: 0.93,
    rmspropEpsilon: 1e-7,
    adamBeta1: 0.9,
    adamBeta2: 0.999,
    adamEpsilon: 1e-7,
  },
  rmsprop: {
    learningRate: 0.05,
    momentumBeta: 0.87,
    rmspropDecay: 0.93,
    rmspropEpsilon: 1e-7,
    adamBeta1: 0.9,
    adamBeta2: 0.999,
    adamEpsilon: 1e-7,
  },
  adam: {
    learningRate: 0.035,
    momentumBeta: 0.87,
    rmspropDecay: 0.93,
    rmspropEpsilon: 1e-7,
    adamBeta1: 0.9,
    adamBeta2: 0.999,
    adamEpsilon: 1e-7,
  },
};

export function cloneOptimizerConfigs(configs: OptimizerConfigs = DEFAULT_OPTIMIZER_CONFIGS): OptimizerConfigs {
  return {
    sgd: { ...configs.sgd },
    momentum: { ...configs.momentum },
    rmsprop: { ...configs.rmsprop },
    adam: { ...configs.adam },
  };
}

export function matchedLearningRateConfigs(learningRate: number, configs: OptimizerConfigs): OptimizerConfigs {
  return {
    sgd: { ...configs.sgd, learningRate },
    momentum: { ...configs.momentum, learningRate },
    rmsprop: { ...configs.rmsprop, learningRate },
    adam: { ...configs.adam, learningRate },
  };
}

/** Legacy convenience wrapper for the original curved terrain. */
export function racetrackLoss(point: Point): number {
  return LANDSCAPES.ravine.loss(point);
}

/** Legacy convenience wrapper for the original curved terrain. */
export function racetrackGradient(point: Point): Point {
  return LANDSCAPES.ravine.gradient(point);
}

export function createOptimizerState(point: Point): OptimizerState {
  return {
    point: { ...point },
    velocity: { x: 0, y: 0 },
    squareAverage: { x: 0, y: 0 },
    firstMoment: { x: 0, y: 0 },
    secondMoment: { x: 0, y: 0 },
    step: 0,
  };
}

function subtractScaled(point: Point, direction: Point, scale: number): Point {
  return { x: point.x - scale * direction.x, y: point.y - scale * direction.y };
}

export function optimizerStep(
  name: OptimizerName,
  state: OptimizerState,
  config: OptimizerConfig,
  landscape: LossLandscape = LANDSCAPES.ravine,
): OptimizerState {
  const gradient = landscape.gradient(state.point);
  const step = state.step + 1;
  if (name === "sgd") {
    return { ...state, point: subtractScaled(state.point, gradient, config.learningRate), step };
  }
  if (name === "momentum") {
    const velocity = {
      x: config.momentumBeta * state.velocity.x + gradient.x,
      y: config.momentumBeta * state.velocity.y + gradient.y,
    };
    return { ...state, velocity, point: subtractScaled(state.point, velocity, config.learningRate), step };
  }
  if (name === "rmsprop") {
    const squareAverage = {
      x: config.rmspropDecay * state.squareAverage.x + (1 - config.rmspropDecay) * gradient.x * gradient.x,
      y: config.rmspropDecay * state.squareAverage.y + (1 - config.rmspropDecay) * gradient.y * gradient.y,
    };
    const normalized = {
      x: gradient.x / (Math.sqrt(squareAverage.x) + config.rmspropEpsilon),
      y: gradient.y / (Math.sqrt(squareAverage.y) + config.rmspropEpsilon),
    };
    return { ...state, squareAverage, point: subtractScaled(state.point, normalized, config.learningRate), step };
  }

  const firstMoment = {
    x: config.adamBeta1 * state.firstMoment.x + (1 - config.adamBeta1) * gradient.x,
    y: config.adamBeta1 * state.firstMoment.y + (1 - config.adamBeta1) * gradient.y,
  };
  const secondMoment = {
    x: config.adamBeta2 * state.secondMoment.x + (1 - config.adamBeta2) * gradient.x * gradient.x,
    y: config.adamBeta2 * state.secondMoment.y + (1 - config.adamBeta2) * gradient.y * gradient.y,
  };
  const corrected = {
    x: (firstMoment.x / (1 - config.adamBeta1 ** step)) / (Math.sqrt(secondMoment.x / (1 - config.adamBeta2 ** step)) + config.adamEpsilon),
    y: (firstMoment.y / (1 - config.adamBeta1 ** step)) / (Math.sqrt(secondMoment.y / (1 - config.adamBeta2 ** step)) + config.adamEpsilon),
  };
  return {
    ...state,
    firstMoment,
    secondMoment,
    point: subtractScaled(state.point, corrected, config.learningRate),
    step,
  };
}

function leftDisplayedTerrain(point: Point, bounds: LandscapeBounds): boolean {
  const xMargin = (bounds.xMax - bounds.xMin) * 0.7;
  const yMargin = (bounds.yMax - bounds.yMin) * 0.7;
  return Math.abs(point.x) > Math.max(Math.abs(bounds.xMin), Math.abs(bounds.xMax)) + xMargin
    || Math.abs(point.y) > Math.max(Math.abs(bounds.yMin), Math.abs(bounds.yMax)) + yMargin;
}

export function simulateOptimizer(
  name: OptimizerName,
  start: Point,
  config: OptimizerConfig,
  iterations: number,
  landscape: LossLandscape = LANDSCAPES.ravine,
): Trajectory {
  let state = createOptimizerState(start);
  const points = [{ ...start }];
  const losses = [landscape.loss(start)];
  let diverged = false;
  for (let index = 0; index < iterations; index += 1) {
    state = optimizerStep(name, state, config, landscape);
    const nextLoss = landscape.loss(state.point);
    if (!Number.isFinite(nextLoss) || leftDisplayedTerrain(state.point, landscape.bounds)) {
      diverged = true;
      break;
    }
    points.push({ ...state.point });
    losses.push(nextLoss);
  }
  return { name, points, losses, diverged };
}

export function finiteDifferenceGradient(
  point: Point,
  landscape: LossLandscape = LANDSCAPES.ravine,
  epsilon = 1e-5,
): Point {
  return {
    x: (landscape.loss({ x: point.x + epsilon, y: point.y }) - landscape.loss({ x: point.x - epsilon, y: point.y })) / (2 * epsilon),
    y: (landscape.loss({ x: point.x, y: point.y + epsilon }) - landscape.loss({ x: point.x, y: point.y - epsilon })) / (2 * epsilon),
  };
}
