"use client";

import { useEffect, useRef } from "react";
import { getResolvedTheme } from "./theme";

const DENSITY_RAMP = " .·:-=+*#%@";
const CELL_W = 10;
const CELL_H = 16;
const FONT_PX = 14;

const PATTERN_COLS = 5;
const PATTERN_ROWS = 7;
const LETTER_GAP_COLS = 2;

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
  "0": [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 1, 1],
    [1, 0, 1, 0, 1],
    [1, 1, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
  "4": [
    [0, 0, 0, 1, 0],
    [0, 0, 1, 1, 0],
    [0, 1, 0, 1, 0],
    [1, 0, 0, 1, 0],
    [1, 1, 1, 1, 1],
    [0, 0, 0, 1, 0],
    [0, 0, 0, 1, 0],
  ],
};

const CYCLE_DURATION = 4;
const LETTER_DURATION = 1;
const RIPPLE_SPEED = 220;
const RIPPLE_DURATION = 1.6;
const RIPPLE_RING_WIDTH = 36;
const HALF_RING = RIPPLE_RING_WIDTH / 2;

// Bound concurrent ripples — beyond this the screen is saturated and extra
// ripples just heat the CPU without adding visible signal. New clicks evict
// the oldest, so rapid-fire input stays responsive without piling up cost.
const MAX_RIPPLES = 10;

// Pre-rendered glyph atlas: NUM_ALPHA_BUCKETS × (RAMP_LEN - 1) tiles.
// Drawing a cell becomes a single drawImage instead of fillStyle + fillText.
// 16 buckets keeps alpha quantization invisible at the opacities we use.
const NUM_ALPHA_BUCKETS = 16;

type Ripple = { x: number; y: number; t: number };
type LiveRipple = {
  x: number;
  y: number;
  radius: number;
  minR2: number;
  maxR2: number;
  fade: number;
};

type Props = {
  /** When false, only click ripples render — the ambient noise field AND the
   *  letter pulse are both suppressed. Defaults to true. */
  noise?: boolean;
  /** Word to pulse in the background. Defaults to "DATA". Characters without
   *  a pattern in `letterPatterns` are silently skipped. */
  word?: string;
};

export default function AsciiDataBackground({
  noise = true,
  word = "DATA",
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ripplesRef = useRef<Ripple[]>([]);
  const animRef = useRef(0);
  // Read inside the frame loop so toggling without remounting works.
  const noiseRef = useRef(noise);
  useEffect(() => {
    noiseRef.current = noise;
  }, [noise]);
  const wordRef = useRef(word);
  useEffect(() => {
    wordRef.current = word;
  }, [word]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      // Routes can opt out of ripples by wrapping their content in an
      // element with [data-no-ripple] (e.g. /blogs/* keeps clicks quiet for
      // reading material). Header/footer clicks are unaffected.
      const target = e.target as Element | null;
      if (target?.closest("[data-no-ripple]")) return;
      const rs = ripplesRef.current;
      rs.push({ x: e.clientX, y: e.clientY, t: performance.now() });
      if (rs.length > MAX_RIPPLES) rs.shift();
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let cols = 0;
    let rows = 0;
    let startC = 0;
    const letterMap = new Map<string, number>();
    let dpr = window.devicePixelRatio || 1;
    // Optional page-anchored y position for the DATA pulse. When the page
    // includes <div data-bg-anchor="data" />, the letters render centered on
    // that element instead of the viewport. Lets pages reserve a clean band
    // for the bg without burying it under hero content.
    let anchorEl: Element | null = null;

    let currentTheme: "light" | "dark" = getResolvedTheme();
    // [bucket][charIdx-1] → tile canvas. Index skips RAMP[0] (' ').
    let atlas: HTMLCanvasElement[][] = [];

    const buildAtlas = () => {
      const isDark = currentTheme === "dark";
      const baseColor = isDark ? "236, 236, 236" : "23, 23, 23";
      const ATLAS_W = CELL_W * 2;
      const ATLAS_H = CELL_H * 2;
      const next: HTMLCanvasElement[][] = [];
      for (let b = 0; b < NUM_ALPHA_BUCKETS; b++) {
        const alpha = (b + 1) / NUM_ALPHA_BUCKETS;
        const row: HTMLCanvasElement[] = [];
        for (let ci = 1; ci < DENSITY_RAMP.length; ci++) {
          const off = document.createElement("canvas");
          off.width = Math.floor(ATLAS_W * dpr);
          off.height = Math.floor(ATLAS_H * dpr);
          const octx = off.getContext("2d");
          if (!octx) continue;
          octx.scale(dpr, dpr);
          octx.font = `${FONT_PX}px ui-monospace, "Geist Mono", "JetBrains Mono", monospace`;
          octx.textAlign = "center";
          octx.textBaseline = "middle";
          octx.fillStyle = `rgba(${baseColor}, ${alpha})`;
          octx.fillText(DENSITY_RAMP[ci], ATLAS_W / 2, ATLAS_H / 2);
          row.push(off);
        }
        next.push(row);
      }
      atlas = next;
    };

    const layout = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      cols = Math.ceil(w / CELL_W);
      rows = Math.ceil(h / CELL_H);

      buildAtlas();
    };
    layout();
    window.addEventListener("resize", layout);

    const rebuildLetterMap = (startR: number) => {
      letterMap.clear();
      const word = wordRef.current;
      const totalW = word.length * PATTERN_COLS + (word.length - 1) * LETTER_GAP_COLS;
      startC = Math.floor((cols - totalW) / 2);
      for (let i = 0; i < word.length; i++) {
        const p = letterPatterns[word[i]];
        if (!p) continue;
        const c0 = startC + i * (PATTERN_COLS + LETTER_GAP_COLS);
        for (let r = 0; r < PATTERN_ROWS; r++) {
          for (let c = 0; c < PATTERN_COLS; c++) {
            if (p[r][c]) letterMap.set(`${c0 + c},${startR + r}`, i);
          }
        }
      }
    };

    const startTime = performance.now();
    // Reused across frames to avoid GC churn from per-frame allocations.
    const liveRipples: LiveRipple[] = [];

    const frame = (now: number) => {
      // Theme toggle → rebuild atlas with new color.
      const t = getResolvedTheme();
      if (t !== currentTheme) {
        currentTheme = t;
        buildAtlas();
      }

      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);

      // Filter + project ripples into the per-frame cache. Squared bounds let
      // the inner loop cull with one mul/compare per ripple instead of sqrt.
      liveRipples.length = 0;
      const rs = ripplesRef.current;
      let writeIdx = 0;
      for (let i = 0; i < rs.length; i++) {
        const rp = rs[i];
        const elapsed = (now - rp.t) / 1000;
        if (elapsed >= RIPPLE_DURATION + 0.1) continue;
        rs[writeIdx++] = rp;
        const radius = elapsed * RIPPLE_SPEED;
        const minR = Math.max(0, radius - HALF_RING);
        const maxR = radius + HALF_RING;
        liveRipples.push({
          x: rp.x,
          y: rp.y,
          radius,
          minR2: minR * minR,
          maxR2: maxR * maxR,
          fade: 1 - elapsed / RIPPLE_DURATION,
        });
      }
      rs.length = writeIdx;

      const isDark = currentTheme === "dark";
      const baseAlpha = isDark ? 0.14 : 0.22;
      const pulseAlpha = isDark ? 0.55 : 0.65;
      const ambientFactor = isDark ? 0.18 : 0.3;

      const elapsed = (now - startTime) / 1000;
      const cycleT = elapsed % CYCLE_DURATION;
      const noisePhase = elapsed * 0.55;
      const rampLast = DENSITY_RAMP.length - 1;
      const rippleCount = liveRipples.length;

      // Position DATA letters: anchored to a page element if present,
      // otherwise viewport-centered. Re-query each frame so SPA navigations
      // pick up new anchors automatically.
      if (!anchorEl || !anchorEl.isConnected) {
        anchorEl = document.querySelector('[data-bg-anchor="data"]');
      }
      let startR = Math.floor((rows - PATTERN_ROWS) / 2);
      if (anchorEl) {
        const rect = anchorEl.getBoundingClientRect();
        const centerY = (rect.top + rect.bottom) / 2;
        startR = Math.floor(centerY / CELL_H) - Math.floor(PATTERN_ROWS / 2);
      }
      rebuildLetterMap(startR);

      const noiseOn = noiseRef.current;
      for (let r = 0; r < rows; r++) {
        const py = r * CELL_H + CELL_H / 2;
        const rowPhase = r * 0.22 + noisePhase;
        for (let c = 0; c < cols; c++) {
          let density = noiseOn ? 0.06 + 0.05 * Math.sin(c * 0.18 + rowPhase) : 0;

          const li = letterMap.get(`${c},${r}`);
          const isLetter = li !== undefined && noiseOn;
          if (isLetter) {
            const start = (li as number) * LETTER_DURATION;
            if (cycleT >= start && cycleT < start + LETTER_DURATION) {
              const p = (cycleT - start) / LETTER_DURATION;
              density += Math.sin(p * Math.PI) * 0.85;
            } else {
              density += 0.12;
            }
          }

          const px = c * CELL_W + CELL_W / 2;
          // Track ripple contribution separately from ambient/letter density so
          // we can give it the same alpha multiplier letters get. Otherwise the
          // ring promotes the character but barely moves the alpha bucket.
          let rippleBoost = 0;
          for (let ri = 0; ri < rippleCount; ri++) {
            const rp = liveRipples[ri];
            const dx = px - rp.x;
            const dy = py - rp.y;
            const dist2 = dx * dx + dy * dy;
            if (dist2 < rp.minR2 || dist2 > rp.maxR2) continue;
            const band = Math.abs(Math.sqrt(dist2) - rp.radius);
            const intensity = 1 - band / HALF_RING;
            rippleBoost += intensity * rp.fade * 0.55;
          }
          density += rippleBoost;

          if (density <= 0.05) continue;
          if (density > 1) density = 1;

          const charIdx = Math.floor(density * rampLast);
          if (charIdx === 0) continue;

          let visualAlpha: number;
          if (isLetter) {
            visualAlpha = baseAlpha + density * pulseAlpha;
          } else {
            const ambientPart = density - rippleBoost;
            visualAlpha = baseAlpha + ambientPart * ambientFactor + rippleBoost * pulseAlpha;
          }
          let bucket = Math.floor(visualAlpha * NUM_ALPHA_BUCKETS);
          if (bucket < 0) bucket = 0;
          else if (bucket >= NUM_ALPHA_BUCKETS) bucket = NUM_ALPHA_BUCKETS - 1;

          const tile = atlas[bucket][charIdx - 1];
          ctx.drawImage(tile, px - CELL_W, py - CELL_H);
        }
      }

      animRef.current = requestAnimationFrame(frame);
    };
    animRef.current = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", layout);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ width: "100%", height: "100%" }}
      aria-hidden="true"
    />
  );
}
