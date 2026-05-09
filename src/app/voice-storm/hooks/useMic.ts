"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MicVAD } from "@ricky0123/vad-web";

export type MicState = "idle" | "asking" | "ready" | "recording" | "error";

interface AnalyserSnapshot {
  /** Time-domain samples in [-1, 1]. */
  waveform: Float32Array;
  /** RMS amplitude in [0, 1]. */
  rms: number;
}

export interface UseMicOptions {
  /** Called once per detected speech segment with 16 kHz mono PCM. */
  onSpeech?: (audio: Float32Array) => void;
}

export interface UseMic {
  state: MicState;
  error: string | null;
  /** True while the VAD believes the user is currently speaking. */
  speaking: boolean;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  /** Live snapshot of the analyser. Empty if not recording. */
  sample: () => AnalyserSnapshot;
}

const MIC_CONSTRAINTS: MediaStreamConstraints = {
  audio: {
    channelCount: 1,
    echoCancellation: true,
    autoGainControl: true,
    noiseSuppression: true,
  },
};

export function useMic(options: UseMicOptions = {}): UseMic {
  const { onSpeech } = options;
  const [state, setState] = useState<MicState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);

  const onSpeechRef = useRef(onSpeech);
  onSpeechRef.current = onSpeech;

  const vadRef = useRef<MicVAD | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const analyserSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const waveformBufRef = useRef<Float32Array | null>(null);

  const cleanup = useCallback(async () => {
    try {
      await vadRef.current?.destroy();
    } catch {}
    vadRef.current = null;
    try {
      analyserSourceRef.current?.disconnect();
      analyserRef.current?.disconnect();
    } catch {}
    streamRef.current?.getTracks().forEach((t) => t.stop());
    try {
      await ctxRef.current?.close();
    } catch {}
    ctxRef.current = null;
    streamRef.current = null;
    analyserRef.current = null;
    analyserSourceRef.current = null;
    waveformBufRef.current = null;
    setSpeaking(false);
  }, []);

  useEffect(() => () => void cleanup(), [cleanup]);

  const start = useCallback(async () => {
    setError(null);
    setState("asking");
    try {
      const stream = await navigator.mediaDevices.getUserMedia(MIC_CONSTRAINTS);
      const ctx = new AudioContext();
      const analyserSource = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyserSource.connect(analyser);

      streamRef.current = stream;
      ctxRef.current = ctx;
      analyserRef.current = analyser;
      analyserSourceRef.current = analyserSource;
      waveformBufRef.current = new Float32Array(analyser.fftSize);

      const { MicVAD } = await import("@ricky0123/vad-web");
      const vad = await MicVAD.new({
        audioContext: ctx,
        getStream: async () => stream,
        // Tuned to match Xenova's moonshine-web reference.
        positiveSpeechThreshold: 0.3,
        negativeSpeechThreshold: 0.25,
        redemptionMs: 400,
        preSpeechPadMs: 80,
        minSpeechMs: 250,
        onSpeechStart: () => setSpeaking(true),
        onSpeechEnd: (audio) => {
          setSpeaking(false);
          onSpeechRef.current?.(audio);
        },
        onVADMisfire: () => setSpeaking(false),
      });
      vadRef.current = vad;
      await vad.start();

      setState("recording");
    } catch (err) {
      await cleanup();
      setError(err instanceof Error ? err.message : "Microphone permission denied");
      setState("error");
    }
  }, [cleanup]);

  const stop = useCallback(async () => {
    await cleanup();
    setState("idle");
  }, [cleanup]);

  const sample = useCallback((): AnalyserSnapshot => {
    const analyser = analyserRef.current;
    const buf = waveformBufRef.current;
    if (!analyser || !buf) return { waveform: new Float32Array(0), rms: 0 };
    analyser.getFloatTimeDomainData(buf as unknown as Float32Array<ArrayBuffer>);
    let sumSq = 0;
    for (let i = 0; i < buf.length; i++) sumSq += buf[i] * buf[i];
    const rms = Math.sqrt(sumSq / buf.length);
    return { waveform: buf, rms };
  }, []);

  return { state, error, speaking, start, stop, sample };
}
