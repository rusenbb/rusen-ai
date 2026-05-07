"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { UMAP } from "umap-js";
import { CORPUS, SENSE_COLORS, type WordEntry } from "./data/corpus";
import { useEmbedding } from "./hooks/useEmbedding";

type Point = {
  index: number;
  x: number;     // [0..1] projected coord
  y: number;     // [0..1] projected coord
  senseIdx: number;
  sentence: string;
};

const ATLAS_HEIGHT = 520;
const POINT_RADIUS = 6;
const HALO_RADIUS = 18;

export default function WordSenseAtlasPage() {
  const { status, progress, error, embedBatch } = useEmbedding();
  const [activeWord, setActiveWord] = useState<WordEntry>(CORPUS[0]);
  const [points, setPoints] = useState<Point[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);
  const fadeStartRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Recompute embeddings + UMAP whenever the active word changes (and model is ready)
  useEffect(() => {
    if (status !== "ready") return;
    let cancelled = false;
    const run = async () => {
      setBusy(true);
      try {
        const sentences = activeWord.sentences.map((s) => s.text);
        const embeddings = await embedBatch(sentences);
        if (cancelled) return;
        const arrays = embeddings.map((e) => Array.from(e));
        const umap = new UMAP({
          nComponents: 2,
          nNeighbors: Math.min(8, arrays.length - 1),
          minDist: 0.3,
          spread: 1.0,
        });
        const projection = umap.fit(arrays) as number[][];
        if (cancelled) return;

        // Normalise to [0, 1]
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const [px, py] of projection) {
          if (px < minX) minX = px;
          if (px > maxX) maxX = px;
          if (py < minY) minY = py;
          if (py > maxY) maxY = py;
        }
        const dx = maxX - minX || 1;
        const dy = maxY - minY || 1;
        const senseIdxMap = new Map(activeWord.senses.map((s, i) => [s.id, i] as const));
        const out: Point[] = projection.map(([px, py], i) => ({
          index: i,
          x: (px - minX) / dx,
          y: (py - minY) / dy,
          senseIdx: senseIdxMap.get(activeWord.sentences[i].sense) ?? 0,
          sentence: activeWord.sentences[i].text,
        }));
        if (!cancelled) {
          setPoints(out);
          fadeStartRef.current = performance.now();
        }
      } catch (err) {
        console.error("word-sense-atlas: projection failed", err);
      } finally {
        if (!cancelled) setBusy(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [activeWord, embedBatch, status]);

  // Render the atlas (canvas)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(ATLAS_HEIGHT * dpr);
      canvas.style.height = `${ATLAS_HEIGHT}px`;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !points) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;

    let raf = 0;
    const draw = () => {
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Background
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, w, h);

      // Subtle grid
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 1;
      const gridStep = 40;
      ctx.beginPath();
      for (let x = 0; x <= w; x += gridStep) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      for (let y = 0; y <= h; y += gridStep) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();

      const pad = 32;
      const innerW = w - pad * 2;
      const innerH = h - pad * 2;

      // Fade-in animation
      const elapsed = performance.now() - fadeStartRef.current;
      const fade = Math.min(1, elapsed / 600);

      // Halos (additive)
      ctx.globalCompositeOperation = "lighter";
      for (const p of points) {
        const cx = pad + p.x * innerW;
        const cy = pad + p.y * innerH;
        const color = SENSE_COLORS[p.senseIdx % SENSE_COLORS.length];
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, HALO_RADIUS);
        grad.addColorStop(0, `${color}99`);
        grad.addColorStop(1, `${color}00`);
        ctx.globalAlpha = 0.55 * fade;
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, HALO_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;

      // Dots
      for (const p of points) {
        const cx = pad + p.x * innerW;
        const cy = pad + p.y * innerH;
        const isHovered = hovered === p.index;
        const r = isHovered ? POINT_RADIUS + 3 : POINT_RADIUS;
        const color = SENSE_COLORS[p.senseIdx % SENSE_COLORS.length];
        ctx.globalAlpha = fade;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        if (isHovered) {
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;

      if (fade < 1) {
        raf = requestAnimationFrame(draw);
      }
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [points, hovered]);

  const findHovered = useCallback(
    (clientX: number, clientY: number): number | null => {
      const canvas = canvasRef.current;
      if (!canvas || !points) return null;
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = ATLAS_HEIGHT;
      const pad = 32;
      const innerW = w - pad * 2;
      const innerH = h - pad * 2;
      const px = clientX - rect.left;
      const py = clientY - rect.top;
      let best: number | null = null;
      let bestDist = 14 * 14;
      for (const p of points) {
        const cx = pad + p.x * innerW;
        const cy = pad + p.y * innerH;
        const dx = px - cx;
        const dy = py - cy;
        const d2 = dx * dx + dy * dy;
        if (d2 < bestDist) {
          bestDist = d2;
          best = p.index;
        }
      }
      return best;
    },
    [points],
  );

  const hoveredPoint = hovered !== null && points ? points[hovered] : null;
  const senseLabels = useMemo(
    () => activeWord.senses.map((s, i) => ({ ...s, color: SENSE_COLORS[i % SENSE_COLORS.length] })),
    [activeWord.senses],
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
      <div className="mb-6">
        <p className="text-xs font-mono tracking-[0.18em] text-neutral-500 dark:text-neutral-500 mb-2">
          NLP / SEMANTICS
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">Word Sense Atlas</h1>
        <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 max-w-2xl text-pretty">
          Pick a polysemous word. Each sentence using it gets embedded in your browser, then projected to 2D — clusters reveal distinct senses without ever being told.
        </p>
      </div>

      {/* Word picker */}
      <div className="flex flex-wrap gap-2 mb-4">
        {CORPUS.map((entry) => {
          const active = entry.word === activeWord.word;
          return (
            <button
              key={entry.word}
              type="button"
              onClick={() => setActiveWord(entry)}
              className={`rounded-full border px-4 py-1.5 text-sm font-mono transition ${
                active
                  ? "border-cyan-500 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300"
                  : "border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-500"
              }`}
            >
              {entry.word}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-neutral-500 mb-5 italic">{activeWord.prompt}</p>

      {/* Status strip */}
      <div className="mb-3 text-xs font-mono">
        {status === "loading" && (
          <span className="text-neutral-500">Loading embedding model… {progress}%</span>
        )}
        {status === "ready" && busy && (
          <span className="text-cyan-600 dark:text-cyan-400">Embedding {activeWord.sentences.length} sentences and projecting…</span>
        )}
        {status === "ready" && !busy && points && (
          <span className="text-green-600 dark:text-green-400">{points.length} sentences mapped · hover a dot</span>
        )}
        {error && <span className="text-red-500">{error}</span>}
      </div>

      {/* Canvas */}
      <div className="relative rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-800">
        <canvas
          ref={canvasRef}
          className="block w-full"
          style={{ height: ATLAS_HEIGHT }}
          onMouseMove={(e) => setHovered(findHovered(e.clientX, e.clientY))}
          onMouseLeave={() => setHovered(null)}
        />
        {hoveredPoint && (
          <div
            className="absolute pointer-events-none px-3 py-2 rounded-md bg-neutral-900 text-neutral-100 text-xs max-w-md shadow-xl border border-neutral-700"
            style={{
              left: `min(60%, calc(${hoveredPoint.x * 100}% + 16px))`,
              top: `min(72%, calc(${hoveredPoint.y * 100}% + 24px))`,
            }}
          >
            <div className="text-[10px] uppercase tracking-wider text-neutral-400 mb-1 font-mono">
              {activeWord.senses[hoveredPoint.senseIdx]?.label}
            </div>
            <div>{hoveredPoint.sentence}</div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {senseLabels.map((s) => (
          <div key={s.id} className="flex items-start gap-2 text-xs">
            <span
              className="inline-block w-3 h-3 rounded-full mt-0.5 flex-shrink-0"
              style={{ background: s.color }}
            />
            <div>
              <div className="font-semibold text-neutral-800 dark:text-neutral-200 capitalize">{s.label}</div>
              <div className="text-neutral-500">{s.gloss}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Method note */}
      <div className="mt-8 text-xs text-neutral-500 leading-relaxed max-w-2xl">
        <p>
          Sentences are embedded with <code className="font-mono text-[11px]">mxbai-embed-xsmall-v1</code> (384-dim, ~50&nbsp;MB) running on WebAssembly.
          The 2D layout comes from UMAP with eight neighbours; small numbers of points can land in tight clusters, so distances are a sketch, not gospel.
          Colour reflects the hand-tagged sense, but the projection has no idea what the labels are — overlap means the model couldn&apos;t separate them.
        </p>
      </div>
    </div>
  );
}
