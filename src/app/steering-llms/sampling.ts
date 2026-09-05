export function distribution(
  logits: ArrayLike<number>,
  targetIds: ReadonlySet<number>,
  strength: number,
  temperature: number,
  topK: number,
) {
  const candidates = Array.from(logits, (score, id) => ({
    id,
    score: (Number(score) + (targetIds.has(id) ? strength : 0)) / temperature,
  }))
    .filter((token) => Number.isFinite(token.score))
    .sort((a, b) => b.score - a.score || a.id - b.id)
    .slice(0, topK);
  if (!candidates.length)
    throw new Error("The model produced no finite candidate logits.");
  const weights = candidates.map((token) =>
    Math.exp(token.score - candidates[0].score),
  );
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  return candidates.map((token, index) => ({
    id: token.id,
    probability: weights[index] / total,
  }));
}

export function sampleToken(
  candidates: { id: number; probability: number }[],
  draw: number,
): number {
  let threshold = draw;
  for (const candidate of candidates)
    if ((threshold -= candidate.probability) <= 0) return candidate.id;
  return candidates[candidates.length - 1].id;
}
