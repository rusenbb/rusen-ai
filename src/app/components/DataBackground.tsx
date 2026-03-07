"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { GameEngine } from "./game-of-life/engine";
import { createInitialSeed } from "./game-of-life/patterns";

const CELL_SIZE = 12; // Base cell size in pixels at zoom=1
const MIN_ZOOM = 0.05;
const MAX_ZOOM = 8;
const DEFAULT_SPEED = 10;
const DOT_RADIUS = 1.5;
const DEAD_CELL_OPACITY = 0.06;
const ALIVE_CELL_OPACITY = 0.35;
const HINT_STORAGE_KEY = "gol-hint-shown";

export default function DataBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const animationRef = useRef<number>(0);
  const panRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });
  const hasDraggedRef = useRef(false);

  const [speed, setSpeed] = useState(DEFAULT_SPEED);
  const [isPaused, setIsPaused] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [zoomDisplay, setZoomDisplay] = useState(100);
  const [showHint, setShowHint] = useState(false);

  // Initialize engine and seed
  useEffect(() => {
    const engine = new GameEngine();
    engineRef.current = engine;

    const centerX = Math.floor(window.innerWidth / CELL_SIZE / 2);
    const centerY = Math.floor(window.innerHeight / CELL_SIZE / 2);
    engine.seed(createInitialSeed(centerX, centerY));

    // Center the pan so grid (0,0) is top-left-ish, and the seed is centered
    panRef.current = { x: 0, y: 0 };

    // Show hint once
    if (!localStorage.getItem(HINT_STORAGE_KEY)) {
      setShowHint(true);
      localStorage.setItem(HINT_STORAGE_KEY, "1");
      setTimeout(() => setShowHint(false), 4000);
    }
  }, []);

  // Simulation tick — decoupled from rendering
  useEffect(() => {
    if (isPaused || !engineRef.current) return;

    const interval = setInterval(() => {
      engineRef.current!.tick();
      setGeneration(engineRef.current!.generation);
    }, 1000 / speed);

    return () => clearInterval(interval);
  }, [speed, isPaused]);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const onColorSchemeChange = (e: MediaQueryListEvent) => {
      isDark = e.matches;
    };
    mediaQuery.addEventListener("change", onColorSchemeChange);

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = window.innerWidth;
      const height = window.innerHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      ctx.clearRect(0, 0, width, height);

      if (!engineRef.current) {
        animationRef.current = requestAnimationFrame(render);
        return;
      }

      const zoom = zoomRef.current;
      const pan = panRef.current;
      const cellScreen = CELL_SIZE * zoom;
      const dotColor = isDark ? "255, 255, 255" : "0, 0, 0";

      // Visible grid bounds
      const minGX = Math.floor(-pan.x / cellScreen) - 1;
      const minGY = Math.floor(-pan.y / cellScreen) - 1;
      const maxGX = Math.ceil((width - pan.x) / cellScreen) + 1;
      const maxGY = Math.ceil((height - pan.y) / cellScreen) + 1;

      // Draw dead cell dot grid (only when cells are large enough on screen)
      if (cellScreen >= 6) {
        ctx.fillStyle = `rgba(${dotColor}, ${DEAD_CELL_OPACITY})`;
        for (let gy = minGY; gy <= maxGY; gy++) {
          for (let gx = minGX; gx <= maxGX; gx++) {
            if (!engineRef.current.isAlive(gx, gy)) {
              const sx = gx * cellScreen + pan.x + cellScreen / 2;
              const sy = gy * cellScreen + pan.y + cellScreen / 2;
              ctx.beginPath();
              ctx.arc(sx, sy, DOT_RADIUS, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }

      // Draw living cells
      const alive = engineRef.current.getCellsInBounds(
        minGX,
        minGY,
        maxGX,
        maxGY
      );

      ctx.fillStyle = `rgba(${dotColor}, ${ALIVE_CELL_OPACITY})`;

      if (cellScreen >= 4) {
        const padding = Math.max(1, cellScreen * 0.1);
        const size = cellScreen - padding * 2;
        const radius = Math.min(2, size * 0.2);
        for (const [gx, gy] of alive) {
          const sx = gx * cellScreen + pan.x + padding;
          const sy = gy * cellScreen + pan.y + padding;
          ctx.beginPath();
          ctx.roundRect(sx, sy, size, size, radius);
          ctx.fill();
        }
      } else {
        // Small cells — simple filled rects
        const size = Math.max(1, cellScreen * 0.8);
        for (const [gx, gy] of alive) {
          ctx.fillRect(
            gx * cellScreen + pan.x,
            gy * cellScreen + pan.y,
            size,
            size
          );
        }
      }

      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationRef.current);
      mediaQuery.removeEventListener("change", onColorSchemeChange);
    };
  }, []);

  // Resize handler
  useEffect(() => {
    const onResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.style.width = "100%";
        canvas.style.height = "100%";
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Shift key interaction toggle
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "Shift") setIsInteracting(true);
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === "Shift") {
        setIsInteracting(false);
        isDraggingRef.current = false;
      }
    };
    document.addEventListener("keydown", down);
    document.addEventListener("keyup", up);
    return () => {
      document.removeEventListener("keydown", down);
      document.removeEventListener("keyup", up);
    };
  }, []);

  // Wheel zoom (native listener for passive: false)
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = overlay.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoom = zoomRef.current;
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * factor));
      const scale = newZoom / zoom;

      panRef.current = {
        x: mouseX - (mouseX - panRef.current.x) * scale,
        y: mouseY - (mouseY - panRef.current.y) * scale,
      };
      zoomRef.current = newZoom;
      setZoomDisplay(Math.round(newZoom * 100));
    };

    overlay.addEventListener("wheel", handleWheel, { passive: false });
    return () => overlay.removeEventListener("wheel", handleWheel);
  }, []);

  // Mouse handlers for pan and cell toggle
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...panRef.current };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      hasDraggedRef.current = true;
    }

    panRef.current = {
      x: panStartRef.current.x + dx,
      y: panStartRef.current.y + dy,
    };
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    isDraggingRef.current = false;

    // If no drag happened, it's a click — toggle cell
    if (!hasDraggedRef.current && engineRef.current) {
      const zoom = zoomRef.current;
      const pan = panRef.current;
      const cellScreen = CELL_SIZE * zoom;

      const rect = (e.target as HTMLElement).getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const gx = Math.floor((mx - pan.x) / cellScreen);
      const gy = Math.floor((my - pan.y) / cellScreen);
      engineRef.current.toggle(gx, gy);
    }
  }, []);

  // Controls helpers
  const handleZoomButton = useCallback((factor: number) => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const centerX = width / 2;
    const centerY = height / 2;

    const zoom = zoomRef.current;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * factor));
    const scale = newZoom / zoom;

    panRef.current = {
      x: centerX - (centerX - panRef.current.x) * scale,
      y: centerY - (centerY - panRef.current.y) * scale,
    };
    zoomRef.current = newZoom;
    setZoomDisplay(Math.round(newZoom * 100));
  }, []);

  const handleReset = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.clear();

    const centerX = Math.floor(window.innerWidth / CELL_SIZE / 2);
    const centerY = Math.floor(window.innerHeight / CELL_SIZE / 2);
    engineRef.current.seed(createInitialSeed(centerX, centerY));

    panRef.current = { x: 0, y: 0 };
    zoomRef.current = 1;
    setZoomDisplay(100);
    setGeneration(0);
  }, []);

  // Reduced motion
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setSpeed(1);
    }
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 -z-10 pointer-events-none"
        style={{ width: "100%", height: "100%" }}
      />

      {/* Interaction overlay — only active when Shift is held */}
      <div
        ref={overlayRef}
        className={`fixed inset-0 ${
          isInteracting
            ? "pointer-events-auto cursor-crosshair z-[5]"
            : "pointer-events-none -z-10"
        }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />

      {/* Shift hint */}
      {showHint && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 rounded-lg bg-neutral-900/80 dark:bg-white/80 text-white dark:text-neutral-900 text-xs backdrop-blur animate-fade-in-up">
          Hold Shift to interact with the background
        </div>
      )}

      {/* Controls */}
      <div className="fixed bottom-4 right-4 z-10 pointer-events-auto">
        {showControls ? (
          <div className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur border border-neutral-200 dark:border-neutral-800 rounded-lg p-3 space-y-3 text-sm w-52 select-none">
            {/* Header */}
            <div className="flex justify-between items-center">
              <span className="text-neutral-400 dark:text-neutral-500 text-xs font-mono">
                gen {generation}
              </span>
              <button
                onClick={() => setShowControls(false)}
                className="w-5 h-5 flex items-center justify-center rounded text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                aria-label="Close controls"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M2 2l8 8M10 2l-8 8" />
                </svg>
              </button>
            </div>

            {/* Play/Pause */}
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="w-full py-1 rounded border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              {isPaused ? "Play" : "Pause"}
            </button>

            {/* Speed */}
            <label className="block">
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                Speed: {speed} gen/s
              </span>
              <input
                type="range"
                min={1}
                max={60}
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="w-full mt-1 accent-neutral-500"
              />
            </label>

            {/* Zoom */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleZoomButton(0.7)}
                className="w-7 h-7 flex items-center justify-center rounded border border-neutral-200 dark:border-neutral-700 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                aria-label="Zoom out"
              >
                -
              </button>
              <span className="flex-1 text-center text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                {zoomDisplay}%
              </span>
              <button
                onClick={() => handleZoomButton(1.4)}
                className="w-7 h-7 flex items-center justify-center rounded border border-neutral-200 dark:border-neutral-700 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                aria-label="Zoom in"
              >
                +
              </button>
            </div>

            {/* Reset */}
            <button
              onClick={handleReset}
              className="w-full py-1 rounded border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              Reset
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowControls(true)}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/80 dark:bg-neutral-900/80 backdrop-blur border border-neutral-200 dark:border-neutral-800 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
            title="Game of Life controls"
            aria-label="Open Game of Life controls"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
            >
              <circle cx="8" cy="8" r="2.5" />
              <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4" />
            </svg>
          </button>
        )}
      </div>
    </>
  );
}
