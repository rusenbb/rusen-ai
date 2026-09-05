export const LAYERS = [5, 10, 15, 20, 25] as const;
export const MODEL_ID = "HuggingFaceTB/SmolLM2-135M-Instruct";
export const MODEL_REVISION = "12fd25f77366fa6b3b4b768ec3050bf629380bac";
export const MODEL_SHA256 =
  "ecc1a19eece6494e2963cf74f78ace35916e8d0b803168ddd41db00979f18e39";
export const MODEL_BYTES = 137147981;
export const PRESETS = [
  {
    id: "optimism",
    title: "Optimism ↔ pessimism",
    positiveLabel: "Optimistic",
    negativeLabel: "Pessimistic",
    instruction: "Answer with an optimistic and hopeful outlook.",
    prompt: "What might happen when I start a new job?",
    positive: [
      "I feel hopeful about the future.",
      "This change is a wonderful opportunity.",
      "I expect things to turn out well.",
      "We can find a positive way forward.",
    ],
    negative: [
      "I feel worried about the future.",
      "This change is a terrible mistake.",
      "I expect things to turn out badly.",
      "We cannot find a way out of this trouble.",
    ],
  },
  {
    id: "nature",
    title: "Nature ↔ technology",
    positiveLabel: "Nature",
    negativeLabel: "Technology",
    instruction: "Use imagery and examples from nature, plants and forests.",
    prompt: "Describe a place where I could spend an afternoon.",
    positive: [
      "The forest is full of trees and flowers.",
      "Birds sing above the flowing river.",
      "We walked through a green meadow.",
      "The garden grows beneath the sunlight.",
    ],
    negative: [
      "The computer is full of files and programs.",
      "Servers run inside the data center.",
      "We worked with a digital network.",
      "The software runs inside the processor.",
    ],
  },
  {
    id: "story",
    title: "Storytelling ↔ exposition",
    positiveLabel: "Storytelling",
    negativeLabel: "Exposition",
    instruction:
      "Answer as a short imaginative story with a character and events.",
    prompt: "Tell me about finding something unexpected.",
    positive: [
      "Once upon a time, a young traveler found a hidden door.",
      "She opened the box and gasped in surprise.",
      "The old wizard whispered a secret to the child.",
      "One night, a stranger arrived at the village.",
    ],
    negative: [
      "This report describes the main properties of the object.",
      "The box contains several standard components.",
      "The document explains the procedure to the reader.",
      "This section presents the results of the analysis.",
    ],
  },
] as const;
export interface SteeringSettings {
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
