"use client";

import { useEffect, useRef, useState } from "react";
import type { AttentionMask } from "../hooks/useClipSeg";
import { containedImageStyle } from "../maps";

type Props = {
  mask: AttentionMask;
  /** "viridis" is the blue-green-yellow scientific gradient; "accent" tints by the theme accent. */
  palette?: "viridis" | "accent";
  /** "overlay": translucent tint on top of the photo; "alpha": an opaque heatmap image. */
  blend?: "overlay" | "alpha";
  className?: string;
  imageAspect?: number;
};

function viridisColor(v: number): [number, number, number] {
  // Cheap 5-stop polyline approximation of viridis.
  const stops: Array<[number, [number, number, number]]> = [
    [0.0, [68, 1, 84]],
    [0.25, [59, 82, 139]],
    [0.5, [33, 145, 140]],
    [0.75, [94, 201, 98]],
    [1.0, [253, 231, 37]],
  ];
  for (let i = 1; i < stops.length; i++) {
    if (v <= stops[i][0]) {
      const [t0, c0] = stops[i - 1];
      const [t1, c1] = stops[i];
      const t = (v - t0) / (t1 - t0);
      return [
        Math.round(c0[0] + (c1[0] - c0[0]) * t),
        Math.round(c0[1] + (c1[1] - c0[1]) * t),
        Math.round(c0[2] + (c1[2] - c0[2]) * t),
      ];
    }
  }
  return stops[stops.length - 1][1];
}

/** The theme's accent colour as RGB, read from the CSS token. */
function accentRgb(): [number, number, number] {
  const probe = document.createElement("canvas").getContext("2d");
  const value = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
  if (!probe || !value) return [34, 211, 238];
  probe.fillStyle = value;
  const hex = String(probe.fillStyle);
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [34, 211, 238];
}

export default function HeatmapCanvas({
  mask,
  palette = "accent",
  blend = "overlay",
  className,
  imageAspect,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [themeKey, setThemeKey] = useState(0);

  useEffect(() => {
    const redraw = () => setThemeKey((k) => k + 1);
    window.addEventListener("rusen-theme-change", redraw);
    return () => window.removeEventListener("rusen-theme-change", redraw);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = mask.width;
    canvas.height = mask.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = ctx.createImageData(mask.width, mask.height);
    const accent = accentRgb();
    const colorFor = palette === "viridis" ? viridisColor : () => accent;
    for (let i = 0; i < mask.data.length; i++) {
      const v = mask.data[i];
      const j = i * 4;
      const [r, g, b] = colorFor(v);
      img.data[j] = r;
      img.data[j + 1] = g;
      img.data[j + 2] = b;
      // Overlay: alpha grows with the score so weak regions stay clear.
      // Alpha mode: nearly opaque so it reads as a stand-alone image.
      img.data[j + 3] = blend === "overlay" ? Math.round(v * v * 190) : Math.round(40 + v * 215);
    }
    ctx.putImageData(img, 0, 0);
  }, [mask, palette, blend, themeKey]);

  return (
    <canvas
      ref={canvasRef}
      className={className ?? "absolute inset-0 w-full h-full pointer-events-none"}
      style={imageAspect ? containedImageStyle(imageAspect) : undefined}
    />
  );
}
