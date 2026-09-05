import type {
  ProgressCallback,
  Tensor,
  TextGenerationPipeline,
} from "@huggingface/transformers";
import { createSeededRandom } from "@/lib/random";
import { distribution, sampleToken } from "./sampling";

export const MODEL_ID = "Xenova/distilgpt2";
export const MODEL_REVISION = "a41c10485c18a64b6606729b6a082330cbd8f49e";
export const TARGET_WORDS = [
  "good",
  "great",
  "happy",
  "kind",
  "hope",
  "joy",
  "love",
  "wonderful",
  "helpful",
];
export interface SteeringSettings {
  prompt: string;
  seed: number;
  strength: number;
  temperature: number;
  tokens: number;
}
export interface SteeringOutput {
  text: string;
  tokenIds: number[];
  targetCount: number;
  firstStepMass: number;
}

export async function loadSteeringModel(
  progress: ProgressCallback,
  device: "wasm" | "cpu" = "wasm",
): Promise<TextGenerationPipeline> {
  const { pipeline, env } = await import("@huggingface/transformers");
  env.allowLocalModels = false;
  return pipeline("text-generation", MODEL_ID, {
    device,
    dtype: "q8",
    model_file_name: "decoder_model_merged",
    revision: MODEL_REVISION,
    progress_callback: progress,
  });
}

export async function compareSteering(
  model: TextGenerationPipeline,
  settings: SteeringSettings,
  onStep: (condition: string, step: number) => void = () => {},
  signal?: AbortSignal,
) {
  const { LogitsProcessor, LogitsProcessorList } =
    await import("@huggingface/transformers");
  if (!settings.prompt.trim()) throw new Error("Enter a prompt.");
  if (model.tokenizer.encode(settings.prompt).length > 96)
    throw new Error(
      "Use a prompt of at most 96 model tokens for this browser experiment.",
    );
  const targets = TARGET_WORDS.flatMap((word) => {
    const ids = model.tokenizer.encode(" " + word, {
      add_special_tokens: false,
    });
    return ids.length === 1 ? [{ word, id: ids[0] }] : [];
  });
  const targetIds = new Set(targets.map((target) => target.id));
  if (!targetIds.size)
    throw new Error(
      "The model vocabulary has no single-token targets for this intervention.",
    );
  const run = async (
    strength: number,
    condition: string,
  ): Promise<SteeringOutput> => {
    const random = createSeededRandom(settings.seed);
    const tokenIds: number[] = [];
    let firstStepMass = 0;
    class SeededIntervention extends LogitsProcessor {
      _call(_input: bigint[][], logits: Tensor): Tensor {
        if (signal?.aborted)
          throw new DOMException("Comparison cancelled", "AbortError");
        if (logits.dims[0] !== 1)
          throw new Error("This comparison accepts one prompt at a time.");
        const data = logits.data as Float32Array;
        const candidates = distribution(
          data,
          targetIds,
          strength,
          settings.temperature,
          40,
        );
        if (!tokenIds.length)
          firstStepMass = candidates
            .filter((token) => targetIds.has(token.id))
            .reduce((sum, token) => sum + token.probability, 0);
        const id = sampleToken(candidates, random());
        tokenIds.push(id);
        // Sampling is local and seeded. The backend's greedy step simply emits our draw.
        data.fill(-Infinity);
        data[id] = 0;
        onStep(condition, tokenIds.length);
        return logits;
      }
    }
    const processors = new LogitsProcessorList();
    processors.push(new SeededIntervention());
    const output = await model(settings.prompt, {
      max_new_tokens: settings.tokens,
      do_sample: false,
      logits_processor: processors,
      return_full_text: false,
    });
    const text = output[0]?.generated_text;
    if (typeof text !== "string")
      throw new Error("The model returned an unexpected completion.");
    return {
      text,
      tokenIds,
      targetCount: tokenIds.filter((id) => targetIds.has(id)).length,
      firstStepMass,
    };
  };
  const baseline = await run(0, "Baseline");
  const steered = await run(settings.strength, "Steered");
  return {
    baseline,
    steered,
    targets,
    settings: { ...settings },
    model: MODEL_ID,
    revision: MODEL_REVISION,
  };
}
