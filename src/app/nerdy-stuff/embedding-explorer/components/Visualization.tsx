"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import type { Point, ProjectionMode } from "../types";
import { COLORS } from "../types";

interface VisualizationProps {
  points: Point[];
  projectionMode: ProjectionMode;
  axisLabels: {
    xPositive: string | null;
    xNegative: string | null;
    yPositive: string | null;
    yNegative: string | null;
  };
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
  projectionMode,
  axisLabels,
  selectedWord,
  hoveredWord,
  onSelectWord,
  onHoverWord,
}: VisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 500 });
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    };

    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const toCanvasCoords = useCallback(
    (x: number, y: number) => {
      const { width, height } = dimensions;
      const centerX = width / 2;
      const centerY = height / 2;
      const plotWidth = (width - PADDING * 2) * zoom;
      const plotHeight = (height - PADDING * 2) * zoom;

      return {
        cx: centerX + (x * plotWidth) / 2 + pan.x,
        cy: centerY - (y * plotHeight) / 2 + pan.y,
      };
    },
    [dimensions, zoom, pan]
  );

  const findPointAt = useCallback(
    (canvasX: number, canvasY: number): Point | null => {
      const hitRadius = POINT_RADIUS + 8;
      for (const point of points) {
        const { cx, cy } = toCanvasCoords(point.x, point.y);
        const distance = Math.sqrt((canvasX - cx) ** 2 + (canvasY - cy) ** 2);
        if (distance <= hitRadius) {
          return point;
        }
      }
      return null;
    },
    [points, toCanvasCoords]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      setDimensions({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);

    const { width, height } = dimensions;
    const centerX = width / 2;
    const centerY = height / 2;

    const gridColor = isDarkMode ? "#262626" : "#e5e5e5";
    const axisColor = isDarkMode ? "#404040" : "#d4d4d4";
    const labelColor = isDarkMode ? "#b5b5b5" : "#5f5f5f";
    const textColor = "#fafafa";
    const badgeBg = isDarkMode ? "rgba(10, 10, 10, 0.92)" : "rgba(17, 24, 39, 0.88)";
    const badgeBorder = isDarkMode ? "#525252" : "rgba(255, 255, 255, 0.16)";
    const badgeTextColor = "#f8fafc";
    const pointLabelBg = isDarkMode ? "rgba(10, 10, 10, 0.9)" : "rgba(23, 23, 23, 0.88)";

    ctx.clearRect(0, 0, width, height);

    const gridSize = 50 * zoom;
    const offsetX = ((pan.x % gridSize) + gridSize) % gridSize;
    const offsetY = ((pan.y % gridSize) + gridSize) % gridSize;

    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.45;
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

    const axisY = centerY + pan.y;
    const axisX = centerX + pan.x;
    ctx.strokeStyle = axisColor;
    ctx.lineWidth = 2;

    if (axisY > 0 && axisY < height) {
      ctx.beginPath();
      ctx.moveTo(0, axisY);
      ctx.lineTo(width, axisY);
      ctx.stroke();
    }

    if (axisX > 0 && axisX < width) {
      ctx.beginPath();
      ctx.moveTo(axisX, 0);
      ctx.lineTo(axisX, height);
      ctx.stroke();
    }

    ctx.fillStyle = labelColor;
    ctx.font = "12px Georgia, serif";

    if (projectionMode === "axes") {
      if (axisLabels.xPositive) {
        ctx.textAlign = "right";
        ctx.fillText(
          `${axisLabels.xPositive} →`,
          width - 10,
          axisY > 10 && axisY < height - 10 ? axisY - 8 : centerY - 8
        );
      }

      if (axisLabels.xNegative) {
        ctx.textAlign = "left";
        ctx.fillText(
          `← ${axisLabels.xNegative}`,
          10,
          axisY > 10 && axisY < height - 10 ? axisY - 8 : centerY - 8
        );
      }

      if (axisLabels.yPositive) {
        ctx.textAlign = "center";
        ctx.fillText(
          `↑ ${axisLabels.yPositive}`,
          axisX > 10 && axisX < width - 10 ? axisX : centerX,
          20
        );
      }

      if (axisLabels.yNegative) {
        ctx.textAlign = "center";
        ctx.fillText(
          `↓ ${axisLabels.yNegative}`,
          axisX > 10 && axisX < width - 10 ? axisX : centerX,
          height - 10
        );
      }
    }

    ctx.fillStyle = badgeBg;
    ctx.strokeStyle = badgeBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(12, 12, 152, 30, 15);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = badgeTextColor;
    ctx.font = "600 11px Georgia, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(projectionMode === "umap" ? "UMAP manifold view" : "Semantic axis view", 88, 27);
    ctx.textBaseline = "alphabetic";

    if (points.length === 0) {
      ctx.fillStyle = labelColor;
      ctx.font = "14px Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText(
        projectionMode === "umap"
          ? "Add at least three embedded items to build the manifold"
          : "Add words to see them projected",
        width / 2,
        height / 2
      );
      return;
    }

    for (const point of points) {
      const { cx, cy } = toCanvasCoords(point.x, point.y);

      if (cx < -20 || cx > width + 20 || cy < -20 || cy > height + 20) {
        continue;
      }

      const isSelected = point.word === selectedWord;
      const isHovered = point.word === hoveredWord;

      let radius = POINT_RADIUS * Math.sqrt(zoom);
      if (isSelected) radius = SELECTED_RADIUS * Math.sqrt(zoom);
      else if (isHovered || point.isHighlighted) radius = HOVER_RADIUS * Math.sqrt(zoom);

      let color = COLORS.default;
      if (point.isArithmeticResult) color = COLORS.arithmeticResult;
      else if (point.isHighlighted) color = COLORS.highlighted;

      if (isSelected || isHovered || point.isHighlighted || point.isArithmeticResult) {
        ctx.beginPath();
        ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2);
        ctx.fillStyle = `${color}40`;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = isSelected || isHovered ? color : `${color}cc`;
      ctx.fill();

      ctx.strokeStyle = isDarkMode ? "#000" : "#fff";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      if (point.isArithmeticResult || isSelected || isHovered) {
        ctx.font = `bold ${11 * Math.sqrt(zoom)}px Georgia, serif`;
        const labelText = point.word;
        const labelWidth = ctx.measureText(labelText).width + 12;
        const labelHeight = 18;
        const labelX = cx - labelWidth / 2;
        const labelY = cy - radius - 22;

        ctx.fillStyle = pointLabelBg;
        ctx.beginPath();
        ctx.roundRect(labelX, labelY, labelWidth, labelHeight, 6);
        ctx.fill();

        ctx.fillStyle = textColor;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(labelText, cx, labelY + labelHeight / 2);
        ctx.textBaseline = "alphabetic";
      }
    }

    if (hoveredWord) {
      const point = points.find((candidate) => candidate.word === hoveredWord);
      if (point) {
        const { cx, cy } = toCanvasCoords(point.x, point.y);
        const coordText = `(${point.x.toFixed(2)}, ${point.y.toFixed(2)})`;

        ctx.font = "11px monospace";
        const textWidth = ctx.measureText(coordText).width;
        const tooltipWidth = textWidth + 12;
        const tooltipHeight = 22;
        const tooltipX = cx - tooltipWidth / 2;
        const tooltipY = cy + HOVER_RADIUS * Math.sqrt(zoom) + 10;

        ctx.fillStyle = isDarkMode ? "rgba(38, 38, 38, 0.95)" : "rgba(255, 255, 255, 0.95)";
        ctx.strokeStyle = isDarkMode ? "#404040" : "#d4d4d4";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isDarkMode ? "#a3a3a3" : "#525252";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(coordText, cx, tooltipY + tooltipHeight / 2);
        ctx.textBaseline = "alphabetic";
      }
    }

    ctx.fillStyle = labelColor;
    ctx.font = "11px Georgia, serif";
    ctx.textAlign = "right";
    ctx.fillText(`${Math.round(zoom * 100)}%`, width - 10, height - 10);
  }, [axisLabels, dimensions, hoveredWord, isDarkMode, onHoverWord, pan, points, projectionMode, selectedWord, toCanvasCoords, zoom]);

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
        setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
        lastMousePos.current = { x, y };
        return;
      }

      const point = findPointAt(x, y);
      onHoverWord(point?.word ?? null);
    },
    [findPointAt, isPanning, onHoverWord]
  );

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 1 && !(e.button === 0 && e.shiftKey)) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    setIsPanning(true);
    lastMousePos.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    e.preventDefault();
  }, []);

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
    [findPointAt, isPanning, onSelectWord]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      if (!e.shiftKey) return;

      e.preventDefault();
      e.stopPropagation();
      const delta = -e.deltaY * 0.001;
      setZoom((prev) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev + delta * prev)));
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
        className="w-full h-[500px] border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden"
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

      <div className="absolute bottom-3 left-3 flex items-center gap-2">
        <button
          onClick={() => setZoom((prev) => Math.min(MAX_ZOOM, prev * 1.2))}
          className="w-7 h-7 flex items-center justify-center rounded bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700"
          title="Zoom in"
        >
          +
        </button>
        <button
          onClick={() => setZoom((prev) => Math.max(MIN_ZOOM, prev / 1.2))}
          className="w-7 h-7 flex items-center justify-center rounded bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700"
          title="Zoom out"
        >
          -
        </button>
        <button
          onClick={handleReset}
          className="h-7 px-2 flex items-center justify-center rounded bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-700"
          title="Reset view"
        >
          Reset
        </button>
      </div>

      <div className="absolute top-3 right-3 text-xs text-neutral-400 dark:text-neutral-500 text-right">
        <div>Shift+scroll to zoom</div>
        <div>Shift+drag to pan</div>
      </div>
    </div>
  );
}
