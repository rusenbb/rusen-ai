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

type CommandResult = {
  ok: boolean;
  message: string;
};

function clampSpeedDigit(digit: number): number {
  return Math.max(0, Math.min(9, Math.floor(digit)));
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export default function DataBackground() {
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
  const terminalInputRef = useRef<HTMLInputElement>(null);
  const cmdSequenceRef = useRef("");
  const cmdSequenceTimeRef = useRef(0);

  const panModeRef = useRef<"none" | "drag">("none");
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioNodesRef = useRef<{
    master: GainNode;
    toneGain: GainNode;
    bassGain: GainNode;
    oscLead: OscillatorNode;
    oscBass: OscillatorNode;
  } | null>(null);

  const [loaded, setLoaded] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [bgNavMode, setBgNavMode] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [soundVolume, setSoundVolume] = useState(35);
  const [autoZoomEnabled, setAutoZoomEnabled] = useState(true);
  const [speedDigit, setSpeedDigit] = useState(3);
  const speedDigitRef = useRef(3);
  const [manualPaused, setManualPaused] = useState(false);
  const [clearBgMode, setClearBgMode] = useState(false);
  const prevPathRef = useRef<string | null>(null);
  const [showTerminal, setShowTerminal] = useState(false);
  const [paletteEverOpened, setPaletteEverOpened] = useState(true);
  const [platformIsMac, setPlatformIsMac] = useState(false);
  const [prefsHydrated, setPrefsHydrated] = useState(false);
  const [terminalInput, setTerminalInput] = useState("");
  const [terminalOutput, setTerminalOutput] = useState(
    "Type 'help' for available commands.",
  );
  const routeIsDemoDetail = Boolean(pathname && /^\/demos\/.+/.test(pathname));
  const animationPaused = manualPaused;

  const openTerminal = () => {
    setShowTerminal(true);
    setShowHint(false);
    if (!paletteEverOpened) {
      localStorage.setItem("bg.palette.opened", "1");
      setPaletteEverOpened(true);
    }
  };

  const applySpeedDigit = (digit: number) => {
    const clamped = clampSpeedDigit(digit);
    const value = sliderFromDigitKey(String(clamped));
    if (value === null) return;
    speedRef.current = value;
    setSpeedDigit(clamped);
  };

  const applySoundVolume = (value: number) => {
    setSoundVolume(clampPercent(value));
  };

  useEffect(() => {
    speedDigitRef.current = speedDigit;
  }, [speedDigit]);

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
        const gentleScale = Math.pow(0.9992, frameScale);
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
    const nav = navigator as Navigator & {
      userAgentData?: { platform?: string };
    };
    const platform = nav.userAgentData?.platform ?? navigator.platform ?? "";
    setPlatformIsMac(/mac|iphone|ipad|ipod/i.test(platform));
    const opened = localStorage.getItem("bg.palette.opened") === "1";
    setPaletteEverOpened(opened);

    try {
      const raw = localStorage.getItem(BG_PREFS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<{
          bgNavMode: boolean;
          autoZoomEnabled: boolean;
          soundEnabled: boolean;
          soundVolume: number;
          speedDigit: number;
          manualPaused: boolean;
          clearBgMode: boolean;
          showHelp: boolean;
        }>;

        if (typeof parsed.bgNavMode === "boolean") setBgNavMode(parsed.bgNavMode);
        if (typeof parsed.autoZoomEnabled === "boolean") {
          setAutoZoomEnabled(parsed.autoZoomEnabled);
        }
        if (typeof parsed.soundEnabled === "boolean") setSoundEnabled(parsed.soundEnabled);
        if (typeof parsed.soundVolume === "number") applySoundVolume(parsed.soundVolume);
        if (typeof parsed.speedDigit === "number") applySpeedDigit(parsed.speedDigit);
        if (typeof parsed.manualPaused === "boolean") setManualPaused(parsed.manualPaused);
        if (typeof parsed.clearBgMode === "boolean") setClearBgMode(parsed.clearBgMode);
        if (typeof parsed.showHelp === "boolean") setShowHelp(parsed.showHelp);
      }
    } catch (error) {
      console.warn("[life-bg] failed to restore settings:", error);
    } finally {
      setPrefsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!prefsHydrated) return;
    const payload = {
      bgNavMode,
      autoZoomEnabled,
      soundEnabled,
      soundVolume,
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
    soundEnabled,
    soundVolume,
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

    const handleMouseDown = (e: MouseEvent) => {
      if (showTerminal) return;
      if (!bgNavMode) return;
      if (isInteractiveElement(e.target)) return;
      if (e.button !== 0 && e.button !== 2) return;

      panModeRef.current = "drag";
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      document.body.style.cursor = "grabbing";
      setShowHint(false);
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

    const handleContextMenu = (e: MouseEvent) => {
      if (panModeRef.current === "drag" || (bgNavMode && !isInteractiveElement(e.target))) {
        e.preventDefault();
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (showTerminal) return;
      if (!bgNavMode) return;
      if (isInteractiveElement(e.target)) return;

      const universe = universeRef.current;
      const canvas = canvasRef.current;
      if (!universe || !canvas) return;

      e.preventDefault();
      setShowHint(false);
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
      setShowHint(false);
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
      setShowHint(false);
      stopAutoZoom();
      event.preventDefault();
    };

    const handleGestureEnd = () => {
      lastGestureScale = 1;
    };

    window.addEventListener("mousedown", handleMouseDown, { passive: false });
    window.addEventListener("mousemove", handleMouseMove, { passive: false });
    window.addEventListener("mouseup", handleMouseUp, { passive: false });
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
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("gesturestart", handleGestureStart);
      window.removeEventListener("gesturechange", handleGestureChange);
      window.removeEventListener("gestureend", handleGestureEnd);
      window.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("blur", endPan);
      endPan();
    };
  }, [loaded, initError, bgNavMode, showTerminal]);

  // Auto-pause when entering a demo detail route, but allow manual override afterward.
  useEffect(() => {
    if (!pathname) return;
    const was = prevPathRef.current;
    const isDemoDetail = /^\/demos\/.+/.test(pathname);
    const wasDemoDetail = was ? /^\/demos\/.+/.test(was) : false;
    if (isDemoDetail && !wasDemoDetail) {
      setManualPaused(true);
      setSoundEnabled(false);
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
        setShowHint(false);
        e.preventDefault();
        return;
      }

      if (e.key === "0") {
        blurNonTextActiveElement();
        setManualPaused((prev) => !prev);
        setShowHint(false);
        e.preventDefault();
        return;
      }

      const value = sliderFromDigitKey(e.key);
      if (value === null) return;

      blurNonTextActiveElement();
      speedRef.current = value;
      setSpeedDigit(Number(e.key));
      setManualPaused(false);
      setShowHint(false);
      e.preventDefault();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Retro bip-bop procedural soundtrack
  useEffect(() => {
    let sequenceTimer: number | null = null;
    let disposed = false;

    const advanceSeed = (seed: number): number => {
      return (seed * 1664525 + 1013904223) >>> 0;
    };

    const disposeAudio = () => {
      if (sequenceTimer !== null) {
        window.clearInterval(sequenceTimer);
        sequenceTimer = null;
      }
      const nodes = audioNodesRef.current;
      if (nodes) {
        nodes.oscLead.stop();
        nodes.oscBass.stop();
      }
      audioNodesRef.current = null;
      if (audioContextRef.current) {
        void audioContextRef.current.close();
      }
      audioContextRef.current = null;
    };

    if (clearBgMode) {
      disposeAudio();
      return;
    }

    const createAudio = () => {
      if (audioContextRef.current && audioNodesRef.current) return;
      const Ctx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;

      const ctx = new Ctx();
      const master = ctx.createGain();
      const toneGain = ctx.createGain();
      const bassGain = ctx.createGain();
      const oscLead = ctx.createOscillator();
      const oscBass = ctx.createOscillator();
      const lowpass = ctx.createBiquadFilter();
      const hp = ctx.createBiquadFilter();

      lowpass.type = "lowpass";
      lowpass.frequency.value = 2800;
      lowpass.Q.value = 0.6;
      hp.type = "highpass";
      hp.frequency.value = 110;
      hp.Q.value = 0.35;

      oscLead.type = "square";
      oscLead.frequency.value = 440;
      oscBass.type = "triangle";
      oscBass.frequency.value = 110;

      toneGain.gain.value = 0;
      bassGain.gain.value = 0;
      master.gain.value = soundEnabled ? (soundVolume / 100) * 0.085 : 0;

      oscLead.connect(toneGain);
      oscBass.connect(bassGain);
      toneGain.connect(lowpass);
      bassGain.connect(lowpass);
      lowpass.connect(hp);
      hp.connect(master);
      master.connect(ctx.destination);

      oscLead.start();
      oscBass.start();

      let seed = (Date.now() >>> 0) ^ 0x9e3779b9;
      const scales: number[][] = [
        [0, 3, 5, 7, 10], // minor pentatonic
        [0, 2, 4, 7, 9], // major pentatonic
      ];
      const basePitches = [110, 123.47, 130.81, 146.83];
      const leadPattern = [0, 2, 4, 7, 4, 2, 0, 7];
      let step = 0;
      let currentScale = scales[0];

      const scheduleNext = () => {
        if (disposed) return;
        seed = advanceSeed(seed);
        const randA = seed / 0xffffffff;
        seed = advanceSeed(seed);
        const randB = seed / 0xffffffff;
        seed = advanceSeed(seed);
        const randC = seed / 0xffffffff;

        const speedNorm = speedDigitRef.current / 9;
        if (randA > 0.82) {
          currentScale =
            scales[Math.floor(randA * scales.length)] ??
            scales[0];
        }
        const base = basePitches[Math.floor(randB * basePitches.length)] ?? 130.81;
        const degree = currentScale[leadPattern[step % leadPattern.length] % currentScale.length] ?? 0;
        const targetLead = base * Math.pow(2, (degree + (randC > 0.9 ? 12 : 0)) / 12);
        const targetBass = base * Math.pow(2, -12 / 12);
        const now = ctx.currentTime;
        const pulseLen = 0.06 + speedNorm * 0.03;
        const bassPulseLen = 0.08 + speedNorm * 0.04;

        oscLead.frequency.setValueAtTime(targetLead, now);
        oscBass.frequency.setValueAtTime(targetBass, now);

        toneGain.gain.cancelScheduledValues(now);
        toneGain.gain.setValueAtTime(0.0001, now);
        toneGain.gain.linearRampToValueAtTime(0.12 + speedNorm * 0.06, now + 0.01);
        toneGain.gain.exponentialRampToValueAtTime(0.0001, now + pulseLen);

        bassGain.gain.cancelScheduledValues(now);
        bassGain.gain.setValueAtTime(0.0001, now);
        bassGain.gain.linearRampToValueAtTime(0.06 + speedNorm * 0.03, now + 0.015);
        bassGain.gain.exponentialRampToValueAtTime(0.0001, now + bassPulseLen);

        lowpass.frequency.setTargetAtTime(1800 + speedNorm * 1100 + randA * 250, now, 0.04);

        step += 1;
        const bpm = 92 + speedNorm * 52;
        const stepMs = Math.max(130, Math.round((60000 / bpm) / 2));
        sequenceTimer = window.setTimeout(scheduleNext, stepMs);
      };

      scheduleNext();

      audioContextRef.current = ctx;
      audioNodesRef.current = { master, toneGain, bassGain, oscLead, oscBass };
    };

    createAudio();

    const resumeAudio = () => {
      const ctx = audioContextRef.current;
      if (ctx && ctx.state === "suspended") {
        void ctx.resume();
      }
    };

    window.addEventListener("pointerdown", resumeAudio, { passive: true });
    window.addEventListener("keydown", resumeAudio, { passive: true });
    window.addEventListener("wheel", resumeAudio, { passive: true });

    return () => {
      disposed = true;
      window.removeEventListener("pointerdown", resumeAudio);
      window.removeEventListener("keydown", resumeAudio);
      window.removeEventListener("wheel", resumeAudio);
      disposeAudio();
    };
  }, [clearBgMode]);

  useEffect(() => {
    const nodes = audioNodesRef.current;
    const ctx = audioContextRef.current;
    if (!nodes || !ctx) return;
    const now = ctx.currentTime;
    const level = (soundVolume / 100) * 0.085;
    nodes.master.gain.cancelScheduledValues(now);
    nodes.master.gain.setTargetAtTime(soundEnabled ? level : 0.0, now, 0.35);
  }, [soundEnabled, soundVolume]);

  // Command terminal
  useEffect(() => {
    if (!showTerminal) return;
    const id = window.setTimeout(() => terminalInputRef.current?.focus(), 10);
    return () => window.clearTimeout(id);
  }, [showTerminal]);

  const runTerminalCommand = (raw: string): CommandResult => {
    const cmd = raw.trim().toLowerCase();
    if (!cmd) return { ok: false, message: "Empty command." };
    if (cmd === "help") {
      return {
        ok: true,
        message:
          "Commands: help, status, bg on/off, sound|music on/off, volume 0..100, autozoom on/off, clear on/off, speed 0..9, close",
      };
    }
    if (cmd === "status") {
      return {
        ok: true,
        message: `bg:${bgNavMode ? "on" : "off"} music:${soundEnabled ? "on" : "off"} vol:${soundVolume}% autozoom:${autoZoomEnabled ? "on" : "off"} clear:${clearBgMode ? "on" : "off"} speed:${speedDigit}`,
      };
    }
    if (cmd === "bg on") {
      setBgNavMode(true);
      return { ok: true, message: "Background navigation enabled." };
    }
    if (cmd === "bg off") {
      setBgNavMode(false);
      return { ok: true, message: "Background navigation disabled." };
    }
    if (cmd === "sound on") {
      setSoundEnabled(true);
      return { ok: true, message: "Ambient sound enabled." };
    }
    if (cmd === "sound off") {
      setSoundEnabled(false);
      return { ok: true, message: "Ambient sound disabled." };
    }
    if (cmd === "music on") {
      setSoundEnabled(true);
      return { ok: true, message: "Background music enabled." };
    }
    if (cmd === "music off") {
      setSoundEnabled(false);
      return { ok: true, message: "Background music disabled." };
    }
    const volumeMatch = cmd.match(/^volume\s+(\d{1,3})$/);
    if (volumeMatch) {
      applySoundVolume(Number(volumeMatch[1]));
      return { ok: true, message: `Volume set to ${clampPercent(Number(volumeMatch[1]))}%.` };
    }
    if (cmd === "autozoom on") {
      setAutoZoomEnabled(true);
      return { ok: true, message: "Auto zoom enabled." };
    }
    if (cmd === "autozoom off") {
      setAutoZoomEnabled(false);
      return { ok: true, message: "Auto zoom disabled." };
    }
    if (cmd === "clear on") {
      setClearBgMode(true);
      setManualPaused(true);
      setBgNavMode(false);
      return { ok: true, message: "Background cleared to black." };
    }
    if (cmd === "clear off") {
      setClearBgMode(false);
      setManualPaused(false);
      setBgNavMode(true);
      return { ok: true, message: "Game of Life background restored." };
    }
    if (cmd === "close" || cmd === "exit") {
      setShowTerminal(false);
      return { ok: true, message: "Closed." };
    }

    const speedMatch = cmd.match(/^speed\s+([0-9])$/);
    if (speedMatch) {
      applySpeedDigit(Number(speedMatch[1]));
      return { ok: true, message: `Speed set to ${speedMatch[1]}.` };
    }

    return { ok: false, message: `Unknown command: ${raw}` };
  };

  useEffect(() => {
    const handleControl = (event: Event) => {
      const e = event as CustomEvent<{ action?: string }>;
      const action = e.detail?.action;
      if (!action) return;
      if (action === "toggle-bg-nav") {
        if (clearBgMode) return;
        setBgNavMode((v) => !v);
      }
      if (action === "toggle-auto-zoom") setAutoZoomEnabled((v) => !v);
      if (action === "toggle-sound") setSoundEnabled((v) => !v);
      if (action === "music-vol-up") applySoundVolume(soundVolume + 10);
      if (action === "music-vol-down") applySoundVolume(soundVolume - 10);
      if (action === "speed-up") applySpeedDigit(speedDigit + 1);
      if (action === "speed-down") applySpeedDigit(speedDigit - 1);
      if (action === "toggle-bg-clear") {
        setClearBgMode((v) => {
          const next = !v;
          if (next) {
            setManualPaused(true);
            setBgNavMode(false);
          } else {
            setManualPaused(false);
            setBgNavMode(true);
          }
          return next;
        });
      }
      if (action === "toggle-animation-pause") {
        if (clearBgMode) return;
        setManualPaused((v) => !v);
      }
      if (action === "toggle-help") setShowHelp((v) => !v);
      if (action === "open-terminal") openTerminal();
    };

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isPalette = (e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "p";
      if (isPalette) {
        openTerminal();
        e.preventDefault();
        return;
      }

      if (showTerminal) {
        if (e.key === "Escape") {
          setShowTerminal(false);
          e.preventDefault();
        }
        return;
      }

      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isInteractiveElement(e.target)) return;
      if (e.key.length !== 1 || !/[a-z]/i.test(e.key)) return;

      const now = performance.now();
      if (now - cmdSequenceTimeRef.current > 1200) {
        cmdSequenceRef.current = "";
      }
      cmdSequenceTimeRef.current = now;
      cmdSequenceRef.current = (cmdSequenceRef.current + e.key.toLowerCase()).slice(-3);
      if (cmdSequenceRef.current === "cmd") {
        openTerminal();
        cmdSequenceRef.current = "";
        e.preventDefault();
      }
    };

    window.addEventListener("bg-control", handleControl);
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      window.removeEventListener("bg-control", handleControl);
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [showTerminal, paletteEverOpened, clearBgMode, speedDigit, soundVolume]);

  useEffect(() => {
    const focusOn = showHelp || showTerminal;
    document.body.dataset.bgFocus = focusOn ? "on" : "off";
    document.body.dataset.bgNav = bgNavMode ? "on" : "off";
    document.body.dataset.bgAutozoom = autoZoomEnabled ? "on" : "off";
    document.body.dataset.bgSound = soundEnabled ? "on" : "off";
    document.body.dataset.bgVolume = String(soundVolume);
    document.body.dataset.bgPaused = animationPaused ? "on" : "off";
    document.body.dataset.bgClear = clearBgMode ? "on" : "off";
    document.body.dataset.bgSpeed = String(speedDigit);
    window.dispatchEvent(
      new CustomEvent("bg-state", {
        detail: {
          bgNavMode,
          autoZoomEnabled,
          soundEnabled,
          soundVolume,
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
      delete document.body.dataset.bgSound;
      delete document.body.dataset.bgVolume;
      delete document.body.dataset.bgPaused;
      delete document.body.dataset.bgClear;
      delete document.body.dataset.bgSpeed;
    };
  }, [
    showHelp,
    showTerminal,
    bgNavMode,
    autoZoomEnabled,
    soundEnabled,
    soundVolume,
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
          <div className="inline-flex items-center gap-3 rounded-lg border border-neutral-300/65 dark:border-neutral-600/70 bg-white/26 dark:bg-neutral-900/32 px-4 py-2 text-sm font-medium tracking-wide text-neutral-800 dark:text-neutral-100 backdrop-blur-[2px]">
            <span className="w-4 h-4 border-2 border-neutral-500/70 dark:border-neutral-300/70 border-t-transparent rounded-full animate-spin" />
            <span>Initializing Life...</span>
          </div>
        </div>
      )}

      {/* Init error indicator */}
      {initError && (
        <div className="fixed bottom-4 left-4 z-[60] text-[10px] text-neutral-500 dark:text-neutral-500 bg-white/70 dark:bg-neutral-900/70 border border-neutral-200 dark:border-neutral-800 rounded px-2 py-1 backdrop-blur pointer-events-none">
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
              <div>Terminal: type "cmd" or press Ctrl/Cmd+Shift+P</div>
              <div>Speed: keys 1-9, key 0 toggles pause/play</div>
            </div>
          </div>
        </div>
      )}

      {loaded && !initError && !showTerminal && !paletteEverOpened && (
        <div className="fixed top-16 right-4 z-[70] max-w-sm px-3 py-2 rounded-lg border border-neutral-300/70 dark:border-neutral-700/70 bg-white/90 dark:bg-neutral-900/90 text-xs text-neutral-700 dark:text-neutral-200 shadow-lg">
          Open Command Palette:
          {" "}
          <span className="font-mono">
            {platformIsMac ? "Cmd+Shift+P" : "Ctrl+Shift+P"}
          </span>
          {" "}
          or type <span className="font-mono">cmd</span>.
        </div>
      )}

      {showTerminal && (
        <div className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div
            data-bg-nav-ignore
            className="w-full max-w-2xl rounded-lg border border-neutral-300/70 dark:border-neutral-700/70 bg-white/90 dark:bg-neutral-900/90 shadow-2xl"
          >
            <div className="px-3 py-2 border-b border-neutral-300/60 dark:border-neutral-700/60 text-xs font-mono text-neutral-600 dark:text-neutral-300">
              bg-terminal
            </div>
            <div className="px-3 pt-3 text-xs font-mono text-neutral-700 dark:text-neutral-200">
              {terminalOutput}
            </div>
            <form
              className="p-3"
              onSubmit={(e) => {
                e.preventDefault();
                const res = runTerminalCommand(terminalInput);
                setTerminalOutput(res.message);
                setTerminalInput("");
              }}
            >
              <input
                ref={terminalInputRef}
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                placeholder="help"
                className="w-full rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-2 py-1.5 text-xs font-mono text-neutral-800 dark:text-neutral-100 outline-none focus:ring-1 focus:ring-neutral-500"
                data-bg-nav-ignore
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </form>
            <div className="px-3 pb-3 text-[10px] text-neutral-500 dark:text-neutral-400">
              Enter to run, Esc to close.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
