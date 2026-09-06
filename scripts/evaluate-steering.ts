/** Replay a recorded direction evaluation on the pinned native CPU runtime. */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { AutoTokenizer, env } from "@huggingface/transformers";
import * as ort from "onnxruntime-node";
import {
  createEngine,
  directionFromPairs,
  type Runtime,
} from "../src/app/steering-llms/model";
import {
  MODEL_ID,
  MODEL_REVISION,
  MODEL_SHA256,
  MODEL_SHAPE,
} from "../src/app/steering-llms/presets";
import { norm } from "../src/app/steering-llms/sampling";
import { createSeededRandom } from "../src/lib/random";

interface Plan {
  prompts: string[];
  temperature: number;
  seed: number;
  tokens: number;
  configurations: {
    id: string;
    layer: number;
    strength: number;
    instruction: string;
    pairs: [string, string][];
  }[];
}
async function main() {
  const [directory, planFile, outputFile] = process.argv.slice(2);
  if (!directory || !planFile || !outputFile)
    throw new Error(
      "Usage: tsx scripts/evaluate-steering.ts MODEL_DIRECTORY PLAN_JSON OUTPUT_JSON",
    );
  if (fs.existsSync(outputFile) || fs.existsSync(`${outputFile}l`))
    throw new Error(
      "Choose a new output path; existing evidence is never overwritten.",
    );
  const document = JSON.parse(fs.readFileSync(planFile, "utf8"));
  const plan: Plan = document.native?.plan ?? document;
  env.allowLocalModels = true;
  env.allowRemoteModels = false;
  const tokenizer = await AutoTokenizer.from_pretrained(
    path.resolve(directory),
  );
  const bytes = fs.readFileSync(
    path.join(directory, "onnx/model_quantized.onnx"),
  );
  if (createHash("sha256").update(bytes).digest("hex") !== MODEL_SHA256)
    throw new Error("Model fingerprint mismatch");
  const runtime = {
    Tensor: ort.Tensor,
    InferenceSession: {
      create: (
        buffer: Uint8Array,
        options: ort.InferenceSession.SessionOptions = {},
      ) =>
        ort.InferenceSession.create(buffer, {
          ...options,
          intraOpNumThreads: 1,
          interOpNumThreads: 1,
        }),
    },
  } as Runtime;
  const records = [];
  const directions = [];
  for (const config of plan.configurations) {
    const engine = await createEngine(bytes, tokenizer, runtime, config.layer);
    try {
      const positive = [],
        negative = [];
      for (const [p, n] of config.pairs) {
        positive.push(await engine.activation(p));
        negative.push(await engine.activation(n));
      }
      const direction = directionFromPairs(positive, negative);
      directions.push({ ...config, direction: Array.from(direction) });
      const rng = createSeededRandom(817);
      const random = Float32Array.from(direction, () => rng() * 2 - 1);
      const scale = norm(direction) / norm(random);
      for (let i = 0; i < random.length; i++) random[i] *= scale;
      for (const prompt of plan.prompts)
        for (const condition of [
          "baseline",
          "prompted",
          "random",
          "steered",
        ] as const) {
          const settings = {
            prompt,
            layer: config.layer,
            strength: config.strength,
            instruction: config.instruction,
            temperature: plan.temperature,
            seed: plan.seed,
            tokens: plan.tokens,
            positive: config.pairs.map((x) => x[0]),
            negative: config.pairs.map((x) => x[1]),
          };
          const delta = (
            condition === "steered"
              ? direction
              : condition === "random"
                ? random
                : new Float32Array(MODEL_SHAPE.hidden)
          ).map((x) => x * config.strength);
          const output = await engine.complete(
            settings,
            delta,
            condition === "prompted" ? config.instruction : "",
            () => {},
          );
          const additionMaxError = Math.max(
            ...output.after.map((x, i) =>
              Math.abs(
                x - output.before[i] - (output.measurementIndex ? delta[i] : 0),
              ),
            ),
          );
          const row = {
            id: config.id,
            layer: config.layer,
            strength: config.strength,
            prompt,
            condition,
            text: output.text,
            tokenIds: output.tokenIds,
            repetition: output.repetition,
            measurementIndex: output.measurementIndex,
            additionMaxError,
          };
          records.push(row);
          fs.appendFileSync(`${outputFile}l`, JSON.stringify(row) + "\n");
        }
      console.log(config.id, config.layer, "complete");
    } finally {
      await engine.dispose();
    }
  }
  fs.writeFileSync(
    outputFile,
    JSON.stringify(
      {
        model: MODEL_ID,
        revision: MODEL_REVISION,
        sha256: MODEL_SHA256,
        runtime: "onnxruntime-node 1.24.3 CPU, one inference thread",
        method:
          "Last-token mean contrast; generated-token activations only; unchanged assistant-prefill fiction opening",
        plan,
        directions,
        records,
      },
      null,
      2,
    ) + "\n",
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
