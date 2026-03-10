"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

// Speed slider space retained for the Oimo speed mapping curve.
const DEFAULT_SPEED = 0.3;
const SPEED_COEFF = 16 / 0.7;
const TARGET_FRAME_MS = 1000 / 60;
const BG_PREFS_KEY = "bg.settings.v1";

function speedFromSlider(t: number): number {
  if (t < 0.01) return 0;
  const minStep = 1e-4;
  const base = Math.pow(2, (t - 0.3) * SPEED_COEFF);
  const correction =
    (minStep - Math.pow(2, -0.3 * SPEED_COEFF)) * (1 - Math.min(1, t / 0.3));
  return Math.max(0, (base + correction) * 0.5);
}

function sliderFromDigitKey(key: string): number | null {
  if (!/^[0-9]$/.test(key)) return null;
  if (key === "0") return 0;
  const digit = Number(key);
  // Keep x1 near key "3" (t=0.3) and accelerate more for higher keys.
  const table = [0, 0.12, 0.2, 0.3, 0.42, 0.54, 0.66, 0.78, 0.9, 1.0];
  return table[digit] ?? null;
}

function getCanvasDisplaySize(canvas: HTMLCanvasElement): {
  width: number;
  height: number;
} {
  const width = Math.max(1, canvas.clientWidth || window.innerWidth || 1);
  const height = Math.max(1, canvas.clientHeight || window.innerHeight || 1);
  return { width, height };
}

function getCanvasPixelSize(canvas: HTMLCanvasElement): {
  width: number;
  height: number;
} {
  const { width: displayW, height: displayH } = getCanvasDisplaySize(canvas);
  const dpr = window.devicePixelRatio || 1;
  return {
    width: Math.max(1, Math.round(displayW * dpr)),
    height: Math.max(1, Math.round(displayH * dpr)),
  };
}

function isInteractiveElement(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return Boolean(
    el.closest(
      "a, button, input, textarea, select, label, summary, [role='button'], [data-bg-nav-ignore]",
    ),
  );
}

function clampSpeedDigit(digit: number): number {
  return Math.max(0, Math.min(9, Math.floor(digit)));
}

function clampAutoZoomSpeedDigit(digit: number): number {
  return Math.max(1, Math.min(9, Math.floor(digit)));
}

export default function GameOfLifeExperience() {
  const pathname = usePathname();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<import("./game-of-life/renderer").Renderer | null>(
    null,
  );
  const universeRef = useRef<import("./game-of-life/universe").Universe | null>(
    null,
  );
  const animationRef = useRef<number>(0);
  const speedRef = useRef(DEFAULT_SPEED);
  const lastStepTimeRef = useRef<number | null>(null);
  const panModeRef = useRef<"none" | "drag">("none");
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const touchGestureRef = useRef<{
    mode: "none" | "pan" | "pinch";
    lastX: number;
    lastY: number;
    lastCenterX: number;
    lastCenterY: number;
    lastDistance: number;
  }>({
    mode: "none",
    lastX: 0,
    lastY: 0,
    lastCenterX: 0,
    lastCenterY: 0,
    lastDistance: 0,
  });
  const [loaded, setLoaded] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [bgNavMode, setBgNavMode] = useState(true);
  const [autoZoomEnabled, setAutoZoomEnabled] = useState(true);
  const [autoZoomSpeedDigit, setAutoZoomSpeedDigit] = useState(3);
  const autoZoomSpeedDigitRef = useRef(3);
  const [speedDigit, setSpeedDigit] = useState(3);
  const speedDigitRef = useRef(3);
  const [manualPaused, setManualPaused] = useState(false);
  const [clearBgMode, setClearBgMode] = useState(false);
  const prevPathRef = useRef<string | null>(null);
  const [prefsHydrated, setPrefsHydrated] = useState(false);
  const routeIsDemoDetail = Boolean(pathname && /^\/demos\/.+/.test(pathname));
  const animationPaused = manualPaused;

  const applySpeedDigit = (digit: number) => {
    const clamped = clampSpeedDigit(digit);
    const value = sliderFromDigitKey(String(clamped));
    if (value === null) return;
    speedRef.current = value;
    setSpeedDigit(clamped);
  };

  const applyAutoZoomSpeedDigit = (digit: number) => {
    setAutoZoomSpeedDigit(clampAutoZoomSpeedDigit(digit));
  };

  useEffect(() => {
    speedDigitRef.current = speedDigit;
  }, [speedDigit]);

  useEffect(() => {
    autoZoomSpeedDigitRef.current = autoZoomSpeedDigit;
  }, [autoZoomSpeedDigit]);

  // Load data and initialize (lazy-reinitialize when clear mode is turned off).
  useEffect(() => {
    let cancelled = false;
    let localRenderer: import("./game-of-life/renderer").Renderer | null = null;

    const disposeScene = () => {
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
      universeRef.current = null;
      lastStepTimeRef.current = null;
    };

    if (clearBgMode) {
      disposeScene();
      setLoaded(false);
      setInitError(null);
      return () => {
        cancelled = true;
      };
    }

    async function init() {
      try {
        const canvas = canvasRef.current;
        if (!canvas) return;

        disposeScene();
        setInitError(null);
        setLoaded(false);
        // Let the first frame paint before heavy decode work starts.
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        });
        if (cancelled) return;

        const [
          { loadAllData },
          { Decoder },
          { Sampler },
          { Universe },
          { Renderer },
        ] = await Promise.all([
          import("./game-of-life/png-loader"),
          import("./game-of-life/decoder"),
          import("./game-of-life/sampler"),
          import("./game-of-life/universe"),
          import("./game-of-life/renderer"),
        ]);

        const data = await loadAllData("/game-of-life");
        if (cancelled) return;

        const decoder = new Decoder();
        decoder.decodeGraph(data.graph);
        decoder.decodeAnim(data.anim);
        decoder.decodeLocation(data.loc);

        const sampler = new Sampler(decoder.graph, decoder.frames);
        const displaySize = getCanvasDisplaySize(canvas);
        const pixelSize = getCanvasPixelSize(canvas);
        canvas.width = pixelSize.width;
        canvas.height = pixelSize.height;

        const aspect = displaySize.width / displaySize.height;
        const universe = new Universe(sampler, aspect);
        universeRef.current = universe;

        // Keep camera normalization in render-pixel space, matching renderer.
        universe.scaleCamera(pixelSize.width / 8);
        universe.normalizeZoom(pixelSize.width);

        const renderer = new Renderer(canvas, decoder.graph, decoder.frames);
        localRenderer = renderer;
        rendererRef.current = renderer;

        setLoaded(true);
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error ? error.message : "Failed to initialize";
          setInitError(message);
          console.error("[life-bg] init failed:", error);
        }
      }
    }

    init();
    return () => {
      cancelled = true;
      if (localRenderer) {
        localRenderer.dispose();
        if (rendererRef.current === localRenderer) {
          rendererRef.current = null;
        }
      }
      universeRef.current = null;
      lastStepTimeRef.current = null;
    };
  }, [clearBgMode]);

  // Render loop
  useEffect(() => {
    if (!loaded || initError) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    let isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onSchemeChange = (e: MediaQueryListEvent) => {
      isDark = e.matches;
    };
    mq.addEventListener("change", onSchemeChange);

    const render = () => {
      const renderer = rendererRef.current;
      const universe = universeRef.current;
      if (!renderer || !universe) {
        animationRef.current = requestAnimationFrame(render);
        return;
      }

      // Resize canvas to match display size
      const pixelSize = getCanvasPixelSize(canvas);
      if (
        canvas.width !== pixelSize.width ||
        canvas.height !== pixelSize.height
      ) {
        canvas.width = pixelSize.width;
        canvas.height = pixelSize.height;
      }

      const now = performance.now();
      const prev = lastStepTimeRef.current;
      lastStepTimeRef.current = now;
      const frameScale =
        prev === null
          ? 1
          : Math.max(0, Math.min(4, (now - prev) / TARGET_FRAME_MS));

      if (!animationPaused && !clearBgMode) {
        const speed = speedFromSlider(speedRef.current);
        universe.step(speed * frameScale);
      }
      if (!animationPaused && !clearBgMode && autoZoomEnabled) {
        // Roughly 2x faster than the old scale at each step (especially around level 3).
        const autoZoomScaleTable = [0, 0.9997, 0.999, 0.9984, 0.9978, 0.9972, 0.9966, 0.996, 0.9954, 0.9948];
        const baseScale = autoZoomScaleTable[autoZoomSpeedDigitRef.current] ?? 0.9992;
        const gentleScale = Math.pow(baseScale, frameScale);
        universe.scaleCamera(gentleScale);
        universe.normalizeZoom(getCanvasPixelSize(canvas).width);
      }
      if (!clearBgMode) {
        renderer.render(universe, isDark);
      }

      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationRef.current);
      lastStepTimeRef.current = null;
      mq.removeEventListener("change", onSchemeChange);
    };
  }, [loaded, initError, autoZoomEnabled, animationPaused, clearBgMode]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(BG_PREFS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<{
          bgNavMode: boolean;
          autoZoomEnabled: boolean;
          autoZoomSpeedDigit: number;
          speedDigit: number;
          manualPaused: boolean;
          clearBgMode: boolean;
          showHelp: boolean;
        }>;

        if (typeof parsed.bgNavMode === "boolean") setBgNavMode(parsed.bgNavMode);
        if (typeof parsed.autoZoomEnabled === "boolean") {
          setAutoZoomEnabled(parsed.autoZoomEnabled);
        }
        if (typeof parsed.autoZoomSpeedDigit === "number") applyAutoZoomSpeedDigit(parsed.autoZoomSpeedDigit);
        if (typeof parsed.speedDigit === "number") applySpeedDigit(parsed.speedDigit);
        if (typeof parsed.manualPaused === "boolean") setManualPaused(parsed.manualPaused);
        // Keep simulation visible in standalone page regardless of older prefs.
        setClearBgMode(false);
        if (typeof parsed.showHelp === "boolean") setShowHelp(parsed.showHelp);
      }
    } catch (error) {
      console.warn("[life-bg] failed to restore settings:", error);
    } finally {
      setClearBgMode(false);
      setPrefsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!prefsHydrated) return;
    const payload = {
      bgNavMode,
      autoZoomEnabled,
      autoZoomSpeedDigit,
      speedDigit,
      manualPaused,
      clearBgMode,
      showHelp,
    };
    localStorage.setItem(BG_PREFS_KEY, JSON.stringify(payload));
  }, [
    prefsHydrated,
    bgNavMode,
    autoZoomEnabled,
    autoZoomSpeedDigit,
    speedDigit,
    manualPaused,
    clearBgMode,
    showHelp,
  ]);

  // Background navigation mode:
  // - Trackpad pinch: zoom
  // - Trackpad scroll: pan
  // - Mouse wheel: zoom
  // - Mouse drag (left/right): pan
  useEffect(() => {
    if (!loaded || initError) return;

    const stopAutoZoom = () => {
      setAutoZoomEnabled((prev) => (prev ? false : prev));
    };

    const applyZoomAt = (scale: number, clientX: number, clientY: number) => {
      const universe = universeRef.current;
      const canvas = canvasRef.current;
      if (!universe || !canvas) return;

      const safeScale = Math.max(0.2, Math.min(5, scale));
      const rect = canvas.getBoundingClientRect();
      const centerX = rect.left + rect.width * 0.5;
      const centerY = rect.top + rect.height * 0.5;
      const scaleVelocity = safeScale - 1;
      const dx = (clientX - centerX) * scaleVelocity;
      const dy = (clientY - centerY) * scaleVelocity;

      universe.translateCamera(-dx / rect.width, -dy / rect.height);
      universe.scaleCamera(1 + scaleVelocity);
      universe.normalizeZoom(getCanvasPixelSize(canvas).width);
    };

    const endPan = () => {
      panModeRef.current = "none";
      document.body.style.cursor = "";
    };

    const endTouchGesture = () => {
      touchGestureRef.current.mode = "none";
      touchGestureRef.current.lastDistance = 0;
    };

    const getTouchCenter = (touches: TouchList) => {
      const a = touches[0];
      const b = touches[1];
      return {
        x: (a.clientX + b.clientX) / 2,
        y: (a.clientY + b.clientY) / 2,
      };
    };

    const getTouchDistance = (touches: TouchList) => {
      const a = touches[0];
      const b = touches[1];
      return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (!bgNavMode) return;
      if (isInteractiveElement(e.target)) return;
      if (e.button !== 0 && e.button !== 2) return;

      panModeRef.current = "drag";
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      document.body.style.cursor = "grabbing";
      stopAutoZoom();
      e.preventDefault();
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (panModeRef.current === "none") return;

      const universe = universeRef.current;
      const canvas = canvasRef.current;
      if (!universe || !canvas) return;

      const dx = e.clientX - lastMouseRef.current.x;
      const dy = e.clientY - lastMouseRef.current.y;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      const displaySize = getCanvasDisplaySize(canvas);

      universe.translateCamera(
        -dx / displaySize.width,
        -dy / displaySize.height,
      );
      stopAutoZoom();
      e.preventDefault();
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0 || e.button === 2) endPan();
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (!bgNavMode) return;
      if (isInteractiveElement(e.target)) return;

      if (e.touches.length === 1) {
        const touch = e.touches[0];
        touchGestureRef.current.mode = "pan";
        touchGestureRef.current.lastX = touch.clientX;
        touchGestureRef.current.lastY = touch.clientY;
        stopAutoZoom();
        e.preventDefault();
        return;
      }

      if (e.touches.length >= 2) {
        const center = getTouchCenter(e.touches);
        touchGestureRef.current.mode = "pinch";
        touchGestureRef.current.lastCenterX = center.x;
        touchGestureRef.current.lastCenterY = center.y;
        touchGestureRef.current.lastDistance = getTouchDistance(e.touches);
        stopAutoZoom();
        e.preventDefault();
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!bgNavMode) return;

      const universe = universeRef.current;
      const canvas = canvasRef.current;
      if (!universe || !canvas) return;

      const gesture = touchGestureRef.current;
      if (gesture.mode === "none") return;

      if (gesture.mode === "pan" && e.touches.length === 1) {
        const touch = e.touches[0];
        const dx = touch.clientX - gesture.lastX;
        const dy = touch.clientY - gesture.lastY;
        gesture.lastX = touch.clientX;
        gesture.lastY = touch.clientY;

        const displaySize = getCanvasDisplaySize(canvas);
        universe.translateCamera(-dx / displaySize.width, -dy / displaySize.height);
        stopAutoZoom();
        e.preventDefault();
        return;
      }

      if (e.touches.length >= 2) {
        const center = getTouchCenter(e.touches);
        const distance = getTouchDistance(e.touches);
        const prevDistance = gesture.lastDistance || distance;
        const ratio = prevDistance / Math.max(1, distance);

        applyZoomAt(ratio, center.x, center.y);

        const displaySize = getCanvasDisplaySize(canvas);
        const centerDx = center.x - gesture.lastCenterX;
        const centerDy = center.y - gesture.lastCenterY;
        universe.translateCamera(-centerDx / displaySize.width, -centerDy / displaySize.height);

        gesture.mode = "pinch";
        gesture.lastCenterX = center.x;
        gesture.lastCenterY = center.y;
        gesture.lastDistance = distance;
        stopAutoZoom();
        e.preventDefault();
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        touchGestureRef.current.mode = "pan";
        touchGestureRef.current.lastX = touch.clientX;
        touchGestureRef.current.lastY = touch.clientY;
        touchGestureRef.current.lastDistance = 0;
        return;
      }
      if (e.touches.length >= 2) {
        const center = getTouchCenter(e.touches);
        touchGestureRef.current.mode = "pinch";
        touchGestureRef.current.lastCenterX = center.x;
        touchGestureRef.current.lastCenterY = center.y;
        touchGestureRef.current.lastDistance = getTouchDistance(e.touches);
        return;
      }
      endTouchGesture();
    };

    const handleContextMenu = (e: MouseEvent) => {
      if (panModeRef.current === "drag" || (bgNavMode && !isInteractiveElement(e.target))) {
        e.preventDefault();
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (!bgNavMode) return;
      if (isInteractiveElement(e.target)) return;

      const universe = universeRef.current;
      const canvas = canvasRef.current;
      if (!universe || !canvas) return;

      e.preventDefault();
      stopAutoZoom();

      let dy = e.deltaY;
      if (e.deltaMode === 1) {
        dy *= 40;
      }
      if (e.deltaMode === 2) {
        dy *= 800;
      }

      if (e.ctrlKey) {
        // Browser-native expectation:
        // pinch out => zoom in, pinch in => zoom out.
        const delta = dy * 0.01;
        const scale = Math.pow(2, delta);
        applyZoomAt(scale, e.clientX, e.clientY);
        return;
      }

      // Wheel/trackpad scroll: zoom only. Pan is click+drag.
      const delta = -dy * 0.012;
      const scale = Math.pow(2, delta);
      applyZoomAt(scale, e.clientX, e.clientY);
    };

    // Safari macOS trackpad pinch fallback.
    let lastGestureScale = 1;
    const handleGestureStart = (event: Event) => {
      const e = event as Event & {
        scale?: number;
      };
      lastGestureScale = e.scale ?? 1;
      stopAutoZoom();
      if (!bgNavMode) return;
      if (isInteractiveElement(event.target)) return;
      event.preventDefault();
    };

    const handleGestureChange = (event: Event) => {
      if (!bgNavMode) return;
      if (isInteractiveElement(event.target)) return;

      const e = event as Event & {
        scale?: number;
        clientX?: number;
        clientY?: number;
      };
      const currentScale = e.scale ?? 1;
      // Safari gesture scale > 1 means fingers move apart (pinch out).
      // Universe.scaleCamera needs <1 for zoom-in, so invert the ratio.
      const ratio = lastGestureScale / currentScale;
      lastGestureScale = currentScale;
      applyZoomAt(
        ratio,
        e.clientX ?? window.innerWidth * 0.5,
        e.clientY ?? window.innerHeight * 0.5,
      );
      stopAutoZoom();
      event.preventDefault();
    };

    const handleGestureEnd = () => {
      lastGestureScale = 1;
    };

    window.addEventListener("mousedown", handleMouseDown, { passive: false });
    window.addEventListener("mousemove", handleMouseMove, { passive: false });
    window.addEventListener("mouseup", handleMouseUp, { passive: false });
    window.addEventListener("touchstart", handleTouchStart, { passive: false });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: false });
    window.addEventListener("touchcancel", handleTouchEnd, { passive: false });
    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("gesturestart", handleGestureStart, {
      passive: false,
    });
    window.addEventListener("gesturechange", handleGestureChange, {
      passive: false,
    });
    window.addEventListener("gestureend", handleGestureEnd);
    window.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("blur", endPan);

    return () => {
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("gesturestart", handleGestureStart);
      window.removeEventListener("gesturechange", handleGestureChange);
      window.removeEventListener("gestureend", handleGestureEnd);
      window.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("blur", endPan);
      endPan();
      endTouchGesture();
    };
  }, [loaded, initError, bgNavMode]);

  // Auto-pause when entering a demo detail route, but allow manual override afterward.
  useEffect(() => {
    if (!pathname) return;
    const was = prevPathRef.current;
    const isDemoDetail = /^\/demos\/.+/.test(pathname);
    const wasDemoDetail = was ? /^\/demos\/.+/.test(was) : false;
    if (isDemoDetail && !wasDemoDetail) {
      setManualPaused(true);
    }
    prevPathRef.current = pathname;
  }, [pathname]);

  // Cleanup renderer on unmount
  useEffect(() => {
    return () => {
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
      universeRef.current = null;
      lastStepTimeRef.current = null;
    };
  }, []);

  // Reduced motion
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      speedRef.current = 0;
    }
  }, []);

  // Keyboard speed controls: 0 toggles pause/play, 1..9 sets speed levels.
  useEffect(() => {
    const blurNonTextActiveElement = () => {
      const active = document.activeElement as HTMLElement | null;
      if (!active) return;
      const tag = active.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || active.isContentEditable) {
        return;
      }
      active.blur();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === "?" || e.key.toLowerCase() === "h") {
        setShowHelp((prev) => !prev);
        e.preventDefault();
        return;
      }

      if (e.key === "0") {
        blurNonTextActiveElement();
        setManualPaused((prev) => !prev);
        e.preventDefault();
        return;
      }

      const value = sliderFromDigitKey(e.key);
      if (value === null) return;

      blurNonTextActiveElement();
      speedRef.current = value;
      setSpeedDigit(Number(e.key));
      setManualPaused(false);
      e.preventDefault();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const handleControl = (event: Event) => {
      const e = event as CustomEvent<{ action?: string }>;
      const action = e.detail?.action;
      if (!action) return;
      if (action.startsWith("set-speed:")) {
        applySpeedDigit(Number(action.split(":")[1] ?? "3"));
        return;
      }
      if (action.startsWith("set-autozoom-speed:")) {
        applyAutoZoomSpeedDigit(Number(action.split(":")[1] ?? "3"));
        return;
      }
      if (action === "set-bg-nav:on") {
        setBgNavMode(true);
        return;
      }
      if (action === "set-bg-nav:off") {
        setBgNavMode(false);
        return;
      }
      if (action === "set-autozoom:on") {
        setAutoZoomEnabled(true);
        return;
      }
      if (action === "set-autozoom:off") {
        setAutoZoomEnabled(false);
        return;
      }
      if (action === "set-pause:on") {
        setManualPaused(true);
        return;
      }
      if (action === "set-pause:off") {
        setManualPaused(false);
        return;
      }
      if (action === "toggle-bg-nav") {
        if (clearBgMode) return;
        setBgNavMode((v) => !v);
      }
      if (action === "toggle-auto-zoom") setAutoZoomEnabled((v) => !v);
      if (action === "speed-up") applySpeedDigit(speedDigit + 1);
      if (action === "speed-down") applySpeedDigit(speedDigit - 1);
      if (action === "autozoom-speed-up") applyAutoZoomSpeedDigit(autoZoomSpeedDigit + 1);
      if (action === "autozoom-speed-down") applyAutoZoomSpeedDigit(autoZoomSpeedDigit - 1);
      if (action === "toggle-bg-clear") return;
      if (action === "toggle-animation-pause") {
        if (clearBgMode) return;
        setManualPaused((v) => !v);
      }
      if (action === "toggle-help") setShowHelp((v) => !v);
    };

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isInteractiveElement(e.target)) return;
      if (e.key.length !== 1 || !/[a-z]/i.test(e.key)) return;
    };

    window.addEventListener("bg-control", handleControl);
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      window.removeEventListener("bg-control", handleControl);
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [clearBgMode, speedDigit, autoZoomSpeedDigit]);

  useEffect(() => {
    const focusOn = showHelp;
    document.body.dataset.bgFocus = focusOn ? "on" : "off";
    document.body.dataset.bgNav = bgNavMode ? "on" : "off";
    document.body.dataset.bgAutozoom = autoZoomEnabled ? "on" : "off";
    document.body.dataset.bgAutozoomSpeed = String(autoZoomSpeedDigit);
    document.body.dataset.bgPaused = animationPaused ? "on" : "off";
    document.body.dataset.bgClear = clearBgMode ? "on" : "off";
    document.body.dataset.bgSpeed = String(speedDigit);
    window.dispatchEvent(
      new CustomEvent("bg-state", {
        detail: {
          bgNavMode,
          autoZoomEnabled,
          autoZoomSpeedDigit,
          speedDigit,
          animationPaused,
          clearBgMode,
          showHelp,
          routeIsDemoDetail,
        },
      }),
    );
    return () => {
      delete document.body.dataset.bgFocus;
      delete document.body.dataset.bgNav;
      delete document.body.dataset.bgAutozoom;
      delete document.body.dataset.bgAutozoomSpeed;
      delete document.body.dataset.bgPaused;
      delete document.body.dataset.bgClear;
      delete document.body.dataset.bgSpeed;
    };
  }, [
    showHelp,
    bgNavMode,
    autoZoomEnabled,
    autoZoomSpeedDigit,
    speedDigit,
    animationPaused,
    clearBgMode,
    routeIsDemoDetail,
  ]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-0"
        style={{ width: "100%", height: "100%", opacity: clearBgMode ? 0 : 1 }}
      />

      {/* Loading indicator */}
      {!clearBgMode && !loaded && !initError && (
        <div className="fixed inset-0 z-[5] flex items-center justify-center pointer-events-none">
          <div className="inline-flex items-center gap-3 rounded-lg border border-neutral-800/70 bg-neutral-950/72 px-4 py-2 text-sm font-medium tracking-wide text-neutral-50 shadow-lg backdrop-blur-[6px]">
            <span className="w-4 h-4 border-2 border-neutral-200/80 border-t-transparent rounded-full animate-spin" />
            <span>Initializing Life...</span>
          </div>
        </div>
      )}

      {/* Init error indicator */}
      {initError && (
        <div className="fixed bottom-4 left-4 z-[60] text-[10px] text-neutral-700 dark:text-neutral-300 bg-white/88 dark:bg-neutral-900/80 border border-neutral-300 dark:border-neutral-700 rounded px-2 py-1 shadow-sm backdrop-blur pointer-events-none">
          Life background unavailable: {initError}
        </div>
      )}

      {loaded && !initError && showHelp && (
        <div className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div
            data-bg-nav-ignore
            className="w-full max-w-md rounded-lg border border-neutral-300/70 dark:border-neutral-700/70 bg-white/94 dark:bg-neutral-900/94 shadow-2xl"
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-300/60 dark:border-neutral-700/60">
              <div className="text-xs font-mono text-neutral-700 dark:text-neutral-200">
                bg-help
              </div>
              <button
                type="button"
                onClick={() => setShowHelp(false)}
                className="w-6 h-6 rounded border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                aria-label="Close help"
              >
                ×
              </button>
            </div>
            <div className="px-3 py-3 text-[11px] leading-relaxed text-neutral-700 dark:text-neutral-200 space-y-1">
              <div>Mode: BG Nav {bgNavMode ? "On" : "Off"}</div>
              <div>Trackpad: scroll/pinch = zoom</div>
              <div>Pan: click + drag</div>
              <div>Auto zoom starts On and stops when you navigate manually</div>
              <div>Open site terminal with Cmd/Ctrl+Shift+P</div>
              <div>Speed: keys 1-9, key 0 toggles pause/play</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
