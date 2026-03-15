import { createAnisotropicQuadratic, createHighDimensionalSaddle } from "./objectives";
import { runGradientTrace } from "./gradient";
import type { SimulationTrace, Vector } from "./types";

/**
 * Configuration for a single dimension in the comparison.
 * Condition number scales with dimension to reflect realistic behavior.
 */
export interface DimensionConfig {
  dimension: number;
  conditionNumber: number;
  color: string;
  label: string;
}

export const DEFAULT_DIMENSION_CONFIGS: DimensionConfig[] = [
  { dimension: 2, conditionNumber: 8, color: "#0f766e", label: "2D" },
  { dimension: 10, conditionNumber: 18, color: "#1d4ed8", label: "10D" },
  { dimension: 64, conditionNumber: 42, color: "#b45309", label: "64D" },
  { dimension: 500, conditionNumber: 90, color: "#be123c", label: "500D" },
];

function createStartPoint(dimension: number): Vector {
  return Array.from({ length: dimension }, (_, index) => {
    const direction = index % 2 === 0 ? 1 : -1;
    const falloff = 1 - index / Math.max(1, dimension);
    return direction * (1.6 + falloff * 0.9);
  });
}

export interface DimensionTraceResult {
  config: DimensionConfig;
  trace: SimulationTrace;
  /** Loss values normalized to fraction of initial loss remaining (1 = start, 0 = fully removed) */
  normalizedLoss: number[];
  stepsToHalfLoss: number | null;
  spectrum: number[];
}

export function runDimensionComparison(
  configs: DimensionConfig[],
  steps: number,
): DimensionTraceResult[] {
  return configs.map((config) => {
    const objective = createAnisotropicQuadratic(config.dimension, config.conditionNumber);
    const trace = runGradientTrace({
      objective,
      optimizerId: "gradient-descent",
      start: createStartPoint(config.dimension),
      steps,
      params: { learningRate: 0.02 },
    });

    const startValue = trace.startValue;
    const normalizedLoss = trace.frames.map((frame) =>
      startValue > 1e-9 ? frame.value / startValue : 1,
    );

    const stepsToHalfLoss = findStepForThreshold(normalizedLoss, 0.5);
    const spectrum = objective.hessianSpectrum ?? [];

    return { config, trace, normalizedLoss, stepsToHalfLoss, spectrum };
  });
}

function findStepForThreshold(
  normalizedValues: number[],
  threshold: number,
): number | null {
  for (let i = 0; i < normalizedValues.length; i++) {
    if ((normalizedValues[i] ?? 1) <= threshold) return i;
  }
  return null;
}

export interface SpectrumHistogramBin {
  start: number;
  end: number;
  count: number;
}

export function binSpectrum(
  spectrum: number[],
  bins: number,
): SpectrumHistogramBin[] {
  if (spectrum.length === 0) return [];

  const sorted = [...spectrum].sort((a, b) => a - b);
  const min = sorted[0]!;
  const max = sorted[sorted.length - 1]!;
  const span = Math.max(1e-9, max - min);

  const result: SpectrumHistogramBin[] = Array.from({ length: bins }, (_, i) => ({
    start: min + (i / bins) * span,
    end: min + ((i + 1) / bins) * span,
    count: 0,
  }));

  for (const value of sorted) {
    const binIndex = Math.min(bins - 1, Math.floor(((value - min) / span) * bins));
    result[binIndex]!.count++;
  }

  return result;
}

export interface CriticalPointStats {
  dimension: number;
  totalCombinations: bigint;
  localMinima: bigint;
  fractionMinima: number;
  formattedTotal: string;
}

export function criticalPointCombinations(dimension: number): CriticalPointStats {
  const total = BigInt(1) << BigInt(dimension);
  const localMinima = BigInt(1);
  const fraction = 1 / Number(total);

  return {
    dimension,
    totalCombinations: total,
    localMinima,
    fractionMinima: fraction,
    formattedTotal: formatBigIntCompact(total),
  };
}

function formatBigIntCompact(value: bigint): string {
  if (value <= BigInt(999_999)) return value.toString();

  // Approximate as a power of 10 for display
  const digits = value.toString().length;
  const leading = value.toString().slice(0, 3);
  const decimal = `${leading[0]}.${leading.slice(1)}`;
  return `${decimal} \u00d7 10^${digits - 1}`;
}

export function saddleForDimension(
  dimension: number,
  negativeDirections: number,
): { spectrum: number[]; positiveCount: number; negativeCount: number } {
  const objective = createHighDimensionalSaddle(dimension, negativeDirections);
  const spectrum = objective.hessianSpectrum ?? [];
  return {
    spectrum,
    positiveCount: spectrum.filter((v) => v >= 0).length,
    negativeCount: spectrum.filter((v) => v < 0).length,
  };
}

export function convergenceCharacterization(
  stepsToHalfLoss: number | null,
  totalSteps: number,
): string {
  if (stepsToHalfLoss === null) return "slow";
  const fraction = stepsToHalfLoss / totalSteps;
  if (fraction < 0.05) return "fast";
  if (fraction < 0.15) return "moderate";
  if (fraction < 0.4) return "gradual";
  return "slow";
}
