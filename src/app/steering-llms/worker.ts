import { AutoTokenizer, env } from "@huggingface/transformers";
import * as ort from "onnxruntime-web/wasm";
import {
  compareSteering,
  createEngine,
  type Comparison,
  type Condition,
} from "./model";
import {
  MODEL_ID,
  MODEL_REVISION,
  MODEL_SHA256,
  MODEL_BYTES,
  type SteeringSettings,
} from "./presets";
export type SteeringResponse =
  | { stage: string }
  | { condition: Condition; text: string }
  | { result: Comparison }
  | { error: string };
const post = (value: SteeringResponse) => self.postMessage(value);
let bytes: Uint8Array | undefined;
let tokenizer:
  | Awaited<ReturnType<typeof AutoTokenizer.from_pretrained>>
  | undefined;
let engine: Awaited<ReturnType<typeof createEngine>> | undefined;
let currentLayer = -1;
let busy = false;
async function download() {
  const url = `https://huggingface.co/${MODEL_ID}/resolve/${MODEL_REVISION}/onnx/model_quantized.onnx`;
  const cache = await caches
    .open("rusen-activation-model-v1")
    .catch(() => null);
  const cached = await cache?.match(url);
  let buffer: ArrayBuffer;
  if (cached) {
    post({ stage: "Reading cached model…" });
    buffer = await cached.arrayBuffer();
  } else {
    let response: Response | undefined;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        response = await fetch(url, { signal: AbortSignal.timeout(180000) });
        if (!response.ok)
          throw new Error(`Model download returned ${response.status}.`);
        const reader = response.body?.getReader();
        if (!reader) throw new Error("No model download stream.");
        const chunks: Uint8Array[] = [];
        let size = 0;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          size += value.length;
          post({
            stage: `Downloading model · ${(size / 1e6).toFixed(0)} / ${(MODEL_BYTES / 1e6).toFixed(0)} MB`,
          });
        }
        const data = new Uint8Array(size);
        let offset = 0;
        for (const chunk of chunks) {
          data.set(chunk, offset);
          offset += chunk.length;
        }
        buffer = data.buffer;
        break;
      } catch (error) {
        if (attempt === 2) throw error;
        post({ stage: `Download interrupted · retry ${attempt + 1} / 2` });
      }
    }
    if (!buffer!) throw new Error("Model download failed.");
  }
  const hash = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", buffer!)),
    (x) => x.toString(16).padStart(2, "0"),
  ).join("");
  if (hash !== MODEL_SHA256) {
    await cache?.delete(url);
    throw new Error(
      "Model checksum mismatch. Retry to download a verified copy.",
    );
  }
  if (!cached) await cache?.put(url, new Response(buffer!)).catch(() => {});
  return new Uint8Array(buffer!);
}
self.onmessage = async ({ data: settings }: MessageEvent<SteeringSettings>) => {
  if (busy) return;
  busy = true;
  try {
    ort.env.wasm.numThreads = 1;
    // Keep the runtime on our origin and off the main UI thread.
    ort.env.wasm.wasmPaths = "/runtime/ort-1.25/";
    env.allowLocalModels = false;
    if (!tokenizer) {
      post({ stage: "Loading tokenizer…" });
      tokenizer = await AutoTokenizer.from_pretrained(MODEL_ID, {
        revision: MODEL_REVISION,
      });
    }
    if (!bytes) bytes = await download();
    if (!engine || currentLayer !== settings.layer) {
      post({ stage: `Preparing intervention after block ${settings.layer}…` });
      await engine?.dispose();
      engine = undefined;
      engine = await createEngine(bytes, tokenizer, ort, settings.layer);
      currentLayer = settings.layer;
    }
    const result = await compareSteering(
      engine,
      settings,
      (stage) => post({ stage }),
      (condition, text) => post({ condition, text }),
    );
    post({ result });
  } catch (error) {
    post({
      error:
        error instanceof Error
          ? error.message
          : "Activation experiment failed.",
    });
  } finally {
    busy = false;
  }
};
