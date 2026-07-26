"use client";

/* Pages serves purpose-built responsive variants; a raw img keeps the
   static export independent from Next's unavailable image optimizer. */
/* eslint-disable @next/next/no-img-element */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import type { Photo, PhotoLocale, PhotoSeries } from "@/lib/photos";

const PHOTO_LANGUAGE_KEY = "photoLanguage";
const PHOTO_LANGUAGE_EVENT = "photo-language-change";
let inMemoryLocale: PhotoLocale | null = null;

function isPhotoLocale(value: string | null): value is PhotoLocale {
  return value === "tr" || value === "en" || value === "ja";
}

function getPhotoLocale(): PhotoLocale {
  try {
    const stored = window.localStorage.getItem(PHOTO_LANGUAGE_KEY);
    if (isPhotoLocale(stored)) return stored;
  } catch {
    // Fall through to the in-memory or browser-language preference.
  }
  if (inMemoryLocale) return inMemoryLocale;
  const preferred = window.navigator.language.toLowerCase();
  if (preferred.startsWith("ja")) return "ja";
  if (preferred.startsWith("tr")) return "tr";
  return "en";
}

function subscribePhotoLocale(onStoreChange: () => void) {
  window.addEventListener(PHOTO_LANGUAGE_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(PHOTO_LANGUAGE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function setPhotoLocale(locale: PhotoLocale) {
  inMemoryLocale = locale;
  try {
    window.localStorage.setItem(PHOTO_LANGUAGE_KEY, locale);
  } catch {
    // In-memory state keeps the control functional when storage is unavailable.
  }
  window.dispatchEvent(new Event(PHOTO_LANGUAGE_EVENT));
}

const PHOTO_LOCALES: readonly { id: PhotoLocale; label: string; name: string }[] = [
  { id: "tr", label: "TR", name: "Türkçe" },
  { id: "en", label: "EN", name: "English" },
  { id: "ja", label: "日本語", name: "日本語" },
];

const UI_COPY = {
  tr: {
    archive: "RUSEN BİRBEN / FOTOĞRAFLAR",
    heroTitle: "Işık, kısacık.",
    heroSubtitle: "Renk, gölge ve fark edilmeye değer sıradan şeyler.",
    count: (photos: number, series: number) => `${photos} kare · ${series} seri`,
    prologue: "ÖNSÖZ",
    view: "Gör",
    viewPhoto: "Fotoğrafı gör",
    selectedKicker: "SEÇKİ / DÖRT BÖLÜM",
    selectedTitle: "Geçerken kalanlar.",
    selectedIntro:
      "Bir kronoloji değil. Fotoğraflar yan yana geldiğinde ortaya çıkan küçük ilişkilerden oluşan bir seçki.",
    series: "SERİ",
    more: "Yoldan geçen başka anlar",
    close: "Kapat",
    previous: "Önceki fotoğraf",
    next: "Sonraki fotoğraf",
    language: "Fotoğraf dili",
    openLabel: (title: string, index: number, total: number) =>
      `“${title}” fotoğrafını aç; ${index} / ${total}`,
    dialogLabel: (title: string, index: number, total: number) =>
      `“${title}”, fotoğraf ${index} / ${total}`,
  },
  en: {
    archive: "RUSEN BIRBEN / PHOTOGRAPHS",
    heroTitle: "Light, briefly.",
    heroSubtitle: "Color, shadow, and ordinary things worth noticing.",
    count: (photos: number, series: number) => `${photos} frames · ${series} series`,
    prologue: "PROLOGUE",
    view: "View",
    viewPhoto: "View photograph",
    selectedKicker: "SELECTED WORK / FOUR CHAPTERS",
    selectedTitle: "Stories in passing.",
    selectedIntro:
      "Not a chronology. A collection of small relationships that appeared only after the photographs were placed beside one another.",
    series: "SERIES",
    more: "More passing moments",
    close: "Close",
    previous: "Previous photograph",
    next: "Next photograph",
    language: "Photography language",
    openLabel: (title: string, index: number, total: number) =>
      `Open “${title}”, photograph ${index} of ${total}`,
    dialogLabel: (title: string, index: number, total: number) =>
      `“${title}”, photograph ${index} of ${total}`,
  },
  ja: {
    archive: "RUSEN BIRBEN / 写真",
    heroTitle: "光は、束の間。",
    heroSubtitle: "色と影、そして目を向ける価値のある日常。",
    count: (photos: number, series: number) => `${photos}枚 · ${series}シリーズ`,
    prologue: "序章",
    view: "見る",
    viewPhoto: "写真を見る",
    selectedKicker: "作品選 / 四章",
    selectedTitle: "通り過ぎる物語。",
    selectedIntro:
      "これは年代記ではない。写真を隣り合わせたときに初めて現れた、小さな関係の集まり。",
    series: "シリーズ",
    more: "通り過ぎる、さらに多くの瞬間",
    close: "閉じる",
    previous: "前の写真",
    next: "次の写真",
    language: "写真ページの言語",
    openLabel: (title: string, index: number, total: number) =>
      `「${title}」を開く、${index} / ${total}`,
    dialogLabel: (title: string, index: number, total: number) =>
      `「${title}」、写真 ${index} / ${total}`,
  },
} as const;

type PhotoGalleryProps = {
  hero: Photo;
  series: PhotoSeries[];
  photos: Photo[];
};

type PhotoFrameProps = {
  photo: Photo;
  locale: PhotoLocale;
  ui: (typeof UI_COPY)[PhotoLocale];
  index: number;
  total: number;
  priority?: boolean;
  hero?: boolean;
  onOpen: (index: number, opener: HTMLButtonElement) => void;
};

function sourceSet(photo: Photo): string {
  return [photo.sources.thumbnail, photo.sources.display, photo.sources.large]
    .map((source) => `${source.url} ${source.width}w`)
    .join(", ");
}

function PhotoFrame({
  photo,
  locale,
  ui,
  index,
  total,
  priority = false,
  hero = false,
  onOpen,
}: PhotoFrameProps) {
  const copy = photo.translations[locale];
  const style = {
    "--photo-ratio": photo.aspectRatio,
    "--photo-placeholder": `url(${photo.blurDataUrl})`,
  } as CSSProperties;

  const imageButton = (
    <button
      type="button"
      className={hero ? "photo-hero-frame" : "photo-frame"}
      style={style}
      onClick={(event) => onOpen(index, event.currentTarget)}
      aria-label={ui.openLabel(copy.title, index + 1, total)}
    >
      <img
        src={hero ? photo.sources.large.url : photo.sources.display.url}
        srcSet={sourceSet(photo)}
        sizes={hero ? "100vw" : "(max-width: 720px) 100vw, (max-width: 1100px) 50vw, 34vw"}
        width={photo.width}
        height={photo.height}
        alt={copy.alt}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
      />
      {!hero && (
        <>
          <span className="photo-frame-register" aria-hidden="true">
            <span>F::{String(index + 1).padStart(2, "0")}</span>
            <span>{photo.width}×{photo.height}</span>
          </span>
          <span className="photo-frame-reveal" aria-hidden="true">
            <span>{copy.title}</span>
            <span>{ui.view} ↗</span>
          </span>
        </>
      )}
    </button>
  );

  if (hero) return imageButton;

  return (
    <figure className="photo-figure">
      {imageButton}
      <figcaption className="photo-caption">
        <div className="photo-caption-heading">
          <span>{String(index + 1).padStart(2, "0")}</span>
          <h3>{copy.title}</h3>
        </div>
        <p>{copy.story}</p>
      </figcaption>
    </figure>
  );
}

export default function PhotoGallery({ hero, series, photos }: PhotoGalleryProps) {
  const locale = useSyncExternalStore<PhotoLocale>(
    subscribePhotoLocale,
    getPhotoLocale,
    () => "tr",
  );
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const pointerStart = useRef<number | null>(null);
  const indexById = useMemo(
    () => new Map(photos.map((photo, index) => [photo.id, index])),
    [photos],
  );
  const ui = UI_COPY[locale];
  const heroCopy = hero.translations[locale];

  const close = useCallback(() => setActiveIndex(null), []);
  const move = useCallback((direction: -1 | 1) => {
    setActiveIndex((current) => {
      if (current === null) return null;
      return (current + direction + photos.length) % photos.length;
    });
  }, [photos.length]);
  const isOpen = activeIndex !== null;

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      else if (event.key === "ArrowLeft") move(-1);
      else if (event.key === "ArrowRight") move(1);
      else if (event.key === "Tab") {
        const focusable = dialogRef.current?.querySelectorAll<HTMLButtonElement>("button");
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      openerRef.current?.focus();
    };
  }, [isOpen, close, move]);

  const open = (index: number, opener: HTMLButtonElement) => {
    openerRef.current = opener;
    setActiveIndex(index);
  };

  const onPointerDown = (event: ReactPointerEvent) => {
    pointerStart.current = event.clientX;
  };

  const onPointerUp = (event: ReactPointerEvent) => {
    if (pointerStart.current === null) return;
    const distance = event.clientX - pointerStart.current;
    pointerStart.current = null;
    if (Math.abs(distance) < 50) return;
    move(distance > 0 ? -1 : 1);
  };

  const activePhoto = activeIndex === null ? null : photos[activeIndex];
  const activeCopy = activePhoto?.translations[locale] ?? null;

  return (
    <div className="photos-page" lang={locale}>
      <section className="photo-hero" aria-labelledby="photographs-title">
        <PhotoFrame
          photo={hero}
          locale={locale}
          ui={ui}
          index={0}
          total={photos.length}
          priority
          hero
          onOpen={open}
        />
        <div className="photo-hero-shade" aria-hidden="true" />
        <div className="photo-hero-telemetry" lang="en" aria-hidden="true">
          <span>Frame::01/{String(photos.length).padStart(2, "0")}</span>
          <span>{hero.width}×{hero.height}</span>
          <span>Archive::selected</span>
        </div>
        <div className="photo-language-picker" role="group" aria-label={ui.language}>
          {PHOTO_LOCALES.map((option) => (
            <button
              type="button"
              key={option.id}
              className={option.id === locale ? "is-active" : undefined}
              onClick={() => setPhotoLocale(option.id)}
              aria-pressed={option.id === locale}
              title={option.name}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="photo-hero-copy">
          <p>{ui.archive}</p>
          <h1 id="photographs-title">{ui.heroTitle}</h1>
          <span>{ui.heroSubtitle}</span>
        </div>
        <a className="photo-scroll-cue" href="#prologue">
          <span>{ui.count(photos.length, series.length)}</span>
          <span aria-hidden="true">↓</span>
        </a>
      </section>

      <section id="prologue" className="photo-prologue" aria-labelledby="prologue-title">
        <p>00 // {ui.prologue}</p>
        <h2 id="prologue-title">{heroCopy.title}</h2>
        <div>
          <p>{heroCopy.story}</p>
          <button type="button" onClick={(event) => open(0, event.currentTarget)}>
            {ui.viewPhoto} <span aria-hidden="true">↗</span>
          </button>
        </div>
      </section>

      <section id="selected" className="photo-collection" aria-labelledby="selected-title">
        <header className="photo-section-heading">
          <p>{ui.selectedKicker}</p>
          <h2 id="selected-title">{ui.selectedTitle}</h2>
          <span>{ui.selectedIntro}</span>
        </header>

        <div className="photo-series-list">
          {series.map((chapter) => (
            <article className="photo-series" id={`series-${chapter.id}`} key={chapter.id}>
              <header className="photo-series-heading">
                <p>{chapter.number} / {ui.series}</p>
                <h2>{chapter.translations[locale].title}</h2>
                <span>{chapter.translations[locale].description}</span>
              </header>

              <div className="photo-rows">
                {chapter.rows.map((row) => (
                  <div className="photo-row" key={row.map((photo) => photo.id).join("-")}>
                    {row.map((photo) => {
                      const index = indexById.get(photo.id);
                      if (index === undefined) return null;
                      return (
                        <div
                          className="photo-row-item"
                          key={photo.id}
                          style={{ "--photo-grow": photo.aspectRatio } as CSSProperties}
                        >
                          <PhotoFrame
                            photo={photo}
                            locale={locale}
                            ui={ui}
                            index={index}
                            total={photos.length}
                            onOpen={open}
                          />
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className="photo-ending">
        <p>{ui.more}</p>
        <a href="https://instagram.com/rusen_birben" target="_blank" rel="noopener noreferrer">
          <span className="photo-ending-platform">Instagram</span>
          <span className="photo-ending-handle">@rusen_birben</span>
        </a>
      </footer>

      {activePhoto && activeCopy && activeIndex !== null && (
        <div
          ref={dialogRef}
          className="photo-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={ui.dialogLabel(activeCopy.title, activeIndex + 1, photos.length)}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
        >
          <button ref={closeRef} type="button" className="photo-lightbox-close" onClick={close}>
            {ui.close} <span aria-hidden="true">×</span>
          </button>
          <button
            type="button"
            className="photo-lightbox-nav photo-lightbox-prev"
            onClick={() => move(-1)}
            aria-label={ui.previous}
          >
            ←
          </button>
          <div className="photo-lightbox-layout">
            <figure>
              <img
                key={activePhoto.id}
                src={activePhoto.sources.large.url}
                width={activePhoto.width}
                height={activePhoto.height}
                alt={activeCopy.alt}
                decoding="async"
              />
            </figure>
            <aside>
              <p className="photo-lightbox-series">{activePhoto.seriesTitles[locale]}</p>
              <h2>{activeCopy.title}</h2>
              <p className="photo-lightbox-story">{activeCopy.story}</p>
              <div className="photo-lightbox-meta">
                <span>{activePhoto.filename.replace(/\.[^.]+$/, "")}</span>
                <span>
                  {String(activeIndex + 1).padStart(2, "0")} / {String(photos.length).padStart(2, "0")}
                </span>
              </div>
            </aside>
          </div>
          <button
            type="button"
            className="photo-lightbox-nav photo-lightbox-next"
            onClick={() => move(1)}
            aria-label={ui.next}
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
