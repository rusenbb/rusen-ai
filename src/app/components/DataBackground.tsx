"use client";

import { useEffect, useRef, useState } from "react";

// Letter definitions as point-test functions (for checking if a point is inside the letter)
// Each letter is defined in a 0-100 coordinate system
// Using blocky, 90-degree angle designs for clarity with dot grid

function isInsideD(x: number, y: number): boolean {
  // Blocky D shape:
  // - Left vertical bar (0-25, full height)
  // - Top horizontal bar (0-75, 0-25)
  // - Bottom horizontal bar (0-75, 75-100)
  // - Right vertical bar (75-100, 25-75)
  // - Inner hole (25-75, 25-75)
  
  const leftBar = x >= 0 && x <= 25 && y >= 0 && y <= 100;
  const topBar = x >= 0 && x <= 75 && y >= 0 && y <= 25;
  const bottomBar = x >= 0 && x <= 75 && y >= 75 && y <= 100;
  const rightBar = x >= 75 && x <= 100 && y >= 25 && y <= 75;
  
  const inOuter = leftBar || topBar || bottomBar || rightBar;
  
  return inOuter;
}

function isInsideA(x: number, y: number): boolean {
  // Blocky A shape with 90-degree angles:
  // - Left vertical bar (0-25, 25-100)
  // - Right vertical bar (75-100, 25-100)
  // - Top horizontal bar (0-100, 0-25)
  // - Middle crossbar (0-100, 50-65)
  
  const leftBar = x >= 0 && x <= 25 && y >= 25 && y <= 100;
  const rightBar = x >= 75 && x <= 100 && y >= 25 && y <= 100;
  const topBar = x >= 0 && x <= 100 && y >= 0 && y <= 25;
  const middleBar = x >= 0 && x <= 100 && y >= 45 && y <= 60;
  
  return leftBar || rightBar || topBar || middleBar;
}

function isInsideT(x: number, y: number): boolean {
  // Blocky T shape:
  // - Top horizontal bar (0-100, 0-25)
  // - Center vertical stem (37.5-62.5, 0-100)
  
  const topBar = x >= 0 && x <= 100 && y >= 0 && y <= 25;
  const stem = x >= 37.5 && x <= 62.5 && y >= 0 && y <= 100;
  
  return topBar || stem;
}

function isInsideLetter(letter: string, x: number, y: number): boolean {
  switch (letter) {
    case "D":
      return isInsideD(x, y);
    case "A":
      return isInsideA(x, y);
    case "T":
      return isInsideT(x, y);
    default:
      return false;
  }
}

interface Dot {
  x: number;
  y: number;
  letterIndex: number; // -1 if not part of any letter, 0-3 for D-A-T-A
}

export default function DataBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dots, setDots] = useState<Dot[]>([]);
  const animationRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  // Calculate dots and which letter they belong to
  useEffect(() => {
    const calculateDots = () => {
      const spacing = 28; // Grid spacing
      const width = window.innerWidth;
      const height = window.innerHeight;

      // Calculate letter positions (centered, with gap between letters)
      const letterWidth = Math.min(120, width * 0.12);
      const letterHeight = letterWidth * 1.2;
      const letterGap = letterWidth * 0.25;
      const totalWidth = letterWidth * 4 + letterGap * 3;
      const startX = (width - totalWidth) / 2;
      const startY = (height - letterHeight) / 2;

      const letters = ["D", "A", "T", "A"];
      const letterBounds = letters.map((_, i) => ({
        x: startX + i * (letterWidth + letterGap),
        y: startY,
        width: letterWidth,
        height: letterHeight,
      }));

      const newDots: Dot[] = [];

      // Generate grid dots
      for (let x = spacing / 2; x < width; x += spacing) {
        for (let y = spacing / 2; y < height; y += spacing) {
          let letterIndex = -1;

          // Check if this dot is inside any letter
          for (let i = 0; i < letterBounds.length; i++) {
            const bounds = letterBounds[i];
            // Convert dot position to letter's local coordinate system (0-100)
            const localX = ((x - bounds.x) / bounds.width) * 100;
            const localY = ((y - bounds.y) / bounds.height) * 100;

            if (
              localX >= 0 &&
              localX <= 100 &&
              localY >= 0 &&
              localY <= 100 &&
              isInsideLetter(letters[i], localX, localY)
            ) {
              letterIndex = i;
              break;
            }
          }

          newDots.push({ x, y, letterIndex });
        }
      }

      setDots(newDots);
    };

    calculateDots();
    window.addEventListener("resize", calculateDots);
    return () => window.removeEventListener("resize", calculateDots);
  }, []);

  // Animation loop
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
      const elapsed = (currentTime - startTimeRef.current) / 1000; // seconds
      const cycleDuration = 4; // Total cycle duration in seconds
      const letterDuration = 1; // Each letter lights up for 1 second

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Get computed color for dots
      const computedStyle = getComputedStyle(document.documentElement);
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const dotColor = isDark ? "255, 255, 255" : "0, 0, 0";

      const dotRadius = 2;

      for (const dot of dots) {
        let opacity = 0.08; // Base opacity for all dots

        if (dot.letterIndex >= 0) {
          // This dot is part of a letter
          const letterStartTime = dot.letterIndex * letterDuration;
          const cycleTime = elapsed % cycleDuration;

          // Calculate how "active" this letter is
          if (cycleTime >= letterStartTime && cycleTime < letterStartTime + letterDuration) {
            const letterProgress = (cycleTime - letterStartTime) / letterDuration;
            // Fade in and out within the letter's time window
            const fadeProgress = Math.sin(letterProgress * Math.PI);
            opacity = 0.08 + fadeProgress * 0.5; // Brighten to 0.58 max
          }
        }

        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dotRadius, 0, Math.PI * 2);
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
