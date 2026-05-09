"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMic } from "./hooks/useMic";
import { useTranscriber } from "./hooks/useTranscriber";
import { decodeAudioFile } from "./utils/audio";

type Utterance = {
  id: number;
  text: string;
  durationSec: number;
  source: "mic" | "upload";
  transcribing: boolean;
};

const MAX_HISTORY = 12;

export default function VoiceStormPage() {
  const transcriber = useTranscriber();

  const [history, setHistory] = useState<Utterance[]>([]);
  const [transcribeError, setTranscribeError] = useState<string | null>(null);
  const [revealText, setRevealText] = useState<string>("");
  const [uploadBusy, setUploadBusy] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rafRef = useRef<number>(0);
  const idRef = useRef<number>(0);
  // Serialize transcribe calls so concurrent utterances don't fight for the
  // single WASM inference thread.
  const transcribeQueueRef = useRef<Promise<void>>(Promise.resolve());

  // Defined after `mic` because `handleSpeech` closes over `transcriber`.
  const handleSpeech = useCallback(
    (audio: Float32Array) => {
      const id = ++idRef.current;
      const durationSec = audio.length / 16000;
      const placeholder: Utterance = {
        id,
        text: "",
        durationSec,
        source: "mic",
        transcribing: true,
      };
      setHistory((prev) => [placeholder, ...prev].slice(0, MAX_HISTORY));
      transcribeQueueRef.current = transcribeQueueRef.current.then(async () => {
        try {
          const text = await transcriber.transcribe(audio);
          const finalText = text.length > 0 ? text : "(no speech detected)";
          setHistory((prev) =>
            prev.map((u) =>
              u.id === id ? { ...u, text: finalText, transcribing: false } : u,
            ),
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Transcription failed";
          setHistory((prev) =>
            prev.map((u) =>
              u.id === id ? { ...u, text: `(error: ${msg})`, transcribing: false } : u,
            ),
          );
          setTranscribeError(msg);
        }
      });
    },
    [transcriber],
  );

  const mic = useMic({ onSpeech: handleSpeech });

  // Live waveform render loop. Always running so the canvas reflects the
  // current mic state — including the idle gradient when not recording.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(360 * dpr);
      canvas.style.height = `360px`;
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const { waveform, rms } = mic.sample();

      const intensity = Math.min(1, rms * 4);
      const speakingBoost = mic.speaking ? 0.25 : 0;
      const bg = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) / 1.2);
      bg.addColorStop(0, `rgba(56, 189, 248, ${0.05 + (intensity + speakingBoost) * 0.18})`);
      bg.addColorStop(1, "rgba(10, 10, 10, 0.0)");
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      ctx.strokeStyle = mic.speaking
        ? "#22d3ee"
        : mic.state === "recording"
          ? "rgba(34, 211, 238, 0.5)"
          : "rgba(255,255,255,0.18)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      const N = waveform.length;
      if (N > 0) {
        for (let i = 0; i < N; i++) {
          const x = (i / (N - 1)) * w;
          const v = waveform[i];
          const y = cy + v * (h / 3);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
      } else {
        ctx.moveTo(0, cy);
        ctx.lineTo(w, cy);
      }
      ctx.stroke();

      const ringR = 44 + (intensity + speakingBoost) * 60;
      ctx.strokeStyle = `rgba(56, 189, 248, ${0.35 + (intensity + speakingBoost) * 0.55})`;
      ctx.lineWidth = 2 + (intensity + speakingBoost) * 4;
      ctx.beginPath();
      ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = mic.speaking
        ? "#06b6d4"
        : mic.state === "recording"
          ? "rgba(6, 182, 212, 0.5)"
          : "rgba(255,255,255,0.08)";
      ctx.beginPath();
      ctx.arc(cx, cy, 16, 0, Math.PI * 2);
      ctx.fill();

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [mic]);

  // Animated reveal of the latest committed transcript.
  const latestCommitted = history.find((u) => !u.transcribing);
  const latestText = latestCommitted?.text ?? "";
  useEffect(() => {
    if (!latestText) {
      setRevealText("");
      return;
    }
    setRevealText("");
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setRevealText(latestText.slice(0, i));
      if (i >= latestText.length) clearInterval(interval);
    }, 18);
    return () => clearInterval(interval);
  }, [latestText]);

  const handleToggle = useCallback(async () => {
    setTranscribeError(null);
    if (mic.state === "recording") {
      await mic.stop();
    } else {
      await mic.start();
    }
  }, [mic]);

  const handleUpload = useCallback(
    async (file: File) => {
      setTranscribeError(null);
      setUploadBusy(true);
      try {
        const decoded = await decodeAudioFile(file);
        if (decoded.audio.length < 1600) {
          throw new Error("Audio too short to transcribe");
        }
        const text = await transcriber.transcribe(decoded.audio);
        const finalText = text.length > 0 ? text : "(no speech detected)";
        const id = ++idRef.current;
        setHistory((prev) =>
          [
            {
              id,
              text: finalText,
              durationSec: decoded.durationSec,
              source: "upload" as const,
              transcribing: false,
            },
            ...prev,
          ].slice(0, MAX_HISTORY),
        );
      } catch (err) {
        setTranscribeError(err instanceof Error ? err.message : "Could not transcribe file");
      } finally {
        setUploadBusy(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [transcriber],
  );

  const isRecording = mic.state === "recording";
  const canRecord =
    transcriber.status === "ready" &&
    (mic.state === "idle" || mic.state === "ready" || mic.state === "recording");
  const buttonLabel = (() => {
    if (mic.state === "asking") return "Permission…";
    if (isRecording) return "Stop";
    if (transcriber.status === "loading") return `Loading Whisper… ${transcriber.progress}%`;
    return "Hold the floor";
  })();

  const pendingCount = history.filter((u) => u.transcribing).length;
  const earlier = latestCommitted
    ? history.filter((u) => u.id !== latestCommitted.id)
    : history;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
      <div className="mb-6">
        <p className="text-xs font-mono tracking-[0.18em] text-neutral-500 dark:text-neutral-500 mb-2">
          AUDIO / SPEECH-TO-TEXT
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">Voice Storm</h1>
        <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 max-w-2xl text-pretty">
          Speak in any of ~99 languages — Silero VAD detects each utterance,
          Whisper Base transcribes it, and the language is auto-detected per segment.
          Or upload an audio file. Both run locally; no audio leaves the browser.
        </p>
      </div>

      {/* Model status */}
      <div className="mb-4 text-xs font-mono">
        {transcriber.status === "loading" && (
          <span className="text-neutral-500">Loading Whisper Base… {transcriber.progress}%</span>
        )}
        {transcriber.status === "ready" && (
          <span className="text-green-600 dark:text-green-400">
            Whisper Base ready · ~155 MB cached · multilingual
          </span>
        )}
        {transcriber.error && <span className="text-red-500">{transcriber.error}</span>}
        {mic.error && <span className="text-red-500 ml-3">{mic.error}</span>}
        {transcribeError && <span className="text-red-500 ml-3">{transcribeError}</span>}
      </div>

      {/* Visualizer */}
      <div className="rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-black mb-4 relative">
        <canvas ref={canvasRef} className="block w-full" />
        {isRecording && (
          <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm border border-cyan-500/30 text-[10px] font-mono uppercase tracking-[0.18em]">
            <span className="relative inline-flex h-1.5 w-1.5">
              {mic.speaking && (
                <span className="absolute inset-0 rounded-full bg-cyan-400 animate-ping" />
              )}
              <span
                className={`relative inline-block h-1.5 w-1.5 rounded-full ${
                  mic.speaking ? "bg-cyan-400" : "bg-neutral-500"
                }`}
              />
            </span>
            <span className={mic.speaking ? "text-cyan-300" : "text-neutral-400"}>
              {mic.speaking ? "Speaking" : "Listening"}
            </span>
          </div>
        )}
        {pendingCount > 0 && (
          <div className="absolute top-3 right-3 flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm border border-cyan-500/30 text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-300">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            Transcribing {pendingCount > 1 ? `${pendingCount} segments` : "…"}
          </div>
        )}
      </div>

      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <button
          type="button"
          onClick={handleToggle}
          disabled={!canRecord || uploadBusy}
          className={`px-6 py-3 rounded-full font-medium text-sm transition disabled:opacity-50 disabled:cursor-not-allowed ${
            isRecording
              ? "bg-red-500 hover:bg-red-600 text-white"
              : "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-90"
          }`}
        >
          {buttonLabel}
        </button>

        <span className="text-xs text-neutral-500 hidden sm:block">or</span>

        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={transcriber.status !== "ready" || isRecording || uploadBusy}
          className="px-5 py-3 rounded-full font-medium text-sm border border-neutral-300 dark:border-neutral-700 hover:border-neutral-500 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {uploadBusy ? "Transcribing file…" : "↑ Upload audio"}
        </button>

        <span className="text-xs text-neutral-500 ml-auto">
          {isRecording
            ? "Speak naturally — each pause commits a segment."
            : uploadBusy
              ? "Decoding & transcribing…"
              : "Click to record live, or upload mp3 / wav / m4a / webm."}
        </span>
      </div>

      {/* Latest committed transcript */}
      {latestCommitted && (
        <div className="mb-6 p-5 rounded-xl border border-cyan-500/30 bg-cyan-500/5">
          <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-400 mb-2">
            Latest transcript
          </div>
          <p className="text-lg sm:text-xl leading-relaxed">
            {revealText}
            {revealText.length < latestText.length && (
              <span className="inline-block w-[0.6ch] -mb-0.5 animate-pulse">▋</span>
            )}
          </p>
        </div>
      )}

      {/* History (everything except the latest committed item) */}
      {earlier.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-mono uppercase tracking-[0.22em] text-neutral-500">
            Earlier
          </h2>
          <ul className="space-y-2">
            {earlier.map((item) => (
              <li
                key={item.id}
                className={`flex items-baseline gap-3 text-sm border-l-2 pl-3 ${
                  item.transcribing
                    ? "border-cyan-500/50"
                    : "border-neutral-300 dark:border-neutral-700"
                }`}
              >
                <span className="font-mono text-[10px] text-neutral-500 tabular-nums shrink-0">
                  {item.durationSec.toFixed(1)}s
                </span>
                <span className="font-mono text-[10px] text-neutral-400 uppercase tracking-[0.16em] shrink-0">
                  {item.source === "upload" ? "file" : "mic"}
                </span>
                {item.transcribing ? (
                  <span className="text-cyan-500 italic flex items-center gap-2">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    transcribing…
                  </span>
                ) : (
                  <span className="text-neutral-700 dark:text-neutral-300">{item.text}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-10 text-xs text-neutral-500 leading-relaxed max-w-3xl">
        <p>
          Audio is captured at the browser&apos;s native sample rate, mixed down to mono, and
          resampled to 16 kHz. Silero VAD watches every 32 ms frame; once it sees ~250 ms of
          confirmed speech and then ~400 ms of silence, the captured segment is handed to{" "}
          <code className="font-mono text-[11px]">whisper-base</code> (multilingual, ~155 MB).
          Whisper auto-detects the language per segment, so you can switch languages mid-session.
          Anti-hallucination flags (<code className="font-mono text-[11px]">no_repeat_ngram_size: 3</code>{" "}
          plus a non-speech-token post-filter) keep the output clean on near-silent audio. The
          architecture mirrors Xenova&apos;s moonshine-web reference; swapping in Moonshine for
          lower latency is a model swap away, but it&apos;s English-only.
        </p>
      </div>
    </div>
  );
}
