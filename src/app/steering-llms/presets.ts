export const LAYERS = [5, 10, 15, 20, 25] as const;
export const MODEL_ID = "HuggingFaceTB/SmolLM2-360M-Instruct";
export const MODEL_REVISION = "a10cc1512eabd3dde888204e902eca88bddb4951";
export const MODEL_SHA256 =
  "57987a3a24dc34ad2cb5e7e566840ccaece095e35a24ae4fc5b3086c7ddd6918";
export const MODEL_BYTES = 364564671;
export const MODEL_SHAPE = {
  blocks: 32,
  hidden: 960,
  kvHeads: 5,
  headSize: 64,
  vocabulary: 49152,
} as const;
export const CONTINUATION_INSTRUCTION =
  "Continue the story from the assistant opening, in English. Write only the continuation.";
export interface SteeringSettings {
  directionId?: string;
  prompt: string;
  positive: string[];
  negative: string[];
  instruction: string;
  layer: number;
  strength: number;
  seed: number;
  temperature: number;
  tokens: number;
}
