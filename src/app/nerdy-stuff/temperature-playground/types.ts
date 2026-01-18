// Types for Temperature Playground state management

export interface TemperatureOutput {
  temperature: number;
  content: string;
  isGenerating: boolean;
  error: string | null;
  modelUsed: string | null;
}

export interface TemperaturePlaygroundState {
  prompt: string;
  selectedModel: string;
  temperatures: number[];
  outputs: Map<number, TemperatureOutput>;
  isAnyGenerating: boolean;
  rateLimitRemaining: number | null;
}

export type TemperaturePlaygroundAction =
  | { type: "SET_PROMPT"; prompt: string }
  | { type: "SET_MODEL"; model: string }
  | { type: "SET_TEMPERATURES"; temperatures: number[] }
  | { type: "START_GENERATION" }
  | { type: "START_SINGLE_GENERATION"; temperature: number }
  | { type: "UPDATE_OUTPUT"; temperature: number; content: string }
  | { type: "FINISH_GENERATION"; temperature: number; modelUsed: string | null }
  | { type: "SET_ERROR"; temperature: number; error: string }
  | { type: "SET_RATE_LIMIT"; remaining: number }
  | { type: "CLEAR_OUTPUTS" };

// Default temperatures to compare
export const DEFAULT_TEMPERATURES = [0.0, 0.5, 1.0];

// Available models (same as other demos)
export const AVAILABLE_MODELS = [
  { id: "auto", name: "Auto (Recommended)" },
  { id: "google/gemini-2.0-flash-exp:free", name: "Gemini 2.0 Flash" },
  { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B" },
  { id: "google/gemma-3-27b-it:free", name: "Gemma 3 27B" },
  { id: "deepseek/deepseek-r1-0528:free", name: "DeepSeek R1" },
  { id: "qwen/qwen3-coder:free", name: "Qwen3 Coder 480B" },
];

// Example prompts to help users get started
export const EXAMPLE_PROMPTS = [
  {
    label: "Story Opener",
    prompt: "Write a single opening sentence for a mystery novel set in Tokyo.",
  },
  {
    label: "Code Comment",
    prompt: "Write a one-line comment explaining what a binary search function does.",
  },
  {
    label: "Product Name",
    prompt: "Suggest one creative name for a coffee shop that specializes in cold brew.",
  },
  {
    label: "Metaphor",
    prompt: "Create a single metaphor comparing life to a journey.",
  },
];

export function createInitialState(): TemperaturePlaygroundState {
  const outputs = new Map<number, TemperatureOutput>();
  for (const temp of DEFAULT_TEMPERATURES) {
    outputs.set(temp, {
      temperature: temp,
      content: "",
      isGenerating: false,
      error: null,
      modelUsed: null,
    });
  }

  return {
    prompt: "",
    selectedModel: "auto",
    temperatures: DEFAULT_TEMPERATURES,
    outputs,
    isAnyGenerating: false,
    rateLimitRemaining: null,
  };
}

export function temperatureReducer(
  state: TemperaturePlaygroundState,
  action: TemperaturePlaygroundAction
): TemperaturePlaygroundState {
  switch (action.type) {
    case "SET_PROMPT":
      return { ...state, prompt: action.prompt };

    case "SET_MODEL":
      return { ...state, selectedModel: action.model };

    case "SET_TEMPERATURES": {
      const outputs = new Map<number, TemperatureOutput>();
      for (const temp of action.temperatures) {
        const existing = state.outputs.get(temp);
        outputs.set(temp, existing || {
          temperature: temp,
          content: "",
          isGenerating: false,
          error: null,
          modelUsed: null,
        });
      }
      return { ...state, temperatures: action.temperatures, outputs };
    }

    case "START_GENERATION": {
      const outputs = new Map(state.outputs);
      for (const temp of state.temperatures) {
        outputs.set(temp, {
          temperature: temp,
          content: "",
          isGenerating: true,
          error: null,
          modelUsed: null,
        });
      }
      return { ...state, outputs, isAnyGenerating: true };
    }

    case "START_SINGLE_GENERATION": {
      const outputs = new Map(state.outputs);
      const current = outputs.get(action.temperature);
      if (current) {
        outputs.set(action.temperature, {
          ...current,
          content: "",
          isGenerating: true,
          error: null,
          modelUsed: null,
        });
      }
      return { ...state, outputs, isAnyGenerating: true };
    }

    case "UPDATE_OUTPUT": {
      const outputs = new Map(state.outputs);
      const current = outputs.get(action.temperature);
      if (current) {
        outputs.set(action.temperature, {
          ...current,
          content: action.content,
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
          modelUsed: action.modelUsed,
        });
      }
      // Check if any are still generating
      const isAnyGenerating = Array.from(outputs.values()).some(o => o.isGenerating);
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
      const isAnyGenerating = Array.from(outputs.values()).some(o => o.isGenerating);
      return { ...state, outputs, isAnyGenerating };
    }

    case "SET_RATE_LIMIT":
      return { ...state, rateLimitRemaining: action.remaining };

    case "CLEAR_OUTPUTS": {
      const outputs = new Map<number, TemperatureOutput>();
      for (const temp of state.temperatures) {
        outputs.set(temp, {
          temperature: temp,
          content: "",
          isGenerating: false,
          error: null,
          modelUsed: null,
        });
      }
      return { ...state, outputs };
    }

    default:
      return state;
  }
}
