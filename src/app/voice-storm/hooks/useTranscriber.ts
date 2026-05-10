"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MODEL_ID = "Xenova/whisper-base";
const SAMPLE_RATE = 16000;

type AsrOptions = {
  chunk_length_s?: number;
  stride_length_s?: number;
  language?: string;
  task?: "transcribe" | "translate";
  no_repeat_ngram_size?: number;
  return_timestamps?: boolean;
  do_sample?: boolean;
  top_k?: number;
  force_full_sequences?: boolean;
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

// Whisper hallucinates a fixed set of phrases when given silence or noise —
// these come from subtitle/credit lines in its training data. Strip them
// post-hoc rather than trusting the model's "confidence."
const HALLUCINATION_PATTERNS: RegExp[] = [
  /^\s*(thanks?|thank you)( so much| very much)?( for watching)?[.!]?\s*$/i,
  /^\s*(please )?(don'?t forget to )?(like|subscribe)( and (like|subscribe))?[.!]?\s*$/i,
  /^\s*subtitles?( by| from)? .+/i,
  /^\s*(translated|captioned) by .+/i,
  /^\s*\[?(music|applause|laughter|silence|sound|audio|noise)\]?[.!]?\s*$/i,
  /amara\.org/i,
  /^\s*(bye|goodbye)[.!]?\s*$/i,
];

// Bracketed sound tags Whisper emits inline: [AUDIO], [BLANK_AUDIO], [Music], etc.
const NON_SPEECH_TOKEN_RE = /\[\s*[A-Za-z_ ]+\s*\]/g;

// Detect runs of the same token repeated >=4 times (e.g. "you you you you you").
// no_repeat_ngram_size catches most but not all; this is the safety net.
function stripExcessiveRepetition(text: string): string {
  const tokens = text.split(/(\s+)/);
  const out: string[] = [];
  let lastWord = "";
  let runLen = 0;
  for (const tok of tokens) {
    if (/^\s+$/.test(tok)) {
      out.push(tok);
      continue;
    }
    const norm = tok.toLowerCase().replace(/[.,!?;:]+$/, "");
    if (norm && norm === lastWord) {
      runLen += 1;
      if (runLen >= 3) continue; // keep first 3 occurrences only
    } else {
      lastWord = norm;
      runLen = 1;
    }
    out.push(tok);
  }
  return out.join("").trim();
}

function cleanWhisperOutput(text: string): string {
  let cleaned = text.replace(NON_SPEECH_TOKEN_RE, "").replace(/\s+/g, " ").trim();
  cleaned = stripExcessiveRepetition(cleaned);
  for (const pat of HALLUCINATION_PATTERNS) {
    if (pat.test(cleaned)) return "";
  }
  return cleaned;
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

      // Skip clips too short to plausibly contain speech (<300 ms).
      // Whisper happily hallucinates a full sentence from a 100ms blip.
      if (audio.length < SAMPLE_RATE * 0.3) return "";

      // Skip clips with vanishingly low energy — pure VAD false positives.
      let sumSq = 0;
      for (let i = 0; i < audio.length; i++) sumSq += audio[i] * audio[i];
      const rms = Math.sqrt(sumSq / audio.length);
      if (rms < 0.005) return "";

      // Hard-cap at 30s so a chunk never blows past Whisper's window. The VAD
      // already segments much shorter, but a stuck "speaking" state could
      // theoretically deliver a longer buffer.
      const trimmed =
        audio.length > SAMPLE_RATE * 30
          ? audio.subarray(0, SAMPLE_RATE * 30)
          : audio;

      const out = await pipelineRef.current(trimmed, {
        chunk_length_s: 30,
        stride_length_s: 5,
        task: "transcribe",
        // Omit `language` to let Whisper auto-detect from the multilingual model.
        ...(opts?.language ? { language: opts.language } : {}),
        // Greedy / deterministic decoding. Sampling injects randomness that
        // turns near-silence into hallucinated phrases far more often.
        do_sample: false,
        top_k: 0,
        // Anti-hallucination: prevents `[SOUND] [SOUND] …` repetition traps.
        no_repeat_ngram_size: 3,
        return_timestamps: false,
        force_full_sequences: false,
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
