"use client";

import { useEffect, useRef } from "react";
import type { Sigil } from "@/lib/blog-sigil";
import { glyphStyle } from "../../components/ascii-cover/ink";
import { getResolvedTheme, THEME_EVENT } from "../../components/theme";

const COLS = 12;
const RAMP = "░▒▓█";
const SCRAMBLE_MS = 750;

type Cell = { ch: string; v: number } | null;

/** Lay sentence lengths out as blocks: longer sentence, longer and denser. */
function layout(sigil: Sigil): Cell[][] {
  return sigil.rows.map((lengths) => {
    const row: Cell[] = new Array(COLS).fill(null);
    if (lengths.length === 0) {
      row[0] = { ch: "·", v: 0.2 };
      return row;
    }
    let x = 0;
    for (const len of lengths) {
      if (x >= COLS) break;
      const width = Math.max(1, Math.min(6, Math.round(len / 6)));
      const v = Math.max(0.3, Math.min(1, len / 32));
      const ch = RAMP[Math.min(RAMP.length - 1, Math.floor(v * (RAMP.length - 1)))];
      for (let k = 0; k < width && x < COLS; k++) row[x++] = { ch, v };
      x++;
    }
    return row;
  });
}

/**
 * The post's sigil, drawn as ASCII. On hover of its entry, letters from the
 * post scramble across the grid and settle left to right into the pattern.
 */
export default function PostSigil({ sigil }: { sigil: Sigil }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const cells = layout(sigil);
    const rows = cells.length;
    const host = (canvas.closest(".post-row, .series-card, .archive-row, .writing-card") as HTMLElement | null) ?? canvas;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const letters = sigil.letters || "abcdefghijklmnopqrstuvwxyz";
    let dark = getResolvedTheme() === "dark";
    let raf = 0;
    let start = 0;

    const draw = (elapsed: number | null) => {
      const { width, height } = canvas.getBoundingClientRect();
      if (!width || !height) return;
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== Math.round(width * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const cw = width / COLS;
      const ch = height / rows;
      const mono = getComputedStyle(document.body).getPropertyValue("--font-geist-mono").trim();
      ctx.font = `${Math.round(ch * 1.05)}px ${mono ? `${mono}, ` : ""}ui-monospace, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < COLS; c++) {
          const cell = cells[r][c];
          let glyph = cell?.ch ?? null;
          let v = cell?.v ?? 0;
          if (elapsed !== null) {
            // Each column settles a little after the one to its left.
            const settleAt = (c / COLS) * SCRAMBLE_MS * 0.7 + 120;
            if (elapsed < settleAt) {
              glyph = letters[(r * COLS + c + Math.floor(elapsed / 45)) % letters.length];
              v = 0.5;
            }
          }
          if (!glyph) continue;
          ctx.fillStyle = glyphStyle(sigil.hue, v, dark);
          ctx.fillText(glyph, c * cw + cw / 2, r * ch + ch / 2);
        }
      }
    };

    const tick = (now: number) => {
      const elapsed = now - start;
      if (elapsed >= SCRAMBLE_MS) {
        raf = 0;
        draw(null);
        return;
      }
      draw(elapsed);
      raf = requestAnimationFrame(tick);
    };

    const onEnter = () => {
      if (reduced.matches || raf) return;
      start = performance.now();
      raf = requestAnimationFrame(tick);
    };
    const onTheme = () => {
      dark = getResolvedTheme() === "dark";
      draw(null);
    };
    const ro = new ResizeObserver(() => draw(null));

    draw(null);
    ro.observe(canvas);
    host.addEventListener("pointerenter", onEnter);
    window.addEventListener(THEME_EVENT, onTheme);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      host.removeEventListener("pointerenter", onEnter);
      window.removeEventListener(THEME_EVENT, onTheme);
    };
  }, [sigil]);

  return <canvas ref={canvasRef} className="post-sigil" aria-hidden="true" />;
}
