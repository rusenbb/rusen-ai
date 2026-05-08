"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMic } from "./hooks/useMic";
import { useTranscriber } from "./hooks/useTranscriber";
import { decodeAudioFile } from "./utils/audio";

type HistoryItem = {
  id: number;
  text: string;
  durationSec: number;
  source: "mic" | "upload";
};

const LIVE_WINDOW_SEC = 6;
const LIVE_INTERVAL_MS = 2000;

export default function VoiceStormPage() {
  const mic = useMic();
  const transcriber = useTranscriber();

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [pending, setPending] = useState<string | null>(null);
  const [transcribeError, setTranscribeError] = useState<string | null>(null);
  const [revealText, setRevealText] = useState<string>("");
  const [liveCaption, setLiveCaption] = useState<string>("");
  const [uploadBusy, setUploadBusy] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rafRef = useRef<number>(0);
  const idRef = useRef<number>(0);
  const liveTimerRef = useRef<number | null>(null);
  const liveBusyRef = useRef<boolean>(false);

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
      const bg = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) / 1.2);
      bg.addColorStop(0, `rgba(56, 189, 248, ${0.05 + intensity * 0.18})`);
      bg.addColorStop(1, "rgba(10, 10, 10, 0.0)");
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      ctx.strokeStyle = mic.state === "recording" ? "#22d3ee" : "rgba(255,255,255,0.18)";
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

      const ringR = 44 + intensity * 60;
      ctx.strokeStyle = `rgba(56, 189, 248, ${0.35 + intensity * 0.55})`;
      ctx.lineWidth = 2 + intensity * 4;
      ctx.beginPath();
      ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = mic.state === "recording" ? "#06b6d4" : "rgba(255,255,255,0.08)";
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

  // Animated reveal of newly-transcribed text
  useEffect(() => {
    if (!pending) return;
    setRevealText("");
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setRevealText(pending.slice(0, i));
      if (i >= pending.length) clearInterval(interval);
    }, 18);
    return () => clearInterval(interval);
  }, [pending]);

  // Live transcription loop: while recording, every LIVE_INTERVAL_MS ms,
  // grab the trailing LIVE_WINDOW_SEC seconds of audio and transcribe it.
  // This is the "near-real-time" caption that updates as you speak.
  useEffect(() => {
    if (mic.state !== "recording" || transcriber.status !== "ready") {
      if (liveTimerRef.current) {
        clearInterval(liveTimerRef.current);
        liveTimerRef.current = null;
      }
      return;
    }

    const tick = async () => {
      if (liveBusyRef.current) return;
      const audio = mic.snapshotRecent(LIVE_WINDOW_SEC);
      if (!audio || audio.length < 16000 * 0.6) return; // need at least ~600 ms of speech
      liveBusyRef.current = true;
      try {
        const text = await transcriber.transcribe(audio);
        if (text) setLiveCaption(text);
      } catch {
        // Live errors are non-fatal; surface only the final transcribe error if it happens.
      } finally {
        liveBusyRef.current = false;
      }
    };
    liveTimerRef.current = window.setInterval(tick, LIVE_INTERVAL_MS);
    return () => {
      if (liveTimerRef.current) {
        clearInterval(liveTimerRef.current);
        liveTimerRef.current = null;
      }
    };
  }, [mic, transcriber]);

  const finalizeMicSession = useCallback(
    async () => {
      const handle = await mic.stop();
      setLiveCaption("");
      if (!handle || handle.audio.length < 1600) return;
      try {
        const text = await transcriber.transcribe(handle.audio);
        if (text && text.length > 0) {
          setPending(text);
          const id = ++idRef.current;
          setHistory((prev) =>
            [{ id, text, durationSec: handle.durationSec, source: "mic" as const }, ...prev].slice(0, 6),
          );
        } else {
          setPending("(silence)");
        }
      } catch (err) {
        setTranscribeError(err instanceof Error ? err.message : "Transcription failed");
      }
    },
    [mic, transcriber],
  );

  const handleToggle = useCallback(async () => {
    setTranscribeError(null);
    if (mic.state === "recording") {
      await finalizeMicSession();
    } else {
      setLiveCaption("");
      await mic.start();
    }
  }, [mic, finalizeMicSession]);

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
        const finalText = text && text.length > 0 ? text : "(silence)";
        setPending(finalText);
        const id = ++idRef.current;
        setHistory((prev) =>
          [{ id, text: finalText, durationSec: decoded.durationSec, source: "upload" as const }, ...prev].slice(0, 6),
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

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
      <div className="mb-6">
        <p className="text-xs font-mono tracking-[0.18em] text-neutral-500 dark:text-neutral-500 mb-2">
          AUDIO / SPEECH-TO-TEXT
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">Voice Storm</h1>
        <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 max-w-2xl text-pretty">
          Speak into your microphone and a live caption updates every couple of seconds.
          Or upload an audio file for a clean batch transcription. Whisper Tiny runs locally,
          no audio ever leaves the browser.
        </p>
      </div>

      {/* Model status */}
      <div className="mb-4 text-xs font-mono">
        {transcriber.status === "loading" && (
          <span className="text-neutral-500">Loading Whisper Tiny… {transcriber.progress}%</span>
        )}
        {transcriber.status === "ready" && (
          <span className="text-green-600 dark:text-green-400">Whisper ready · ~75 MB cached</span>
        )}
        {transcriber.error && <span className="text-red-500">{transcriber.error}</span>}
        {mic.error && <span className="text-red-500 ml-3">{mic.error}</span>}
        {transcribeError && <span className="text-red-500 ml-3">{transcribeError}</span>}
      </div>

      {/* Visualizer */}
      <div className="rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-black mb-4 relative">
        <canvas ref={canvasRef} className="block w-full" />
        {isRecording && liveCaption && (
          <div className="absolute inset-x-4 bottom-4 px-4 py-3 rounded-lg bg-black/70 backdrop-blur-sm border border-cyan-500/30">
            <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-cyan-400 mb-1">
              Live caption
            </div>
            <p className="text-sm sm:text-base text-cyan-100">{liveCaption}</p>
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
            ? "Listening… click again to stop and finalize."
            : uploadBusy
              ? "Decoding & transcribing…"
              : "Click to record live, or upload mp3 / wav / m4a / webm."}
        </span>
      </div>

      {/* Final reveal */}
      {pending && (
        <div className="mb-6 p-5 rounded-xl border border-cyan-500/30 bg-cyan-500/5">
          <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-400 mb-2">
            Latest transcript
          </div>
          <p className="text-lg sm:text-xl leading-relaxed">
            {revealText}
            {revealText.length < pending.length && (
              <span className="inline-block w-[0.6ch] -mb-0.5 animate-pulse">▋</span>
            )}
          </p>
        </div>
      )}

      {/* History */}
      {history.length > 1 && (
        <div className="space-y-2">
          <h2 className="text-xs font-mono uppercase tracking-[0.22em] text-neutral-500">Earlier</h2>
          <ul className="space-y-2">
            {history.slice(1).map((item) => (
              <li
                key={item.id}
                className="flex items-baseline gap-3 text-sm border-l-2 border-neutral-300 dark:border-neutral-700 pl-3"
              >
                <span className="font-mono text-[10px] text-neutral-500 tabular-nums shrink-0">
                  {item.durationSec.toFixed(1)}s
                </span>
                <span className="font-mono text-[10px] text-neutral-400 uppercase tracking-[0.16em] shrink-0">
                  {item.source === "upload" ? "file" : "mic"}
                </span>
                <span className="text-neutral-700 dark:text-neutral-300">{item.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-10 text-xs text-neutral-500 leading-relaxed max-w-3xl">
        <p>
          Audio is captured at the browser&apos;s native sample rate, mixed down to mono, and
          resampled to 16 kHz before being fed to <code className="font-mono text-[11px]">whisper-tiny.en</code>.
          The live caption uses a sliding {LIVE_WINDOW_SEC}-second window: every {LIVE_INTERVAL_MS / 1000}s,
          the trailing window is sent to Whisper, and the result replaces the on-screen caption. When you
          stop, the entire recording is transcribed once more for an accurate final pass. Distil-Whisper
          and Moonshine are faster, but Whisper Tiny remains the most robust open model in this size
          class for in-browser inference.
        </p>
      </div>
    </div>
  );
}
