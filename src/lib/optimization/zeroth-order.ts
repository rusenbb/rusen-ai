import {
  addVectors,
  clampPointToDomain,
  covarianceSpread,
  distance,
  eigenDecomposition2x2,
  meanVector,
  scaleVector,
  subtractVectors,
} from "./math";
import { createRng, sampleGaussian2D, type SeededRng } from "./rng";
import type {
  Objective2D,
  OptimizerPreset,
  SimulationTrace,
  TraceFrame,
  TraceOverlay,
  Vector,
  ZerothOrderOptimizerId,
  ZerothOrderOptimizerSpec,
  ZerothOrderParams,
} from "./types";

const DEFAULT_ZEROTH_PARAMS: ZerothOrderParams = {
  stepScale: 0.48,
  populationSize: 12,
  eliteFraction: 0.35,
  simplexScale: 0.6,
  temperature: 1.3,
  cooling: 0.96,
  inertia: 0.68,
  cognitive: 1.25,
  social: 1.35,
  covarianceDecay: 0.55,
};

export const ZEROTH_ORDER_OPTIMIZERS: Record<
  ZerothOrderOptimizerId,
  ZerothOrderOptimizerSpec
> = {
  "random-search": {
    id: "random-search",
    label: "Random Search",
    shortLabel: "Random",
    color: "#64748b",
    description: "A healthy baseline: more honest than clever, more useful than people admit.",
    formula: "Sample, evaluate, keep the best.",
    defaultParams: DEFAULT_ZEROTH_PARAMS,
  },
  "nelder-mead": {
    id: "nelder-mead",
    label: "Nelder-Mead",
    shortLabel: "Nelder-Mead",
    color: "#0f766e",
    description: "Simplex geometry instead of gradients: reflect, expand, contract, repeat.",
    formula: "Simplex reflections and contractions over function values only.",
    defaultParams: DEFAULT_ZEROTH_PARAMS,
  },
  "simulated-annealing": {
    id: "simulated-annealing",
    label: "Simulated Annealing",
    shortLabel: "Annealing",
    color: "#c2410c",
    description: "Allows bad moves early so the search can stop acting short-sighted.",
    formula: "Accept uphill moves with temperature-scaled probability.",
    defaultParams: DEFAULT_ZEROTH_PARAMS,
  },
  "particle-swarm": {
    id: "particle-swarm",
    label: "Particle Swarm",
    shortLabel: "PSO",
    color: "#1d4ed8",
    description: "A flock of guesses that mixes private memory with social pressure.",
    formula: "Velocity update with inertia + cognitive + social terms.",
    defaultParams: DEFAULT_ZEROTH_PARAMS,
  },
  "cma-es": {
    id: "cma-es",
    label: "CMA-ES",
    shortLabel: "CMA-ES",
    color: "#be123c",
    description: "Adapts a search distribution so the covariance itself becomes the strategy.",
    formula: "Sample from N(m, σ²C), rank, and adapt mean + covariance.",
    defaultParams: DEFAULT_ZEROTH_PARAMS,
  },
};

const ZEROTH_PRESETS: Array<OptimizerPreset<ZerothOrderOptimizerId, Partial<ZerothOrderParams>>> =
  [
    { objectiveId: "bowl", optimizerId: "random-search", params: { stepScale: 0.85, populationSize: 10 } },
    { objectiveId: "bowl", optimizerId: "nelder-mead", params: { simplexScale: 0.85 } },
    { objectiveId: "bowl", optimizerId: "simulated-annealing", params: { stepScale: 0.62, temperature: 1.2, cooling: 0.965 } },
    { objectiveId: "bowl", optimizerId: "particle-swarm", params: { stepScale: 0.58, populationSize: 14 } },
    { objectiveId: "bowl", optimizerId: "cma-es", params: { stepScale: 0.5, populationSize: 12 } },
    { objectiveId: "ravine", optimizerId: "random-search", params: { stepScale: 0.65, populationSize: 12 } },
    { objectiveId: "ravine", optimizerId: "nelder-mead", params: { simplexScale: 0.55 } },
    { objectiveId: "ravine", optimizerId: "simulated-annealing", params: { stepScale: 0.46, temperature: 1.1 } },
    { objectiveId: "ravine", optimizerId: "particle-swarm", params: { stepScale: 0.4, populationSize: 14 } },
    { objectiveId: "ravine", optimizerId: "cma-es", params: { stepScale: 0.35, populationSize: 12 } },
    { objectiveId: "rosenbrock", optimizerId: "random-search", params: { stepScale: 0.55, populationSize: 14 } },
    { objectiveId: "rosenbrock", optimizerId: "nelder-mead", params: { simplexScale: 0.48 } },
    { objectiveId: "rosenbrock", optimizerId: "simulated-annealing", params: { stepScale: 0.32, temperature: 1.3 } },
    { objectiveId: "rosenbrock", optimizerId: "particle-swarm", params: { stepScale: 0.34, populationSize: 16 } },
    { objectiveId: "rosenbrock", optimizerId: "cma-es", params: { stepScale: 0.28, populationSize: 14 } },
    { objectiveId: "himmelblau", optimizerId: "random-search", params: { stepScale: 1.1, populationSize: 14 } },
    { objectiveId: "himmelblau", optimizerId: "nelder-mead", params: { simplexScale: 0.7 } },
    { objectiveId: "himmelblau", optimizerId: "simulated-annealing", params: { stepScale: 0.62, temperature: 1.4 } },
    { objectiveId: "himmelblau", optimizerId: "particle-swarm", params: { stepScale: 0.65, populationSize: 16 } },
    { objectiveId: "himmelblau", optimizerId: "cma-es", params: { stepScale: 0.5, populationSize: 16 } },
    { objectiveId: "rastrigin", optimizerId: "random-search", params: { stepScale: 0.95, populationSize: 16 } },
    { objectiveId: "rastrigin", optimizerId: "nelder-mead", params: { simplexScale: 0.5 } },
    { objectiveId: "rastrigin", optimizerId: "simulated-annealing", params: { stepScale: 0.55, temperature: 1.5 } },
    { objectiveId: "rastrigin", optimizerId: "particle-swarm", params: { stepScale: 0.52, populationSize: 18 } },
    { objectiveId: "rastrigin", optimizerId: "cma-es", params: { stepScale: 0.42, populationSize: 16 } },
    { objectiveId: "noisy-bowl", optimizerId: "random-search", params: { stepScale: 0.95, populationSize: 16 } },
    { objectiveId: "noisy-bowl", optimizerId: "nelder-mead", params: { simplexScale: 0.7 } },
    { objectiveId: "noisy-bowl", optimizerId: "simulated-annealing", params: { stepScale: 0.7, temperature: 1.6, cooling: 0.97 } },
    { objectiveId: "noisy-bowl", optimizerId: "particle-swarm", params: { stepScale: 0.62, populationSize: 18 } },
    { objectiveId: "noisy-bowl", optimizerId: "cma-es", params: { stepScale: 0.5, populationSize: 16 } },
    { objectiveId: "cliff", optimizerId: "random-search", params: { stepScale: 0.88, populationSize: 14 } },
    { objectiveId: "cliff", optimizerId: "nelder-mead", params: { simplexScale: 0.6 } },
    { objectiveId: "cliff", optimizerId: "simulated-annealing", params: { stepScale: 0.58, temperature: 1.4 } },
    { objectiveId: "cliff", optimizerId: "particle-swarm", params: { stepScale: 0.52, populationSize: 16 } },
    { objectiveId: "cliff", optimizerId: "cma-es", params: { stepScale: 0.46, populationSize: 14 } },
  ];

interface EvaluatedCandidate {
  point: Vector;
  value: number;
}

interface AskResult<TContext = unknown> {
  candidates: Vector[];
  context: TContext;
  overlay?: TraceOverlay;
}

interface ZerothSnapshot {
  point: Vector;
  value: number;
  bestPoint: Vector;
  bestValue: number;
  evaluations: number;
  diagnostics: Record<string, number>;
  overlay?: TraceOverlay;
  spread: number | null;
}

interface ZerothOrderOptimizer<TState, TContext = unknown> {
  id: ZerothOrderOptimizerId;
  init: (
    objective: Objective2D,
    start: Vector,
    params: ZerothOrderParams,
    rng: SeededRng,
  ) => TState;
  snapshot: (state: TState) => ZerothSnapshot;
  ask: (
    state: TState,
    objective: Objective2D,
    params: ZerothOrderParams,
    rng: SeededRng,
  ) => AskResult<TContext>;
  tell: (
    state: TState,
    objective: Objective2D,
    params: ZerothOrderParams,
    rng: SeededRng,
    evaluations: EvaluatedCandidate[],
    context: TContext,
  ) => TState;
}

interface RunZerothTraceConfig {
  objective: Objective2D;
  optimizerId: ZerothOrderOptimizerId;
  start: Vector;
  evaluationBudget: number;
  seed: number;
  params?: Partial<ZerothOrderParams>;
}

function mergeParams(
  objectiveId: string,
  optimizerId: ZerothOrderOptimizerId,
  overrides?: Partial<ZerothOrderParams>,
): ZerothOrderParams {
  const preset = ZEROTH_PRESETS.find(
    (candidate) =>
      candidate.objectiveId === objectiveId &&
      candidate.optimizerId === optimizerId,
  );

  return {
    ...DEFAULT_ZEROTH_PARAMS,
    ...ZEROTH_ORDER_OPTIMIZERS[optimizerId].defaultParams,
    ...(preset?.params ?? {}),
    ...(overrides ?? {}),
  };
}

function createFrame(
  index: number,
  snapshot: ZerothSnapshot,
  pathLength: number,
  oscillationCount: number,
  stepSize: number,
): TraceFrame {
  return {
    index,
    point: [...snapshot.point],
    bestPoint: [...snapshot.bestPoint],
    bestValue: snapshot.bestValue,
    value: snapshot.value,
    gradientNorm: null,
    stepSize,
    pathLength,
    evaluations: snapshot.evaluations,
    oscillationCount,
    diagnostics: snapshot.diagnostics,
    overlay: snapshot.overlay,
  };
}

type RandomState = {
  center: Vector;
  currentPoint: Vector;
  currentValue: number;
  bestPoint: Vector;
  bestValue: number;
  evaluations: number;
  overlay?: TraceOverlay;
  spread: number | null;
};

const randomSearchOptimizer: ZerothOrderOptimizer<RandomState, null> = {
  id: "random-search",
  init: (objective, start) => {
    const currentPoint = clampPointToDomain(start, objective.domain);
    const currentValue = objective.value(currentPoint);

    return {
      center: currentPoint,
      currentPoint,
      currentValue,
      bestPoint: currentPoint,
      bestValue: currentValue,
      evaluations: 1,
      spread: null,
    };
  },
  snapshot: (state) => ({
    point: state.currentPoint,
    value: state.currentValue,
    bestPoint: state.bestPoint,
    bestValue: state.bestValue,
    evaluations: state.evaluations,
    diagnostics: {
      candidateCount: state.overlay?.points?.length ?? 0,
      bestImprovement: state.currentValue - state.bestValue,
      searchSpread: state.spread ?? 0,
    },
    overlay: state.overlay,
    spread: state.spread,
  }),
  ask: (state, objective, params, rng) => {
    const candidates = new Array<Vector>(params.populationSize);
    const dx = objective.domain.x[1] - objective.domain.x[0];
    const dy = objective.domain.y[1] - objective.domain.y[0];

    for (let index = 0; index < params.populationSize; index += 1) {
      const localBias = index < Math.ceil(params.populationSize * 0.75);
      const point = localBias
        ? [
            state.bestPoint[0] + rng.normal() * params.stepScale,
            state.bestPoint[1] + rng.normal() * params.stepScale,
          ]
        : [
            objective.domain.x[0] + rng.next() * dx,
            objective.domain.y[0] + rng.next() * dy,
          ];
      candidates[index] = clampPointToDomain(point, objective.domain);
    }

    return {
      candidates,
      context: null,
      overlay: { points: candidates },
    };
  },
  tell: (state, objective, _params, _rng, evaluations) => {
    let bestCandidate = evaluations[0] ?? {
      point: state.bestPoint,
      value: state.bestValue,
    };

    for (const candidate of evaluations) {
      if (candidate.value < bestCandidate.value) {
        bestCandidate = candidate;
      }
    }

    const improved = bestCandidate.value < state.bestValue;
    const overlay = { points: evaluations.map((candidate) => candidate.point) };

    return {
      center: improved ? bestCandidate.point : state.center,
      currentPoint: bestCandidate.point,
      currentValue: bestCandidate.value,
      bestPoint: improved ? bestCandidate.point : state.bestPoint,
      bestValue: improved ? bestCandidate.value : state.bestValue,
      evaluations: state.evaluations + evaluations.length,
      overlay,
      spread: covarianceSpread(evaluations.map((candidate) => candidate.point)),
    };
  },
};

type NelderState = {
  simplex: Vector[];
  values: number[];
  bestPoint: Vector;
  bestValue: number;
  evaluations: number;
  spread: number | null;
};

type NelderContext = {
  centroid: Vector;
  reflection: Vector;
  expansion: Vector;
  outsideContraction: Vector;
  insideContraction: Vector;
  sortedIndices: number[];
};

function simplexCentroid(simplex: Vector[], ignoreIndex: number): Vector {
  const kept = simplex.filter((_, index) => index !== ignoreIndex);
  return meanVector(kept);
}

const nelderMeadOptimizer: ZerothOrderOptimizer<NelderState, NelderContext> = {
  id: "nelder-mead",
  init: (objective, start, params) => {
    const a = clampPointToDomain(start, objective.domain);
    const b = clampPointToDomain(
      [a[0] + params.simplexScale, a[1] - params.simplexScale * 0.15],
      objective.domain,
    );
    const c = clampPointToDomain(
      [a[0] - params.simplexScale * 0.25, a[1] + params.simplexScale],
      objective.domain,
    );
    const simplex = [a, b, c];
    const values = simplex.map((point) => objective.value(point));
    const bestIndex = values.indexOf(Math.min(...values));
    return {
      simplex,
      values,
      bestPoint: simplex[bestIndex] ?? a,
      bestValue: values[bestIndex] ?? values[0] ?? 0,
      evaluations: simplex.length,
      spread: covarianceSpread(simplex),
    };
  },
  snapshot: (state) => {
    const centroid = meanVector(state.simplex);
    const centroidValue =
      state.values.reduce((sum, value) => sum + value, 0) / state.values.length;
    return {
      point: centroid,
      value: centroidValue,
      bestPoint: state.bestPoint,
      bestValue: state.bestValue,
      evaluations: state.evaluations,
      diagnostics: {
        simplexSpread: state.spread ?? 0,
        bestSimplexValue: state.bestValue,
      },
      overlay: { simplex: state.simplex },
      spread: state.spread,
    };
  },
  ask: (state, objective) => {
    const sortedIndices = [0, 1, 2].sort(
      (left, right) => (state.values[left] ?? 0) - (state.values[right] ?? 0),
    );
    const worstIndex = sortedIndices[2] ?? 2;
    const centroid = simplexCentroid(state.simplex, worstIndex);
    const worstPoint = state.simplex[worstIndex] ?? state.simplex[2] ?? [0, 0];
    const reflection = clampPointToDomain(
      addVectors(centroid, subtractVectors(centroid, worstPoint)),
      objective.domain,
    );
    const expansion = clampPointToDomain(
      addVectors(centroid, scaleVector(subtractVectors(reflection, centroid), 2)),
      objective.domain,
    );
    const outsideContraction = clampPointToDomain(
      addVectors(centroid, scaleVector(subtractVectors(reflection, centroid), 0.5)),
      objective.domain,
    );
    const insideContraction = clampPointToDomain(
      addVectors(centroid, scaleVector(subtractVectors(worstPoint, centroid), 0.5)),
      objective.domain,
    );

    return {
      candidates: [reflection, expansion, outsideContraction, insideContraction],
      context: {
        centroid,
        reflection,
        expansion,
        outsideContraction,
        insideContraction,
        sortedIndices,
      },
      overlay: { simplex: state.simplex, points: [reflection, expansion, outsideContraction, insideContraction] },
    };
  },
  tell: (state, objective, _params, _rng, evaluations, context) => {
    const reflectionValue = evaluations[0]?.value ?? Number.POSITIVE_INFINITY;
    const expansionValue = evaluations[1]?.value ?? Number.POSITIVE_INFINITY;
    const outsideContractionValue =
      evaluations[2]?.value ?? Number.POSITIVE_INFINITY;
    const insideContractionValue =
      evaluations[3]?.value ?? Number.POSITIVE_INFINITY;

    const sorted = context.sortedIndices;
    const bestIndex = sorted[0] ?? 0;
    const secondIndex = sorted[1] ?? 1;
    const worstIndex = sorted[2] ?? 2;
    const simplex = [...state.simplex];
    const values = [...state.values];
    const bestValue = values[bestIndex] ?? values[0] ?? 0;
    const secondValue = values[secondIndex] ?? values[1] ?? 0;
    const worstValue = values[worstIndex] ?? values[2] ?? 0;

    if (reflectionValue < bestValue) {
      simplex[worstIndex] = evaluations[1]?.point ?? context.reflection;
      values[worstIndex] = Math.min(reflectionValue, expansionValue);
    } else if (reflectionValue < secondValue) {
      simplex[worstIndex] = evaluations[0]?.point ?? context.reflection;
      values[worstIndex] = reflectionValue;
    } else if (reflectionValue < worstValue && outsideContractionValue <= reflectionValue) {
      simplex[worstIndex] = evaluations[2]?.point ?? context.outsideContraction;
      values[worstIndex] = outsideContractionValue;
    } else if (insideContractionValue < worstValue) {
      simplex[worstIndex] = evaluations[3]?.point ?? context.insideContraction;
      values[worstIndex] = insideContractionValue;
    } else {
      const bestPoint = simplex[bestIndex] ?? simplex[0] ?? [0, 0];
      for (let index = 0; index < simplex.length; index += 1) {
        if (index === bestIndex) continue;
        simplex[index] = clampPointToDomain(
          addVectors(bestPoint, scaleVector(subtractVectors(simplex[index] ?? bestPoint, bestPoint), 0.5)),
          objective.domain,
        );
        values[index] = objective.value(simplex[index] ?? bestPoint);
      }
    }

    const bestSimplexValue = Math.min(...values);
    const bestSimplexIndex = values.indexOf(bestSimplexValue);

    return {
      simplex,
      values,
      bestPoint: simplex[bestSimplexIndex] ?? state.bestPoint,
      bestValue: bestSimplexValue,
      evaluations: state.evaluations + evaluations.length,
      spread: covarianceSpread(simplex),
    };
  },
};

type AnnealingState = {
  currentPoint: Vector;
  currentValue: number;
  bestPoint: Vector;
  bestValue: number;
  temperature: number;
  evaluations: number;
  acceptedRatio: number;
  overlay?: TraceOverlay;
};

const simulatedAnnealingOptimizer: ZerothOrderOptimizer<AnnealingState, Vector> =
  {
    id: "simulated-annealing",
    init: (objective, start, params) => {
      const point = clampPointToDomain(start, objective.domain);
      const value = objective.value(point);
      return {
        currentPoint: point,
        currentValue: value,
        bestPoint: point,
        bestValue: value,
        temperature: params.temperature,
        evaluations: 1,
        acceptedRatio: 0,
      };
    },
    snapshot: (state) => ({
      point: state.currentPoint,
      value: state.currentValue,
      bestPoint: state.bestPoint,
      bestValue: state.bestValue,
      evaluations: state.evaluations,
      diagnostics: {
        temperature: state.temperature,
        acceptedRatio: state.acceptedRatio,
        bestGap: state.currentValue - state.bestValue,
      },
      overlay: state.overlay,
      spread: null,
    }),
    ask: (state, objective, params, rng) => {
      const jump = [
        state.currentPoint[0] + rng.normal() * params.stepScale * Math.max(0.2, state.temperature),
        state.currentPoint[1] + rng.normal() * params.stepScale * Math.max(0.2, state.temperature),
      ];
      const candidate = clampPointToDomain(jump, objective.domain);

      return {
        candidates: [candidate],
        context: candidate,
        overlay: {
          segments: [{ from: state.currentPoint, to: candidate }],
        },
      };
    },
    tell: (state, _objective, params, rng, evaluations, candidate) => {
      const evaluation = evaluations[0];
      if (!evaluation) {
        return state;
      }
      const delta = evaluation.value - state.currentValue;
      const accepted =
        delta <= 0 || rng.next() < Math.exp(-delta / Math.max(0.08, state.temperature));
      const currentPoint = accepted ? evaluation.point : state.currentPoint;
      const currentValue = accepted ? evaluation.value : state.currentValue;
      const bestImproved = currentValue < state.bestValue;

      return {
        currentPoint,
        currentValue,
        bestPoint: bestImproved ? currentPoint : state.bestPoint,
        bestValue: bestImproved ? currentValue : state.bestValue,
        temperature: state.temperature * params.cooling,
        evaluations: state.evaluations + 1,
        acceptedRatio: accepted
          ? state.acceptedRatio * 0.85 + 0.15
          : state.acceptedRatio * 0.85,
        overlay: {
          segments: [{ from: state.currentPoint, to: candidate, accepted }],
        },
      };
    },
  };

type PsoState = {
  positions: Vector[];
  velocities: Vector[];
  personalBest: Vector[];
  personalValues: number[];
  globalBest: Vector;
  globalValue: number;
  evaluations: number;
};

type PsoContext = {
  candidates: Vector[];
  velocities: Vector[];
};

const particleSwarmOptimizer: ZerothOrderOptimizer<PsoState, PsoContext> = {
  id: "particle-swarm",
  init: (objective, start, params, rng) => {
    const positions = new Array<Vector>(params.populationSize);
    const velocities = new Array<Vector>(params.populationSize);

    for (let index = 0; index < params.populationSize; index += 1) {
      positions[index] = clampPointToDomain(
        [start[0] + rng.normal() * params.stepScale, start[1] + rng.normal() * params.stepScale],
        objective.domain,
      );
      velocities[index] = [rng.normal() * 0.05, rng.normal() * 0.05];
    }

    const personalValues = positions.map((point) => objective.value(point));
    const bestValue = Math.min(...personalValues);
    const bestIndex = personalValues.indexOf(bestValue);

    return {
      positions,
      velocities,
      personalBest: positions.map((point) => [...point]),
      personalValues,
      globalBest: positions[bestIndex] ?? positions[0] ?? start,
      globalValue: bestValue,
      evaluations: positions.length,
    };
  },
  snapshot: (state) => ({
    point: state.globalBest,
    value: state.globalValue,
    bestPoint: state.globalBest,
    bestValue: state.globalValue,
    evaluations: state.evaluations,
    diagnostics: {
      swarmSpread: covarianceSpread(state.positions),
      particleCount: state.positions.length,
      velocity: covarianceSpread(state.velocities),
    },
    overlay: { points: state.positions },
    spread: covarianceSpread(state.positions),
  }),
  ask: (state, objective, params, rng) => {
    const candidates = new Array<Vector>(state.positions.length);
    const velocities = new Array<Vector>(state.positions.length);

    for (let index = 0; index < state.positions.length; index += 1) {
      const point = state.positions[index] ?? state.globalBest;
      const velocity = state.velocities[index] ?? [0, 0];
      const pBest = state.personalBest[index] ?? point;
      const nextVelocity = [
        params.inertia * (velocity[0] ?? 0) +
          params.cognitive * rng.next() * ((pBest[0] ?? 0) - (point[0] ?? 0)) +
          params.social * rng.next() * ((state.globalBest[0] ?? 0) - (point[0] ?? 0)),
        params.inertia * (velocity[1] ?? 0) +
          params.cognitive * rng.next() * ((pBest[1] ?? 0) - (point[1] ?? 0)) +
          params.social * rng.next() * ((state.globalBest[1] ?? 0) - (point[1] ?? 0)),
      ];
      velocities[index] = nextVelocity;
      candidates[index] = clampPointToDomain(
        addVectors(point, nextVelocity),
        objective.domain,
      );
    }

    return {
      candidates,
      context: { candidates, velocities },
      overlay: { points: candidates },
    };
  },
  tell: (state, _objective, _params, _rng, evaluations, context) => {
    const personalBest = state.personalBest.map((point) => [...point]);
    const personalValues = [...state.personalValues];
    let globalBest = state.globalBest;
    let globalValue = state.globalValue;

    for (let index = 0; index < evaluations.length; index += 1) {
      const candidate = evaluations[index];
      if (!candidate) continue;
      if (candidate.value < (personalValues[index] ?? Number.POSITIVE_INFINITY)) {
        personalValues[index] = candidate.value;
        personalBest[index] = candidate.point;
      }
      if (candidate.value < globalValue) {
        globalValue = candidate.value;
        globalBest = candidate.point;
      }
    }

    return {
      positions: context.candidates.map((point) => [...point]),
      velocities: context.velocities.map((point) => [...point]),
      personalBest,
      personalValues,
      globalBest,
      globalValue,
      evaluations: state.evaluations + evaluations.length,
    };
  },
};

type CmaState = {
  mean: Vector;
  covariance: readonly [number, number, number];
  sigma: number;
  bestPoint: Vector;
  bestValue: number;
  evaluations: number;
  spread: number | null;
};

const cmaEsOptimizer: ZerothOrderOptimizer<CmaState, Vector[]> = {
  id: "cma-es",
  init: (objective, start, params) => {
    const point = clampPointToDomain(start, objective.domain);
    return {
      mean: point,
      covariance: [1, 0, 1],
      sigma: params.stepScale,
      bestPoint: point,
      bestValue: objective.value(point),
      evaluations: 1,
      spread: null,
    };
  },
  snapshot: (state) => {
    const eig = eigenDecomposition2x2(state.covariance);
    return {
      point: state.mean,
      value: state.bestValue,
      bestPoint: state.bestPoint,
      bestValue: state.bestValue,
      evaluations: state.evaluations,
      diagnostics: {
        sigma: state.sigma,
        covarianceSpread: state.spread ?? 0,
        covarianceAspect: (eig.radii[0] ?? 1) / Math.max(eig.radii[1] ?? 1, 1e-6),
      },
      overlay: {
        covariance: {
          center: state.mean,
          axisA: eig.axisA,
          axisB: eig.axisB,
          radii: [eig.radii[0] * state.sigma, eig.radii[1] * state.sigma],
        },
      },
      spread: state.spread,
    };
  },
  ask: (state, objective, params, rng) => {
    const candidates = new Array<Vector>(params.populationSize);
    for (let index = 0; index < params.populationSize; index += 1) {
      const sample = sampleGaussian2D(rng, state.mean, state.covariance).map(
        (value, sampleIndex) =>
          (state.mean[sampleIndex] ?? 0) +
          (value - (state.mean[sampleIndex] ?? 0)) * state.sigma,
      );
      candidates[index] = clampPointToDomain(sample, objective.domain);
    }

    return {
      candidates,
      context: candidates,
      overlay: {
        points: candidates,
      },
    };
  },
  tell: (state, _objective, params, _rng, evaluations) => {
    const sorted = [...evaluations].sort((left, right) => left.value - right.value);
    const eliteCount = Math.max(2, Math.round(sorted.length * params.eliteFraction));
    const elite = sorted.slice(0, eliteCount);
    const nextMean = meanVector(elite.map((candidate) => candidate.point));
    const centered = elite.map((candidate) => subtractVectors(candidate.point, nextMean));
    const covariance = centered.reduce(
      (accumulator, point) => {
        const x = point[0] ?? 0;
        const y = point[1] ?? 0;
        return [
          accumulator[0] + x * x,
          accumulator[1] + x * y,
          accumulator[2] + y * y,
        ] as const;
      },
      [0, 0, 0] as const,
    );
    const normalized: readonly [number, number, number] = [
      covariance[0] / elite.length,
      covariance[1] / elite.length,
      covariance[2] / elite.length,
    ];
    const nextCovariance: readonly [number, number, number] = [
      state.covariance[0] * (1 - params.covarianceDecay) +
        normalized[0] * params.covarianceDecay,
      state.covariance[1] * (1 - params.covarianceDecay) +
        normalized[1] * params.covarianceDecay,
      state.covariance[2] * (1 - params.covarianceDecay) +
        normalized[2] * params.covarianceDecay,
    ];

    const bestCandidate = sorted[0];
    const bestImproved =
      bestCandidate && bestCandidate.value < state.bestValue
        ? bestCandidate
        : null;
    const stepTowardBest = distance(nextMean, state.mean);

    return {
      mean: nextMean,
      covariance: nextCovariance,
      sigma: Math.max(0.08, state.sigma * (stepTowardBest > 0.18 ? 1.04 : 0.96)),
      bestPoint: bestImproved?.point ?? state.bestPoint,
      bestValue: bestImproved?.value ?? state.bestValue,
      evaluations: state.evaluations + evaluations.length,
      spread: covarianceSpread(evaluations.map((candidate) => candidate.point)),
    };
  },
};

function runWithImplementation<TState, TContext>(
  implementation: ZerothOrderOptimizer<TState, TContext>,
  objective: Objective2D,
  spec: ZerothOrderOptimizerSpec,
  start: Vector,
  evaluationBudget: number,
  mergedParams: ZerothOrderParams,
  rng: SeededRng,
): SimulationTrace {
  let state = implementation.init(objective, start, mergedParams, rng);
  let snapshot = implementation.snapshot(state);
  const frames: TraceFrame[] = [createFrame(0, snapshot, 0, 0, 0)];
  let pathLength = 0;
  const oscillationCount = 0;
  let previousPoint = snapshot.point;
  let thresholdIndex: number | null =
    snapshot.bestValue <= objective.successThreshold ? 0 : null;

  while (snapshot.evaluations < evaluationBudget) {
    const askResult = implementation.ask(state, objective, mergedParams, rng);
    const evaluations = askResult.candidates.map((point) => ({
      point,
      value: objective.value(point),
    }));
    state = implementation.tell(
      state,
      objective,
      mergedParams,
      rng,
      evaluations,
      askResult.context,
    );
    snapshot = implementation.snapshot(state);
    const stepSize = distance(previousPoint, snapshot.point);
    pathLength += stepSize;
    previousPoint = snapshot.point;
    const nextFrame = createFrame(
      frames.length,
      {
        ...snapshot,
        overlay: snapshot.overlay ?? askResult.overlay,
      },
      pathLength,
      oscillationCount,
      stepSize,
    );
    frames.push(nextFrame);

    if (thresholdIndex === null && snapshot.bestValue <= objective.successThreshold) {
      thresholdIndex = nextFrame.index;
    }

    if (snapshot.evaluations >= evaluationBudget) break;
  }

  const improvementFrame =
    frames.find((frame) => frame.evaluations >= 50) ?? frames[frames.length - 1];

  return {
    optimizerId: spec.id,
    optimizerLabel: spec.label,
    color: spec.color,
    family: "zeroth-order",
    frames,
    thresholdIndex,
    diverged: false,
    startValue: frames[0]?.value ?? snapshot.value,
    endValue: frames[frames.length - 1]?.value ?? snapshot.value,
    improvementPerWindow:
      (frames[0]?.value ?? 0) - (improvementFrame?.value ?? frames[0]?.value ?? 0),
    finalSpread: snapshot.spread,
  };
}

export function runZerothOrderTrace({
  objective,
  optimizerId,
  start,
  evaluationBudget,
  seed,
  params,
}: RunZerothTraceConfig): SimulationTrace {
  const spec = ZEROTH_ORDER_OPTIMIZERS[optimizerId];
  const mergedParams = mergeParams(objective.id, optimizerId, params);
  const rng = createRng(seed);
  switch (optimizerId) {
    case "random-search":
      return runWithImplementation(
        randomSearchOptimizer,
        objective,
        spec,
        start,
        evaluationBudget,
        mergedParams,
        rng,
      );
    case "nelder-mead":
      return runWithImplementation(
        nelderMeadOptimizer,
        objective,
        spec,
        start,
        evaluationBudget,
        mergedParams,
        rng,
      );
    case "simulated-annealing":
      return runWithImplementation(
        simulatedAnnealingOptimizer,
        objective,
        spec,
        start,
        evaluationBudget,
        mergedParams,
        rng,
      );
    case "particle-swarm":
      return runWithImplementation(
        particleSwarmOptimizer,
        objective,
        spec,
        start,
        evaluationBudget,
        mergedParams,
        rng,
      );
    case "cma-es":
      return runWithImplementation(
        cmaEsOptimizer,
        objective,
        spec,
        start,
        evaluationBudget,
        mergedParams,
        rng,
      );
  }
}

export function measureRobustness(
  objective: Objective2D,
  optimizerId: ZerothOrderOptimizerId,
  start: Vector,
  evaluationBudget: number,
): number {
  let successes = 0;
  for (let seed = 1; seed <= 5; seed += 1) {
    const trace = runZerothOrderTrace({
      objective,
      optimizerId,
      start,
      evaluationBudget,
      seed,
    });
    if (
      (trace.frames.at(-1)?.bestValue ?? Number.POSITIVE_INFINITY) <=
      objective.successThreshold
    ) {
      successes += 1;
    }
  }
  return successes / 5;
}

export function getZerothOptimizerList(): ZerothOrderOptimizerSpec[] {
  return Object.values(ZEROTH_ORDER_OPTIMIZERS);
}
