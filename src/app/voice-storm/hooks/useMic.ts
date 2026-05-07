"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const TARGET_SAMPLE_RATE = 16000;

type MicState = "idle" | "asking" | "ready" | "recording" | "error";

interface RecordingHandle {
  audio: Float32Array;
  durationSec: number;
}

interface AnalyserSnapshot {
  /** Time-domain samples in [-1, 1]. */
  waveform: Float32Array;
  /** RMS amplitude in [0, 1]. */
  rms: number;
}

export interface UseMic {
  state: MicState;
  error: string | null;
  start: () => Promise<void>;
  stop: () => Promise<RecordingHandle | null>;
  /** Live snapshot of the analyser. Empty if not recording. */
  sample: () => AnalyserSnapshot;
}

function resampleTo16k(input: Float32Array, fromRate: number): Float32Array {
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

export function useMic(): UseMic {
  const [state, setState] = useState<MicState>("idle");
  const [error, setError] = useState<string | null>(null);

  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);
  const startTimeRef = useRef<number>(0);
  const waveformBufRef = useRef<Float32Array | null>(null);

  const cleanup = useCallback(() => {
    try {
      processorRef.current?.disconnect();
      sourceRef.current?.disconnect();
      analyserRef.current?.disconnect();
    } catch {}
    streamRef.current?.getTracks().forEach((t) => t.stop());
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    sourceRef.current = null;
    processorRef.current = null;
    analyserRef.current = null;
    streamRef.current = null;
    waveformBufRef.current = null;
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const start = useCallback(async () => {
    setError(null);
    setState("asking");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      const processor = ctx.createScriptProcessor(4096, 1, 1);

      source.connect(analyser);
      source.connect(processor);
      processor.connect(ctx.destination);

      chunksRef.current = [];
      startTimeRef.current = performance.now();
      processor.onaudioprocess = (e) => {
        const channel = e.inputBuffer.getChannelData(0);
        // Copy because the underlying buffer is reused.
        chunksRef.current.push(new Float32Array(channel));
      };

      ctxRef.current = ctx;
      sourceRef.current = source;
      processorRef.current = processor;
      analyserRef.current = analyser;
      streamRef.current = stream;
      waveformBufRef.current = new Float32Array(analyser.fftSize);

      setState("recording");
    } catch (err) {
      cleanup();
      setError(err instanceof Error ? err.message : "Microphone permission denied");
      setState("error");
    }
  }, [cleanup]);

  const stop = useCallback(async (): Promise<RecordingHandle | null> => {
    const ctx = ctxRef.current;
    if (!ctx) {
      setState("idle");
      return null;
    }
    const sampleRate = ctx.sampleRate;
    const chunks = chunksRef.current;
    chunksRef.current = [];

    cleanup();

    if (chunks.length === 0) {
      setState("idle");
      return null;
    }
    const total = chunks.reduce((sum, c) => sum + c.length, 0);
    const merged = new Float32Array(total);
    let offset = 0;
    for (const c of chunks) {
      merged.set(c, offset);
      offset += c.length;
    }
    const audio = resampleTo16k(merged, sampleRate);
    const durationSec = (performance.now() - startTimeRef.current) / 1000;

    setState("idle");
    return { audio, durationSec };
  }, [cleanup]);

  const sample = useCallback((): AnalyserSnapshot => {
    const analyser = analyserRef.current;
    const buf = waveformBufRef.current;
    if (!analyser || !buf) return { waveform: new Float32Array(0), rms: 0 };
    // The DOM type for getFloatTimeDomainData wants Float32Array<ArrayBuffer>;
    // our buffer is Float32Array<ArrayBufferLike>. Runtime is identical;
    // bypass via unknown.
    analyser.getFloatTimeDomainData(buf as unknown as Float32Array<ArrayBuffer>);
    let sumSq = 0;
    for (let i = 0; i < buf.length; i++) sumSq += buf[i] * buf[i];
    const rms = Math.sqrt(sumSq / buf.length);
    return { waveform: buf, rms };
  }, []);

  return { state, error, start, stop, sample };
}
