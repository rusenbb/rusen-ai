"use client";

import {
  useRef,
  useState,
  useEffect,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import type { PointMode, SegmentPoint } from "../types";

const THEME_EVENT = "rusen-theme-change";

interface ImageBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface SegmentCanvasProps {
  imageUrl: string | null;
  /** Clicks add points only while this is true. */
  interactive: boolean;
  /** Dims the image while the model loads or reads it. */
  busy: boolean;
  points: SegmentPoint[];
  pointMode: PointMode;
  maskData: Float32Array | null;
  maskWidth: number;
  maskHeight: number;
  maskOpacity: number;
  /** Incrementing counter to trigger redraws when mask ref changes */
  maskRenderKey: number;
  onPointAdd: (x: number, y: number, label: 1 | 0) => void;
  /** HTML laid over the canvas: hints and progress. */
  overlay?: ReactNode;
}

function token(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export default function SegmentCanvas({
  imageUrl,
  interactive,
  busy,
  points,
  pointMode,
  maskData,
  maskWidth,
  maskHeight,
  maskOpacity,
  maskRenderKey,
  onPointAdd,
  overlay,
}: SegmentCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageBoundsRef = useRef<ImageBounds | null>(null);
  const loadedImageRef = useRef<HTMLImageElement | null>(null);

  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });
  const [themeKey, setThemeKey] = useState(0);
  // Bumped when the image finishes loading, to trigger a redraw.
  const [imageLoadedKey, setImageLoadedKey] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver((entries) => {
      const e = entries[0];
      if (!e) return;
      setDimensions({ width: e.contentRect.width, height: e.contentRect.height });
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const redraw = () => setThemeKey((k) => k + 1);
    window.addEventListener(THEME_EVENT, redraw);
    return () => window.removeEventListener(THEME_EVENT, redraw);
  }, []);

  useEffect(() => {
    loadedImageRef.current = null;
    if (!imageUrl) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      loadedImageRef.current = img;
      setImageLoadedKey((k) => k + 1);
    };
    img.onerror = () => {
      loadedImageRef.current = null;
    };
    img.src = imageUrl;
  }, [imageUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = dimensions;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const surface = token("--surface");
    const accent = token("--accent");
    const accent2 = token("--accent-2");
    ctx.fillStyle = surface;
    ctx.fillRect(0, 0, width, height);

    const img = loadedImageRef.current;
    if (!img || !img.complete || img.naturalWidth === 0) {
      imageBoundsRef.current = null;
      return;
    }

    // Letter-box the image.
    const imgAspect = img.naturalWidth / img.naturalHeight;
    let drawW: number, drawH: number;
    if (imgAspect > width / height) {
      drawW = width;
      drawH = width / imgAspect;
    } else {
      drawH = height;
      drawW = height * imgAspect;
    }
    const drawX = (width - drawW) / 2;
    const drawY = (height - drawH) / 2;
    imageBoundsRef.current = { x: drawX, y: drawY, w: drawW, h: drawH };
    ctx.drawImage(img, drawX, drawY, drawW, drawH);

    if (busy) {
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = surface;
      ctx.fillRect(drawX, drawY, drawW, drawH);
      ctx.globalAlpha = 1;
    }

    if (maskData && maskWidth > 0 && maskHeight > 0) {
      const off = document.createElement("canvas");
      off.width = maskWidth;
      off.height = maskHeight;
      const offCtx = off.getContext("2d");
      if (offCtx) {
        const imgData = offCtx.createImageData(maskWidth, maskHeight);
        for (let i = 0; i < maskData.length; i++) {
          if (maskData[i] > 0) imgData.data[i * 4 + 3] = 255;
        }
        offCtx.putImageData(imgData, 0, 0);
        // Tint the mask with the accent token, whatever format it is in.
        offCtx.globalCompositeOperation = "source-in";
        offCtx.fillStyle = accent;
        offCtx.fillRect(0, 0, maskWidth, maskHeight);
        ctx.globalAlpha = maskOpacity;
        ctx.drawImage(off, drawX, drawY, drawW, drawH);
        ctx.globalAlpha = 1;
      }
    }

    for (const pt of points) {
      const cx = drawX + pt.x * drawW;
      const cy = drawY + pt.y * drawH;
      ctx.beginPath();
      if (pt.label === 1) ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      else ctx.rect(cx - 5.5, cy - 5.5, 11, 11);
      ctx.fillStyle = pt.label === 1 ? accent : accent2;
      ctx.fill();
      ctx.strokeStyle = surface;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, [dimensions, themeKey, imageUrl, imageLoadedKey, busy, points, maskData, maskOpacity, maskWidth, maskHeight, maskRenderKey]);

  const addAt = (e: ReactMouseEvent<HTMLCanvasElement>, label: 1 | 0) => {
    if (!interactive) return;
    const bounds = imageBoundsRef.current;
    if (!bounds) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;
    if (cssX < bounds.x || cssX > bounds.x + bounds.w) return;
    if (cssY < bounds.y || cssY > bounds.y + bounds.h) return;
    onPointAdd((cssX - bounds.x) / bounds.w, (cssY - bounds.y) / bounds.h, label);
  };

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden">
      <canvas
        ref={canvasRef}
        className={`block h-full w-full ${interactive ? "cursor-crosshair" : "cursor-progress"}`}
        style={{ width: dimensions.width, height: dimensions.height }}
        onClick={(e) => addAt(e, e.shiftKey || pointMode === "exclude" ? 0 : 1)}
        onContextMenu={(e) => {
          e.preventDefault();
          addAt(e, 0);
        }}
        role="img"
        aria-label={
          imageUrl
            ? `Segmentation image with ${points.length} selection ${points.length === 1 ? "point" : "points"}.`
            : "Segmentation workspace. Load an image to begin."
        }
      />
      {overlay}
    </div>
  );
}
