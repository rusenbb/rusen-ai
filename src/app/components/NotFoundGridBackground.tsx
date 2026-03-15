"use client";

import { useEffect, useRef, useState } from "react";
import { getResolvedTheme } from "./theme";

const glyphPatterns: Record<string, number[][]> = {
  "0": [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 1, 0, 1],
    [1, 0, 1, 0, 1],
    [1, 0, 1, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
  "4": [
    [1, 0, 0, 1, 0],
    [1, 0, 0, 1, 0],
    [1, 0, 0, 1, 0],
    [1, 1, 1, 1, 1],
    [0, 0, 0, 1, 0],
    [0, 0, 0, 1, 0],
    [0, 0, 0, 1, 0],
  ],
};

const MESSAGE = ["4", "0", "4"];
const PATTERN_COLS = 5;
const PATTERN_ROWS = 7;
const BASE_GRID_SPACING = 28;
const MIN_GRID_SPACING = 12;
const LETTER_GAP = 3;
const EDGE_MARGIN = 4;

type Dot = {
  x: number;
  y: number;
  isGlyph: boolean;
  glyphIndex: number;
};

export default function NotFoundGridBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  const [dots, setDots] = useState<Dot[]>([]);

  useEffect(() => {
    const updateDots = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const totalGlyphCols = MESSAGE.length * PATTERN_COLS + (MESSAGE.length - 1) * LETTER_GAP;
      const requiredCols = totalGlyphCols + EDGE_MARGIN * 2;
      const gridSpacing = Math.max(
        MIN_GRID_SPACING,
        Math.min(BASE_GRID_SPACING, Math.floor(width / requiredCols)),
      );

      const gridCols = Math.ceil(width / gridSpacing) + 1;
      const gridRows = Math.ceil(height / gridSpacing) + 1;
      const glyphStartCol = Math.floor((gridCols - totalGlyphCols) / 2);
      const glyphStartRow = Math.floor((gridRows - PATTERN_ROWS) / 2);
      const glyphCells = new Map<string, number>();

      MESSAGE.forEach((character, glyphIndex) => {
        const pattern = glyphPatterns[character];
        const columnOffset = glyphStartCol + glyphIndex * (PATTERN_COLS + LETTER_GAP);

        for (let row = 0; row < PATTERN_ROWS; row += 1) {
          for (let col = 0; col < PATTERN_COLS; col += 1) {
            if (pattern[row][col] === 1) {
              glyphCells.set(`${columnOffset + col},${glyphStartRow + row}`, glyphIndex);
            }
          }
        }
      });

      const nextDots: Dot[] = [];
      for (let row = 0; row < gridRows; row += 1) {
        for (let col = 0; col < gridCols; col += 1) {
          const key = `${col},${row}`;
          const glyphIndex = glyphCells.get(key) ?? -1;
          nextDots.push({
            x: col * gridSpacing + gridSpacing / 2,
            y: row * gridSpacing + gridSpacing / 2,
            isGlyph: glyphIndex >= 0,
            glyphIndex,
          });
        }
      }

      setDots(nextDots);
    };

    updateDots();
    window.addEventListener("resize", updateDots);

    return () => window.removeEventListener("resize", updateDots);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const render = (time: number) => {
      const reducedMotion = mediaQuery.matches;
      const isDark = getResolvedTheme() === "dark";
      const backgroundColor = isDark ? "#07070a" : "#f7f7f4";
      const dotColor = isDark ? "236, 239, 244" : "43, 48, 58";
      const elapsed = time / 1000;
      const glyphDuration = 1;
      const cycleDuration = MESSAGE.length * glyphDuration;
      const cycleTime = elapsed % cycleDuration;

      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = backgroundColor;
      context.fillRect(0, 0, canvas.width, canvas.height);

      for (const dot of dots) {
        let opacity = isDark ? 0.07 : 0.08;
        let radius = 1.6;

        if (dot.isGlyph) {
          const glyphStartTime = dot.glyphIndex * glyphDuration;
          const glyphIsActive =
            cycleTime >= glyphStartTime && cycleTime < glyphStartTime + glyphDuration;
          const glyphProgress = glyphIsActive
            ? (cycleTime - glyphStartTime) / glyphDuration
            : 0;
          const sequentialPulse = glyphIsActive ? Math.sin(glyphProgress * Math.PI) : 0;

          opacity =
            (isDark ? 0.18 : 0.14) +
            sequentialPulse * (isDark ? 0.4 : 0.3);
          radius = 1.9 + sequentialPulse * 0.9;
        }

        context.beginPath();
        context.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
        context.fillStyle = `rgba(${dotColor}, ${Math.max(0.03, Math.min(opacity, 0.95))})`;
        context.fill();
      }

      if (!reducedMotion) {
        animationFrameRef.current = window.requestAnimationFrame(render);
      }
    };

    if (mediaQuery.matches) {
      render(0);
    } else {
      animationFrameRef.current = window.requestAnimationFrame(render);
    }

    const handleMotionChange = () => {
      window.cancelAnimationFrame(animationFrameRef.current);
      if (mediaQuery.matches) {
        render(0);
      } else {
        animationFrameRef.current = window.requestAnimationFrame(render);
      }
    };

    mediaQuery.addEventListener("change", handleMotionChange);

    return () => {
      window.cancelAnimationFrame(animationFrameRef.current);
      mediaQuery.removeEventListener("change", handleMotionChange);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [dots]);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.05),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.04),transparent_40%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.03),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.02),transparent_40%)]" />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
