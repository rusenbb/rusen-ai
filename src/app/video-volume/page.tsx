"use client";

import { useEffect, useRef, useState } from "react";
import {
  Button,
  DemoFootnote,
  DemoHeader,
  DemoMutedSection,
  DemoPage,
  DemoPanel,
} from "@/components/ui";
import {
  clamp,
  DEFAULT_PITCH,
  DEFAULT_YAW,
  DURATION,
  HEIGHT,
  matchingKinds,
  tracksAt,
  WIDTH,
} from "./scene";
import { drawFrame, drawVolume } from "./render";

const inputClass =
  "w-full accent-emerald-600 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-500";

export default function VideoVolumePage() {
  const [time, setTime] = useState(0.35);
  const [query, setQuery] = useState("car");
  const [yaw, setYaw] = useState(DEFAULT_YAW);
  const [pitch, setPitch] = useState(DEFAULT_PITCH);
  const [depth, setDepth] = useState(800);
  const [ghosts, setGhosts] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [mode, setMode] = useState<"slice" | "orbit">("slice");
  const volume = useRef<HTMLCanvasElement>(null);
  const preview = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    time: number;
    yaw: number;
    pitch: number;
  } | null>(null);
  const kinds = matchingKinds(query);
  const matches = tracksAt(time).filter((track) => kinds.includes(track.kind));
  const seconds = (time * DURATION).toFixed(2);

  useEffect(() => {
    const canvas = volume.current;
    if (!canvas) return;
    const frame = document.createElement("canvas");
    frame.width = WIDTH;
    frame.height = HEIGHT;
    const render = () => {
      drawVolume(canvas, frame, {
        time,
        yaw,
        pitch,
        depth,
        kinds: matchingKinds(query),
        ghosts,
      });
      const context = preview.current?.getContext("2d");
      if (context) drawFrame(context, time, matchingKinds(query));
    };
    render();
    const observer = new ResizeObserver(render);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [time, yaw, pitch, depth, query, ghosts]);

  useEffect(() => {
    if (!playing) return;
    let request = 0,
      previous: number | undefined;
    const tick = (now: number) => {
      if (previous !== undefined) {
        const delta = Math.min((now - previous) / 1000, 0.1) / DURATION;
        setTime((value) => (value + delta) % 1);
      }
      previous = now;
      request = requestAnimationFrame(tick);
    };
    request = requestAnimationFrame(tick);
    const pauseWhenHidden = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener("visibilitychange", pauseWhenHidden);
    return () => {
      cancelAnimationFrame(request);
      document.removeEventListener("visibilitychange", pauseWhenHidden);
    };
  }, [playing]);

  function reset() {
    setPlaying(false);
    setTime(0.35);
    setQuery("car");
    setYaw(DEFAULT_YAW);
    setPitch(DEFAULT_PITCH);
    setDepth(800);
    setGhosts(true);
    setMode("slice");
    drag.current = null;
  }

  return (
    <DemoPage width="2xl">
      <DemoHeader
        eyebrow="Space × time"
        title="Video Volume"
        description="Pull a moment out of a moving scene. Stack its frames, then follow the shapes that cars and people trace through time."
        actions={<Button onClick={reset}>Reset</Button>}
      />
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="w-full max-w-md">
          <label
            htmlFor="object-query"
            className="mb-2 block text-xs font-mono uppercase tracking-wider"
          >
            Find objects in time
          </label>
          <input
            id="object-query"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Try car, person, or all"
            aria-describedby="query-help query-result"
            autoComplete="off"
            className="w-full border border-[var(--line)] bg-transparent px-4 py-3 text-base focus-visible:outline-2 focus-visible:outline-emerald-500"
          />
          <p id="query-help" className="mt-2 text-xs text-neutral-500">
            Filter the authored tracks: car, person, or all.
          </p>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Object presets">
          {["car", "person", "all"].map((word) => (
            <Button
              key={word}
              aria-pressed={query.trim().toLowerCase() === word}
              variant={
                query.trim().toLowerCase() === word ? "primary" : "secondary"
              }
              onClick={() => setQuery(word)}
            >
              {word === "car"
                ? "Cars"
                : word === "person"
                  ? "People"
                  : "All objects"}
            </Button>
          ))}
        </div>
      </div>
      <div className="overflow-hidden border border-[var(--line)]">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#090e12] px-4 pt-4 text-[#afc0c7]">
          <p className="text-[11px] font-mono uppercase tracking-[.15em]">
            8 seconds / 49 contour slices
          </p>
          <p className="text-xs">
            {mode === "slice"
              ? "Drag sideways to move through time"
              : "Drag to rotate the volume"}
          </p>
        </div>
        <canvas
          ref={volume}
          role="img"
          aria-label={`Time volume at ${seconds} seconds; ${matches.length} highlighted objects. Use the time and view controls below to explore.`}
          className="block h-[340px] w-full cursor-grab touch-pan-y active:cursor-grabbing sm:h-[500px] lg:h-[560px]"
          style={{ touchAction: mode === "orbit" ? "none" : "pan-y" }}
          onPointerDown={(event) => {
            if (event.button !== 0 || !event.isPrimary) return;
            setPlaying(false);
            event.currentTarget.setPointerCapture(event.pointerId);
            drag.current = {
              id: event.pointerId,
              x: event.clientX,
              y: event.clientY,
              time,
              yaw,
              pitch,
            };
          }}
          onPointerMove={(event) => {
            const start = drag.current;
            if (!start || start.id !== event.pointerId) return;
            const dx = event.clientX - start.x,
              dy = event.clientY - start.y;
            if (mode === "slice")
              setTime(
                clamp(
                  start.time + dx / (event.currentTarget.clientWidth * 0.65),
                ),
              );
            else {
              setYaw(clamp(start.yaw + dx * 0.18, 15, 70));
              setPitch(clamp(start.pitch - dy * 0.13, -20, 35));
            }
          }}
          onPointerUp={() => {
            drag.current = null;
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
          onLostPointerCapture={() => {
            drag.current = null;
          }}
        >
          A street scene stacked along time. Cars form moving ribbons;
          pedestrians form walking silhouettes. All controls are available
          below.
        </canvas>
        <div className="space-y-4 border-t border-[var(--line)] p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => setPlaying((value) => !value)}
                aria-pressed={playing}
              >
                {playing ? "Pause" : "Play"}
              </Button>
              <Button
                aria-pressed={mode === "slice"}
                onClick={() => setMode("slice")}
              >
                Drag time
              </Button>
              <Button
                aria-pressed={mode === "orbit"}
                onClick={() => setMode("orbit")}
              >
                Rotate
              </Button>
            </div>
            <output
              aria-live="off"
              htmlFor="time"
              className="font-mono text-sm tabular-nums"
              data-testid="time-output"
            >
              {seconds} / 8.00 s
            </output>
          </div>
          <label
            htmlFor="time"
            className="block text-xs font-mono uppercase tracking-wider"
          >
            Time slice
          </label>
          <input
            id="time"
            aria-valuetext={`${seconds} seconds`}
            type="range"
            min="0"
            max="1"
            step="0.0025"
            value={time}
            onChange={(event) => {
              setPlaying(false);
              setTime(Number(event.target.value));
            }}
            className={inputClass}
          />
          <div className="flex justify-between font-mono text-[10px] text-neutral-500">
            <span>0 s · START</span>
            <span>4 s</span>
            <span>8 s · END</span>
          </div>
        </div>
      </div>
      <p
        id="query-result"
        role="status"
        aria-label="Object filter results"
        className="my-4 min-h-5 text-sm text-neutral-500"
      >
        {matches.length
          ? `${matches.length} tracks visible · ${kinds.length === 2 ? "cars and people" : kinds[0] === "car" ? "cars" : "people"}. Color follows each object across time.`
          : "No matching tracks. Try car, person, or all."}
      </p>
      <div className="grid gap-6 lg:grid-cols-2">
        <DemoPanel
          title="The selected moment"
          description="The bright plane in the volume is this frame. Its horizontal and vertical axes are image coordinates; the third axis is time."
        >
          <canvas
            ref={preview}
            width={WIDTH}
            height={HEIGHT}
            role="img"
            aria-label={`Street scene at ${seconds} seconds, with ${matches.length} highlighted objects.`}
            className="mt-4 block w-full border border-[var(--line)]"
          >
            Selected frame of the original synthetic street animation.
          </canvas>
          <ul
            className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs"
            aria-label="Track legend"
          >
            {matches.map((track) => (
              <li key={track.id} className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-2 w-2 rounded-full border border-neutral-500"
                  style={{ background: track.color }}
                />
                {track.id}
              </li>
            ))}
          </ul>
        </DemoPanel>
        <DemoPanel
          title="View controls"
          description="Explore from another angle, or spread the frames apart. These controls also provide a keyboard alternative to dragging."
        >
          <div className="mt-5 space-y-5">
            <label className="block text-xs">
              Rotation · {yaw.toFixed(0)}°
              <input
                aria-label="Rotation"
                type="range"
                min="15"
                max="70"
                value={yaw}
                onChange={(e) => setYaw(Number(e.target.value))}
                className={`${inputClass} mt-3 block`}
              />
            </label>
            <label className="block text-xs">
              Tilt · {pitch.toFixed(0)}°
              <input
                aria-label="Tilt"
                type="range"
                min="-20"
                max="35"
                value={pitch}
                onChange={(e) => setPitch(Number(e.target.value))}
                className={`${inputClass} mt-3 block`}
              />
            </label>
            <label className="block text-xs">
              Time-axis spacing
              <input
                aria-label="Time-axis spacing"
                type="range"
                min="400"
                max="1200"
                step="20"
                value={depth}
                onChange={(e) => setDepth(Number(e.target.value))}
                className={`${inputClass} mt-3 block`}
              />
            </label>
            <label className="flex min-h-10 items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={ghosts}
                onChange={(e) => setGhosts(e.target.checked)}
                className="h-4 w-4 accent-emerald-600"
              />
              Show faint frame stack
            </label>
          </div>
        </DemoPanel>
      </div>
      <DemoMutedSection title="Reading the volume" className="mt-6">
        <div className="grid gap-5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400 sm:grid-cols-3">
          <p>
            <strong className="text-foreground">
              A frame becomes a slice.
            </strong>{" "}
            Moving the white plane changes the selected moment while the whole
            eight-second sequence stays in view.
          </p>
          <p>
            <strong className="text-foreground">Motion becomes a shape.</strong>{" "}
            Moving cars leave slanted ribbons. The parked car stays in the same
            image position, making a straight extrusion along time.
          </p>
          <p>
            <strong className="text-foreground">
              A filter reveals tracks.
            </strong>{" "}
            Each color belongs to one object. Try people to see how walking
            changes a silhouette from moment to moment.
          </p>
        </div>
      </DemoMutedSection>
      <DemoFootnote>
        Original procedural scene with authored object contours. This demo
        illustrates the interaction; it does not run video segmentation or
        accept uploaded footage. Runs locally in your browser, with no model
        download. Playback starts only when you press Play.
      </DemoFootnote>
    </DemoPage>
  );
}
