"use client";

import { useId, useRef, useState, type CSSProperties } from "react";
import { FiDownload, FiHeadphones, FiPause, FiPlay, FiRotateCcw, FiRotateCw } from "react-icons/fi";
import type { Lang, PostFrontmatter } from "@/lib/blog";

const COPY = {
  en: {
    title: "Listen to this article",
    label: "English audio edition",
    speed: "Playback speed",
    download: "Download audio",
    error: "The audio could not be loaded. Try the download link below.",
    play: "Play audio",
    pause: "Pause audio",
    position: "Playback position",
    backward: "Back 15 seconds",
    forward: "Forward 15 seconds",
    loading: "Loading audio",
  },
  tr: {
    title: "Bu yazıyı dinle",
    label: "Türkçe sesli sürüm",
    speed: "Oynatma hızı",
    download: "Sesi indir",
    error: "Ses yüklenemedi. Aşağıdaki indirme bağlantısını deneyebilirsin.",
    play: "Sesi oynat",
    pause: "Sesi duraklat",
    position: "Dinleme konumu",
    backward: "15 saniye geri",
    forward: "15 saniye ileri",
    loading: "Ses yükleniyor",
  },
};

function timeLabel(seconds: number) {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

export default function ArticleAudio({ audio, lang }: {
  audio: NonNullable<PostFrontmatter["audio"]>;
  lang: Lang;
}) {
  const ref = useRef<HTMLAudioElement>(null);
  const id = useId();
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(audio.durationSeconds);
  const pendingSeek = useRef<number | null>(null);
  const copy = COPY[lang];
  const progress = Math.min(100, position / duration * 100);

  async function togglePlayback() {
    const element = ref.current;
    if (!element) return;
    if (!element.paused) { element.pause(); return; }
    setFailed(false);
    setLoading(true);
    if (element.error) element.load();
    try { await element.play(); }
    catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) setFailed(true);
      setLoading(false);
    }
  }

  function seek(seconds: number) {
    const element = ref.current;
    if (!element) return;
    const next = Math.max(0, Math.min(duration, seconds));
    setPosition(next);
    if (element.readyState === 0) {
      pendingSeek.current = next;
      element.load();
    } else element.currentTime = next;
  }

  return (
    <section className="article-audio" aria-labelledby={`${id}-title`} data-allow-select>
      <audio
        ref={ref}
        preload="none"
        src={audio.src}
        aria-label={copy.label}
        onError={() => { setFailed(true); setLoading(false); setPlaying(false); }}
        onLoadedMetadata={(event) => {
          const element = event.currentTarget;
          if (Number.isFinite(element.duration)) setDuration(element.duration);
          if (pendingSeek.current !== null) {
            element.currentTime = Math.min(element.duration, pendingSeek.current);
            pendingSeek.current = null;
          }
          setFailed(false);
        }}
        onPlay={() => setPlaying(true)}
        onPlaying={() => setLoading(false)}
        onWaiting={() => setLoading(true)}
        onPause={() => { setPlaying(false); setLoading(false); }}
        onEnded={() => { setPlaying(false); setLoading(false); }}
        onSeeked={() => setLoading(false)}
        onTimeUpdate={(event) => setPosition(event.currentTarget.currentTime)}
      />
      <button
        className="article-audio-play"
        onClick={togglePlayback}
        aria-label={playing ? copy.pause : copy.play}
        aria-busy={loading}
        title={playing ? copy.pause : copy.play}
      >
        {loading ? <span className="article-audio-spinner" aria-hidden="true" /> : playing ? <FiPause aria-hidden="true" /> : <FiPlay aria-hidden="true" />}
      </button>
      <div className="article-audio-main">
        <div className="article-audio-heading">
          <h2 id={`${id}-title`}><FiHeadphones aria-hidden="true" />{copy.title}</h2>
          <span className="article-audio-language">{lang.toUpperCase()}</span>
        </div>
        <div className="article-audio-wave" style={{ "--audio-progress": `${progress}%` } as CSSProperties}>
          <svg viewBox={`0 0 ${audio.waveform.length * 6} 48`} preserveAspectRatio="none" aria-hidden="true">
            <defs><clipPath id={`${id}-played`}><rect width={`${progress}%`} height="48" /></clipPath></defs>
            <g className="article-audio-wave-base">
              {audio.waveform.map((value, i) => <rect key={i} x={i * 6 + 1} y={24 - Math.max(2, value * 42) / 2} width="3" height={Math.max(2, value * 42)} rx="1.5" />)}
            </g>
            <g className="article-audio-wave-played" clipPath={`url(#${id}-played)`}>
              {audio.waveform.map((value, i) => <rect key={i} x={i * 6 + 1} y={24 - Math.max(2, value * 42) / 2} width="3" height={Math.max(2, value * 42)} rx="1.5" />)}
            </g>
          </svg>
          <input type="range" min="0" max={duration} step="1" value={position}
            aria-label={copy.position} aria-valuetext={`${timeLabel(position)} / ${timeLabel(Math.round(duration))}`}
            onChange={(event) => seek(Number(event.target.value))} />
        </div>
        <div className="article-audio-options">
          <span className="article-audio-time"><span>{timeLabel(position)}</span><span>/ {timeLabel(Math.round(duration))}</span></span>
          <div className="article-audio-tools">
            <button onClick={() => seek(position - 15)} aria-label={copy.backward} title={copy.backward} className="article-audio-skip"><FiRotateCcw aria-hidden="true" /><span aria-hidden="true">15</span></button>
            <button onClick={() => seek(position + 15)} aria-label={copy.forward} title={copy.forward} className="article-audio-skip"><FiRotateCw aria-hidden="true" /><span aria-hidden="true">15</span></button>
            <select
              aria-label={copy.speed}
              title={copy.speed}
              defaultValue="1"
              onChange={(event) => {
                if (ref.current) {
                  const speed = Number(event.target.value);
                  ref.current.defaultPlaybackRate = speed;
                  ref.current.playbackRate = speed;
                }
              }}
            >
              {[0.75, 1, 1.25, 1.5, 1.75, 2].map((speed) => (
                <option key={speed} value={speed}>{speed}×</option>
              ))}
            </select>
            <a href={audio.src} download aria-label={copy.download} title={copy.download}><FiDownload aria-hidden="true" /></a>
          </div>
        </div>
      </div>
      {failed && <p role="alert">{copy.error} <a href={audio.src} download>{copy.download}</a></p>}
      <span className="article-audio-status" role="status">{loading ? copy.loading : ""}</span>
    </section>
  );
}
