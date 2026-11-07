"use client";

import { useEffect, useRef } from "react";
import { getResolvedTheme, THEME_EVENT } from "../theme";
import type { CellOut } from "./scene-kit";
import { glyphKey, glyphStyle } from "./ink";
import { createScene } from "./scenes";

const RAMP = " .:-=+*#%@";
const CELL_W = 7;
const CELL_H = 12;
const FONT_PX = 11;
const HOVER_FPS = 30;
// Simulated seconds rendered before the first paint, so covers never start
// on an empty or freshly seeded frame.
const WARMUP_S = 6;

type Props = {
  /** Scene id; matches a project id in `scenes.ts`, unknown ids fall back. */
  scene: string;
  className?: string;
};

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * A small canvas that renders a live ASCII simulation. At rest it shows a
 * still frame; it plays only while its card is hovered (and on screen),
 * brightening cells near the pointer. Reduced motion keeps it still.
 */
export default function AsciiCover({ scene, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const host = (canvas.closest(".term-card") as HTMLElement | null) ?? canvas;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const styleCache = new Map<number, string>();
    const cell: CellOut = { v: 0, hue: 0, ch: null };

    let cols = 0;
    let rows = 0;
    let sim = createScene(scene, { cols: 1, rows: 1, aspect: 1 }, 1);
    let simTime = 0;
    let raf = 0;
    let last = 0;
    let visible = false;
    let hovered = false;
    let pointer: { x: number; y: number } | null = null;
    let dark = getResolvedTheme() === "dark";

    const fillFor = (hue: number, v: number) => {
      const key = glyphKey(hue, v);
      let style = styleCache.get(key);
      if (!style) {
        style = glyphStyle(Math.round(hue / 6) * 6, v, dark);
        styleCache.set(key, style);
      }
      return style;
    };

    const layout = () => {
      const { width, height } = canvas.getBoundingClientRect();
      if (width === 0 || height === 0) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Canvas fonts cannot read CSS variables, so resolve the Geist family.
      const mono = getComputedStyle(document.body).getPropertyValue("--font-geist-mono").trim();
      ctx.font = `${FONT_PX}px ${mono ? `${mono}, ` : ""}ui-monospace, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const nextCols = Math.floor(width / CELL_W);
      const nextRows = Math.floor(height / CELL_H);
      if (nextCols === cols && nextRows === rows) return;
      cols = nextCols;
      rows = nextRows;
      sim = createScene(scene, { cols, rows, aspect: CELL_H / CELL_W }, hashSeed(scene));
      simTime = 0;
      for (let s = 0; s < WARMUP_S * 30; s++) {
        simTime += 1 / 30;
        sim.step(1 / 30, simTime);
      }
    };

    const draw = () => {
      const { width, height } = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, width, height);
      const offX = (width - cols * CELL_W) / 2 + CELL_W / 2;
      const offY = (height - rows * CELL_H) / 2 + CELL_H / 2;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          sim.sample(c, r, cell);
          let v = cell.v;
          if (pointer) {
            const dx = (c * CELL_W + offX - pointer.x) / 46;
            const dy = (r * CELL_H + offY - pointer.y) / 46;
            v = Math.min(1, v + Math.exp(-(dx * dx + dy * dy)) * (0.25 + v * 0.6));
          }
          if (v < 0.04) continue;
          const ch = cell.ch ?? RAMP[Math.min(RAMP.length - 1, Math.ceil(v * (RAMP.length - 1)))];
          ctx.fillStyle = fillFor(cell.hue, v);
          ctx.fillText(ch, c * CELL_W + offX, r * CELL_H + offY);
        }
      }
    };

    const frame = (now: number) => {
      raf = 0;
      // Motion only while the card is hovered; otherwise the cover holds
      // its last frame, so a page of covers stays calm.
      if (!visible || !hovered || reduced.matches || document.hidden) return;
      const interval = 1000 / HOVER_FPS;
      if (now - last >= interval) {
        const dt = Math.min(0.1, last ? (now - last) / 1000 : interval / 1000);
        last = now;
        simTime += dt;
        sim.step(dt, simTime);
        draw();
      }
      raf = requestAnimationFrame(frame);
    };

    const wake = () => {
      if (!raf && visible && hovered && !reduced.matches && !document.hidden) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    };

    layout();
    draw();

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      wake();
    });
    io.observe(canvas);

    const ro = new ResizeObserver(() => {
      layout();
      draw();
    });
    ro.observe(canvas);

    const onEnter = () => {
      hovered = true;
      wake();
    };
    const onLeave = () => {
      hovered = false;
      pointer = null;
      // Repaint without the pointer glow; the frame then stays put.
      draw();
    };
    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      if (reduced.matches) draw();
    };
    const onVisibility = () => wake();
    const onTheme = () => {
      dark = getResolvedTheme() === "dark";
      styleCache.clear();
      draw();
    };
    const onMotion = () => {
      draw();
      wake();
    };

    host.addEventListener("pointerenter", onEnter);
    host.addEventListener("pointerleave", onLeave);
    host.addEventListener("pointermove", onMove);
    document.addEventListener("visibilitychange", onVisibility);
    reduced.addEventListener("change", onMotion);
    window.addEventListener(THEME_EVENT, onTheme);

    return () => {
      window.removeEventListener(THEME_EVENT, onTheme);
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      host.removeEventListener("pointerenter", onEnter);
      host.removeEventListener("pointerleave", onLeave);
      host.removeEventListener("pointermove", onMove);
      document.removeEventListener("visibilitychange", onVisibility);
      reduced.removeEventListener("change", onMotion);
    };
  }, [scene]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
