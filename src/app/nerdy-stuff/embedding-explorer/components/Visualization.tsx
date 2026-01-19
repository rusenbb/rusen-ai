"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import type { Point } from "../types";
import { COLORS } from "../types";

interface VisualizationProps {
  points: Point[];
  xAxisLabel: string | null;
  yAxisLabel: string | null;
  selectedWord: string | null;
  hoveredWord: string | null;
  onSelectWord: (word: string | null) => void;
  onHoverWord: (word: string | null) => void;
}

const POINT_RADIUS = 5;
const SELECTED_RADIUS = 9;
const HOVER_RADIUS = 7;
const PADDING = 60;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;

export default function Visualization({
  points,
  xAxisLabel,
  yAxisLabel,
  selectedWord,
  hoveredWord,
  onSelectWord,
  onHoverWord,
}: VisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 500 });
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Zoom and pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Detect dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    };
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // Convert normalized coordinates to canvas coordinates (with zoom/pan)
  const toCanvasCoords = useCallback(
    (x: number, y: number) => {
      const { width, height } = dimensions;
      const centerX = width / 2;
      const centerY = height / 2;
      const plotWidth = (width - PADDING * 2) * zoom;
      const plotHeight = (height - PADDING * 2) * zoom;

      return {
        cx: centerX + (x * plotWidth / 2) + pan.x,
        cy: centerY - (y * plotHeight / 2) + pan.y,
      };
    },
    [dimensions, zoom, pan]
  );

  // Convert canvas coordinates back to normalized
  const toNormalizedCoords = useCallback(
    (canvasX: number, canvasY: number) => {
      const { width, height } = dimensions;
      const centerX = width / 2;
      const centerY = height / 2;
      const plotWidth = (width - PADDING * 2) * zoom;
      const plotHeight = (height - PADDING * 2) * zoom;

      return {
        x: ((canvasX - centerX - pan.x) / plotWidth) * 2,
        y: -((canvasY - centerY - pan.y) / plotHeight) * 2,
      };
    },
    [dimensions, zoom, pan]
  );

  // Find point at canvas coordinates
  const findPointAt = useCallback(
    (canvasX: number, canvasY: number): Point | null => {
      const hitRadius = (POINT_RADIUS + 8) / zoom;
      for (const point of points) {
        const { cx, cy } = toCanvasCoords(point.x, point.y);
        const distance = Math.sqrt((canvasX - cx) ** 2 + (canvasY - cy) ** 2);

        if (distance <= hitRadius * zoom) {
          return point;
        }
      }
      return null;
    },
    [points, toCanvasCoords, zoom]
  );

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Draw the visualization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas resolution
    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);

    const { width, height } = dimensions;
    const centerX = width / 2;
    const centerY = height / 2;

    // Theme colors
    const bgColor = isDarkMode ? "#0a0a0a" : "#fafafa";
    const gridColor = isDarkMode ? "#262626" : "#e5e5e5";
    const axisColor = isDarkMode ? "#404040" : "#d4d4d4";
    const labelColor = isDarkMode ? "#a3a3a3" : "#737373";
    const textColor = isDarkMode ? "#fafafa" : "#171717";

    // Clear with background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;

    const gridSize = 50 * zoom;
    const offsetX = (pan.x % gridSize + gridSize) % gridSize;
    const offsetY = (pan.y % gridSize + gridSize) % gridSize;

    ctx.globalAlpha = 0.5;
    for (let x = offsetX; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = offsetY; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Draw main axes
    ctx.strokeStyle = axisColor;
    ctx.lineWidth = 2;

    // X axis (horizontal through center + pan)
    const axisY = centerY + pan.y;
    if (axisY > 0 && axisY < height) {
      ctx.beginPath();
      ctx.moveTo(0, axisY);
      ctx.lineTo(width, axisY);
      ctx.stroke();
    }

    // Y axis (vertical through center + pan)
    const axisX = centerX + pan.x;
    if (axisX > 0 && axisX < width) {
      ctx.beginPath();
      ctx.moveTo(axisX, 0);
      ctx.lineTo(axisX, height);
      ctx.stroke();
    }

    // Draw axis labels
    ctx.fillStyle = labelColor;
    ctx.font = "12px system-ui, -apple-system, sans-serif";

    if (xAxisLabel) {
      // Positive X (right)
      ctx.textAlign = "right";
      ctx.fillText(`${xAxisLabel} →`, width - 10, axisY > 10 && axisY < height - 10 ? axisY - 8 : centerY - 8);
      // Negative X (left)
      ctx.textAlign = "left";
      ctx.fillText(`← not ${xAxisLabel}`, 10, axisY > 10 && axisY < height - 10 ? axisY - 8 : centerY - 8);
    }

    if (yAxisLabel) {
      ctx.textAlign = "center";
      // Positive Y (top)
      ctx.fillText(`↑ ${yAxisLabel}`, axisX > 10 && axisX < width - 10 ? axisX : centerX, 20);
      // Negative Y (bottom)
      ctx.fillText(`↓ not ${yAxisLabel}`, axisX > 10 && axisX < width - 10 ? axisX : centerX, height - 10);
    }

    if (points.length === 0) {
      ctx.fillStyle = labelColor;
      ctx.font = "14px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Add words to see them projected", width / 2, height / 2);
      return;
    }

    // Draw points
    for (const point of points) {
      const { cx, cy } = toCanvasCoords(point.x, point.y);

      // Skip if outside visible area
      if (cx < -20 || cx > width + 20 || cy < -20 || cy > height + 20) continue;

      const isSelected = point.word === selectedWord;
      const isHovered = point.word === hoveredWord;

      let radius = POINT_RADIUS * Math.sqrt(zoom);
      if (isSelected) radius = SELECTED_RADIUS * Math.sqrt(zoom);
      else if (isHovered) radius = HOVER_RADIUS * Math.sqrt(zoom);
      else if (point.isHighlighted) radius = HOVER_RADIUS * Math.sqrt(zoom);

      // Determine color
      let color = COLORS.default;
      if (point.isArithmeticResult) color = COLORS.arithmeticResult;
      else if (point.isHighlighted) color = COLORS.highlighted;

      // Draw glow for highlighted points
      if (isSelected || isHovered || point.isHighlighted || point.isArithmeticResult) {
        ctx.beginPath();
        ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2);
        ctx.fillStyle = color + "40";
        ctx.fill();
      }

      // Draw point
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = isSelected || isHovered ? color : color + "cc";
      ctx.fill();

      // Draw border
      ctx.strokeStyle = isDarkMode ? "#000" : "#fff";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Draw label for selected/hovered/arithmetic
      if (point.isArithmeticResult || isSelected || isHovered) {
        ctx.fillStyle = textColor;
        ctx.font = `bold ${11 * Math.sqrt(zoom)}px system-ui, -apple-system, sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(point.word, cx, cy - radius - 8);
      }
    }

    // Draw coordinates for hovered point
    if (hoveredWord) {
      const point = points.find((p) => p.word === hoveredWord);
      if (point) {
        const { cx, cy } = toCanvasCoords(point.x, point.y);

        // Tooltip with coordinates
        const coordText = `(${point.x.toFixed(2)}, ${point.y.toFixed(2)})`;
        ctx.font = "11px monospace";
        const textWidth = ctx.measureText(coordText).width;
        const tooltipWidth = textWidth + 12;
        const tooltipHeight = 22;
        const tooltipX = cx - tooltipWidth / 2;
        const tooltipY = cy + HOVER_RADIUS * Math.sqrt(zoom) + 10;

        // Background
        ctx.fillStyle = isDarkMode ? "rgba(38, 38, 38, 0.95)" : "rgba(255, 255, 255, 0.95)";
        ctx.strokeStyle = isDarkMode ? "#404040" : "#d4d4d4";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight, 4);
        ctx.fill();
        ctx.stroke();

        // Text
        ctx.fillStyle = isDarkMode ? "#a3a3a3" : "#525252";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(coordText, cx, tooltipY + tooltipHeight / 2);
      }
    }

    // Draw zoom level indicator
    ctx.fillStyle = labelColor;
    ctx.font = "11px system-ui";
    ctx.textAlign = "right";
    ctx.fillText(`${Math.round(zoom * 100)}%`, width - 10, height - 10);

  }, [points, dimensions, selectedWord, hoveredWord, xAxisLabel, yAxisLabel, toCanvasCoords, isDarkMode, zoom, pan]);

  // Mouse handlers
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (isPanning) {
        const dx = x - lastMousePos.current.x;
        const dy = y - lastMousePos.current.y;
        setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
        lastMousePos.current = { x, y };
        return;
      }

      const point = findPointAt(x, y);
      onHoverWord(point?.word ?? null);
    },
    [findPointAt, onHoverWord, isPanning]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
        // Middle click or shift+click to pan
        setIsPanning(true);
        lastMousePos.current = { x: e.clientX - canvasRef.current!.getBoundingClientRect().left, y: e.clientY - canvasRef.current!.getBoundingClientRect().top };
        e.preventDefault();
      }
    },
    []
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    onHoverWord(null);
    setIsPanning(false);
  }, [onHoverWord]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (isPanning) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const point = findPointAt(x, y);
      onSelectWord(point?.word ?? null);
    },
    [findPointAt, onSelectWord, isPanning]
  );

  // Handle wheel zoom - needs to be a native event listener to properly prevent scroll
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      // Only zoom if shift is held, otherwise allow normal page scroll
      if (!e.shiftKey) return;

      e.preventDefault();
      e.stopPropagation();
      const delta = -e.deltaY * 0.001;
      setZoom(prev => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev + delta * prev)));
    };

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, []);

  const handleReset = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="w-full h-[500px] border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden bg-neutral-50 dark:bg-neutral-950"
      >
        <canvas
          ref={canvasRef}
          style={{ width: dimensions.width, height: dimensions.height }}
          className={isPanning ? "cursor-grabbing" : "cursor-crosshair"}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
        />
      </div>

      {/* Controls */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2">
        <button
          onClick={() => setZoom(prev => Math.min(MAX_ZOOM, prev * 1.2))}
          className="w-7 h-7 flex items-center justify-center rounded bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700"
          title="Zoom in"
        >
          +
        </button>
        <button
          onClick={() => setZoom(prev => Math.max(MIN_ZOOM, prev / 1.2))}
          className="w-7 h-7 flex items-center justify-center rounded bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700"
          title="Zoom out"
        >
          −
        </button>
        <button
          onClick={handleReset}
          className="h-7 px-2 flex items-center justify-center rounded bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-700"
          title="Reset view"
        >
          Reset
        </button>
      </div>

      {/* Instructions */}
      <div className="absolute top-3 right-3 text-xs text-neutral-400 dark:text-neutral-500">
        Shift+scroll to zoom • Shift+drag to pan
      </div>
    </div>
  );
}
