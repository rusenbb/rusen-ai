import type { PreTrainedTokenizer } from "@huggingface/transformers";
import type { InferenceSession, Tensor } from "onnxruntime-web";
import { createSeededRandom } from "@/lib/random";
import { HIDDEN_SIZE, instrumentModel } from "./graph";
import type { SteeringSettings } from "./presets";
import { distribution, sampleToken, norm } from "./sampling";
export type Runtime = Pick<
  typeof import("onnxruntime-web"),
  "InferenceSession" | "Tensor"
>;
export type Condition = "baseline" | "prompted" | "steered";
export interface Completion {
  text: string;
  tokenIds: number[];
  repetition: number;
  firstLogits: number[];
  before: number[];
  after: number[];
  milliseconds: number;
  firstTokens: { token: string; probability: number }[];
}
export interface Comparison {
  settings: SteeringSettings;
  direction: number[];
  directionNorm: number;
  positiveNorm: number;
  negativeNorm: number;
  outputs: Record<Condition, Completion>;
  firstStepDivergence: number;
}
export function directionFromPairs(
  positive: Float32Array[],
  negative: Float32Array[],
) {
  if (!positive.length || positive.length !== negative.length)
    throw new Error("Use equally sized positive and negative example sets.");
  const direction = new Float32Array(HIDDEN_SIZE);
  positive.forEach((row, i) =>
    row.forEach((value, j) => {
      direction[j] += (value - negative[i][j]) / positive.length;
    }),
  );
  if (!Number.isFinite(norm(direction)) || norm(direction) < 1e-6)
    throw new Error(
      "The contrast examples produce no usable activation direction.",
    );
  return direction;
}
export async function createEngine(
  bytes: Uint8Array,
  tokenizer: PreTrainedTokenizer,
  ort: Runtime,
  layer: number,
) {
  const session = await ort.InferenceSession.create(
    instrumentModel(bytes, layer),
    {
      executionProviders:
        typeof window === "undefined" && typeof self === "undefined"
          ? ["cpu"]
          : ["wasm"],
      graphOptimizationLevel: "all",
    },
  );
  const afterName = `/model/layers.${layer}/input_layernorm/output_3`;
  function emptyCache(): Record<string, Tensor> {
    const cache: Record<string, Tensor> = {};
    for (let i = 0; i < 30; i++)
      for (const kind of ["key", "value"])
        cache[`past_key_values.${i}.${kind}`] = new ort.Tensor(
          "float32",
          new Float32Array(0),
          [1, 3, 0, 64],
        );
    return cache;
  }
  async function forward(
    ids: number[],
    past: number,
    cache: Record<string, Tensor>,
    delta: Float32Array,
  ) {
    const feeds: Record<string, Tensor> = {
      ...cache,
      input_ids: new ort.Tensor("int64", BigInt64Array.from(ids, BigInt), [
        1,
        ids.length,
      ]),
      attention_mask: new ort.Tensor(
        "int64",
        new BigInt64Array(past + ids.length).fill(BigInt(1)),
        [1, past + ids.length],
      ),
      position_ids: new ort.Tensor(
        "int64",
        BigInt64Array.from(ids, (_, i) => BigInt(past + i)),
        [1, ids.length],
      ),
      steering_delta: new ort.Tensor("float32", delta, [1, 1, HIDDEN_SIZE]),
    };
    try {
      return await session.run(feeds);
    } finally {
      for (const [key, tensor] of Object.entries(feeds))
        if (!(key in cache)) tensor.dispose();
    }
  }
  const dispose = (tensors: Record<string, Tensor>) =>
    Object.values(tensors).forEach((t) => t.dispose());
  const last = (t: Tensor) => (t.data as Float32Array).slice(-HIDDEN_SIZE);
  async function activation(text: string) {
    const ids = tokenizer.encode(text, { add_special_tokens: false });
    if (!ids.length || ids.length > 96)
      throw new Error("Each contrast example must contain 1–96 tokens.");
    const cache = emptyCache();
    let output: InferenceSession.OnnxValueMapType | undefined;
    try {
      output = await forward(ids, 0, cache, new Float32Array(HIDDEN_SIZE));
      return last(output.steering_residual_before);
    } finally {
      dispose(cache);
      if (output) dispose(output);
    }
  }
  async function complete(
    settings: SteeringSettings,
    delta: Float32Array,
    instruction: string,
    onToken: (text: string) => void,
  ) {
    const messages = instruction
      ? [
          { role: "system", content: instruction },
          { role: "user", content: settings.prompt },
        ]
      : [{ role: "user", content: settings.prompt }];
    const input = tokenizer.apply_chat_template(messages, {
      tokenize: false,
      add_generation_prompt: true,
    });
    if (typeof input !== "string")
      throw new Error("Invalid chat template output.");
    let ids = tokenizer.encode(input, { add_special_tokens: false });
    if (ids.length > 160)
      throw new Error("Shorten the prompt to at most 160 model tokens.");
    let cache = emptyCache(),
      past = 0;
    const random = createSeededRandom(settings.seed);
    const tokenIds: number[] = [];
    const started = performance.now();
    let firstLogits: number[] = [],
      before: number[] = [],
      after: number[] = [];
    try {
      for (let i = 0; i < settings.tokens; i++) {
        const output = await forward(ids, past, cache, delta);
        dispose(cache);
        cache = {};
        try {
          const logits = (output.logits.data as Float32Array).slice(-49152);
          if (i === 0) {
            firstLogits = Array.from(logits);
            before = Array.from(last(output.steering_residual_before));
            after = Array.from(last(output[afterName]));
          }
          const candidates = distribution(
            logits,
            settings.temperature,
            settings.temperature === 0 ? 1 : 40,
          );
          const id = sampleToken(candidates, random());
          past += ids.length;
          ids = [id];
          for (const [name, tensor] of Object.entries(output))
            if (name.startsWith("present."))
              cache[name.replace("present.", "past_key_values.")] = tensor;
          if (id === tokenizer.eos_token_id) break;
          tokenIds.push(id);
          onToken(tokenizer.decode(tokenIds, { skip_special_tokens: true }));
        } finally {
          for (const [name, tensor] of Object.entries(output))
            if (!name.startsWith("present.")) tensor.dispose();
        }
      }
      const triples = tokenIds
        .slice(2)
        .map((_, i) => tokenIds.slice(i, i + 3).join(","));
      return {
        text: tokenizer.decode(tokenIds, { skip_special_tokens: true }),
        tokenIds,
        repetition: triples.length
          ? 1 - new Set(triples).size / triples.length
          : 0,
        firstLogits,
        before,
        after,
        firstTokens: distribution(firstLogits, 1, 49152)
          .slice(0, 5)
          .map((x) => ({
            token: tokenizer.decode([x.id]),
            probability: x.probability,
          })),
        milliseconds: performance.now() - started,
      };
    } finally {
      dispose(cache);
    }
  }
  return { activation, complete, dispose: () => session.release() };
}
export async function compareSteering(
  engine: Awaited<ReturnType<typeof createEngine>>,
  settings: SteeringSettings,
  onProgress: (stage: string) => void,
  onToken: (condition: Condition, text: string) => void,
): Promise<Comparison> {
  const pos: Float32Array[] = [],
    neg: Float32Array[] = [];
  if (
    settings.positive.length !== settings.negative.length ||
    settings.positive.length < 1 ||
    settings.positive.length > 8
  )
    throw new Error("Provide 1–8 matching contrast pairs.");
  for (let i = 0; i < settings.positive.length; i++) {
    onProgress(`Extracting pair ${i + 1} / ${settings.positive.length}`);
    pos.push(await engine.activation(settings.positive[i]));
    neg.push(await engine.activation(settings.negative[i]));
  }
  const direction = directionFromPairs(pos, neg),
    zero = new Float32Array(HIDDEN_SIZE);
  const outputs = {} as Record<Condition, Completion>;
  for (const condition of ["baseline", "prompted", "steered"] as const) {
    onProgress(`Generating ${condition}`);
    outputs[condition] = await engine.complete(
      settings,
      condition === "steered"
        ? direction.map((x) => x * settings.strength)
        : zero,
      condition === "prompted" ? settings.instruction : "",
      (text) => onToken(condition, text),
    );
  }
  const p = distribution(outputs.baseline.firstLogits, 1, 49152),
    q = distribution(outputs.steered.firstLogits, 1, 49152);
  const qMap = new Map(q.map((x) => [x.id, x.probability]));
  const divergence =
    p.reduce((s, x) => s + Math.abs(x.probability - (qMap.get(x.id) ?? 0)), 0) /
    2;
  return {
    settings,
    direction: Array.from(direction),
    directionNorm: norm(direction),
    positiveNorm: pos.reduce((s, x) => s + norm(x), 0) / pos.length,
    negativeNorm: neg.reduce((s, x) => s + norm(x), 0) / neg.length,
    outputs,
    firstStepDivergence: divergence,
  };
}
