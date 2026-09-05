import { createSeededRandom } from "@/lib/random";

export const EXAMPLE_CORPUS =
  "The cat sleeps on the sofa. The dog sleeps on the rug. The cat watches the bird. The bird sings in the garden. The dog runs in the garden. The cat runs to the sofa. The bird watches the dog. The dog watches the cat.";
export function words(text: string): string[] {
  return (
    text
      .toLowerCase()
      .match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*|[^\s\p{L}\p{N}\p{C}]|\n/gu) ??
    []
  );
}
export function extractBook(
  source: string,
  edition?: { kind: string; sections: { start: string; end: string }[] },
): string {
  const match = source
    .replace(/\r\n/g, "\n")
    .match(/\*\*\* START OF[^\n]*\*\*\*\s*([\s\S]*?)\*\*\* END OF/);
  if (!match)
    throw new Error("This edition is missing its Gutenberg text boundaries.");
  let body = match[1];
  if (edition) {
    let cursor = 0;
    body = edition.sections
      .map((section) => {
        const start = body.indexOf(section.start, cursor);
        const end = section.end
          ? body.indexOf(section.end, start + section.start.length)
          : body.length;
        if (start < 0 || end < start)
          throw new Error(
            "The edition’s verified literary boundaries do not match.",
          );
        cursor = end;
        return body.slice(start, end);
      })
      .join("\n\n");
  }
  body = body
    .replace(/\[Illustration[\s\S]*?\]/gi, "")
    .replace(/\[Pg\.?[^\]]*\]/g, "")
    .replace(/_/g, "");
  body = body
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return edition?.kind === "Fiction"
    ? body.replace(/([^\n])\n(?=[^\n])/g, "$1 ")
    : body;
}

interface Counts {
  total: number;
  next: Map<string, number>;
}
export interface NgramModel {
  contexts: Map<string, Counts>;
  vocabulary: string[];
  tokenCount: number;
  order: number;
}
export function trainNgram(corpus: string, order: number): NgramModel {
  if (!Number.isInteger(order) || order < 1 || order > 5)
    throw new Error("Choose an order from 1 to 5.");
  const contexts = new Map<string, Counts>();
  const vocabulary = new Set<string>();
  let tokenCount = 0;
  // Blank lines separate paragraphs/poems: never learn a transition across them.
  for (const paragraph of corpus.replace(/\r\n/g, "\n").split(/\n\s*\n/)) {
    const tokens = words(paragraph.trim());
    tokenCount += tokens.length;
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      vocabulary.add(token);
      for (let size = 0; size <= Math.min(order - 1, i); size++) {
        const key = tokens.slice(i - size, i).join("\0");
        let bucket = contexts.get(key);
        if (!bucket) {
          bucket = { total: 0, next: new Map() };
          contexts.set(key, bucket);
        }
        bucket.total++;
        bucket.next.set(token, (bucket.next.get(token) ?? 0) + 1);
      }
    }
  }
  return { contexts, vocabulary: [...vocabulary].sort(), tokenCount, order };
}
function lookup(model: NgramModel, prompt: string) {
  const input = words(prompt);
  const trace: { context: string[]; total: number }[] = [];
  let bucket: Counts = { total: 0, next: new Map() };
  for (let size = Math.min(model.order - 1, input.length); size >= 0; size--) {
    const context = size ? input.slice(-size) : [];
    bucket = model.contexts.get(context.join("\0")) ?? {
      total: 0,
      next: new Map(),
    };
    trace.push({ context, total: bucket.total });
    if (bucket.total) break;
  }
  return { bucket, trace };
}
export function inspectNgram(model: NgramModel, prompt: string, alpha: number) {
  if (!Number.isFinite(alpha) || alpha < 0)
    throw new Error("Smoothing must be non-negative.");
  const { bucket, trace } = lookup(model, prompt);
  const denominator = bucket.total + alpha * model.vocabulary.length;
  const distribution = model.vocabulary
    .map((token) => ({
      token,
      count: bucket.next.get(token) ?? 0,
      probability: denominator
        ? ((bucket.next.get(token) ?? 0) + alpha) / denominator
        : 0,
    }))
    .sort(
      (a, b) => b.probability - a.probability || a.token.localeCompare(b.token),
    );
  return {
    trace,
    distribution,
    total: bucket.total,
    denominator,
    tokenCount: model.tokenCount,
    vocabularySize: model.vocabulary.length,
    uniformMass: denominator
      ? (alpha * model.vocabulary.length) / denominator
      : 0,
  };
}
export function generateNgram(
  model: NgramModel,
  prompt: string,
  alpha: number,
  seed: number,
  length: number,
): string {
  const random = createSeededRandom(seed);
  const context = words(prompt);
  const output: string[] = [];
  if (!model.vocabulary.length) return "";
  for (let i = 0; i < length; i++) {
    const { bucket } = lookup(
      model,
      context.slice(-(model.order || 1)).join(" "),
    );
    // Exact additive distribution: empirical counts + uniform pseudocount mass.
    let draw = random() * (bucket.total + alpha * model.vocabulary.length);
    let token: string;
    if (draw >= bucket.total)
      token =
        model.vocabulary[
          Math.min(
            model.vocabulary.length - 1,
            Math.floor((draw - bucket.total) / alpha),
          )
        ];
    else {
      token = bucket.next.keys().next().value!;
      for (const [candidate, count] of bucket.next) {
        draw -= count;
        if (draw < 0) {
          token = candidate;
          break;
        }
      }
    }
    output.push(token);
    context.push(token);
  }
  return output
    .join(" ")
    .replace(/ *\n */g, "\n")
    .replace(/ +([.,;:!?])/g, "$1")
    .replace(/([“(]) +/g, "$1")
    .replace(/ +([”)])/g, "$1");
}
