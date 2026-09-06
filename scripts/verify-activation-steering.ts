import fs from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import * as ort from "onnxruntime-node";
import { AutoTokenizer, env } from "@huggingface/transformers";
import { createEngine } from "../src/app/steering-llms/model";
import {
  MODEL_SHAPE,
  CONTINUATION_INSTRUCTION,
  LAYERS,
  MODEL_SHA256,
  MODEL_ID,
  MODEL_REVISION,
} from "../src/app/steering-llms/presets";
import DIRECTIONS from "../src/content/steering-directions.json";
async function main() {
  const directory = path.resolve(process.argv[2] ?? "output/steering-360m");
  env.allowLocalModels = true;
  env.allowRemoteModels = false;
  const tokenizer = await AutoTokenizer.from_pretrained(directory);
  const bytes = fs.readFileSync(
    path.join(directory, "onnx/model_quantized.onnx"),
  );
  if (createHash("sha256").update(bytes).digest("hex") !== MODEL_SHA256)
    throw new Error("Model fingerprint mismatch");
  console.log(MODEL_ID, MODEL_REVISION);
  const original = await ort.InferenceSession.create(bytes);
  const preset = DIRECTIONS[0];
  const settings = {
    ...preset,
    positive: [...preset.positive],
    negative: [...preset.negative],
    layer: 15,
    strength: 0,
    temperature: 0,
    seed: 42,
    tokens: 1,
  };
  const text = tokenizer.apply_chat_template(
    [{ role: "user", content: CONTINUATION_INSTRUCTION }],
    { tokenize: false, add_generation_prompt: true },
  ) as string;
  const ids = tokenizer.encode(text + settings.prompt, {
    add_special_tokens: false,
  });
  const feeds: Record<string, ort.Tensor> = {
    input_ids: new ort.Tensor("int64", BigInt64Array.from(ids, BigInt), [
      1,
      ids.length,
    ]),
    position_ids: new ort.Tensor(
      "int64",
      BigInt64Array.from(ids, (_, i) => BigInt(i)),
      [1, ids.length],
    ),
    attention_mask: new ort.Tensor(
      "int64",
      new BigInt64Array(ids.length).fill(BigInt(1)),
      [1, ids.length],
    ),
  };
  for (let i = 0; i < MODEL_SHAPE.blocks; i++)
    for (const kind of ["key", "value"])
      feeds[`past_key_values.${i}.${kind}`] = new ort.Tensor(
        "float32",
        new Float32Array(0),
        [1, MODEL_SHAPE.kvHeads, 0, MODEL_SHAPE.headSize],
      );
  const raw = await original.run(feeds);
  const expected = (raw.logits.data as Float32Array).slice(
    -MODEL_SHAPE.vocabulary,
  );
  const checks = [];
  for (const layer of LAYERS) {
    const engine = await createEngine(bytes, tokenizer, ort, layer);
    const output = await engine.complete(
      { ...settings, layer },
      new Float32Array(MODEL_SHAPE.hidden),
      "",
      () => {},
    );
    const maxError = Math.max(
      ...output.comparisonLogits.map((v, i) => Math.abs(v - expected[i])),
    );
    checks.push({ layer, maxError });
    console.log(layer, maxError);
    if (maxError > 1e-4) throw new Error("Original model parity failed");
    await engine.dispose();
  }
  console.log(JSON.stringify(checks));
  Object.values(raw).forEach((t) => t.dispose());
  Object.values(feeds).forEach((t) => t.dispose());
  await original.release();
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
