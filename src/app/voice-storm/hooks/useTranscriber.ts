"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MODEL_ID = "Xenova/whisper-base";

type AsrOptions = {
  chunk_length_s?: number;
  stride_length_s?: number;
  language?: string;
  task?: "transcribe" | "translate";
  no_repeat_ngram_size?: number;
  return_timestamps?: boolean;
};

type AsrPipeline = (
  audio: Float32Array,
  options?: AsrOptions,
) => Promise<{ text: string }>;

export type TranscriberStatus = "idle" | "loading" | "ready" | "error";

export interface UseTranscriber {
  status: TranscriberStatus;
  progress: number;
  error: string | null;
  transcribe: (audio: Float32Array, opts?: { language?: string }) => Promise<string>;
}

const NON_SPEECH_TOKEN_RE = /\[\s*[A-Za-z_ ]+\s*\]/g;

function cleanWhisperOutput(text: string): string {
  return text.replace(NON_SPEECH_TOKEN_RE, "").replace(/\s+/g, " ").trim();
}

export function useTranscriber(): UseTranscriber {
  const [status, setStatus] = useState<TranscriberStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const pipelineRef = useRef<AsrPipeline | null>(null);
  const initPromise = useRef<Promise<void> | null>(null);

  const initModel = useCallback(async () => {
    if (initPromise.current) return initPromise.current;
    if (pipelineRef.current) return;

    initPromise.current = (async () => {
      try {
        setStatus("loading");
        setError(null);
        setProgress(0);

        const { pipeline, env } = await import("@huggingface/transformers");
        env.allowLocalModels = false;
        env.useBrowserCache = true;

        const asr = await pipeline("automatic-speech-recognition", MODEL_ID, {
          device: "wasm",
          progress_callback: (p: { progress?: number; status?: string }) => {
            if (p.progress !== undefined) setProgress(Math.round(p.progress));
          },
        });
        pipelineRef.current = asr as unknown as AsrPipeline;
        setStatus("ready");
        setProgress(100);
      } catch (err) {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Failed to load Whisper");
      } finally {
        initPromise.current = null;
      }
    })();

    return initPromise.current;
  }, []);

  const transcribe = useCallback(
    async (audio: Float32Array, opts?: { language?: string }): Promise<string> => {
      if (!pipelineRef.current) await initModel();
      if (!pipelineRef.current) throw new Error("Whisper failed to load");
      const out = await pipelineRef.current(audio, {
        chunk_length_s: 30,
        task: "transcribe",
        // Omit `language` to let Whisper auto-detect from the multilingual model.
        ...(opts?.language ? { language: opts.language } : {}),
        // Anti-hallucination: prevents `[SOUND] [SOUND] …` style repetition traps
        // the small Whisper variants fall into on noisy or near-silent audio.
        no_repeat_ngram_size: 3,
        return_timestamps: false,
      });
      return cleanWhisperOutput(out.text);
    },
    [initModel],
  );

  useEffect(() => {
    const t = setTimeout(() => {
      initModel();
    }, 400);
    return () => clearTimeout(t);
  }, [initModel]);

  return { status, progress, error, transcribe };
}
