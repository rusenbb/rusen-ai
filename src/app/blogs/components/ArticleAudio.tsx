"use client";

import { useId, useRef, useState } from "react";
import type { Lang, PostFrontmatter } from "@/lib/blog";

const COPY = {
  en: {
    title: "Listen to this article",
    label: "English audio edition",
    speed: "Playback speed",
    download: "Download audio",
    error: "The audio could not be loaded. Try the download link below.",
  },
  tr: {
    title: "Bu yazıyı dinle",
    label: "Türkçe sesli sürüm",
    speed: "Oynatma hızı",
    download: "Sesi indir",
    error: "Ses yüklenemedi. Aşağıdaki indirme bağlantısını deneyebilirsin.",
  },
};

export default function ArticleAudio({ audio, lang }: {
  audio: NonNullable<PostFrontmatter["audio"]>;
  lang: Lang;
}) {
  const ref = useRef<HTMLAudioElement>(null);
  const id = useId();
  const [failed, setFailed] = useState(false);
  const copy = COPY[lang];
  const duration = `${Math.floor(audio.durationSeconds / 60)}:${String(audio.durationSeconds % 60).padStart(2, "0")}`;

  return (
    <section className="article-audio" aria-labelledby={`${id}-title`} data-allow-select>
      <div className="article-audio-heading">
        <h2 id={`${id}-title`}>{copy.title}</h2>
        <span>{duration}</span>
      </div>
      <audio
        ref={ref}
        controls
        preload="none"
        src={audio.src}
        aria-label={copy.label}
        onError={() => setFailed(true)}
        onLoadedMetadata={() => setFailed(false)}
      >
        <a href={audio.src}>{copy.download}</a>
      </audio>
      {failed && <p role="alert">{copy.error}</p>}
      <div className="article-audio-options">
        <label htmlFor={`${id}-speed`}>
          {copy.speed}
          <select
            id={`${id}-speed`}
            defaultValue="1"
            onChange={(event) => {
              if (ref.current) ref.current.playbackRate = Number(event.target.value);
            }}
          >
            {[0.75, 1, 1.25, 1.5, 1.75, 2].map((speed) => (
              <option key={speed} value={speed}>{speed}×</option>
            ))}
          </select>
        </label>
        <a href={audio.src} download>{copy.download}</a>
      </div>
    </section>
  );
}
