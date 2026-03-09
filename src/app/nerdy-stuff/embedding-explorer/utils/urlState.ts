import type { ArithmeticMode, ArithmeticTerm, ProjectionMode } from "../types";

const STATE_PARAM = "state";

export interface ExplorerUrlState {
  projectionMode: ProjectionMode;
  words: string[];
  selectedWordSetIds: string[];
  xAxis: { positive: string; negative: string };
  yAxis: { positive: string; negative: string };
  arithmeticMode: ArithmeticMode;
  arithmeticInputs: { a: string; b: string; c: string };
  openArithmeticTerms: ArithmeticTerm[];
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isProjectionMode(value: unknown): value is ProjectionMode {
  return value === "axes" || value === "umap";
}

function isWordList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

function isAxisState(value: unknown): value is { positive: string; negative: string } {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;
  return isString(candidate.positive) && isString(candidate.negative);
}

function isArithmeticState(value: unknown): value is { a: string; b: string; c: string } {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;
  return isString(candidate.a) && isString(candidate.b) && isString(candidate.c);
}

function isArithmeticMode(value: unknown): value is ArithmeticMode {
  return value === "classic" || value === "open";
}

function isArithmeticTerm(value: unknown): value is ArithmeticTerm {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;
  return (candidate.operation === "+" || candidate.operation === "-") && isString(candidate.value);
}

function isArithmeticTermList(value: unknown): value is ArithmeticTerm[] {
  return Array.isArray(value) && value.every(isArithmeticTerm);
}

export function encodeExplorerState(state: ExplorerUrlState): string {
  return btoa(encodeURIComponent(JSON.stringify(state)));
}

export function decodeExplorerState(encoded: string | null): Partial<ExplorerUrlState> | null {
  if (!encoded) return null;

  try {
    const decoded = decodeURIComponent(atob(encoded));
    const parsed = JSON.parse(decoded) as Record<string, unknown>;
    const state: Partial<ExplorerUrlState> = {};

    if (isProjectionMode(parsed.projectionMode)) {
      state.projectionMode = parsed.projectionMode;
    }

    if (isWordList(parsed.words)) {
      state.words = parsed.words;
    }

    if (isWordList(parsed.selectedWordSetIds)) {
      state.selectedWordSetIds = parsed.selectedWordSetIds;
    }

    if (isAxisState(parsed.xAxis)) {
      state.xAxis = parsed.xAxis;
    }

    if (isAxisState(parsed.yAxis)) {
      state.yAxis = parsed.yAxis;
    }

    if (isArithmeticMode(parsed.arithmeticMode)) {
      state.arithmeticMode = parsed.arithmeticMode;
    }

    if (isArithmeticState(parsed.arithmeticInputs)) {
      state.arithmeticInputs = parsed.arithmeticInputs;
    }

    if (isArithmeticTermList(parsed.openArithmeticTerms)) {
      state.openArithmeticTerms = parsed.openArithmeticTerms;
    }

    return state;
  } catch {
    return null;
  }
}

export function readExplorerState(search: string): Partial<ExplorerUrlState> | null {
  const params = new URLSearchParams(search);
  return decodeExplorerState(params.get(STATE_PARAM));
}

export function buildExplorerShareUrl(
  pathname: string,
  search: string,
  state: ExplorerUrlState
): string {
  const params = new URLSearchParams(search);
  params.set(STATE_PARAM, encodeExplorerState(state));

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
