// Types for Temperature Playground state management

// Token probability for visualization
export interface TokenProbability {
  token: string;
  tokenId: number;
  probability: number;
}

// A single generated token with its sampling context
export interface GeneratedToken {
  token: string;
  tokenId: number;
  selectedProbability: number;
  topProbabilities: TokenProbability[]; // Top-k for wheel visualization
}

export interface TemperatureOutput {
  temperature: number;
  tokens: GeneratedToken[]; // Token-by-token history
  content: string; // Full text (joined tokens)
  isGenerating: boolean;
  currentTokenIndex: number; // For animation sync
  error: string | null;
}

export type AnimationSpeed = "slow" | "normal" | "fast";

export interface TemperaturePlaygroundState {
  prompt: string;
  temperatures: number[];
  outputs: Map<number, TemperatureOutput>;
  isAnyGenerating: boolean;
  // Model loading state
  isModelLoading: boolean;
  modelProgress: number;
  modelError: string | null;
  isModelReady: boolean;
  // UI settings
  animationSpeed: AnimationSpeed;
}

export type TemperaturePlaygroundAction =
  | { type: "SET_PROMPT"; prompt: string }
  | { type: "SET_TEMPERATURES"; temperatures: number[] }
  | { type: "START_GENERATION" }
  | { type: "ADD_TOKEN"; temperature: number; token: GeneratedToken }
  | { type: "ADVANCE_TOKEN_INDEX"; temperature: number }
  | { type: "FINISH_GENERATION"; temperature: number }
  | { type: "SET_ERROR"; temperature: number; error: string }
  | { type: "CLEAR_OUTPUTS" }
  | { type: "SET_MODEL_LOADING"; isLoading: boolean; progress: number }
  | { type: "SET_MODEL_ERROR"; error: string }
  | { type: "SET_MODEL_READY" }
  | { type: "SET_ANIMATION_SPEED"; speed: AnimationSpeed };

// Default temperatures to compare
export const DEFAULT_TEMPERATURES = [0.0, 0.7, 1.5];

// Example prompts optimized for showing temperature effects
export const EXAMPLE_PROMPTS = [
  {
    label: "Story",
    prompt: "Once upon a time",
  },
  {
    label: "Code",
    prompt: "function hello() {",
  },
  {
    label: "Poem",
    prompt: "Roses are red,",
  },
  {
    label: "Open",
    prompt: "The best way to",
  },
];

// Animation duration in ms based on speed setting
export function getAnimationDuration(speed: AnimationSpeed): number {
  switch (speed) {
    case "slow":
      return 2000;
    case "normal":
      return 1000;
    case "fast":
      return 500;
  }
}

function createEmptyOutput(temperature: number): TemperatureOutput {
  return {
    temperature,
    tokens: [],
    content: "",
    isGenerating: false,
    currentTokenIndex: 0,
    error: null,
  };
}

export function createInitialState(): TemperaturePlaygroundState {
  const outputs = new Map<number, TemperatureOutput>();
  for (const temp of DEFAULT_TEMPERATURES) {
    outputs.set(temp, createEmptyOutput(temp));
  }

  return {
    prompt: "",
    temperatures: DEFAULT_TEMPERATURES,
    outputs,
    isAnyGenerating: false,
    isModelLoading: false,
    modelProgress: 0,
    modelError: null,
    isModelReady: false,
    animationSpeed: "normal",
  };
}

export function temperatureReducer(
  state: TemperaturePlaygroundState,
  action: TemperaturePlaygroundAction
): TemperaturePlaygroundState {
  switch (action.type) {
    case "SET_PROMPT":
      return { ...state, prompt: action.prompt };

    case "SET_TEMPERATURES": {
      const outputs = new Map<number, TemperatureOutput>();
      for (const temp of action.temperatures) {
        const existing = state.outputs.get(temp);
        outputs.set(temp, existing || createEmptyOutput(temp));
      }
      return { ...state, temperatures: action.temperatures, outputs };
    }

    case "START_GENERATION": {
      const outputs = new Map(state.outputs);
      for (const temp of state.temperatures) {
        outputs.set(temp, {
          ...createEmptyOutput(temp),
          isGenerating: true,
        });
      }
      return { ...state, outputs, isAnyGenerating: true };
    }

    case "ADD_TOKEN": {
      const outputs = new Map(state.outputs);
      const current = outputs.get(action.temperature);
      if (current) {
        const newTokens = [...current.tokens, action.token];
        outputs.set(action.temperature, {
          ...current,
          tokens: newTokens,
          content: newTokens.map((t) => t.token).join(""),
        });
      }
      return { ...state, outputs };
    }

    case "ADVANCE_TOKEN_INDEX": {
      const outputs = new Map(state.outputs);
      const current = outputs.get(action.temperature);
      if (current) {
        outputs.set(action.temperature, {
          ...current,
          currentTokenIndex: current.currentTokenIndex + 1,
        });
      }
      return { ...state, outputs };
    }

    case "FINISH_GENERATION": {
      const outputs = new Map(state.outputs);
      const current = outputs.get(action.temperature);
      if (current) {
        outputs.set(action.temperature, {
          ...current,
          isGenerating: false,
        });
      }
      const isAnyGenerating = Array.from(outputs.values()).some(
        (o) => o.isGenerating
      );
      return { ...state, outputs, isAnyGenerating };
    }

    case "SET_ERROR": {
      const outputs = new Map(state.outputs);
      const current = outputs.get(action.temperature);
      if (current) {
        outputs.set(action.temperature, {
          ...current,
          isGenerating: false,
          error: action.error,
        });
      }
      const isAnyGenerating = Array.from(outputs.values()).some(
        (o) => o.isGenerating
      );
      return { ...state, outputs, isAnyGenerating };
    }

    case "CLEAR_OUTPUTS": {
      const outputs = new Map<number, TemperatureOutput>();
      for (const temp of state.temperatures) {
        outputs.set(temp, createEmptyOutput(temp));
      }
      return { ...state, outputs };
    }

    case "SET_MODEL_LOADING":
      return {
        ...state,
        isModelLoading: action.isLoading,
        modelProgress: action.progress,
      };

    case "SET_MODEL_ERROR":
      return {
        ...state,
        isModelLoading: false,
        modelError: action.error,
      };

    case "SET_MODEL_READY":
      return {
        ...state,
        isModelLoading: false,
        modelProgress: 100,
        isModelReady: true,
      };

    case "SET_ANIMATION_SPEED":
      return { ...state, animationSpeed: action.speed };

    default:
      return state;
  }
}
