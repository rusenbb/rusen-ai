"use client";

import { useEffect, useRef, useState } from "react";

// Letter patterns: 5 columns x 7 rows where 1 = dot part of letter, 0 = empty
const letterPatterns: Record<string, number[][]> = {
  D: [
    [1, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 0],
  ],
  A: [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
  ],
  T: [
    [1, 1, 1, 1, 1],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
  ],
};

const PATTERN_COLS = 5;
const PATTERN_ROWS = 7;
const GRID_SPACING = 28;

interface Dot {
  gridX: number; // Grid column index
  gridY: number; // Grid row index
  screenX: number; // Actual screen X position
  screenY: number; // Actual screen Y position
  letterIndex: number; // -1 if not part of any letter, 0-3 for D-A-T-A
}

export default function DataBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dots, setDots] = useState<Dot[]>([]);
  const animationRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    const calculateDots = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      // Calculate grid dimensions (how many dots fit on screen)
      const gridCols = Math.ceil(width / GRID_SPACING) + 1;
      const gridRows = Math.ceil(height / GRID_SPACING) + 1;

      // Calculate letter placement in grid coordinates
      // Each letter is 5 cols wide, with 2 cols gap between letters
      // Total: 5 + 2 + 5 + 2 + 5 + 2 + 5 = 26 columns for "DATA"
      const letterWidthInCols = PATTERN_COLS;
      const gapInCols = 2;
      const totalLetterCols = letterWidthInCols * 4 + gapInCols * 3; // 26
      const totalLetterRows = PATTERN_ROWS; // 7

      // Center the letters on the grid
      const startCol = Math.floor((gridCols - totalLetterCols) / 2);
      const startRow = Math.floor((gridRows - totalLetterRows) / 2);

      // Build a map of which grid positions belong to which letter
      const letterMap = new Map<string, number>(); // "col,row" -> letterIndex

      const letters = ["D", "A", "T", "A"];
      letters.forEach((letter, letterIdx) => {
        const pattern = letterPatterns[letter];
        const letterStartCol = startCol + letterIdx * (letterWidthInCols + gapInCols);

        for (let row = 0; row < PATTERN_ROWS; row++) {
          for (let col = 0; col < PATTERN_COLS; col++) {
            if (pattern[row][col] === 1) {
              const gridCol = letterStartCol + col;
              const gridRow = startRow + row;
              const key = `${gridCol},${gridRow}`;
              letterMap.set(key, letterIdx);
            }
          }
        }
      });

      // Generate all grid dots
      const newDots: Dot[] = [];
      for (let gridY = 0; gridY < gridRows; gridY++) {
        for (let gridX = 0; gridX < gridCols; gridX++) {
          const screenX = gridX * GRID_SPACING + GRID_SPACING / 2;
          const screenY = gridY * GRID_SPACING + GRID_SPACING / 2;
          const key = `${gridX},${gridY}`;
          const letterIndex = letterMap.get(key) ?? -1;

          newDots.push({
            gridX,
            gridY,
            screenX,
            screenY,
            letterIndex,
          });
        }
      }

      setDots(newDots);
    };

    calculateDots();
    window.addEventListener("resize", calculateDots);
    return () => window.removeEventListener("resize", calculateDots);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    startTimeRef.current = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = (currentTime - startTimeRef.current) / 1000;
      const cycleDuration = 4;
      const letterDuration = 1;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const dotColor = isDark ? "255, 255, 255" : "0, 0, 0";

      const dotRadius = 2;

      for (const dot of dots) {
        let opacity = 0.08;

        if (dot.letterIndex >= 0) {
          const letterStartTime = dot.letterIndex * letterDuration;
          const cycleTime = elapsed % cycleDuration;

          if (cycleTime >= letterStartTime && cycleTime < letterStartTime + letterDuration) {
            const letterProgress = (cycleTime - letterStartTime) / letterDuration;
            const fadeProgress = Math.sin(letterProgress * Math.PI);
            opacity = 0.08 + fadeProgress * 0.5;
          }
        }

        ctx.beginPath();
        ctx.arc(dot.screenX, dot.screenY, dotRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${dotColor}, ${opacity})`;
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [dots]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10 pointer-events-none"
      style={{ width: "100%", height: "100%" }}
    />
  );
}
