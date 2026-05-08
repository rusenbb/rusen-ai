"use client";

import { useEffect, useRef } from "react";
import type { AttentionMask } from "../hooks/useClipSeg";

type Props = {
  mask: AttentionMask;
  /** "viridis" gives the classic blue-green-yellow scientific gradient.
   *  "cyan" is the original cyan-magenta glow used in screen blend.   */
  palette?: "viridis" | "cyan";
  /** Compositing mode: "screen" produces a translucent glow on top of an
   *  image; "alpha" paints the heatmap as an opaque image. */
  blend?: "screen" | "alpha";
  className?: string;
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

function cyanColor(v: number): [number, number, number] {
  return [
    Math.round(34 + v * 222),
    Math.round(211 - v * 100),
    Math.round(238 - v * 60),
  ];
}

export default function HeatmapCanvas({
  mask,
  palette = "cyan",
  blend = "screen",
  className,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = mask.width;
    canvas.height = mask.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = ctx.createImageData(mask.width, mask.height);
    const colorFor = palette === "viridis" ? viridisColor : cyanColor;
    for (let i = 0; i < mask.data.length; i++) {
      const v = mask.data[i];
      const j = i * 4;
      const [r, g, b] = colorFor(v);
      img.data[j] = r;
      img.data[j + 1] = g;
      img.data[j + 2] = b;
      // Screen blend: alpha derived from intensity so dim regions stay
      // transparent. Alpha mode: nearly opaque so it reads as a stand-alone
      // image, but still skip the very darkest pixels.
      img.data[j + 3] =
        blend === "screen" ? Math.round(v * v * 230) : Math.round(40 + v * 215);
    }
    ctx.putImageData(img, 0, 0);
  }, [mask, palette, blend]);

  return (
    <canvas
      ref={canvasRef}
      className={className ?? "absolute inset-0 w-full h-full pointer-events-none"}
      style={{ mixBlendMode: blend === "screen" ? "screen" : "normal" }}
    />
  );
}
