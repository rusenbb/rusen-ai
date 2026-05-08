export const TARGET_SAMPLE_RATE = 16000;

/** Linear-interpolation resample to 16 kHz mono. Cheap and good enough for ASR. */
export function resampleTo16k(input: Float32Array, fromRate: number): Float32Array {
  if (fromRate === TARGET_SAMPLE_RATE) return input;
  const ratio = fromRate / TARGET_SAMPLE_RATE;
  const outLen = Math.floor(input.length / ratio);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const srcIdx = i * ratio;
    const i0 = Math.floor(srcIdx);
    const i1 = Math.min(i0 + 1, input.length - 1);
    const frac = srcIdx - i0;
    out[i] = input[i0] * (1 - frac) + input[i1] * frac;
  }
  return out;
}

export interface DecodedAudio {
  audio: Float32Array;
  durationSec: number;
}

/**
 * Decodes any browser-supported audio file (mp3, wav, m4a, webm, ogg, flac…)
 * and returns 16 kHz mono PCM ready for Whisper.
 */
export async function decodeAudioFile(file: File): Promise<DecodedAudio> {
  const arrayBuffer = await file.arrayBuffer();
  const Ctor: typeof AudioContext =
    (window.AudioContext as typeof AudioContext) ||
    ((window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
  const ctx = new Ctor();
  try {
    const buf = await ctx.decodeAudioData(arrayBuffer.slice(0));
    // Mix down to mono by averaging channels (most files are mono or stereo).
    const channelCount = buf.numberOfChannels;
    const length = buf.length;
    const mono = new Float32Array(length);
    if (channelCount === 1) {
      mono.set(buf.getChannelData(0));
    } else {
      for (let ch = 0; ch < channelCount; ch++) {
        const data = buf.getChannelData(ch);
        for (let i = 0; i < length; i++) mono[i] += data[i];
      }
      for (let i = 0; i < length; i++) mono[i] /= channelCount;
    }
    const audio = resampleTo16k(mono, buf.sampleRate);
    return { audio, durationSec: buf.duration };
  } finally {
    ctx.close().catch(() => {});
  }
}
