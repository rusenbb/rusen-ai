"use client";

import { useEffect, useRef, useState } from "react";

/** Colours a canvas needs, resolved from the site's CSS tokens. */
export type Palette = {
  background: string;
  surface: string;
  foreground: string;
  muted: string;
  sub: string;
  line: string;
  lineStrong: string;
  signal: string;
  danger: string;
  accent: string;
  accent2: string;
  accent3: string;
  accent4: string;
  accent5: string;
};

const TOKENS: Record<keyof Palette, string> = {
  background: "--background",
  surface: "--surface",
  foreground: "--foreground",
  muted: "--muted",
  sub: "--sub",
  line: "--line",
  lineStrong: "--line-strong",
  signal: "--signal",
  danger: "--danger",
  accent: "--accent",
  accent2: "--accent-2",
  accent3: "--accent-3",
  accent4: "--accent-4",
  accent5: "--accent-5",
};

/** Before the browser can resolve tokens (server render) the palette points at the variables. */
const FALLBACK = Object.fromEntries(
  Object.entries(TOKENS).map(([key, token]) => [key, `var(${token})`]),
) as Palette;

export function readPalette(): Palette {
  if (typeof document === "undefined") return FALLBACK;
  const style = getComputedStyle(document.documentElement);
  const out = { ...FALLBACK };
  for (const key of Object.keys(TOKENS) as Array<keyof Palette>) {
    const value = style.getPropertyValue(TOKENS[key]).trim();
    if (value) out[key] = value;
  }
  return out;
}

/** `color` at `percent` opacity, as a CSS colour a canvas or SVG attribute accepts. */
export function mix(color: string, percent: number): string {
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`;
}

/** Blend two colours: `percent` of `a`, the rest `b`. */
export function blend(a: string, b: string, percent: number): string {
  return `color-mix(in srgb, ${a} ${percent}%, ${b})`;
}

function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme", "class"],
  });
  window.addEventListener("rusen-theme-change", onChange);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);
  return () => {
    observer.disconnect();
    window.removeEventListener("rusen-theme-change", onChange);
    media.removeEventListener("change", onChange);
  };
}

/**
 * Palette as state. The returned object changes identity when the theme
 * changes, so an effect that lists it as a dependency redraws.
 */
export function usePalette(): Palette {
  const [palette, setPalette] = useState<Palette>(FALLBACK);
  useEffect(() => {
    const update = () => setPalette(readPalette());
    update();
    return subscribe(update);
  }, []);
  return palette;
}

/** Palette in a ref, for animation loops that read it every frame without re-subscribing. */
export function usePaletteRef() {
  const ref = useRef<Palette>(FALLBACK);
  useEffect(() => {
    const update = () => {
      ref.current = readPalette();
    };
    update();
    return subscribe(update);
  }, []);
  return ref;
}
