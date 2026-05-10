"use client";

/**
 * Universal optimisation-plot component.
 *
 * Two render modes:
 *   - "contour": Canvas2D heatmap of f(x,y), iso-bands by log-mapped value,
 *                animated trace (single trace = gradient run, or population
 *                of dots = swarm run). Click anywhere = ball-drop start point.
 *   - "3d":      Three.js displaced plane with OrbitControls (drag = rotate,
 *                wheel = zoom). Trace rendered as a Line3 hovering above the
 *                surface. Clicking still ball-drops onto the surface in the
 *                same 2-D coordinate frame.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { Surface } from "@/lib/optimization/surfaces";
import type { Frame } from "@/lib/optimization/gradient-methods";
import type { SwarmTrace } from "@/lib/optimization/swarm-methods";

export type PlotMode = "contour" | "3d";

interface MeshDisplacementMeta {
  zScale: number;
  fmin: number;
  log: boolean;
}

export interface SurfacePlotProps {
  surface: Surface;
  /** Single-agent trace (gradient run). */
  trace?: Frame[];
  /** Optional second trace, for non-gradient algorithm comparison. */
  traceB?: Frame[];
  /** Population trace (swarm run). */
  swarm?: SwarmTrace;
  /** Optional second swarm for two-method comparison. */
  swarmB?: SwarmTrace;
  /** Whether the plot is in contour or 3D mode. */
  mode: PlotMode;
  /** Size in CSS pixels. */
  height?: number;
  /** Called when the user clicks/taps the plot — value is in surface coords. */
  onPick?: (x: number, y: number) => void;
  /** Frame index to display. If null, defaults to last frame (or animates). */
  frame?: number;
  /** If true, animate from frame 0 to last; emits onFrameChange. */
  animate?: boolean;
  onFrameChange?: (i: number) => void;
  /** Speed of animation in frames per second. */
  fps?: number;
}

const PALETTE = [
  [12, 18, 28],
  [25, 30, 70],
  [40, 90, 130],
  [40, 160, 170],
  [80, 200, 160],
  [180, 220, 140],
  [240, 200, 110],
  [255, 140, 70],
  [220, 60, 80],
];

function lerpColor(t: number): [number, number, number] {
  const x = Math.max(0, Math.min(1, t));
  const idx = x * (PALETTE.length - 1);
  const i0 = Math.floor(idx);
  const i1 = Math.min(PALETTE.length - 1, i0 + 1);
  const a = PALETTE[i0];
  const b = PALETTE[i1];
  const k = idx - i0;
  return [
    a[0] + (b[0] - a[0]) * k,
    a[1] + (b[1] - a[1]) * k,
    a[2] + (b[2] - a[2]) * k,
  ];
}

function valueToRange(v: number, min: number, max: number, log: boolean): number {
  if (max <= min) return 0;
  if (log) {
    const lv = Math.log10(Math.max(1e-6, v - min + 1e-6));
    const lmin = Math.log10(1e-6);
    const lmax = Math.log10(max - min + 1e-6);
    return (lv - lmin) / Math.max(lmax - lmin, 1e-6);
  }
  return (v - min) / (max - min);
}

const RES = 96; // grid resolution for both contour and 3D

interface HeightField {
  H: Float32Array; // length RES*RES
  fmin: number;
  fmax: number;
}

function sampleSurface(surface: Surface): HeightField {
  const H = new Float32Array(RES * RES);
  let fmin = Infinity;
  let fmax = -Infinity;
  const D = surface.domain;
  for (let j = 0; j < RES; j++) {
    const y = ((j / (RES - 1)) * 2 - 1) * D;
    for (let i = 0; i < RES; i++) {
      const x = ((i / (RES - 1)) * 2 - 1) * D;
      const v = surface.f(x, y);
      H[j * RES + i] = v;
      if (v < fmin) fmin = v;
      if (v > fmax) fmax = v;
    }
  }
  // Saddle goes to ±∞ at the corners; clip the displayed range.
  if (!Number.isFinite(fmax)) fmax = 100;
  if (!Number.isFinite(fmin)) fmin = -100;
  return { H, fmin, fmax };
}

export function SurfacePlot(props: SurfacePlotProps) {
  const {
    surface,
    trace,
    traceB,
    swarm,
    swarmB,
    mode,
    height = 360,
    onPick,
    frame,
    animate,
    onFrameChange,
    fps = 30,
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const canvas2dRef = useRef<HTMLCanvasElement>(null);

  const heightField = useMemo(() => sampleSurface(surface), [surface]);
  const totalFrames = useMemo(() => {
    if (swarm) return swarm.length;
    if (trace) return trace.length;
    return 1;
  }, [swarm, trace]);

  const [internalFrame, setInternalFrame] = useState(0);
  useEffect(() => {
    setInternalFrame(0);
  }, [trace, swarm, surface, mode]);

  // Animation loop (controlled or self-driven).
  useEffect(() => {
    if (!animate) return;
    if (totalFrames <= 1) return;
    let id = 0;
    let last = performance.now();
    const step = (t: number) => {
      const dt = t - last;
      const target = 1000 / fps;
      if (dt >= target) {
        last = t;
        setInternalFrame((f) => {
          const next = f + 1;
          if (next >= totalFrames) {
            onFrameChange?.(totalFrames - 1);
            return totalFrames - 1;
          }
          onFrameChange?.(next);
          return next;
        });
      }
      id = requestAnimationFrame(step);
    };
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [animate, totalFrames, fps, onFrameChange]);

  const activeFrame = frame ?? internalFrame;

  // ─── Contour mode ────────────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== "contour") return;
    const canvas = canvas2dRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // 1. Heatmap (per-pixel sample of the heightfield via bilinear-ish lookup)
    const img = ctx.createImageData(Math.floor(w), Math.floor(h));
    const data = img.data;
    const D = surface.domain;
    const log = !!surface.logScale;
    const { H, fmin, fmax } = heightField;
    for (let py = 0; py < h; py++) {
      const yn = py / (h - 1); // 0..1
      const j = Math.min(RES - 1, Math.floor((1 - yn) * (RES - 1))); // flip y
      for (let px = 0; px < w; px++) {
        const xn = px / (w - 1);
        const i = Math.min(RES - 1, Math.floor(xn * (RES - 1)));
        const v = H[j * RES + i];
        const t = valueToRange(v, fmin, fmax, log);
        const [r, g, b] = lerpColor(t);
        const o = (py * w + px) * 4;
        data[o] = r;
        data[o + 1] = g;
        data[o + 2] = b;
        data[o + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);

    // 2. Iso-contour lines via marching squares on a coarser grid.
    drawIsoLines(ctx, heightField, w, h, log);

    // 3. Trace overlay
    const sx = (x: number) => ((x + D) / (2 * D)) * w;
    const sy = (y: number) => ((D - y) / (2 * D)) * h;

    if (trace) {
      drawTrace(ctx, trace, activeFrame, sx, sy, "#22d3ee");
    }
    if (traceB) {
      drawTrace(ctx, traceB, activeFrame, sx, sy, "#f472b6");
    }
    if (swarm && swarm[activeFrame]) {
      drawSwarm(ctx, swarm[activeFrame], sx, sy, "#22d3ee");
    }
    if (swarmB && swarmB[activeFrame]) {
      drawSwarm(ctx, swarmB[activeFrame], sx, sy, "#f472b6");
    }

    // 4. Global-min marker
    const gm = surface.globalMin;
    if (Number.isFinite(gm.x) && Number.isFinite(gm.y) && Math.abs(gm.x) <= D && Math.abs(gm.y) <= D) {
      const cx = sx(gm.x);
      const cy = sy(gm.y);
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - 9, cy);
      ctx.lineTo(cx + 9, cy);
      ctx.moveTo(cx, cy - 9);
      ctx.lineTo(cx, cy + 9);
      ctx.stroke();
    }
  }, [mode, surface, heightField, trace, traceB, swarm, swarmB, activeFrame]);

  // ─── 3D mode ─────────────────────────────────────────────────────────────
  const threeRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    mesh: THREE.Mesh;
    traceLineA: THREE.Line | null;
    traceLineB: THREE.Line | null;
    swarmDotsA: THREE.Points | null;
    swarmDotsB: THREE.Points | null;
    rafId: number;
  } | null>(null);

  useEffect(() => {
    if (mode !== "3d") return;
    const container = containerRef.current;
    if (!container) return;

    const w = container.clientWidth;
    const h = height;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(w, h);
    renderer.setClearColor(0x0a0a0a, 1);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    const D = surface.domain;
    camera.position.set(D * 1.6, D * 1.6, D * 1.6);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 0, 0);

    // Surface mesh
    const { mesh, zScale } = buildSurfaceMesh(surface, heightField);
    scene.add(mesh);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dir = new THREE.DirectionalLight(0xffffff, 0.7);
    dir.position.set(2, 5, 3);
    scene.add(dir);

    // Wire grid as a faint floor reference
    const grid = new THREE.GridHelper(D * 2, 8, 0x444444, 0x222222);
    grid.position.y = -0.001;
    scene.add(grid);

    threeRef.current = {
      renderer,
      scene,
      camera,
      controls,
      mesh,
      traceLineA: null,
      traceLineB: null,
      swarmDotsA: null,
      swarmDotsB: null,
      rafId: 0,
    };

    // Store displacement params for the trace updater so it can place lines
    // at the correct world Y (matching the log-scaled mesh).
    (mesh.userData as MeshDisplacementMeta).zScale = zScale;
    (mesh.userData as MeshDisplacementMeta).fmin = heightField.fmin;
    (mesh.userData as MeshDisplacementMeta).log = !!surface.logScale;

    const loop = () => {
      controls.update();
      renderer.render(scene, camera);
      threeRef.current!.rafId = requestAnimationFrame(loop);
    };
    threeRef.current.rafId = requestAnimationFrame(loop);

    const handleResize = () => {
      if (!container || !threeRef.current) return;
      const ww = container.clientWidth;
      threeRef.current.renderer.setSize(ww, h);
      threeRef.current.camera.aspect = ww / h;
      threeRef.current.camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(threeRef.current!.rafId);
      controls.dispose();
      renderer.dispose();
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      threeRef.current = null;
    };
  }, [mode, surface, heightField, height]);

  // 3D trace / swarm updater — runs whenever the active frame changes.
  useEffect(() => {
    if (mode !== "3d") return;
    const ctx = threeRef.current;
    if (!ctx) return;
    const { scene, mesh } = ctx;
    const meta = mesh.userData as MeshDisplacementMeta;
    const liftZ = 0.04 * surface.domain;
    const worldY = (v: number) => {
      const shifted = Math.max(0, v - meta.fmin);
      return (meta.log ? Math.log10(shifted + 1) : shifted) * meta.zScale + liftZ;
    };

    const buildLine = (frames: Frame[], upTo: number, color: number): THREE.Line => {
      const pts: THREE.Vector3[] = [];
      const last = Math.min(upTo, frames.length - 1);
      for (let i = 0; i <= last; i++) {
        const f = frames[i];
        pts.push(new THREE.Vector3(f.x, worldY(f.f), f.y));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({ color, linewidth: 2 });
      return new THREE.Line(geo, mat);
    };

    const buildPoints = (population: { x: number; y: number; f: number }[], color: number) => {
      const positions = new Float32Array(population.length * 3);
      for (let i = 0; i < population.length; i++) {
        positions[i * 3] = population[i].x;
        positions[i * 3 + 1] = worldY(population[i].f);
        positions[i * 3 + 2] = population[i].y;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.PointsMaterial({ color, size: 0.22, sizeAttenuation: true });
      return new THREE.Points(geo, mat);
    };

    // dispose old
    [ctx.traceLineA, ctx.traceLineB].forEach((l) => {
      if (l) {
        scene.remove(l);
        l.geometry.dispose();
        (l.material as THREE.Material).dispose();
      }
    });
    [ctx.swarmDotsA, ctx.swarmDotsB].forEach((p) => {
      if (p) {
        scene.remove(p);
        p.geometry.dispose();
        (p.material as THREE.Material).dispose();
      }
    });
    ctx.traceLineA = null;
    ctx.traceLineB = null;
    ctx.swarmDotsA = null;
    ctx.swarmDotsB = null;

    if (trace) {
      const line = buildLine(trace, activeFrame, 0x22d3ee);
      ctx.traceLineA = line;
      scene.add(line);
    }
    if (traceB) {
      const line = buildLine(traceB, activeFrame, 0xf472b6);
      ctx.traceLineB = line;
      scene.add(line);
    }
    if (swarm && swarm[activeFrame]) {
      const pts = buildPoints(swarm[activeFrame], 0x22d3ee);
      ctx.swarmDotsA = pts;
      scene.add(pts);
    }
    if (swarmB && swarmB[activeFrame]) {
      const pts = buildPoints(swarmB[activeFrame], 0xf472b6);
      ctx.swarmDotsB = pts;
      scene.add(pts);
    }
  }, [mode, surface, trace, traceB, swarm, swarmB, activeFrame]);

  // Click-to-pick: works in both modes (in 3D, projects screen click to ground plane y=0)
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onPick) return;
    if (mode === "contour") {
      const canvas = canvas2dRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const D = surface.domain;
      const xn = (e.clientX - rect.left) / rect.width;
      const yn = (e.clientY - rect.top) / rect.height;
      const x = (xn * 2 - 1) * D;
      const y = (1 - yn * 2) * D;
      onPick(x, y);
    } else {
      const ctx = threeRef.current;
      if (!ctx) return;
      const rect = ctx.renderer.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(ndc, ctx.camera);
      const hits = raycaster.intersectObject(ctx.mesh);
      if (hits.length > 0) {
        const p = hits[0].point;
        onPick(p.x, p.z);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      style={{ height, cursor: onPick ? "crosshair" : undefined }}
      className="relative w-full overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800 bg-black"
    >
      {mode === "contour" && (
        <canvas ref={canvas2dRef} className="absolute inset-0 w-full h-full" />
      )}
      <div className="absolute bottom-2 left-2 text-[10px] font-mono uppercase tracking-[0.18em] text-neutral-400 pointer-events-none">
        {surface.name} · {mode === "3d" ? "drag to rotate · click surface" : "click to drop"}
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function drawTrace(
  ctx: CanvasRenderingContext2D,
  trace: Frame[],
  upTo: number,
  sx: (x: number) => number,
  sy: (y: number) => number,
  color: string,
) {
  const last = Math.min(upTo, trace.length - 1);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i <= last; i++) {
    const px = sx(trace[i].x);
    const py = sy(trace[i].y);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // Start dot
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(sx(trace[0].x), sy(trace[0].y), 4, 0, Math.PI * 2);
  ctx.fill();

  // Current head dot
  const head = trace[last];
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(sx(head.x), sy(head.y), 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawSwarm(
  ctx: CanvasRenderingContext2D,
  pop: { x: number; y: number; f: number }[],
  sx: (x: number) => number,
  sy: (y: number) => number,
  color: string,
) {
  ctx.fillStyle = color;
  for (const p of pop) {
    ctx.beginPath();
    ctx.arc(sx(p.x), sy(p.y), 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Cheap iso-contours: draw a few level lines using a coarser sample
function drawIsoLines(
  ctx: CanvasRenderingContext2D,
  hf: HeightField,
  w: number,
  h: number,
  log: boolean,
) {
  const NLINES = 8;
  const { H, fmin, fmax } = hf;
  const levels: number[] = [];
  for (let k = 1; k <= NLINES; k++) {
    const t = k / (NLINES + 1);
    const v = log ? fmin + Math.pow(10, Math.log10(fmax - fmin + 1e-6) * t) - 1e-6 : fmin + t * (fmax - fmin);
    levels.push(v);
  }
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  for (const lv of levels) {
    drawIsoLine(ctx, H, RES, w, h, lv);
  }
}

function drawIsoLine(
  ctx: CanvasRenderingContext2D,
  H: Float32Array,
  res: number,
  w: number,
  h: number,
  level: number,
) {
  // Marching-squares without ambiguity resolution; good enough for visual contours.
  const cellW = w / (res - 1);
  const cellH = h / (res - 1);
  ctx.beginPath();
  for (let j = 0; j < res - 1; j++) {
    for (let i = 0; i < res - 1; i++) {
      const tl = H[j * res + i];
      const tr = H[j * res + i + 1];
      const bl = H[(j + 1) * res + i];
      const br = H[(j + 1) * res + i + 1];
      const idx =
        (tl > level ? 1 : 0) |
        (tr > level ? 2 : 0) |
        (br > level ? 4 : 0) |
        (bl > level ? 8 : 0);
      if (idx === 0 || idx === 15) continue;
      const x0 = i * cellW;
      const y0 = (res - 1 - j) * cellH; // flip y
      const x1 = (i + 1) * cellW;
      const y1 = (res - 2 - j) * cellH;
      const interp = (a: number, b: number) => (level - a) / (b - a);
      // Edges: 0=top, 1=right, 2=bottom, 3=left  (using TL,TR,BR,BL)
      const top = (): [number, number] => [x0 + interp(tl, tr) * cellW, y0];
      const right = (): [number, number] => [x1, y0 - interp(tr, br) * cellH];
      const bot = (): [number, number] => [x0 + interp(bl, br) * cellW, y1];
      const left = (): [number, number] => [x0, y0 - interp(tl, bl) * cellH];
      const draw = (a: [number, number], b: [number, number]) => {
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
      };
      switch (idx) {
        case 1:
        case 14: draw(top(), left()); break;
        case 2:
        case 13: draw(top(), right()); break;
        case 3:
        case 12: draw(left(), right()); break;
        case 4:
        case 11: draw(right(), bot()); break;
        case 5: draw(top(), right()); draw(left(), bot()); break;
        case 6:
        case 9: draw(top(), bot()); break;
        case 7:
        case 8: draw(left(), bot()); break;
        case 10: draw(top(), left()); draw(right(), bot()); break;
      }
    }
  }
  ctx.stroke();
}

function buildSurfaceMesh(
  surface: Surface,
  hf: HeightField,
): { mesh: THREE.Mesh; zScale: number } {
  const D = surface.domain;
  const geo = new THREE.PlaneGeometry(D * 2, D * 2, RES - 1, RES - 1);
  geo.rotateX(-Math.PI / 2);
  const positions = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(positions.count * 3);
  const log = !!surface.logScale;
  const { H, fmin, fmax } = hf;
  // Choose a vertical scale that keeps the surface readable: target peak ~D.
  const range = Math.max(1e-6, fmax - fmin);
  const zScale = (D * 0.9) / (log ? Math.log10(range + 1) : range);

  for (let j = 0; j < RES; j++) {
    for (let i = 0; i < RES; i++) {
      const idx = j * RES + i;
      const v = H[idx];
      const z = log ? Math.log10(Math.max(0, v - fmin) + 1) * zScale : (v - fmin) * zScale;
      // PlaneGeometry vertex ordering: row major, top-to-bottom in original (y),
      // but rotated. The displaced axis after our X rotation is Y in world space.
      // We compute world coords on the fly from i,j to be safe.
      const wx = ((i / (RES - 1)) * 2 - 1) * D;
      const wz = ((j / (RES - 1)) * 2 - 1) * D;
      // The default PlaneGeometry indexing matches (i,j) row-major in positions,
      // so we set x and z exactly here too:
      positions.setXYZ(idx, wx, z, wz);
      const t = valueToRange(v, fmin, fmax, log);
      const [r, g, b] = lerpColor(t);
      colors[idx * 3] = r / 255;
      colors[idx * 3 + 1] = g / 255;
      colors[idx * 3 + 2] = b / 255;
    }
  }
  positions.needsUpdate = true;
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.85,
    metalness: 0.05,
    side: THREE.DoubleSide,
    flatShading: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  return { mesh, zScale };
}
