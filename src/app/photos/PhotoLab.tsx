"use client";

/* eslint-disable @next/next/no-img-element */

import dynamic from "next/dynamic";
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import copy from "@/content/photo-lab.json";
import type { Photo, PhotoLocale } from "@/lib/photos";
import type { LabStatus } from "./PhotoLabCanvas";

const PhotoLabCanvas = dynamic(() => import("./PhotoLabCanvas"), { ssr: false });
const MODES = ["original", "ascii", "dither", "newsprint", "particles"] as const;
type Mode = (typeof MODES)[number];

function subscribeMotion(changed: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", changed);
  return () => query.removeEventListener("change", changed);
}

export default function PhotoLab({ photo, locale }: { photo: Photo; locale: PhotoLocale }) {
  const ui = copy[locale];
  const [mode, setMode] = useState<Mode>("ascii");
  const [detail, setDetail] = useState(65);
  const [contrast, setContrast] = useState(0);
  const [compare, setCompare] = useState(false);
  const [divider, setDivider] = useState(50);
  const [paused, setPaused] = useState(false);
  const [status, setStatus] = useState<LabStatus>("loading");
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const reducedMotion = useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true,
  );
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const controlsId = useId();
  const descriptionId = useId();
  const reportStatus = useCallback((next: LabStatus) => setStatus(next), []);
  const effectReady = mode !== "original" && status === "ready";
  const unavailable = mode !== "original" && status === "unavailable";
  const animate = !paused && !reducedMotion;

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const observer = new ResizeObserver(([entry]) => {
      const bounds = entry.contentRect;
      const width = Math.max(1, Math.min(bounds.width, bounds.height * photo.aspectRatio));
      setSize({ width, height: width / photo.aspectRatio });
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, [photo.aspectRatio]);

  const selectMode = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    setStatus("loading");
  };

  const reset = () => {
    setDetail(65);
    setContrast(0);
    setDivider(50);
    setCompare(false);
    setPaused(false);
  };

  const dragDivider = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!effectReady || !compare || !frameRef.current) return;
    if (event.type === "pointerdown") {
      if (!event.isPrimary || event.button !== 0) return;
      event.currentTarget.setPointerCapture(event.pointerId);
    } else if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const bounds = frameRef.current.getBoundingClientRect();
    setDivider(Math.max(0, Math.min(100, (event.clientX - bounds.left) / bounds.width * 100)));
  };

  return (
    <div className="photo-lab" data-photo-interactive>
      <div className="photo-lab-stage" ref={stageRef}>
        <div
          ref={frameRef}
          className="photo-lab-frame"
          style={{ width: size.width || "100%", height: size.height || "100%" }}
        >
          <img
            src={photo.sources.display.url}
            width={photo.width}
            height={photo.height}
            alt={photo.translations[locale].alt}
            aria-hidden={effectReady && !compare}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
          {mode !== "original" && imageLoaded && size.width > 0 && !imageError && (
            <div
              className="photo-lab-treatment"
              role={effectReady ? "img" : undefined}
              aria-label={effectReady ? ui.effectLabel
                .replace("{title}", photo.translations[locale].title)
                .replace("{mode}", ui.modes[mode]) : undefined}
              aria-describedby={effectReady ? descriptionId : undefined}
              style={{
                opacity: effectReady ? 1 : 0,
                clipPath: effectReady && compare ? `inset(0 0 0 ${divider}%)` : undefined,
              }}
            >
              <PhotoLabCanvas
                key={mode}
                mode={mode}
                source={photo.sources.display.url}
                width={size.width}
                height={size.height}
                detail={detail}
                contrast={contrast}
                animate={animate}
                onStatus={reportStatus}
              />
            </div>
          )}
          {effectReady && compare && (
            <>
              <div className="photo-lab-compare-labels" aria-hidden="true">
                <span>{ui.modes.original}</span><span>{ui.modes[mode]}</span>
              </div>
              <div
                className="photo-lab-divider"
                style={{ "--divider": `${divider}%` } as CSSProperties}
                onPointerDown={dragDivider}
                onPointerMove={dragDivider}
                onPointerUp={(event) => {
                  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                    event.currentTarget.releasePointerCapture(event.pointerId);
                  }
                }}
                aria-hidden="true"
              ><span>↔</span></div>
            </>
          )}
        </div>
      </div>
      <div className="photo-lab-controls" id={controlsId}>
        <div className="photo-lab-modes" role="group" aria-label={ui.title}>
          {MODES.map((option) => (
            <button type="button" key={option} aria-pressed={mode === option}
              onClick={() => selectMode(option)}>{ui.modes[option]}</button>
          ))}
        </div>
        <p className="photo-lab-description" id={descriptionId} data-allow-select>
          {ui.descriptions[mode]}{mode === "particles" && <> {ui.depth}</>}
        </p>
        <p className="photo-lab-status" role="status">
          {imageError ? ui.imageError : unavailable ? ui.unavailable
            : mode !== "original" && !effectReady ? ui.loading : ""}
        </p>
        {mode !== "original" && (
          <>
            <div className="photo-lab-settings">
              <label htmlFor={`${controlsId}-detail`}>
                <span>{ui.detail}<output aria-hidden="true">{detail}</output></span>
                <input id={`${controlsId}-detail`} type="range" min="0" max="100" value={detail} disabled={!effectReady}
                  onChange={(event) => setDetail(Number(event.target.value))} />
              </label>
              <label htmlFor={`${controlsId}-contrast`}>
                <span>{ui.contrast}<output aria-hidden="true">{contrast > 0 ? "+" : ""}{contrast}</output></span>
                <input id={`${controlsId}-contrast`} type="range" min="-60" max="60" value={contrast} disabled={!effectReady}
                  onChange={(event) => setContrast(Number(event.target.value))} />
              </label>
            </div>
            <div className="photo-lab-actions">
              <button type="button" aria-pressed={compare} disabled={!effectReady}
                onClick={() => setCompare(!compare)}>{ui.compare} ↔</button>
              {mode === "particles" && !reducedMotion && (
                <button type="button" disabled={!effectReady} aria-pressed={paused}
                  onClick={() => setPaused(!paused)}>{paused ? ui.play : ui.pause}</button>
              )}
              <button type="button" onClick={reset}>{ui.reset}</button>
            </div>
            {compare && effectReady && (
              <label className="photo-lab-comparison-control">
                <span>{ui.divider}</span>
                <input type="range" min="0" max="100" value={divider}
                  onChange={(event) => setDivider(Number(event.target.value))} />
              </label>
            )}
          </>
        )}
      </div>
    </div>
  );
}
