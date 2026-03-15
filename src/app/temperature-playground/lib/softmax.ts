/**
 * Convert stored log-probabilities (at T=1) to probabilities at any temperature.
 *
 * Log-probs are log(softmax(logits)). Since softmax is shift-invariant,
 * we can compute softmax(logprob / T) to get probabilities at temperature T.
 *
 * At T=0 (greedy), all probability mass goes to the top token.
 */
export function logprobsToProbs(
  logprobs: number[],
  temperature: number,
): number[] {
  if (logprobs.length === 0) return [];

  if (temperature <= 0) {
    // Greedy: all mass on the highest logprob
    let maxIdx = 0;
    for (let i = 1; i < logprobs.length; i++) {
      if (logprobs[i] > logprobs[maxIdx]) maxIdx = i;
    }
    return logprobs.map((_, i) => (i === maxIdx ? 1.0 : 0.0));
  }

  // Scale logprobs by 1/T, then apply softmax with numerical stability
  const scaled = logprobs.map((lp) => lp / temperature);
  let maxVal = scaled[0];
  for (let i = 1; i < scaled.length; i++) {
    if (scaled[i] > maxVal) maxVal = scaled[i];
  }

  const exps = scaled.map((s) => Math.exp(s - maxVal));
  let total = 0;
  for (const e of exps) total += e;

  return exps.map((e) => e / total);
}

/**
 * Find the probability of a specific token ID within a logprobs list
 * at a given temperature.
 */
export function tokenProbAtTemperature(
  logprobs: Array<{ logprob: number }>,
  tokenIndex: number,
  temperature: number,
): number {
  const lps = logprobs.map((lp) => lp.logprob);
  const probs = logprobsToProbs(lps, temperature);
  return probs[tokenIndex] ?? 0;
}
