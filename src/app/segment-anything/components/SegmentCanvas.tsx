"use client";

import {
  useRef,
  useState,
  useEffect,
  useCallback,
  type MouseEvent as ReactMouseEvent,
  type TouchEvent as ReactTouchEvent,
} from "react";
import type { ModelPhase, PointMode, SegmentPoint } from "../types";

// ── Mask color per theme ─────────────────────────────────────────────

const MASK_COLOR_LIGHT = { r: 59, g: 130, b: 246 }; // blue-500
const MASK_COLOR_DARK = { r: 96, g: 165, b: 250 }; // blue-400
const MASK_ALPHA = 160; // out of 255

// ── Types ────────────────────────────────────────────────────────────

interface ImageBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface SegmentCanvasProps {
  imageUrl: string | null;
  phase: ModelPhase;
  points: SegmentPoint[];
  pointMode: PointMode;
  maskData: Float32Array | null;
  maskWidth: number;
  maskHeight: number;
  maskOpacity: number;
  /** Incrementing counter to trigger redraws when mask ref changes */
  maskRenderKey: number;
  onPointAdd: (x: number, y: number, label: 1 | 0) => void;
}

// ── Component ────────────────────────────────────────────────────────

export default function SegmentCanvas({
  imageUrl,
  phase,
  points,
  pointMode,
  maskData,
  maskWidth,
  maskHeight,
  maskOpacity,
  maskRenderKey,
  onPointAdd,
}: SegmentCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageBoundsRef = useRef<ImageBounds | null>(null);
  const loadedImageRef = useRef<HTMLImageElement | null>(null);

  const [dimensions, setDimensions] = useState({ width: 600, height: 500 });
  const [isDarkMode, setIsDarkMode] = useState(false);
  // Counter bumped when the HTML Image finishes loading, to trigger a redraw.
  // (Setting a ref alone doesn't cause a re-render.)
  const [imageLoadedKey, setImageLoadedKey] = useState(0);

  // ── ResizeObserver ───────────────────────────────────────────────

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver((entries) => {
      const e = entries[0];
      if (!e) return;
      setDimensions({
        width: e.contentRect.width,
        height: e.contentRect.height,
      });
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // ── Dark mode detection ──────────────────────────────────────────

  useEffect(() => {
    const check = () =>
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  // ── Load image when URL changes ──────────────────────────────────

  useEffect(() => {
    if (!imageUrl) {
      loadedImageRef.current = null;
      return;
    }
    loadedImageRef.current = null;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      loadedImageRef.current = img;
      // Bump counter so the draw effect re-runs (setting a ref alone won't)
      setImageLoadedKey((k) => k + 1);
    };
    img.onerror = () => {
      loadedImageRef.current = null;
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // ── Draw ─────────────────────────────────────────────────────────

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

    // Background
    ctx.fillStyle = isDarkMode ? "#0a0a0a" : "#fafafa";
    ctx.fillRect(0, 0, width, height);

    const img = loadedImageRef.current;

    if (!img || !img.complete || img.naturalWidth === 0) {
      // Empty state
      ctx.fillStyle = isDarkMode ? "#525252" : "#a3a3a3";
      ctx.font = "14px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      if (phase === "idle") {
        ctx.fillText("Initializing\u2026", width / 2, height / 2);
      } else if (phase === "loading") {
        ctx.fillText("Downloading model\u2026", width / 2, height / 2);
      } else if (phase === "ready") {
        ctx.fillText("Select or upload an image to begin", width / 2, height / 2);
      } else if (phase === "encoding") {
        ctx.fillText("Encoding image\u2026", width / 2, height / 2);
      } else {
        ctx.fillText("Select or upload an image", width / 2, height / 2);
      }

      imageBoundsRef.current = null;
      return;
    }

    // ── Letter-box the image ───────────────────────────────────────

    const imgAspect = img.naturalWidth / img.naturalHeight;
    const canvasAspect = width / height;
    let drawW: number, drawH: number, drawX: number, drawY: number;

    if (imgAspect > canvasAspect) {
      drawW = width;
      drawH = width / imgAspect;
      drawX = 0;
      drawY = (height - drawH) / 2;
    } else {
      drawH = height;
      drawW = height * imgAspect;
      drawX = (width - drawW) / 2;
      drawY = 0;
    }

    imageBoundsRef.current = { x: drawX, y: drawY, w: drawW, h: drawH };
    ctx.drawImage(img, drawX, drawY, drawW, drawH);

    // ── Encoding overlay ───────────────────────────────────────────

    if (phase === "encoding") {
      ctx.fillStyle = isDarkMode
        ? "rgba(0, 0, 0, 0.5)"
        : "rgba(255, 255, 255, 0.5)";
      ctx.fillRect(drawX, drawY, drawW, drawH);
      ctx.fillStyle = isDarkMode ? "#e5e5e5" : "#262626";
      ctx.font = "500 15px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Encoding image\u2026", drawX + drawW / 2, drawY + drawH / 2);
      return;
    }

    // ── Mask overlay ───────────────────────────────────────────────

    if (maskData && maskWidth > 0 && maskHeight > 0) {
      let offscreen: OffscreenCanvas | HTMLCanvasElement;
      let offCtx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null;

      if (typeof OffscreenCanvas !== "undefined") {
        offscreen = new OffscreenCanvas(maskWidth, maskHeight);
        offCtx = offscreen.getContext("2d");
      } else {
        offscreen = document.createElement("canvas");
        offscreen.width = maskWidth;
        offscreen.height = maskHeight;
        offCtx = offscreen.getContext("2d");
      }

      if (offCtx) {
        const imgData = offCtx.createImageData(maskWidth, maskHeight);
        const color = isDarkMode ? MASK_COLOR_DARK : MASK_COLOR_LIGHT;

        for (let i = 0; i < maskData.length; i++) {
          const on = maskData[i] > 0;
          const idx = i * 4;
          imgData.data[idx + 0] = on ? color.r : 0;
          imgData.data[idx + 1] = on ? color.g : 0;
          imgData.data[idx + 2] = on ? color.b : 0;
          imgData.data[idx + 3] = on ? MASK_ALPHA : 0;
        }
        offCtx.putImageData(imgData, 0, 0);

        ctx.globalAlpha = maskOpacity;
        ctx.drawImage(offscreen, drawX, drawY, drawW, drawH);
        ctx.globalAlpha = 1;
      }
    }

    // ── Point dots ─────────────────────────────────────────────────

    for (const pt of points) {
      const cx = drawX + pt.x * drawW;
      const cy = drawY + pt.y * drawH;

      // Outer ring
      ctx.beginPath();
      ctx.arc(cx, cy, 8, 0, Math.PI * 2);
      ctx.fillStyle =
        pt.label === 1 ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)";
      ctx.fill();

      // Inner dot
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fillStyle = pt.label === 1 ? "#22c55e" : "#ef4444";
      ctx.fill();
      ctx.strokeStyle = "white";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // ── Hint text ──────────────────────────────────────────────────

    if (phase === "encoded" && points.length === 0) {
      ctx.fillStyle = isDarkMode
        ? "rgba(255,255,255,0.5)"
        : "rgba(0,0,0,0.45)";
      ctx.font = "500 14px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        "Click anywhere to segment an object",
        drawX + drawW / 2,
        drawY + drawH / 2
      );
    }
  }, [dimensions, isDarkMode, imageUrl, imageLoadedKey, phase, points, maskData, maskOpacity, maskWidth, maskHeight, maskRenderKey]);

  // ── Click handler ────────────────────────────────────────────────

  const handleMouseDown = useCallback(
    (e: ReactMouseEvent<HTMLCanvasElement>) => {
      if (phase !== "encoded") return;
      e.preventDefault();

      const bounds = imageBoundsRef.current;
      if (!bounds) return;

      const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
      const cssX = e.clientX - rect.left;
      const cssY = e.clientY - rect.top;

      // Check if within image area
      if (cssX < bounds.x || cssX > bounds.x + bounds.w) return;
      if (cssY < bounds.y || cssY > bounds.y + bounds.h) return;

      const nx = (cssX - bounds.x) / bounds.w;
      const ny = (cssY - bounds.y) / bounds.h;
      const label: 1 | 0 = pointMode === "include" ? 1 : 0;

      onPointAdd(nx, ny, label);
    },
    [phase, pointMode, onPointAdd]
  );

  const handleContextMenu = useCallback(
    (e: ReactMouseEvent<HTMLCanvasElement>) => {
      e.preventDefault();
    },
    []
  );

  // ── Touch: tap adds a point using the current pointMode ───────────

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = useCallback(
    (e: ReactTouchEvent<HTMLCanvasElement>) => {
      if (phase !== "encoded") return;
      const touch = e.touches[0];
      if (!touch) return;
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    },
    [phase]
  );

  const handleTouchEnd = useCallback(
    (e: ReactTouchEvent<HTMLCanvasElement>) => {
      const start = touchStartRef.current;
      if (!start) return;
      touchStartRef.current = null;

      const bounds = imageBoundsRef.current;
      if (!bounds) return;

      const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
      const cssX = start.x - rect.left;
      const cssY = start.y - rect.top;

      if (cssX < bounds.x || cssX > bounds.x + bounds.w) return;
      if (cssY < bounds.y || cssY > bounds.y + bounds.h) return;

      const nx = (cssX - bounds.x) / bounds.w;
      const ny = (cssY - bounds.y) / bounds.h;
      const label: 1 | 0 = pointMode === "include" ? 1 : 0;
      onPointAdd(nx, ny, label);
    },
    [pointMode, onPointAdd]
  );

  const handleTouchMove = useCallback(() => {
    touchStartRef.current = null;
  }, []);

  // ── Cursor style ─────────────────────────────────────────────────

  const cursorClass =
    phase === "encoded" ? "cursor-crosshair" : "cursor-default";

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video min-h-[280px] overflow-hidden rounded-xl"
    >
      <canvas
        ref={canvasRef}
        className={`block w-full h-full ${cursorClass}`}
        style={{ width: dimensions.width, height: dimensions.height }}
        onMouseDown={handleMouseDown}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
      />
    </div>
  );
}
