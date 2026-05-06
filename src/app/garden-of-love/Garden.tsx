"use client";

import { useEffect, useRef } from "react";
import { clearGrid, stampText, step } from "./engine";
import { GLYPHS } from "./glyphs";

const BG = "#0a0a0f";
const FG = "#f9a8d4";
const TICK_MS = 100; // 10 generations / second

function getCellSize(): number {
  if (typeof window === "undefined") return 10;
  return window.innerWidth < 768 ? 8 : 10;
}

export default function Garden() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const cellSize = getCellSize();
    const cols = Math.floor(window.innerWidth / cellSize);
    const rows = Math.floor(window.innerHeight / cellSize);

    canvas.width = cols * cellSize * dpr;
    canvas.height = rows * cellSize * dpr;
    canvas.style.width = `${cols * cellSize}px`;
    canvas.style.height = `${rows * cellSize}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    let current = new Uint8Array(cols * rows);
    let next = new Uint8Array(cols * rows);
    clearGrid(current);
    stampText(current, cols, rows, "RUŞEN", GLYPHS);

    const tickHandle = setInterval(() => {
      step(current, next, cols, rows);
      const tmp = current;
      current = next;
      next = tmp;
    }, TICK_MS);

    let rafHandle = 0;
    const draw = () => {
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, cols * cellSize, rows * cellSize);
      ctx.fillStyle = FG;
      ctx.shadowColor = FG;
      ctx.shadowBlur = 3;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (current[r * cols + c]) {
            ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
          }
        }
      }
      rafHandle = requestAnimationFrame(draw);
    };
    rafHandle = requestAnimationFrame(draw);

    return () => {
      clearInterval(tickHandle);
      cancelAnimationFrame(rafHandle);
    };
  }, []);

  return (
    <main
      style={{
        margin: 0,
        padding: 0,
        background: BG,
        minHeight: "100vh",
        overflow: "hidden",
      }}
    >
      <canvas ref={canvasRef} style={{ display: "block" }} />
    </main>
  );
}
