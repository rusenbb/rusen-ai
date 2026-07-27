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
import editorialManifest from "@/content/photos.json";
import type { Photo, PhotoLocale, PhotoSeries } from "@/lib/photos";

const PHOTO_LOCALES = editorialManifest.locales as readonly {
  id: PhotoLocale;
  label: string;
  name: string;
}[];
const PHOTO_LOCALE_IDS = new Set<PhotoLocale>(
  PHOTO_LOCALES.map((locale) => locale.id),
);
const UI_COPY = editorialManifest.ui;
const DEFAULT_PHOTO_LOCALE = editorialManifest.defaultLocale as PhotoLocale;
const BROWSER_FALLBACK_LOCALE = editorialManifest.browserFallbackLocale as PhotoLocale;
const ENDING_LINK = editorialManifest.endingLink;
const PHOTO_LANGUAGE_KEY = "photoLanguage";
const PHOTO_LANGUAGE_EVENT = "photo-language-change";
let inMemoryLocale: PhotoLocale | null = null;

function isPhotoLocale(value: string | null): value is PhotoLocale {
  return value !== null && PHOTO_LOCALE_IDS.has(value as PhotoLocale);
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
  return PHOTO_LOCALES.find((locale) => preferred.startsWith(locale.id))?.id
    ?? BROWSER_FALLBACK_LOCALE;
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

type PhotoUiCopy = (typeof UI_COPY)[PhotoLocale];

function formatUiCopy(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (placeholder, key: string) =>
    key in values ? String(values[key]) : placeholder,
  );
}

type PhotoGalleryProps = {
  hero: Photo;
  series: PhotoSeries[];
  photos: Photo[];
};

type PhotoFrameProps = {
  photo: Photo;
  locale: PhotoLocale;
  ui: PhotoUiCopy;
  index: number;
  total: number;
  priority?: boolean;
  hero?: boolean;
  sizes?: string;
  onOpen: (index: number, opener: HTMLButtonElement) => void;
};

function sourceSet(photo: Photo): string {
  return [photo.sources.thumbnail, photo.sources.display, photo.sources.large]
    .map((source) => `${source.url} ${source.width}w`)
    .join(", ");
}

function photoDescription(copy: Photo["translations"][PhotoLocale]): string {
  return copy.caption ?? copy.story ?? "";
}

function gallerySizes(itemsInRow: number): string {
  if (itemsInRow <= 1) {
    return "(max-width: 720px) 100vw, (max-width: 1600px) calc(100vw - 22rem), 72rem";
  }
  if (itemsInRow === 2) {
    return "(max-width: 720px) 100vw, (max-width: 1600px) calc((100vw - 23.5rem) / 2), 35rem";
  }
  return `(max-width: 720px) 100vw, (max-width: 1600px) calc((100vw - 25rem) / ${itemsInRow}), ${Math.floor(70 / itemsInRow)}rem`;
}

function PhotoFrame({
  photo,
  locale,
  ui,
  index,
  total,
  priority = false,
  hero = false,
  sizes = "100vw",
  onOpen,
}: PhotoFrameProps) {
  const copy = photo.translations[locale];
  const description = photoDescription(copy);
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
      aria-label={formatUiCopy(ui.openLabel, {
        title: copy.title,
        index: index + 1,
        total,
      })}
    >
      <img
        src={hero ? photo.sources.large.url : photo.sources.display.url}
        srcSet={sourceSet(photo)}
        sizes={hero ? "100vw" : sizes}
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
          <h3 data-allow-select>{copy.title}</h3>
        </div>
        <p data-allow-select data-copy-kind={copy.caption ? "caption" : "story"}>
          {description}
        </p>
      </figcaption>
    </figure>
  );
}

export default function PhotoGallery({ hero, series, photos }: PhotoGalleryProps) {
  const locale = useSyncExternalStore<PhotoLocale>(
    subscribePhotoLocale,
    getPhotoLocale,
    () => DEFAULT_PHOTO_LOCALE,
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
  const activeDescription = activeCopy ? photoDescription(activeCopy) : "";

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
          <span>{formatUiCopy(ui.count, {
            photos: photos.length,
            series: series.length,
          })}</span>
          <span aria-hidden="true">↓</span>
        </a>
      </section>

      <section id="prologue" className="photo-prologue" aria-labelledby="prologue-title">
        <p>00 // {ui.prologue}</p>
        <h2 id="prologue-title" data-allow-select>{heroCopy.title}</h2>
        <div>
          <p data-allow-select>{photoDescription(heroCopy)}</p>
          <button type="button" onClick={(event) => open(0, event.currentTarget)}>
            {ui.viewPhoto} <span aria-hidden="true">↗</span>
          </button>
        </div>
      </section>

      <section id="selected" className="photo-collection" aria-labelledby="selected-title">
        <header className="photo-section-heading">
          <p>{formatUiCopy(ui.selectedKicker, { series: series.length })}</p>
          <h2 id="selected-title" data-allow-select>{ui.selectedTitle}</h2>
          <span data-allow-select>{ui.selectedIntro}</span>
        </header>

        <div className="photo-series-list">
          {series.map((chapter) => (
            <article className="photo-series" id={`series-${chapter.id}`} key={chapter.id}>
              <header className="photo-series-heading">
                <p>{chapter.number} / {ui.series}</p>
                <h2 data-allow-select>{chapter.translations[locale].title}</h2>
                <span data-allow-select>{chapter.translations[locale].description}</span>
                {chapter.credit && (
                  <a
                    className="photo-series-credit"
                    href={chapter.credit.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {chapter.credit.translations[locale]} ↗
                  </a>
                )}
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
                            sizes={gallerySizes(row.length)}
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
        <a href={ENDING_LINK.href} target="_blank" rel="noopener noreferrer">
          <span className="photo-ending-platform">{ENDING_LINK.platform}</span>
          <span className="photo-ending-handle">{ENDING_LINK.handle}</span>
        </a>
      </footer>

      {activePhoto && activeCopy && activeIndex !== null && (
        <div
          ref={dialogRef}
          className="photo-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={formatUiCopy(ui.dialogLabel, {
            title: activeCopy.title,
            index: activeIndex + 1,
            total: photos.length,
          })}
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
                src={activePhoto.sources.display.url}
                srcSet={sourceSet(activePhoto)}
                sizes="(max-width: 720px) 100vw, 72vw"
                width={activePhoto.width}
                height={activePhoto.height}
                alt={activeCopy.alt}
                decoding="async"
              />
            </figure>
            <aside>
              <p className="photo-lightbox-series">{activePhoto.seriesTitles[locale]}</p>
              <h2 data-allow-select>{activeCopy.title}</h2>
              <p
                className="photo-lightbox-story"
                data-allow-select
                data-copy-kind={activeCopy.caption ? "caption" : "story"}
              >
                {activeDescription}
              </p>
              {activePhoto.seriesCredit && (
                <a
                  className="photo-lightbox-credit"
                  href={activePhoto.seriesCredit.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {activePhoto.seriesCredit.translations[locale]} ↗
                </a>
              )}
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
