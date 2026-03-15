import { addVectors, dotProduct, norm, scaleVector, subtractVectors } from "./math";
import type {
  GradientOptimizerId,
  GradientOptimizerSpec,
  GradientParams,
  Objective2D,
  ObjectiveND,
  OptimizerPreset,
  SimulationTrace,
  TraceFrame,
  Vector,
} from "./types";

const DEFAULT_GRADIENT_PARAMS: GradientParams = {
  learningRate: 0.08,
  momentum: 0.9,
  beta1: 0.9,
  beta2: 0.999,
  decay: 0.9,
  epsilon: 1e-8,
};

export const GRADIENT_OPTIMIZERS: Record<
  GradientOptimizerId,
  GradientOptimizerSpec
> = {
  "gradient-descent": {
    id: "gradient-descent",
    label: "Gradient Descent",
    shortLabel: "GD",
    color: "#b45309",
    description: "The honest baseline: one gradient, one step, no memory.",
    formula: "x_{t+1} = x_t - η ∇f(x_t)",
    defaultParams: DEFAULT_GRADIENT_PARAMS,
  },
  momentum: {
    id: "momentum",
    label: "Momentum",
    shortLabel: "Momentum",
    color: "#0f766e",
    description: "Carries velocity forward so narrow valleys stop feeling like pinball.",
    formula: "v_{t+1} = μv_t - η∇f(x_t), x_{t+1} = x_t + v_{t+1}",
    defaultParams: DEFAULT_GRADIENT_PARAMS,
  },
  nesterov: {
    id: "nesterov",
    label: "Nesterov",
    shortLabel: "Nesterov",
    color: "#c2410c",
    description: "Looks ahead before committing, which helps when curvature bends the path.",
    formula: "v_{t+1} = μv_t - η∇f(x_t + μv_t), x_{t+1} = x_t + v_{t+1}",
    defaultParams: DEFAULT_GRADIENT_PARAMS,
  },
  adagrad: {
    id: "adagrad",
    label: "AdaGrad",
    shortLabel: "AdaGrad",
    color: "#4d7c0f",
    description: "Shrinks learning rates where the gradients keep shouting.",
    formula: "x_{t+1} = x_t - η g_t / √(Σ g² + ε)",
    defaultParams: DEFAULT_GRADIENT_PARAMS,
  },
  rmsprop: {
    id: "rmsprop",
    label: "RMSProp",
    shortLabel: "RMSProp",
    color: "#1d4ed8",
    description: "Uses a moving average of gradient scale so the past matters, but not forever.",
    formula: "x_{t+1} = x_t - η g_t / √(E[g²]_t + ε)",
    defaultParams: DEFAULT_GRADIENT_PARAMS,
  },
  adam: {
    id: "adam",
    label: "Adam",
    shortLabel: "Adam",
    color: "#be123c",
    description: "Blends momentum and adaptivity, which is why it so often feels unfair.",
    formula: "m_t, v_t → x_{t+1} = x_t - η m̂_t / √(v̂_t + ε)",
    defaultParams: DEFAULT_GRADIENT_PARAMS,
  },
};

const GRADIENT_PRESETS: Array<OptimizerPreset<GradientOptimizerId, Partial<GradientParams>>> =
  [
    { objectiveId: "bowl", optimizerId: "gradient-descent", params: { learningRate: 0.18 } },
    { objectiveId: "bowl", optimizerId: "momentum", params: { learningRate: 0.14, momentum: 0.88 } },
    { objectiveId: "bowl", optimizerId: "nesterov", params: { learningRate: 0.14, momentum: 0.9 } },
    { objectiveId: "bowl", optimizerId: "adagrad", params: { learningRate: 0.65 } },
    { objectiveId: "bowl", optimizerId: "rmsprop", params: { learningRate: 0.18, decay: 0.92 } },
    { objectiveId: "bowl", optimizerId: "adam", params: { learningRate: 0.16 } },
    { objectiveId: "ravine", optimizerId: "gradient-descent", params: { learningRate: 0.08 } },
    { objectiveId: "ravine", optimizerId: "momentum", params: { learningRate: 0.05, momentum: 0.92 } },
    { objectiveId: "ravine", optimizerId: "nesterov", params: { learningRate: 0.045, momentum: 0.93 } },
    { objectiveId: "ravine", optimizerId: "adagrad", params: { learningRate: 0.55 } },
    { objectiveId: "ravine", optimizerId: "rmsprop", params: { learningRate: 0.085, decay: 0.95 } },
    { objectiveId: "ravine", optimizerId: "adam", params: { learningRate: 0.07 } },
    { objectiveId: "saddle", optimizerId: "gradient-descent", params: { learningRate: 0.05 } },
    { objectiveId: "saddle", optimizerId: "momentum", params: { learningRate: 0.045, momentum: 0.88 } },
    { objectiveId: "saddle", optimizerId: "nesterov", params: { learningRate: 0.04, momentum: 0.9 } },
    { objectiveId: "saddle", optimizerId: "adagrad", params: { learningRate: 0.3 } },
    { objectiveId: "saddle", optimizerId: "rmsprop", params: { learningRate: 0.08 } },
    { objectiveId: "saddle", optimizerId: "adam", params: { learningRate: 0.075 } },
    { objectiveId: "rosenbrock", optimizerId: "gradient-descent", params: { learningRate: 0.004 } },
    { objectiveId: "rosenbrock", optimizerId: "momentum", params: { learningRate: 0.003, momentum: 0.92 } },
    { objectiveId: "rosenbrock", optimizerId: "nesterov", params: { learningRate: 0.0028, momentum: 0.92 } },
    { objectiveId: "rosenbrock", optimizerId: "adagrad", params: { learningRate: 0.14 } },
    { objectiveId: "rosenbrock", optimizerId: "rmsprop", params: { learningRate: 0.018 } },
    { objectiveId: "rosenbrock", optimizerId: "adam", params: { learningRate: 0.03 } },
    { objectiveId: "himmelblau", optimizerId: "gradient-descent", params: { learningRate: 0.015 } },
    { objectiveId: "himmelblau", optimizerId: "momentum", params: { learningRate: 0.012, momentum: 0.9 } },
    { objectiveId: "himmelblau", optimizerId: "nesterov", params: { learningRate: 0.011, momentum: 0.9 } },
    { objectiveId: "himmelblau", optimizerId: "adagrad", params: { learningRate: 0.11 } },
    { objectiveId: "himmelblau", optimizerId: "rmsprop", params: { learningRate: 0.03 } },
    { objectiveId: "himmelblau", optimizerId: "adam", params: { learningRate: 0.038 } },
  ];

interface GradientState {
  point: Vector;
  velocity: Vector;
  sumSquares: Vector;
  avgSquares: Vector;
  firstMoment: Vector;
  secondMoment: Vector;
  stepIndex: number;
}

interface GradientStepResult {
  state: GradientState;
  gradient: Vector;
  diagnostics: Record<string, number>;
}

export interface GradientTraceConfig {
  objective: Objective2D | ObjectiveND;
  optimizerId: GradientOptimizerId;
  start: Vector;
  steps: number;
  params?: Partial<GradientParams>;
  successThreshold?: number;
}

function createInitialState(point: Vector): GradientState {
  return {
    point: [...point],
    velocity: point.map(() => 0),
    sumSquares: point.map(() => 0),
    avgSquares: point.map(() => 0),
    firstMoment: point.map(() => 0),
    secondMoment: point.map(() => 0),
    stepIndex: 0,
  };
}

function mergeParams(
  objectiveId: string,
  optimizerId: GradientOptimizerId,
  overrides?: Partial<GradientParams>,
): GradientParams {
  const preset = GRADIENT_PRESETS.find(
    (candidate) =>
      candidate.objectiveId === objectiveId &&
      candidate.optimizerId === optimizerId,
  );

  return {
    ...DEFAULT_GRADIENT_PARAMS,
    ...GRADIENT_OPTIMIZERS[optimizerId].defaultParams,
    ...(preset?.params ?? {}),
    ...(overrides ?? {}),
  };
}

function meanAbs(values: Vector): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + Math.abs(value), 0) / values.length;
}

function stepGradient(
  objective: Objective2D | ObjectiveND,
  optimizerId: GradientOptimizerId,
  state: GradientState,
  params: GradientParams,
): GradientStepResult {
  if (!objective.gradient) {
    throw new Error(`Objective "${objective.id}" does not expose a gradient.`);
  }

  const gradient =
    optimizerId === "nesterov"
      ? objective.gradient(
          addVectors(state.point, scaleVector(state.velocity, params.momentum)),
        )
      : objective.gradient(state.point);

  const nextState: GradientState = {
    ...state,
    point: [...state.point],
    velocity: [...state.velocity],
    sumSquares: [...state.sumSquares],
    avgSquares: [...state.avgSquares],
    firstMoment: [...state.firstMoment],
    secondMoment: [...state.secondMoment],
    stepIndex: state.stepIndex + 1,
  };

  switch (optimizerId) {
    case "gradient-descent": {
      nextState.point = subtractVectors(
        state.point,
        scaleVector(gradient, params.learningRate),
      );
      break;
    }
    case "momentum":
    case "nesterov": {
      nextState.velocity = state.velocity.map(
        (value, index) =>
          params.momentum * value - params.learningRate * (gradient[index] ?? 0),
      );
      nextState.point = addVectors(state.point, nextState.velocity);
      break;
    }
    case "adagrad": {
      nextState.sumSquares = state.sumSquares.map(
        (value, index) => value + (gradient[index] ?? 0) ** 2,
      );
      nextState.point = state.point.map((value, index) => {
        const denom = Math.sqrt(nextState.sumSquares[index] ?? 0) + params.epsilon;
        return value - (params.learningRate * (gradient[index] ?? 0)) / denom;
      });
      break;
    }
    case "rmsprop": {
      nextState.avgSquares = state.avgSquares.map(
        (value, index) =>
          params.decay * value + (1 - params.decay) * (gradient[index] ?? 0) ** 2,
      );
      nextState.point = state.point.map((value, index) => {
        const denom = Math.sqrt(nextState.avgSquares[index] ?? 0) + params.epsilon;
        return value - (params.learningRate * (gradient[index] ?? 0)) / denom;
      });
      break;
    }
    case "adam": {
      nextState.firstMoment = state.firstMoment.map(
        (value, index) =>
          params.beta1 * value + (1 - params.beta1) * (gradient[index] ?? 0),
      );
      nextState.secondMoment = state.secondMoment.map(
        (value, index) =>
          params.beta2 * value + (1 - params.beta2) * (gradient[index] ?? 0) ** 2,
      );

      const biasCorrectedFirst = nextState.firstMoment.map(
        (value) => value / (1 - params.beta1 ** nextState.stepIndex),
      );
      const biasCorrectedSecond = nextState.secondMoment.map(
        (value) => value / (1 - params.beta2 ** nextState.stepIndex),
      );

      nextState.point = state.point.map((value, index) => {
        const denom =
          Math.sqrt(biasCorrectedSecond[index] ?? 0) + params.epsilon;
        return value - (params.learningRate * (biasCorrectedFirst[index] ?? 0)) / denom;
      });
      break;
    }
  }

  const stepVector = subtractVectors(nextState.point, state.point);
  const diagnostics: Record<string, number> = {
    effectiveLearningRate:
      norm(gradient) < 1e-9 ? 0 : norm(stepVector) / Math.max(norm(gradient), 1e-9),
    memoryMagnitude:
      optimizerId === "momentum" || optimizerId === "nesterov"
        ? norm(nextState.velocity)
        : optimizerId === "adam"
          ? norm(nextState.firstMoment)
          : 0,
    adaptationStrength:
      optimizerId === "adagrad"
        ? meanAbs(nextState.sumSquares.map((value) => 1 / (Math.sqrt(value) + params.epsilon)))
        : optimizerId === "rmsprop"
          ? meanAbs(nextState.avgSquares.map((value) => 1 / (Math.sqrt(value) + params.epsilon)))
          : optimizerId === "adam"
            ? meanAbs(
                nextState.secondMoment.map(
                  (value) => 1 / (Math.sqrt(value) + params.epsilon),
                ),
              )
            : 1,
    updateMagnitude: norm(stepVector),
  };

  return { state: nextState, gradient, diagnostics };
}

function createFrame(
  index: number,
  point: Vector,
  bestPoint: Vector,
  bestValue: number,
  value: number,
  pathLength: number,
  evaluations: number,
  oscillationCount: number,
  diagnostics: Record<string, number>,
  gradientNorm: number | null,
  stepSize: number,
): TraceFrame {
  return {
    index,
    point: [...point],
    bestPoint: [...bestPoint],
    bestValue,
    value,
    gradientNorm,
    stepSize,
    pathLength,
    evaluations,
    oscillationCount,
    diagnostics,
  };
}

export function runGradientTrace({
  objective,
  optimizerId,
  start,
  steps,
  params,
  successThreshold,
}: GradientTraceConfig): SimulationTrace {
  const spec = GRADIENT_OPTIMIZERS[optimizerId];
  const mergedParams = mergeParams(objective.id, optimizerId, params);
  let state = createInitialState(start);
  let value = objective.value(state.point);
  let bestPoint = [...state.point];
  let bestValue = value;
  let pathLength = 0;
  let oscillationCount = 0;
  let previousStep: Vector | null = null;
  let thresholdIndex: number | null = value <= (successThreshold ?? objective.successThreshold) ? 0 : null;
  const frames: TraceFrame[] = [
    createFrame(
      0,
      state.point,
      bestPoint,
      bestValue,
      value,
      pathLength,
      1,
      oscillationCount,
      {
        effectiveLearningRate: mergedParams.learningRate,
        memoryMagnitude: 0,
        adaptationStrength: 1,
        updateMagnitude: 0,
      },
      objective.gradient ? norm(objective.gradient(state.point)) : null,
      0,
    ),
  ];
  let diverged = false;

  for (let index = 1; index <= steps; index += 1) {
    const previousPoint = [...state.point];
    const { state: nextState, gradient, diagnostics } = stepGradient(
      objective,
      optimizerId,
      state,
      mergedParams,
    );
    state = nextState;
    value = objective.value(state.point);

    const stepVector = subtractVectors(state.point, previousPoint);
    const stepSize = norm(stepVector);
    pathLength += stepSize;
    if (previousStep && dotProduct(previousStep, stepVector) < 0) {
      oscillationCount += 1;
    }
    previousStep = stepVector;

    if (value < bestValue) {
      bestValue = value;
      bestPoint = [...state.point];
    }

    if (thresholdIndex === null && bestValue <= (successThreshold ?? objective.successThreshold)) {
      thresholdIndex = index;
    }

    if (!Number.isFinite(value) || !state.point.every(Number.isFinite)) {
      diverged = true;
    }

    if (norm(state.point) > 40 || Math.abs(value) > 1e6) {
      diverged = true;
    }

    frames.push(
      createFrame(
        index,
        state.point,
        bestPoint,
        bestValue,
        value,
        pathLength,
        index + 1,
        oscillationCount,
        diagnostics,
        norm(gradient),
        stepSize,
      ),
    );

    if (diverged) break;
  }

  const improvementFrame = frames[Math.min(frames.length - 1, 24)];

  return {
    optimizerId: spec.id,
    optimizerLabel: spec.label,
    color: spec.color,
    family: "gradient",
    frames,
    thresholdIndex,
    diverged,
    startValue: frames[0]?.value ?? value,
    endValue: frames[frames.length - 1]?.value ?? value,
    improvementPerWindow:
      (frames[0]?.value ?? 0) - (improvementFrame?.value ?? frames[0]?.value ?? 0),
    finalSpread: null,
  };
}

export function getGradientOptimizerList(): GradientOptimizerSpec[] {
  return Object.values(GRADIENT_OPTIMIZERS);
}
