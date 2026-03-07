"use client";

import { useEffect, useRef, useState } from "react";

// Speed slider space retained for the Oimo speed mapping curve.
const DEFAULT_SPEED = 0.3;
const SPEED_COEFF = 16 / 0.7;
const TARGET_FRAME_MS = 1000 / 60;

function speedFromSlider(t: number): number {
  if (t < 0.01) return 0;
  const minStep = 1e-4;
  const base = Math.pow(2, (t - 0.3) * SPEED_COEFF);
  const correction =
    (minStep - Math.pow(2, -0.3 * SPEED_COEFF)) * (1 - Math.min(1, t / 0.3));
  return Math.max(0, base + correction);
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
  return {
    width: Math.max(1, Math.round(displayW)),
    height: Math.max(1, Math.round(displayH)),
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

function isLikelyTrackpadWheel(e: WheelEvent): boolean {
  if (e.deltaMode !== 0) return false;
  return Math.abs(e.deltaX) > 0 || Math.abs(e.deltaY) < 18;
}

type CommandResult = {
  ok: boolean;
  message: string;
};

export default function DataBackground() {
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
    bedGain: GainNode;
    oscA: OscillatorNode;
    oscB: OscillatorNode;
    lfo: OscillatorNode;
    lfoGain: GainNode;
  } | null>(null);

  const [loaded, setLoaded] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [bgNavMode, setBgNavMode] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoZoomEnabled, setAutoZoomEnabled] = useState(true);
  const [showTerminal, setShowTerminal] = useState(false);
  const [terminalInput, setTerminalInput] = useState("");
  const [terminalOutput, setTerminalOutput] = useState(
    "Type 'help' for available commands.",
  );

  // Load data and initialize
  useEffect(() => {
    let cancelled = false;
    let localRenderer: import("./game-of-life/renderer").Renderer | null = null;

    async function init() {
      try {
        const canvas = canvasRef.current;
        if (!canvas) return;

        rendererRef.current?.dispose();
        rendererRef.current = null;
        universeRef.current = null;
        lastStepTimeRef.current = null;
        setInitError(null);
        setLoaded(false);

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

        // Initial zoom — match original controller space (CSS pixels).
        universe.scaleCamera(displaySize.width / 8);
        universe.normalizeZoom(displaySize.width);

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
  }, []);

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

      const speed = speedFromSlider(speedRef.current);
      universe.step(speed * frameScale);
      if (autoZoomEnabled) {
        const displaySize = getCanvasDisplaySize(canvas);
        const gentleScale = Math.pow(0.9997, frameScale);
        universe.scaleCamera(gentleScale);
        universe.normalizeZoom(displaySize.width);
      }
      renderer.render(universe, isDark);

      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationRef.current);
      lastStepTimeRef.current = null;
      mq.removeEventListener("change", onSchemeChange);
    };
  }, [loaded, initError, autoZoomEnabled]);

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
      universe.normalizeZoom(rect.width);
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

      let dx = e.deltaX;
      let dy = e.deltaY;
      if (e.deltaMode === 1) {
        dx *= 40;
        dy *= 40;
      }
      if (e.deltaMode === 2) {
        dx *= 800;
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

      if (isLikelyTrackpadWheel(e)) {
        const displaySize = getCanvasDisplaySize(canvas);
        universe.translateCamera(dx / displaySize.width, dy / displaySize.height);
        return;
      }

      // Mouse wheel: zoom.
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

  // Hide hint after first few seconds.
  useEffect(() => {
    const timer = window.setTimeout(() => setShowHint(false), 8000);
    return () => window.clearTimeout(timer);
  }, []);

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

  // Keyboard speed controls: 0 pauses, 1..9 sets speed levels.
  useEffect(() => {
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

      const value = sliderFromDigitKey(e.key);
      if (value === null) return;

      speedRef.current = value;
      setShowHint(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Ambient sound bed
  useEffect(() => {
    const createAudio = () => {
      if (audioContextRef.current && audioNodesRef.current) return;
      const Ctx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;

      const ctx = new Ctx();
      const master = ctx.createGain();
      const bedGain = ctx.createGain();
      const oscA = ctx.createOscillator();
      const oscB = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const lowpass = ctx.createBiquadFilter();

      lowpass.type = "lowpass";
      lowpass.frequency.value = 900;
      lowpass.Q.value = 0.7;

      oscA.type = "sine";
      oscA.frequency.value = 96;
      oscB.type = "triangle";
      oscB.frequency.value = 144;
      lfo.type = "sine";
      lfo.frequency.value = 0.08;

      lfoGain.gain.value = 0.0035;
      bedGain.gain.value = 0;
      master.gain.value = 0.025;

      oscA.connect(bedGain);
      oscB.connect(bedGain);
      bedGain.connect(lowpass);
      lowpass.connect(master);
      master.connect(ctx.destination);

      lfo.connect(lfoGain);
      lfoGain.connect(bedGain.gain);

      oscA.start();
      oscB.start();
      lfo.start();

      audioContextRef.current = ctx;
      audioNodesRef.current = { master, bedGain, oscA, oscB, lfo, lfoGain };
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
      window.removeEventListener("pointerdown", resumeAudio);
      window.removeEventListener("keydown", resumeAudio);
      window.removeEventListener("wheel", resumeAudio);
      const nodes = audioNodesRef.current;
      if (nodes) {
        nodes.oscA.stop();
        nodes.oscB.stop();
        nodes.lfo.stop();
      }
      audioNodesRef.current = null;
      if (audioContextRef.current) {
        void audioContextRef.current.close();
      }
      audioContextRef.current = null;
    };
  }, []);

  useEffect(() => {
    const nodes = audioNodesRef.current;
    const ctx = audioContextRef.current;
    if (!nodes || !ctx) return;
    const now = ctx.currentTime;
    nodes.bedGain.gain.cancelScheduledValues(now);
    nodes.bedGain.gain.setTargetAtTime(soundEnabled ? 0.02 : 0.0, now, 0.35);
  }, [soundEnabled]);

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
          "Commands: help, status, bg on/off, sound on/off, autozoom on/off, speed 0..9, close",
      };
    }
    if (cmd === "status") {
      return {
        ok: true,
        message: `bg:${bgNavMode ? "on" : "off"} sound:${soundEnabled ? "on" : "off"} autozoom:${autoZoomEnabled ? "on" : "off"} speed:${speedRef.current.toFixed(2)}`,
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
    if (cmd === "autozoom on") {
      setAutoZoomEnabled(true);
      return { ok: true, message: "Auto zoom enabled." };
    }
    if (cmd === "autozoom off") {
      setAutoZoomEnabled(false);
      return { ok: true, message: "Auto zoom disabled." };
    }
    if (cmd === "close" || cmd === "exit") {
      setShowTerminal(false);
      return { ok: true, message: "Closed." };
    }

    const speedMatch = cmd.match(/^speed\s+([0-9])$/);
    if (speedMatch) {
      const v = sliderFromDigitKey(speedMatch[1]);
      if (v !== null) {
        speedRef.current = v;
        return { ok: true, message: `Speed set via digit ${speedMatch[1]}.` };
      }
    }

    return { ok: false, message: `Unknown command: ${raw}` };
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isPalette = (e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "p";
      if (isPalette) {
        setShowTerminal(true);
        setShowHint(false);
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
        setShowTerminal(true);
        setShowHint(false);
        cmdSequenceRef.current = "";
        e.preventDefault();
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [showTerminal]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-0"
        style={{ width: "100%", height: "100%" }}
      />

      {/* Loading indicator */}
      {!loaded && !initError && (
        <div className="fixed inset-0 -z-10 flex items-center justify-center pointer-events-none">
          <div className="w-4 h-4 border-2 border-neutral-300 dark:border-neutral-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Init error indicator */}
      {initError && (
        <div className="fixed bottom-4 left-4 z-[60] text-[10px] text-neutral-500 dark:text-neutral-500 bg-white/70 dark:bg-neutral-900/70 border border-neutral-200 dark:border-neutral-800 rounded px-2 py-1 backdrop-blur pointer-events-none">
          Life background unavailable: {initError}
        </div>
      )}

      {/* Navigation hint */}
      {loaded && !initError && showHint && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] bg-black/70 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur pointer-events-none select-none">
          BG Nav {bgNavMode ? "ON" : "OFF"} &middot; Trackpad: pan/pinch
          &middot; Mouse wheel: zoom &middot; Auto Zoom {autoZoomEnabled ? "ON" : "OFF"} &middot; type cmd or Ctrl/Cmd+Shift+P
        </div>
      )}

      {/* Controls help */}
      {loaded && !initError && (
        <div className="fixed bottom-4 left-4 z-[60] pointer-events-auto flex items-center gap-2">
          <button
            onClick={() => {
              setBgNavMode((prev) => !prev);
              setShowHint(false);
            }}
            className="text-[10px] px-2 py-1 rounded border border-neutral-300/60 dark:border-neutral-700/60 bg-white/70 dark:bg-neutral-900/70 text-neutral-600 dark:text-neutral-300 backdrop-blur"
            aria-label="Toggle background navigation mode"
          >
            BG Nav: {bgNavMode ? "On" : "Off"}
          </button>
          <button
            onClick={() => setAutoZoomEnabled((prev) => !prev)}
            className="text-[10px] px-2 py-1 rounded border border-neutral-300/60 dark:border-neutral-700/60 bg-white/70 dark:bg-neutral-900/70 text-neutral-600 dark:text-neutral-300 backdrop-blur"
            aria-label="Toggle auto zoom mode"
          >
            Auto Zoom: {autoZoomEnabled ? "On" : "Off"}
          </button>
          <button
            onClick={() => setSoundEnabled((prev) => !prev)}
            className="text-[10px] px-2 py-1 rounded border border-neutral-300/60 dark:border-neutral-700/60 bg-white/70 dark:bg-neutral-900/70 text-neutral-600 dark:text-neutral-300 backdrop-blur"
            aria-label="Toggle ambient sound"
          >
            Sound: {soundEnabled ? "On" : "Off"}
          </button>
          <button
            onClick={() => {
              setShowHelp((prev) => !prev);
              setShowHint(false);
            }}
            className="text-[10px] px-2 py-1 rounded border border-neutral-300/60 dark:border-neutral-700/60 bg-white/70 dark:bg-neutral-900/70 text-neutral-600 dark:text-neutral-300 backdrop-blur"
            aria-label="Toggle controls help"
          >
            {showHelp ? "Hide controls" : "Show controls (?)"}
          </button>
        </div>
      )}

      {loaded && !initError && showHelp && (
        <div className="fixed bottom-12 left-4 z-[60] max-w-xs text-[11px] leading-relaxed px-3 py-2 rounded border border-neutral-300/60 dark:border-neutral-700/60 bg-white/80 dark:bg-neutral-900/80 text-neutral-700 dark:text-neutral-200 backdrop-blur pointer-events-none">
          <div>Mode: BG Nav {bgNavMode ? "On" : "Off"}</div>
          <div>Trackpad: two-finger move = pan, pinch = zoom</div>
          <div>Mouse: wheel = zoom, drag = pan</div>
          <div>Auto zoom starts On and stops when you navigate manually</div>
          <div>Sound: subtle ambient bed (toggle with button or terminal)</div>
          <div>Terminal: type "cmd" or press Ctrl/Cmd+Shift+P</div>
          <div>Speed: keys 0-9 (0 pauses)</div>
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
