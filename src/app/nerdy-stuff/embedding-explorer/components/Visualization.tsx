"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import type { TextItem, SearchResult } from "../types";
import { getCategoryColor } from "../types";

interface VisualizationProps {
  items: TextItem[];
  selectedPointId: string | null;
  hoveredPointId: string | null;
  searchResults: SearchResult[];
  onSelectPoint: (id: string | null) => void;
  onHoverPoint: (id: string | null) => void;
}

const POINT_RADIUS = 8;
const SELECTED_RADIUS = 12;
const HOVER_RADIUS = 10;
const PADDING = 40;

export default function Visualization({
  items,
  selectedPointId,
  hoveredPointId,
  searchResults,
  onSelectPoint,
  onHoverPoint,
}: VisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });

  // Points with valid projections
  const projectedItems = items.filter((item) => item.x !== null && item.y !== null);

  // Convert normalized coordinates to canvas coordinates
  const toCanvasCoords = useCallback(
    (x: number, y: number) => {
      const { width, height } = dimensions;
      const plotWidth = width - PADDING * 2;
      const plotHeight = height - PADDING * 2;

      return {
        cx: PADDING + ((x + 1) / 2) * plotWidth,
        cy: PADDING + ((1 - (y + 1) / 2)) * plotHeight, // Flip Y for canvas
      };
    },
    [dimensions]
  );

  // Find point at canvas coordinates
  const findPointAt = useCallback(
    (canvasX: number, canvasY: number): TextItem | null => {
      for (const item of projectedItems) {
        if (item.x === null || item.y === null) continue;

        const { cx, cy } = toCanvasCoords(item.x, item.y);
        const distance = Math.sqrt((canvasX - cx) ** 2 + (canvasY - cy) ** 2);

        if (distance <= POINT_RADIUS + 4) {
          return item;
        }
      }
      return null;
    },
    [projectedItems, toCanvasCoords]
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

    // Clear
    ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    // Background
    ctx.fillStyle = "rgba(0, 0, 0, 0.02)";
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    // Draw grid
    ctx.strokeStyle = "rgba(0, 0, 0, 0.05)";
    ctx.lineWidth = 1;

    // Vertical lines
    for (let i = 0; i <= 4; i++) {
      const x = PADDING + (i / 4) * (dimensions.width - PADDING * 2);
      ctx.beginPath();
      ctx.moveTo(x, PADDING);
      ctx.lineTo(x, dimensions.height - PADDING);
      ctx.stroke();
    }

    // Horizontal lines
    for (let i = 0; i <= 4; i++) {
      const y = PADDING + (i / 4) * (dimensions.height - PADDING * 2);
      ctx.beginPath();
      ctx.moveTo(PADDING, y);
      ctx.lineTo(dimensions.width - PADDING, y);
      ctx.stroke();
    }

    if (projectedItems.length === 0) {
      // Empty state
      ctx.fillStyle = "#666";
      ctx.font = "14px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        "Add some texts to visualize embeddings",
        dimensions.width / 2,
        dimensions.height / 2
      );
      return;
    }

    // Search result IDs for highlighting (computed inside effect to avoid dependency issues)
    const searchResultIds = new Set(searchResults.map((r) => r.item.id));

    // Draw points
    for (const item of projectedItems) {
      if (item.x === null || item.y === null) continue;

      const { cx, cy } = toCanvasCoords(item.x, item.y);
      const isSelected = item.id === selectedPointId;
      const isHovered = item.id === hoveredPointId;
      const isSearchResult = searchResultIds.has(item.id);

      let radius = POINT_RADIUS;
      if (isSelected) radius = SELECTED_RADIUS;
      else if (isHovered) radius = HOVER_RADIUS;

      // Draw shadow for highlighted points
      if (isSelected || isHovered || isSearchResult) {
        ctx.beginPath();
        ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2);
        ctx.fillStyle = isSearchResult
          ? "rgba(245, 158, 11, 0.3)"
          : "rgba(0, 0, 0, 0.2)";
        ctx.fill();
      }

      // Draw point
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);

      // Fill color based on category
      const baseColor = getCategoryColor(item.category);
      ctx.fillStyle = isSearchResult
        ? baseColor
        : isSelected || isHovered
        ? baseColor
        : baseColor + "cc"; // Slight transparency for non-highlighted

      ctx.fill();

      // Stroke for selected/hovered
      if (isSelected || isHovered) {
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Draw search result rank
      if (isSearchResult) {
        const rank = searchResults.findIndex((r) => r.item.id === item.id) + 1;
        ctx.fillStyle = "#fff";
        ctx.font = "bold 10px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(rank.toString(), cx, cy);
      }
    }

    // Draw hover tooltip
    if (hoveredPointId) {
      const item = projectedItems.find((i) => i.id === hoveredPointId);
      if (item && item.x !== null && item.y !== null) {
        const { cx, cy } = toCanvasCoords(item.x, item.y);

        // Tooltip background
        const text = item.text.slice(0, 50) + (item.text.length > 50 ? "..." : "");
        ctx.font = "12px system-ui, sans-serif";
        const textWidth = ctx.measureText(text).width;
        const tooltipWidth = textWidth + 16;
        const tooltipHeight = 28;

        // Position tooltip above point
        let tooltipX = cx - tooltipWidth / 2;
        let tooltipY = cy - HOVER_RADIUS - tooltipHeight - 8;

        // Keep tooltip in bounds
        tooltipX = Math.max(4, Math.min(dimensions.width - tooltipWidth - 4, tooltipX));
        tooltipY = Math.max(4, tooltipY);

        // Draw tooltip
        ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
        ctx.beginPath();
        ctx.roundRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight, 4);
        ctx.fill();

        ctx.fillStyle = "#fff";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(text, tooltipX + 8, tooltipY + tooltipHeight / 2);
      }
    }
  }, [
    projectedItems,
    dimensions,
    selectedPointId,
    hoveredPointId,
    searchResults,
    toCanvasCoords,
  ]);

  // Mouse handlers
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const point = findPointAt(x, y);
      onHoverPoint(point?.id ?? null);
    },
    [findPointAt, onHoverPoint]
  );

  const handleMouseLeave = useCallback(() => {
    onHoverPoint(null);
  }, [onHoverPoint]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const point = findPointAt(x, y);
      onSelectPoint(point?.id ?? null);
    },
    [findPointAt, onSelectPoint]
  );

  return (
    <div
      ref={containerRef}
      className="w-full h-[400px] border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden bg-white dark:bg-neutral-900"
    >
      <canvas
        ref={canvasRef}
        style={{ width: dimensions.width, height: dimensions.height }}
        className="cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      />
    </div>
  );
}
