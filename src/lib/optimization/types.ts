export type Vector = number[];

export interface Domain2D {
  x: readonly [number, number];
  y: readonly [number, number];
}

export type ObjectiveKind = "smooth" | "noisy" | "discontinuous";

export interface Objective2D {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  narrative: string;
  dimension: 2;
  kind: ObjectiveKind;
  domain: Domain2D;
  successThreshold: number;
  value: (point: Vector) => number;
  gradient?: (point: Vector) => Vector;
}

export interface ObjectiveND {
  id: string;
  label: string;
  description: string;
  narrative: string;
  dimension: number;
  successThreshold: number;
  value: (point: Vector) => number;
  gradient: (point: Vector) => Vector;
  hessianSpectrum?: number[];
}

export interface GridSample {
  values: number[][];
  min: number;
  max: number;
  xValues: number[];
  yValues: number[];
}

export interface TraceOverlay {
  points?: Vector[];
  simplex?: Vector[];
  segments?: Array<{
    from: Vector;
    to: Vector;
    accepted?: boolean;
  }>;
  covariance?: {
    center: Vector;
    axisA: Vector;
    axisB: Vector;
    radii: readonly [number, number];
  };
}

export interface TraceFrame {
  index: number;
  point: Vector;
  value: number;
  bestPoint: Vector;
  bestValue: number;
  gradientNorm: number | null;
  stepSize: number;
  pathLength: number;
  evaluations: number;
  oscillationCount: number;
  diagnostics: Record<string, number>;
  overlay?: TraceOverlay;
}

export interface SimulationTrace {
  optimizerId: string;
  optimizerLabel: string;
  color: string;
  family: "gradient" | "zeroth-order";
  frames: TraceFrame[];
  thresholdIndex: number | null;
  diverged: boolean;
  startValue: number;
  endValue: number;
  improvementPerWindow: number;
  finalSpread: number | null;
}

export type GradientOptimizerId =
  | "gradient-descent"
  | "momentum"
  | "nesterov"
  | "adagrad"
  | "rmsprop"
  | "adam";

export interface GradientParams {
  learningRate: number;
  momentum: number;
  beta1: number;
  beta2: number;
  decay: number;
  epsilon: number;
}

export interface GradientOptimizerSpec {
  id: GradientOptimizerId;
  label: string;
  shortLabel: string;
  color: string;
  description: string;
  formula: string;
  defaultParams: GradientParams;
}

export type ZerothOrderOptimizerId =
  | "random-search"
  | "nelder-mead"
  | "simulated-annealing"
  | "particle-swarm"
  | "cma-es";

export interface ZerothOrderParams {
  stepScale: number;
  populationSize: number;
  eliteFraction: number;
  simplexScale: number;
  temperature: number;
  cooling: number;
  inertia: number;
  cognitive: number;
  social: number;
  covarianceDecay: number;
}

export interface ZerothOrderOptimizerSpec {
  id: ZerothOrderOptimizerId;
  label: string;
  shortLabel: string;
  color: string;
  description: string;
  formula: string;
  defaultParams: ZerothOrderParams;
}

export interface OptimizerPreset<TOptimizerId extends string, TParams> {
  objectiveId: string;
  optimizerId: TOptimizerId;
  params: TParams;
}

export interface Projection2D {
  axisA: Vector;
  axisB: Vector;
}

export interface DecisionBoundarySnapshot {
  step: number;
  loss: number;
  accuracy: number;
  width: number;
  batchSize: number;
  optimizerId: "sgd" | "adam";
  gridSize: number;
  decisionGrid: number[];
}

export interface TrainingTrace {
  snapshots: DecisionBoundarySnapshot[];
  finalLoss: number;
  finalAccuracy: number;
}
