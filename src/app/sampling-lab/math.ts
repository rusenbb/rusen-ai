/** Signed baseband frequency; a negative frequency preserves a sine's phase. */
export function aliasFrequency(frequency: number, sampleRate: number): number {
  return frequency - sampleRate * Math.floor(frequency / sampleRate + 0.5);
}

export function sineAt(time: number, frequency: number, phase: number): number {
  return Math.sin(2 * Math.PI * frequency * time + phase);
}
