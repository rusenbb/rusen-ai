import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
const require = createRequire(import.meta.url);
const distribution = dirname(require.resolve("onnxruntime-web/wasm"));
const destination = resolve("public/runtime/ort-1.25");
mkdirSync(destination, { recursive: true });
for (const file of [
  "ort-wasm-simd-threaded.wasm",
  "ort-wasm-simd-threaded.mjs",
])
  copyFileSync(resolve(distribution, file), resolve(destination, file));
