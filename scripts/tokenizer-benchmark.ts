import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { get_encoding } from "tiktoken";
import init, { Tokenizer } from "../public/wasm/rusenizer_wasm.js";

const digest = (data: Uint8Array) =>
  createHash("sha256").update(data).digest("hex");
const corpusBytes = readFileSync("src/content/tokenizer-benchmark.json");
const corpus = JSON.parse(corpusBytes.toString()) as {
  name: string;
  scope: string;
  texts: string[];
};
const wasm = readFileSync("public/wasm/rusenizer_wasm_bg.wasm");
const ranks = readFileSync("public/models/v1/mergeable_ranks.json");
await init({ module_or_path: wasm });
const rusen = new Tokenizer(ranks.toString());
const baseline = get_encoding("cl100k_base");
try {
  const rows = corpus.texts.map((text) => ({
    text,
    rusen: rusen.encode(text).length,
    baseline: baseline.encode(text).length,
  }));
  const totalRusen = rows.reduce((sum, row) => sum + row.rusen, 0);
  const totalBaseline = rows.reduce((sum, row) => sum + row.baseline, 0);
  const report = {
    version: 1,
    name: corpus.name,
    scope: corpus.scope,
    baseline: "cl100k_base",
    tiktokenVersion: JSON.parse(
      readFileSync("node_modules/tiktoken/package.json", "utf8"),
    ).version as string,
    corpusSha256: digest(corpusBytes),
    wasmSha256: digest(wasm),
    ranksSha256: digest(ranks),
    rows,
    totalRusen,
    totalBaseline,
    reductionPercent: 100 * (1 - totalRusen / totalBaseline),
  };
  writeFileSync(
    "src/content/tokenizer-benchmark.generated.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    `${rows.length} examples: ${totalRusen} Rusenizer / ${totalBaseline} cl100k_base tokens (${report.reductionPercent.toFixed(2)}% reduction on this corpus only).`,
  );
} finally {
  rusen.free();
  baseline.free();
}
