"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { DemoFootnote, DemoHeader, DemoPage, DemoPanel } from "@/components/ui";

import {
  dft,
  makeHeartPath,
  makeLissajousPath,
  makeSpiralPath,
  reconstructPath,
  resampleClosedPath,
  type FourierTerm,
  type Point,
} from "./math";

const PRESETS: Array<{ label: string; create: () => Point[] }> = [
  { label: "Heart", create: () => makeHeartPath() },
  { label: "Lissajous", create: () => makeLissajousPath() },
  { label: "Spiral", create: () => makeSpiralPath() },
];

const SAMPLE_COUNT = 128;

function drawPolyline(
  context: CanvasRenderingContext2D,
  points: readonly Point[],
  project: (point: Point) => Point,
): void {
  if (points.length === 0) return;
  context.beginPath();
  points.forEach((point, index) => {
    const screen = project(point);
    if (index === 0) context.moveTo(screen.x, screen.y);
    else context.lineTo(screen.x, screen.y);
  });
  context.stroke();
}

function FourierCanvas({
  path,
  terms,
  reconstruction,
  time,
  drawing,
  onStartStroke,
  onContinueStroke,
  onFinishStroke,
}: {
  path: Point[];
  terms: FourierTerm[];
  reconstruction: Point[];
  time: number;
  drawing: boolean;
  onStartStroke: (event: ReactPointerEvent<HTMLCanvasElement>) => void;
  onContinueStroke: (event: ReactPointerEvent<HTMLCanvasElement>) => void;
  onFinishStroke: (event: ReactPointerEvent<HTMLCanvasElement>) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const update = () => {
      const rect = canvas.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.width <= 0 || size.height <= 0) return;
    const dpr = window.devicePixelRatio || 1;
    const pixelWidth = Math.max(1, Math.round(size.width * dpr));
    const pixelHeight = Math.max(1, Math.round(size.height * dpr));
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, size.width, size.height);
    const scale = Math.min(size.width, size.height) * 0.42;
    const project = (point: Point): Point => ({
      x: size.width / 2 + point.x * scale,
      y: size.height / 2 - point.y * scale,
    });

    context.lineWidth = 1;
    context.strokeStyle = "rgba(115, 115, 115, 0.20)";
    for (let coordinate = -1; coordinate <= 1; coordinate += 0.5) {
      const a = project({ x: coordinate, y: -1.1 });
      const b = project({ x: coordinate, y: 1.1 });
      context.beginPath(); context.moveTo(a.x, a.y); context.lineTo(b.x, b.y); context.stroke();
      const c = project({ x: -1.1, y: coordinate });
      const d = project({ x: 1.1, y: coordinate });
      context.beginPath(); context.moveTo(c.x, c.y); context.lineTo(d.x, d.y); context.stroke();
    }
    context.setLineDash([4, 5]);
    context.lineWidth = 1.2;
    context.strokeStyle = drawing ? "rgba(245, 158, 11, 0.92)" : "rgba(6, 182, 212, 0.44)";
    drawPolyline(context, path, project);
    context.setLineDash([]);

    if (reconstruction.length > 0) {
      context.lineWidth = 2.1;
      context.strokeStyle = "rgba(217, 70, 239, 0.88)";
      drawPolyline(context, reconstruction, project);
    }

    if (terms.length > 0) {
      let current: Point = { x: 0, y: 0 };
      context.lineWidth = 1;
      terms.forEach((term) => {
        const angle = 2 * Math.PI * term.frequency * time;
        const next: Point = {
          x: current.x + term.re * Math.cos(angle) - term.im * Math.sin(angle),
          y: current.y + term.re * Math.sin(angle) + term.im * Math.cos(angle),
        };
        const center = project(current);
        context.strokeStyle = "rgba(245, 158, 11, 0.34)";
        context.beginPath();
        context.arc(center.x, center.y, term.amplitude * scale, 0, Math.PI * 2);
        context.stroke();
        const projectedNext = project(next);
        context.strokeStyle = "rgba(245, 158, 11, 0.92)";
        context.beginPath(); context.moveTo(center.x, center.y); context.lineTo(projectedNext.x, projectedNext.y); context.stroke();
        current = next;
      });
      const head = project(current);
      context.fillStyle = "rgba(217, 70, 239, 1)";
      context.beginPath(); context.arc(head.x, head.y, 5, 0, Math.PI * 2); context.fill();
    }

    context.fillStyle = "rgba(82, 82, 82, 0.84)";
    context.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
    context.fillText(path.length < 2 ? "draw one continuous stroke" : "cyan = source · magenta = Fourier reconstruction", 12, size.height - 15);
  }, [drawing, path, reconstruction, size, terms, time]);

  return (
    <canvas
      ref={canvasRef}
      className="block h-[330px] w-full cursor-crosshair touch-none sm:h-[430px]"
      onPointerDown={onStartStroke}
      onPointerMove={onContinueStroke}
      onPointerUp={onFinishStroke}
      onPointerCancel={onFinishStroke}
      aria-label="Draw a closed path to decompose it into Fourier components"
    />
  );
}

function formatAmplitude(value: number): string {
  return value.toFixed(3);
}

export default function FourierSketchPage() {
  const [path, setPath] = useState<Point[]>(() => makeHeartPath());
  const [harmonics, setHarmonics] = useState(14);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [drawing, setDrawing] = useState(false);

  const samples = useMemo(() => resampleClosedPath(path, SAMPLE_COUNT), [path]);
  const allTerms = useMemo(() => dft(samples), [samples]);
  const componentCount = Math.min(Math.max(harmonics, 1), allTerms.length);
  const visibleTerms = useMemo(() => allTerms.slice(0, componentCount), [allTerms, componentCount]);
  const reconstruction = useMemo(() => reconstructPath(visibleTerms, 240), [visibleTerms]);
  const maxComponents = Math.max(1, allTerms.length);

  useEffect(() => {
    if (!playing || drawing || visibleTerms.length === 0) return;
    let animationFrame = 0;
    let previous = performance.now();
    const tick = (now: number) => {
      const delta = Math.min(now - previous, 60);
      previous = now;
      setTime((current) => (current + (delta * speed) / 9000) % 1);
      animationFrame = requestAnimationFrame(tick);
    };
    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, [drawing, playing, speed, visibleTerms.length]);

  const pointFromEvent = useCallback((event: ReactPointerEvent<HTMLCanvasElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    const scale = Math.min(rect.width, rect.height) * 0.42;
    return {
      x: Math.max(-1.12, Math.min(1.12, (event.clientX - rect.left - rect.width / 2) / scale)),
      y: Math.max(-1.12, Math.min(1.12, -(event.clientY - rect.top - rect.height / 2) / scale)),
    };
  }, []);

  const startStroke = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrawing(true);
    setPlaying(false);
    setTime(0);
    setPath([pointFromEvent(event)]);
  }, [pointFromEvent]);
  const continueStroke = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawing) return;
    const next = pointFromEvent(event);
    setPath((current) => {
      const previous = current.at(-1);
      return previous && Math.hypot(previous.x - next.x, previous.y - next.y) < 0.012 ? current : [...current, next];
    });
  }, [drawing, pointFromEvent]);
  const finishStroke = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setDrawing(false);
  }, []);
  const loadPreset = (create: () => Point[]) => {
    setTime(0);
    setPath(create());
    setPlaying(true);
  };
  const clearSketch = () => {
    setTime(0);
    setPlaying(false);
    setPath([]);
  };

  return (
    <DemoPage width="2xl">
      <DemoHeader
        eyebrow="Signals / complex Fourier series"
        title="Fourier Sketch"
        description="Draw a path. The browser samples it as a periodic complex signal, finds its Fourier coefficients, and rebuilds the drawing with rotating vectors."
        actions={
          <div className="flex gap-2">
            <button type="button" onClick={() => setPlaying((current) => !current)} className="border border-fuchsia-500 bg-fuchsia-500/10 px-3 py-2 font-mono text-xs uppercase tracking-[0.14em] text-fuchsia-700 transition hover:bg-fuchsia-500/20 dark:text-fuchsia-300">{playing ? "Pause" : "Animate"}</button>
            <button type="button" onClick={clearSketch} className="border border-[var(--line)] px-3 py-2 font-mono text-xs uppercase tracking-[0.14em] text-neutral-500 transition hover:border-fuchsia-500/60">Clear</button>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(330px,0.75fr)]">
        <DemoPanel title="Draw → decompose → trace" description="Drag one continuous stroke in the field. The cyan dashed source is closed before sampling; magenta is its retained Fourier reconstruction." padding="none">
          <FourierCanvas path={path} terms={visibleTerms} reconstruction={reconstruction} time={time} drawing={drawing} onStartStroke={startStroke} onContinueStroke={continueStroke} onFinishStroke={finishStroke} />
        </DemoPanel>

        <div className="space-y-6">
          <DemoPanel title="Signal controls" description="More components retain more detail; the largest amplitudes are added first." padding="md">
            <label className="block font-mono text-xs uppercase tracking-[0.14em] text-neutral-500">Retained components <span className="ml-2 text-fuchsia-700 dark:text-fuchsia-300">{componentCount} of {allTerms.length || 0}</span><input type="range" min="1" max={maxComponents} step="1" value={Math.min(harmonics, maxComponents)} onChange={(event) => setHarmonics(Number(event.target.value))} className="mt-3 block w-full accent-fuchsia-500" disabled={allTerms.length === 0} /></label>
            <div className="mt-3 grid grid-cols-3 gap-1">
              {[12, 40].map((count) => <button key={count} type="button" onClick={() => setHarmonics(Math.min(count, maxComponents))} className="border border-[var(--line)] px-2 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-neutral-500 transition hover:border-fuchsia-500 hover:text-fuchsia-700 dark:hover:text-fuchsia-300">Use {count}</button>)}
              <button type="button" onClick={() => setHarmonics(maxComponents)} className="border border-fuchsia-500/50 bg-fuchsia-500/5 px-2 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-fuchsia-700 transition hover:bg-fuchsia-500/10 dark:text-fuchsia-300">Use all {allTerms.length || 0}</button>
            </div>
            <label className="mt-5 block font-mono text-xs uppercase tracking-[0.14em] text-neutral-500">Angular speed <span className="ml-2 text-amber-700 dark:text-amber-300">{speed.toFixed(1)}×</span><input type="range" min="0.2" max="2.4" step="0.1" value={speed} onChange={(event) => setSpeed(Number(event.target.value))} className="mt-3 block w-full accent-amber-500" /></label>
            <div className="mt-5 grid grid-cols-3 gap-1">
              {PRESETS.map((preset) => <button key={preset.label} type="button" onClick={() => loadPreset(preset.create)} className="border border-[var(--line)] px-2 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-neutral-500 transition hover:border-cyan-500 hover:text-cyan-700 dark:hover:text-cyan-300">{preset.label}</button>)}
            </div>
          </DemoPanel>
          <DemoPanel title="Sampling ledger" padding="md">
            <div className="grid grid-cols-3 gap-px border border-[var(--line)] bg-[var(--line)] font-mono text-xs"><div className="bg-[var(--surface)] p-3"><span className="block text-[10px] uppercase tracking-[0.12em] text-neutral-500">stroke points</span><strong>{path.length}</strong></div><div className="bg-[var(--surface)] p-3"><span className="block text-[10px] uppercase tracking-[0.12em] text-neutral-500">DFT samples</span><strong>{samples.length}</strong></div><div className="bg-[var(--surface)] p-3"><span className="block text-[10px] uppercase tracking-[0.12em] text-neutral-500">time</span><strong>{time.toFixed(3)}</strong></div></div>
            <p className="mt-4 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">Every component is one complex coefficient: a radius, a phase, and an integer rotation frequency. Their vector sum is the tracing point.</p>
            <p className="mt-3 text-xs leading-relaxed text-neutral-500">All {SAMPLE_COUNT} terms exactly reproduce this {SAMPLE_COUNT}-sample signal. More than {SAMPLE_COUNT} terms would add no information unless the sketch is sampled more densely.</p>
          </DemoPanel>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(330px,0.85fr)]">
        <DemoPanel className="min-w-0" title="Dominant components" description="The circle radii in the canvas are coefficient amplitudes." padding="md">
          <div className="overflow-x-auto"><table className="w-full border-collapse font-mono text-xs sm:min-w-[540px]"><thead className="border-b border-[var(--line)] text-left text-[10px] uppercase tracking-[0.14em] text-neutral-500"><tr><th className="pb-2 font-normal">rank</th><th className="pb-2 font-normal">frequency</th><th className="pb-2 font-normal">amplitude</th><th className="pb-2 font-normal">phase</th><th className="hidden pb-2 font-normal sm:table-cell">relative radius</th></tr></thead><tbody>{allTerms.slice(0, 8).map((term, index) => <tr key={`${term.frequency}-${index}`} className="border-b border-[var(--line)]"><td className="py-2 text-neutral-500">{index + 1}</td><td className="py-2 text-amber-700 dark:text-amber-300">{term.frequency >= 0 ? "+" : ""}{term.frequency}</td><td className="py-2 tabular-nums">{formatAmplitude(term.amplitude)}</td><td className="py-2 tabular-nums text-neutral-500">{Math.round((term.phase * 180) / Math.PI)}°</td><td className="hidden py-2 sm:table-cell"><span className="block h-1.5 max-w-44 bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)]"><span className="block h-full bg-amber-500" style={{ width: `${allTerms[0] ? ((term.amplitude / allTerms[0].amplitude) * 100).toFixed(3) : "0"}%` }} /></span></td></tr>)}</tbody></table></div>
        </DemoPanel>
        <DemoPanel className="min-w-0" title="The equation behind the pen" padding="md">
          <div className="border border-fuchsia-500/25 bg-fuchsia-500/5 p-4 font-mono text-sm leading-8 text-fuchsia-800 dark:text-fuchsia-200">z(t) = Σₖ cₖ · e<sup>i2πkt</sup></div>
          <p className="mt-4 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">The direct discrete Fourier transform (DFT) computes the cₖ values from {SAMPLE_COUNT} evenly spaced samples. Using all {SAMPLE_COUNT} coefficients reconstructs that sampled periodic signal. A 1024-term version would need 1024 samples and a faster FFT, otherwise it would only duplicate frequency information.</p>
        </DemoPanel>
      </div>

      <DemoFootnote align="left">A freehand path is not naturally periodic, so this demo closes the final point back to the first before taking the DFT. Try a loop for the cleanest reconstruction.</DemoFootnote>
    </DemoPage>
  );
}
