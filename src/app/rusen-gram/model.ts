export const EXAMPLE_CORPUS =
  "The cat sleeps on the sofa. The dog sleeps on the rug. The cat watches the bird. The bird sings in the garden. The dog runs in the garden. The cat runs to the sofa. The bird watches the dog. The dog watches the cat.";

export function words(text: string): string[] {
  return text.toLowerCase().match(/[\p{L}\p{N}]+|[^\s\p{L}\p{N}]/gu) ?? [];
}

export function inspectNgram(
  corpus: string,
  prompt: string,
  order: number,
  alpha: number,
) {
  const tokens = words(corpus);
  const vocabulary = [...new Set(tokens)].sort();
  const input = words(prompt);
  const trace: { context: string[]; total: number }[] = [];
  let counts = new Map<string, number>();
  let total = 0;
  for (let size = Math.min(order - 1, input.length); size >= 0; size--) {
    const context = size ? input.slice(-size) : [];
    counts = new Map();
    total = 0;
    for (let i = size; i < tokens.length; i++) {
      if (
        !context.every((token, offset) => tokens[i - size + offset] === token)
      )
        continue;
      counts.set(tokens[i], (counts.get(tokens[i]) ?? 0) + 1);
      total++;
    }
    trace.push({ context, total });
    if (total) break;
  }
  const denominator = total + alpha * vocabulary.length;
  const distribution = vocabulary
    .map((token) => ({
      token,
      count: counts.get(token) ?? 0,
      probability: denominator
        ? ((counts.get(token) ?? 0) + alpha) / denominator
        : 0,
    }))
    .sort(
      (a, b) => b.probability - a.probability || a.token.localeCompare(b.token),
    );
  return {
    trace,
    distribution,
    total,
    vocabularySize: vocabulary.length,
    tokenCount: tokens.length,
    denominator,
  };
}
