"use client";

import { useEffect, useRef } from "react";
import { getPalette, getResolvedTheme, readTokenRgb, THEME_EVENT } from "./theme";
import { LIGHT_READ_LINES } from "./lightReadLines";

/**
 * Home background: a field of scrambled characters. The cursor is a light;
 * where it rests, the scramble settles into sentences from the blog. Move
 * fast and the light goes out, so the page only reads when you slow down.
 */

const CELL_W = 10;
const CELL_H = 16;
const FONT_PX = 14;
const SCRAMBLE = "abcdefghiklmnoprstuvyz.:-=+*#%";
const ALPHA_STEPS = 8;
const LIGHT_RX = 300;
const LIGHT_RY = 120;
// Above this pointer speed (px/s) the light is fully out.
const SPEED_OUT = 650;
const SPEED_FULL = 60;
const FOCUS_RISE = 0.03; // per frame: about a second to full light
const FOCUS_FALL = 0.22;
const ACTIVE_FRAME_MS = 1000 / 30;
const IDLE_FRAME_MS = 1000 / 5;
const SEPARATOR = "   ·   ";

function hash2(a: number, b: number, c = 0): number {
  let h = Math.imul(a, 374761393) ^ Math.imul(b, 668265263) ^ Math.imul(c, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** One long line per text row, starting at a different sentence each time. */
function rowText(row: number): string {
  const n = LIGHT_READ_LINES.length;
  const start = (row * 5) % n;
  let out = "";
  for (let i = 0; i < n; i++) {
    out += LIGHT_READ_LINES[(start + i) % n].text + SEPARATOR;
  }
  return out;
}

export default function LightReadBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let dpr = window.devicePixelRatio || 1;
    let cols = 0;
    let rows = 0;
    let width = 0;
    let height = 0;
    let fontFamily = "ui-monospace, monospace";
    let rgb = "23, 23, 23";
    let theme = getResolvedTheme();
    let palette = getPalette();
    // [alphaStep][scrambleIndex] → pre-rendered glyph tile.
    let atlas: HTMLCanvasElement[][] = [];
    const texts: string[] = [];
    const offsets: number[] = [];

    // Pointer state, in canvas coordinates.
    let present = false;
    let px = -9999;
    let py = -9999;
    let lastMove = 0;
    let speed = 0;
    let focus = 0;
    let touchRelease = 0;

    const buildAtlas = () => {
      const fam = getComputedStyle(document.body).getPropertyValue("--font-geist-mono").trim();
      fontFamily = fam ? `${fam}, ui-monospace, monospace` : "ui-monospace, monospace";
      rgb = readTokenRgb("--foreground", theme === "dark" ? "236, 236, 236" : "23, 23, 23");
      atlas = [];
      for (let a = 0; a < ALPHA_STEPS; a++) {
        const alpha = (a + 1) / ALPHA_STEPS;
        const row: HTMLCanvasElement[] = [];
        for (const ch of SCRAMBLE) {
          const tile = document.createElement("canvas");
          tile.width = Math.ceil(CELL_W * dpr);
          tile.height = Math.ceil(CELL_H * dpr);
          const tctx = tile.getContext("2d");
          if (tctx) {
            tctx.scale(dpr, dpr);
            tctx.font = `${FONT_PX}px ${fontFamily}`;
            tctx.textAlign = "center";
            tctx.textBaseline = "middle";
            tctx.fillStyle = `rgba(${rgb}, ${alpha})`;
            tctx.fillText(ch, CELL_W / 2, CELL_H / 2);
          }
          row.push(tile);
        }
        atlas.push(row);
      }
    };

    const layout = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(width / CELL_W);
      rows = Math.ceil(height / CELL_H);
      texts.length = 0;
      offsets.length = 0;
      for (let r = 0; r < rows; r++) {
        texts.push(rowText(r >> 1));
        offsets.push(Math.floor(hash2(r, 7) * 400));
      }
      buildAtlas();
    };

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = motionQuery.matches;
    const start = performance.now();

    const draw = (now: number) => {
      const nextTheme = getResolvedTheme();
      const nextPalette = getPalette();
      if (nextTheme !== theme || nextPalette !== palette) {
        theme = nextTheme;
        palette = nextPalette;
        buildAtlas();
      }

      // The light needs a slow hand: speed decays when the pointer rests.
      if (now - lastMove > 60) speed *= 0.8;
      if (touchRelease && now > touchRelease) {
        present = false;
        touchRelease = 0;
      }
      const target = present
        ? Math.min(1, Math.max(0, 1 - (speed - SPEED_FULL) / (SPEED_OUT - SPEED_FULL)))
        : 0;
      if (reducedMotion) focus = target;
      else if (target > focus) focus = Math.min(target, focus + FOCUS_RISE);
      else focus = Math.max(target, focus - FOCUS_FALL);

      const dark = theme === "dark";
      const mobile = width < 640;
      const base = (dark ? 0.085 : 0.12) * (mobile ? 0.5 : 1);
      const t = reducedMotion ? 0 : (now - start) / 1000;

      ctx.clearRect(0, 0, width, height);
      ctx.font = `${FONT_PX}px ${fontFamily}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = `rgb(${rgb})`;

      const lit = focus > 0.01;
      // Keep a clear field behind marked content (the hero headline).
      const canvasRect = canvas.getBoundingClientRect();
      const quiet = Array.from(document.querySelectorAll("[data-bg-quiet]"), (el) => {
        const q = el.getBoundingClientRect();
        return {
          c0: Math.floor((q.left - canvasRect.left - 12) / CELL_W),
          c1: Math.ceil((q.right - canvasRect.left + 12) / CELL_W),
          r0: Math.floor((q.top - canvasRect.top - 6) / CELL_H),
          r1: Math.ceil((q.bottom - canvasRect.top + 6) / CELL_H),
        };
      });
      for (let r = 0; r < rows; r++) {
        const cy = r * CELL_H + CELL_H / 2;
        const dy = (cy - py) / LIGHT_RY;
        const textRow = r % 2 === 0;
        const text = texts[r];
        const off = offsets[r];
        for (let c = 0; c < cols; c++) {
          let inQuiet = false;
          for (const q of quiet) {
            if (r >= q.r0 && r < q.r1 && c >= q.c0 && c < q.c1) {
              inQuiet = true;
              break;
            }
          }
          if (inQuiet) continue;
          const h = hash2(c, r);
          let light = 0;
          if (lit) {
            const dx = (c * CELL_W + CELL_W / 2 - px) / LIGHT_RX;
            const d2 = dx * dx + dy * dy;
            if (d2 < 1) light = (1 - d2) * focus;
          }

          if (textRow && light > 0) {
            const ch = text[(c + off) % text.length];
            // Cells settle from the centre outwards as the light grows.
            if (ch !== " " && h < light * 2.4 - 0.1) {
              ctx.globalAlpha = Math.min(0.95, 0.3 + light * 0.8);
              ctx.fillText(ch, c * CELL_W + CELL_W / 2, cy);
              continue;
            }
            if (ch === " " && h < light * 2.4 - 0.1) continue;
          }

          // Leave air: only some cells carry a scrambled glyph, and the light
          // clears the rows between sentences so the text reads cleanly.
          if (h > 0.4) continue;
          const clear = textRow ? 1 : 1 - Math.min(1, light * 1.6);
          if (clear <= 0.05) continue;
          const slot = Math.floor(t * 0.5 + h * 9);
          const gi = Math.floor(hash2(c, r, slot) * SCRAMBLE.length);
          const alpha = base * clear;
          const step = Math.min(ALPHA_STEPS - 1, Math.max(0, Math.round(alpha * ALPHA_STEPS) - 1));
          ctx.globalAlpha = 1;
          ctx.drawImage(atlas[step][gi], c * CELL_W, r * CELL_H, CELL_W, CELL_H);
        }
      }
      ctx.globalAlpha = 1;
      return lit || focus !== target;
    };

    let raf = 0;
    let pending = false;
    let lastPaint = -Infinity;
    let busy = false;

    const frame = (now: number) => {
      pending = false;
      if (document.hidden) return;
      const interval = busy ? ACTIVE_FRAME_MS : IDLE_FRAME_MS;
      if (now - lastPaint >= interval) {
        lastPaint = now;
        busy = draw(now);
      }
      if (!reducedMotion || busy) schedule();
    };
    const schedule = () => {
      if (pending || document.hidden) return;
      pending = true;
      raf = requestAnimationFrame(frame);
    };
    const wake = () => {
      busy = true;
      schedule();
    };

    const toCanvas = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return [e.clientX - rect.left, e.clientY - rect.top] as const;
    };
    const onMove = (e: PointerEvent) => {
      const [x, y] = toCanvas(e);
      const now = performance.now();
      if (present && lastMove) {
        const dt = Math.max(8, now - lastMove);
        const v = (Math.hypot(x - px, y - py) / dt) * 1000;
        speed = speed * 0.6 + v * 0.4;
      }
      if (e.pointerType !== "touch" || e.buttons) present = true;
      px = x;
      py = y;
      lastMove = now;
      wake();
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "touch") return;
      const [x, y] = toCanvas(e);
      present = true;
      touchRelease = 0;
      px = x;
      py = y;
      speed = 0;
      lastMove = performance.now();
      wake();
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerType === "touch") touchRelease = performance.now() + 1500;
    };
    const onLeave = () => {
      present = false;
      wake();
    };
    const onResize = () => {
      layout();
      wake();
    };
    const onVisibility = () => {
      if (!document.hidden) wake();
    };
    const onMotion = (e: MediaQueryListEvent) => {
      reducedMotion = e.matches;
      wake();
    };

    layout();
    wake();
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(canvas);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    window.addEventListener(THEME_EVENT, wake);
    document.addEventListener("visibilitychange", onVisibility);
    motionQuery.addEventListener("change", onMotion);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener(THEME_EVENT, wake);
      document.removeEventListener("visibilitychange", onVisibility);
      motionQuery.removeEventListener("change", onMotion);
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
