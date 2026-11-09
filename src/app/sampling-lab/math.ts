/** Signed baseband frequency; a negative frequency preserves a sine's phase. */
export function aliasFrequency(frequency: number, sampleRate: number): number {
  return frequency - sampleRate * Math.floor(frequency / sampleRate + 0.5);
}

export function sineAt(time: number, frequency: number, phase: number): number {
  return Math.sin(2 * Math.PI * frequency * time + phase);
}

/** Finite sinc interpolation: the unobserved samples outside the window are zero. */
export function reconstructSamples(samples: readonly number[], sampleRate: number, time: number): number {
  return samples.reduce((sum, sample, index) => {
    const x = sampleRate * time - index;
    return sum + sample * (Math.abs(x) < 1e-10 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x));
  }, 0);
}

/** One plain sentence describing what the sampler sees. */
export function verdict(frequency: number, sampleRate: number, alias: number): string {
  const head = `${frequency} Hz sampled at ${sampleRate} Hz`;
  if (sampleRate === 2 * frequency) return `${head} sits on the limit: two samples per cycle, so the phase decides what the dots show.`;
  if (sampleRate < 2 * frequency) return alias === 0 ? `${head} looks like a constant.` : `${head} looks like ${Math.abs(alias)} Hz.`;
  return `${head} is captured: no slower wave fits the same dots.`;
}
