"use client";

import type { ReactNode } from "react";
import { DEMO_IMAGES } from "@/lib/demoImages";

/** Samples with one clear object to click, and the hint shown on each. */
const HINTS: Record<string, string> = {
  "/demo-images/dog.jpg": "Click the dog",
  "/demo-images/kitchen.jpg": "Click a person",
  "/demo-images/food.jpg": "Click the cup",
  "/demo-images/portrait.jpg": "Click the face",
};

export const SAMPLE_IMAGES = DEMO_IMAGES.filter(({ url }) => url in HINTS).map(({ url, alt }) => ({ url, alt }));

export function sampleHint(url: string | null): string {
  return (url && HINTS[url]) || "Click any object";
}

interface SampleImagesProps {
  activeUrl: string | null;
  onSelect: (url: string) => void;
  disabled: boolean;
  /** Trailing control, e.g. the upload button. */
  children?: ReactNode;
}

export default function SampleImages({ activeUrl, onSelect, disabled, children }: SampleImagesProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {SAMPLE_IMAGES.map((img) => {
        const isActive = activeUrl === img.url;
        return (
          <button
            key={img.url}
            type="button"
            onClick={() => onSelect(img.url)}
            disabled={disabled}
            aria-pressed={isActive}
            aria-label={`Sample image: ${img.alt}`}
            className={`shrink-0 border p-0.5 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              isActive ? "border-[var(--line-strong)]" : "border-[var(--line)] hover:border-[var(--line-strong)]"
            } cursor-pointer`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt="" className="block h-10 w-14 object-cover sm:h-12 sm:w-[4.5rem]" />
          </button>
        );
      })}
      {children}
    </div>
  );
}
