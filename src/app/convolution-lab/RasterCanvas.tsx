"use client";

import { useEffect, useRef, type KeyboardEvent, type MouseEvent } from "react";

export type RasterFocus = {
  row: number;
  col: number;
  rows: number;
  columns: number;
};

type RasterCanvasProps = {
  width: number;
  height: number;
  pixels: Uint8ClampedArray;
  label: string;
  focus?: RasterFocus;
  focusColor?: string;
  onCellSelect?: (row: number, col: number) => void;
  pixelated?: boolean;
  className?: string;
};

function cellAtEvent(
  event: MouseEvent<HTMLCanvasElement>,
  width: number,
  height: number,
): { row: number; col: number } {
  const bounds = event.currentTarget.getBoundingClientRect();
  return {
    row: Math.min(height - 1, Math.max(0, Math.floor(((event.clientY - bounds.top) / bounds.height) * height))),
    col: Math.min(width - 1, Math.max(0, Math.floor(((event.clientX - bounds.left) / bounds.width) * width))),
  };
}

export function RasterCanvas({
  width,
  height,
  pixels,
  label,
  focus,
  focusColor = "#fbbf24",
  onCellSelect,
  pixelated = true,
  className = "",
}: RasterCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !width || !height || pixels.length !== width * height * 4) return;
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return;

    const imageData = context.createImageData(width, height);
    imageData.data.set(pixels);
    context.putImageData(imageData, 0, 0);

    if (!focus || focus.rows <= 0 || focus.columns <= 0) return;
    context.save();
    context.strokeStyle = focusColor;
    context.lineWidth = Math.max(1, Math.round(Math.min(width, height) / 96));
    context.setLineDash([2, 1]);
    context.strokeRect(focus.col, focus.row, focus.columns, focus.rows);
    context.restore();
  }, [focus, focusColor, height, pixels, width]);

  const handleKeyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
    if (!onCellSelect || !focus) return;
    let row = focus.row;
    let col = focus.col;
    if (event.key === "ArrowUp") row -= 1;
    else if (event.key === "ArrowDown") row += 1;
    else if (event.key === "ArrowLeft") col -= 1;
    else if (event.key === "ArrowRight") col += 1;
    else return;
    event.preventDefault();
    onCellSelect(Math.min(height - 1, Math.max(0, row)), Math.min(width - 1, Math.max(0, col)));
  };

  return (
    <canvas
      ref={canvasRef}
      className={`block h-auto w-full bg-neutral-950 ${pixelated ? "[image-rendering:pixelated]" : ""} ${onCellSelect ? "cursor-crosshair focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300" : ""} ${className}`}
      aria-label={label}
      role={onCellSelect ? "button" : "img"}
      tabIndex={onCellSelect ? 0 : undefined}
      onClick={onCellSelect ? (event) => {
        const { row, col } = cellAtEvent(event, width, height);
        onCellSelect(row, col);
      } : undefined}
      onKeyDown={handleKeyDown}
    />
  );
}
