"use client";

import { useEffect, useRef, useState } from "react";
import { getResolvedTheme } from "./theme";

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
const BASE_GRID_SPACING = 28;
const MIN_GRID_SPACING = 10;
const MARGIN_COLS = 4;

const RIPPLE_EXPANSION_SPEED = 200;
const RIPPLE_DURATION = 1.5;
const RING_WIDTH = 40;
const MAX_RIPPLES = 5;

type Dot = {
  screenX: number;
  screenY: number;
  letterIndex: number;
};

type Ripple = {
  x: number;
  y: number;
  startTime: number;
};

function calculateRippleOpacity(dot: Dot, ripple: Ripple, currentTime: number): number {
  const elapsed = (currentTime - ripple.startTime) / 1000;
  if (elapsed > RIPPLE_DURATION) return 0;

  const distance = Math.hypot(dot.screenX - ripple.x, dot.screenY - ripple.y);
  const maxRingRadius = elapsed * RIPPLE_EXPANSION_SPEED + RING_WIDTH / 2;
  if (distance > maxRingRadius) return 0;

  let totalOpacityBoost = 0;
  const ringStrengths = [0.3, 0.2, 0.12];

  for (let ringIndex = 0; ringIndex < 3; ringIndex++) {
    const ringDelay = ringIndex * 0.05;
    const ringElapsed = Math.max(0, elapsed - ringDelay);
    if (ringElapsed <= 0) continue;

    const ringCenterRadius = ringElapsed * RIPPLE_EXPANSION_SPEED;
    const distanceToRing = Math.abs(distance - ringCenterRadius);

    if (distanceToRing < RING_WIDTH / 2) {
      const ringIntensity = 1 - distanceToRing / (RING_WIDTH / 2);
      const fadeProgress = 1 - elapsed / RIPPLE_DURATION;
      const fadeMultiplier = Math.pow(fadeProgress, 0.5);
      totalOpacityBoost += ringIntensity * ringStrengths[ringIndex] * fadeMultiplier;
    }
  }

  return totalOpacityBoost;
}

export default function LegacyDataGridBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const ripplesRef = useRef<Ripple[]>([]);
  const [dots, setDots] = useState<Dot[]>([]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ripplesRef.current.length >= MAX_RIPPLES) {
        ripplesRef.current.shift();
      }
      ripplesRef.current.push({
        x: e.clientX,
        y: e.clientY,
        startTime: performance.now(),
      });
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  useEffect(() => {
    const calculateDots = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      const letterWidthInCols = PATTERN_COLS;
      const gapInCols = 2;
      const totalLetterCols = letterWidthInCols * 4 + gapInCols * 3;
      const totalLetterRows = PATTERN_ROWS;

      const requiredCols = totalLetterCols + MARGIN_COLS * 2;
      const calculatedSpacing = Math.floor(width / requiredCols);
      const gridSpacing = Math.max(MIN_GRID_SPACING, Math.min(BASE_GRID_SPACING, calculatedSpacing));

      const gridCols = Math.ceil(width / gridSpacing) + 1;
      const gridRows = Math.ceil(height / gridSpacing) + 1;
      const startCol = Math.floor((gridCols - totalLetterCols) / 2);
      const startRow = Math.floor((gridRows - totalLetterRows) / 2);

      const letterMap = new Map<string, number>();
      const letters = ["D", "A", "T", "A"];

      letters.forEach((letter, letterIdx) => {
        const pattern = letterPatterns[letter];
        const letterStartCol = startCol + letterIdx * (letterWidthInCols + gapInCols);

        for (let row = 0; row < PATTERN_ROWS; row++) {
          for (let col = 0; col < PATTERN_COLS; col++) {
            if (pattern[row][col] === 1) {
              const key = `${letterStartCol + col},${startRow + row}`;
              letterMap.set(key, letterIdx);
            }
          }
        }
      });

      const nextDots: Dot[] = [];
      for (let gridY = 0; gridY < gridRows; gridY++) {
        for (let gridX = 0; gridX < gridCols; gridX++) {
          const key = `${gridX},${gridY}`;
          nextDots.push({
            screenX: gridX * gridSpacing + gridSpacing / 2,
            screenY: gridY * gridSpacing + gridSpacing / 2,
            letterIndex: letterMap.get(key) ?? -1,
          });
        }
      }

      setDots(nextDots);
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
      ripplesRef.current = ripplesRef.current.filter(
        (ripple) => (currentTime - ripple.startTime) / 1000 < RIPPLE_DURATION + 0.1,
      );

      const elapsed = (currentTime - startTimeRef.current) / 1000;
      const cycleDuration = 4;
      const letterDuration = 1;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const isDark = getResolvedTheme() === "dark";
      const dotColor = isDark ? "255, 255, 255" : "71, 85, 105";
      const baseOpacity = isDark ? 0.08 : 0.035;
      const pulseOpacity = isDark ? 0.5 : 0.18;

      for (const dot of dots) {
        let opacity = baseOpacity;

        if (dot.letterIndex >= 0) {
          const letterStartTime = dot.letterIndex * letterDuration;
          const cycleTime = elapsed % cycleDuration;
          if (cycleTime >= letterStartTime && cycleTime < letterStartTime + letterDuration) {
            const letterProgress = (cycleTime - letterStartTime) / letterDuration;
            opacity = baseOpacity + Math.sin(letterProgress * Math.PI) * pulseOpacity;
          }
        }

        let rippleBoost = 0;
        for (const ripple of ripplesRef.current) {
          rippleBoost += calculateRippleOpacity(dot, ripple, currentTime);
        }
        opacity = Math.min(1, opacity + rippleBoost * (isDark ? 1 : 0.65));

        ctx.beginPath();
        ctx.arc(dot.screenX, dot.screenY, 2, 0, Math.PI * 2);
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
      className="fixed inset-0 pointer-events-none z-0"
      style={{ width: "100%", height: "100%" }}
    />
  );
}
