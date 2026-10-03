"use client";
import { useEffect, useId, useRef, useState, type PointerEvent } from "react";
import { Button } from "@/components/ui";
import { clamp, DEFAULT_PITCH, DEFAULT_YAW, HEIGHT, WIDTH } from "./scene";
import { createVolumeCache, drawVolume, type VolumeCache } from "./render";
import type { Gallery } from "./gallery";
const rangeClass =
  "w-full accent-emerald-600 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-500";
type Props = {
  gallery: Gallery;
  title: string;
  fps: number;
  index: number;
  filter: string;
  playing: boolean;
  onIndex: (index: number) => void;
  onPlaying: (playing: boolean) => void;
};
type Position = { x: number; y: number };
export function VolumeViewer({
  gallery,
  title,
  fps,
  index,
  filter,
  playing,
  onIndex,
  onPlaying,
}: Props) {
  const [yaw, setYaw] = useState(DEFAULT_YAW),
    [pitch, setPitch] = useState(DEFAULT_PITCH),
    [depth, setDepth] = useState(800),
    [zoom, setZoom] = useState(1),
    [ghosts, setGhosts] = useState(true),
    [mode, setMode] = useState<"orbit" | "slice">("orbit"),
    [expanded, setExpanded] = useState(false),
    [notice, setNotice] = useState("");
  const surface = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null),
    frame = useRef<HTMLCanvasElement | null>(null),
    dialog = useRef<HTMLDialogElement>(null),
    opener = useRef<HTMLButtonElement>(null);
  const cache = useRef<VolumeCache | null>(null);
  const request = useRef(0),
    redraw = useRef<() => void>(() => {});
  const nativeOwned = useRef(false),
    transition = useRef(0),
    pointers = useRef(new Map<number, Position>());
  const drag = useRef<{
      x: number;
      y: number;
      yaw: number;
      pitch: number;
      index: number;
    } | null>(null),
    pinch = useRef<{ distance: number; zoom: number } | null>(null);
  const id = useId(),
    last = gallery.frames.length - 1,
    seconds = (index / fps).toFixed(3);
  const clearGesture = () => {
    pointers.current.clear();
    drag.current = null;
    pinch.current = null;
  };
  function closeExpanded() {
    transition.current++;
    nativeOwned.current = false;
    clearGesture();
    setExpanded(false);
    if (document.fullscreenElement === surface.current)
      void document.exitFullscreen().catch(() => {});
    requestAnimationFrame(() => opener.current?.focus());
  }
  function openExpanded() {
    const current = ++transition.current;
    setNotice("");
    setMode("orbit");
    clearGesture();
    setExpanded(true);
    requestAnimationFrame(() => {
      if (transition.current !== current) return;
      const target = surface.current;
      if (!document.fullscreenEnabled || !target?.requestFullscreen) {
        setNotice(
          "Expanded view is active. This browser does not support native fullscreen.",
        );
        return;
      }
      void target
        .requestFullscreen()
        .then(() => {
          if (transition.current !== current) {
            if (document.fullscreenElement)
              void document.exitFullscreen().catch(() => {});
            return;
          }
          nativeOwned.current = true;
        })
        .catch(() => {
          if (transition.current === current)
            setNotice(
              "Expanded view is active. Native fullscreen was unavailable.",
            );
        });
    });
  }

  useEffect(() => {
    if (!expanded) return;
    const modal = dialog.current!;
    modal.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const exited = () => {
      if (nativeOwned.current && !document.fullscreenElement) {
        nativeOwned.current = false;
        setExpanded(false);
        requestAnimationFrame(() => opener.current?.focus());
      }
    };
    document.addEventListener("fullscreenchange", exited);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("fullscreenchange", exited);
      modal.close();
    };
  }, [expanded]);
  useEffect(
    () => () => {
      transition.current++;
      if (nativeOwned.current && document.fullscreenElement) {
        nativeOwned.current = false;
        void document.exitFullscreen().catch(() => {});
      }
    },
    [],
  );
  useEffect(() => {
    const target = canvas.current;
    if (!target) return;
    if (!frame.current) {
      frame.current = document.createElement("canvas");
      frame.current.width = WIDTH;
      frame.current.height = HEIGHT;
    }
    if (!cache.current) cache.current = createVolumeCache();
    const render = () => {
      cancelAnimationFrame(request.current);
      request.current = requestAnimationFrame(() =>
        drawVolume(
          target,
          frame.current!,
          gallery,
          {
            index,
            filter,
            yaw,
            pitch,
            depth,
            zoom,
            ghosts,
          },
          cache.current!,
        ),
      );
    };
    redraw.current = render;
    render();
    return () => cancelAnimationFrame(request.current);
  }, [gallery, index, filter, yaw, pitch, depth, zoom, ghosts, expanded]);
  useEffect(() => {
    const target = canvas.current;
    if (!target) return;
    const observer = new ResizeObserver(() => redraw.current());
    observer.observe(target);
    return () => observer.disconnect();
  }, [expanded]);
  useEffect(() => {
    if (!expanded || !canvas.current) return;
    const target = canvas.current;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      setZoom((value) =>
        clamp(
          value * Math.exp(-clamp(event.deltaY, -100, 100) * 0.003),
          0.5,
          2.5,
        ),
      );
    };
    target.addEventListener("wheel", wheel, { passive: false });
    return () => target.removeEventListener("wheel", wheel);
  }, [expanded]);
  function resetView() {
    setYaw(DEFAULT_YAW);
    setPitch(DEFAULT_PITCH);
    setDepth(800);
    setZoom(1);
    setGhosts(true);
    setMode("orbit");
    clearGesture();
  }
  function pointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (event.button !== 0) return;
    onPlaying(false);
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    const points = [...pointers.current.values()];
    if (points.length === 2) {
      pinch.current = {
        distance: Math.hypot(
          points[0].x - points[1].x,
          points[0].y - points[1].y,
        ),
        zoom,
      };
      drag.current = null;
    } else if (points.length === 1)
      drag.current = { x: event.clientX, y: event.clientY, yaw, pitch, index };
  }
  function pointerMove(event: PointerEvent<HTMLCanvasElement>) {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    const points = [...pointers.current.values()];
    if (points.length >= 2 && pinch.current) {
      const distance = Math.hypot(
        points[0].x - points[1].x,
        points[0].y - points[1].y,
      );
      if (pinch.current.distance > 0)
        setZoom(
          clamp(
            (pinch.current.zoom * distance) / pinch.current.distance,
            0.5,
            2.5,
          ),
        );
      return;
    }
    const start = drag.current;
    if (!start) return;
    const dx = event.clientX - start.x,
      dy = event.clientY - start.y;
    if (mode === "slice")
      onIndex(
        Math.round(
          clamp(
            start.index + (dx / (event.currentTarget.clientWidth * 0.7)) * last,
            0,
            last,
          ),
        ),
      );
    else {
      setYaw(((((start.yaw + dx * 0.45 + 180) % 360) + 360) % 360) - 180);
      setPitch(clamp(start.pitch - dy * 0.35, -70, 70));
    }
  }
  function pointerEnd(event: PointerEvent<HTMLCanvasElement>) {
    pointers.current.delete(event.pointerId);
    pinch.current = null;
    const remaining = [...pointers.current.values()][0];
    drag.current = remaining ? { ...remaining, yaw, pitch, index } : null;
  }
  const content = (
    <div
      ref={surface}
      className={
        expanded
          ? "flex h-dvh w-screen flex-col overflow-auto bg-[var(--background)]"
          : "overflow-hidden border border-[var(--line)]"
      }
    >
      <div
        className={`flex flex-wrap items-center justify-between gap-3 bg-[#090e12] p-3 text-xs text-[#afc0c7] ${expanded ? "sticky top-0 z-10" : ""}`}
      >
        <div>
          <h2
            id={expanded ? `${id}-title` : undefined}
            className="font-mono text-sm text-white"
          >
            {title}
          </h2>
          <p className="mt-1">
            3 seconds · {gallery.frames.length} analyzed frames · {fps} fps
          </p>
        </div>
        {expanded ? (
          <Button
            style={{ color: "white", borderColor: "#87979b" }}
            onClick={closeExpanded}
          >
            Close fullscreen
          </Button>
        ) : (
          <Button
            ref={opener}
            style={{ color: "white", borderColor: "#87979b" }}
            onClick={openExpanded}
          >
            Fullscreen
          </Button>
        )}
      </div>
      <canvas
        ref={canvas}
        role="img"
        tabIndex={0}
        aria-label={`Time volume at ${seconds} seconds. Drag to ${mode === "orbit" ? "rotate" : "scrub time"}; keyboard controls below.`}
        aria-describedby={`${id}-help`}
        className={`block w-full cursor-grab select-none bg-[#090e12] active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-emerald-400 ${expanded ? "min-h-[140px]" : "h-[340px] sm:h-[500px] lg:h-[560px]"}`}
        style={{
          height: expanded ? "max(140px, calc(100dvh - 285px))" : undefined,
          touchAction: mode === "orbit" ? "none" : "pan-y",
        }}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerEnd}
        onPointerCancel={clearGesture}
        onLostPointerCapture={pointerEnd}
        onKeyDown={(e) => {
          if (e.ctrlKey || e.metaKey || e.altKey) return;
          if (
            [
              "ArrowLeft",
              "ArrowRight",
              "ArrowUp",
              "ArrowDown",
              "+",
              "=",
              "-",
              "0",
            ].includes(e.key)
          ) {
            e.preventDefault();
            if (e.key === "0") resetView();
            else if (e.key === "+" || e.key === "=")
              setZoom((z) => clamp(z + 0.1, 0.5, 2.5));
            else if (e.key === "-") setZoom((z) => clamp(z - 0.1, 0.5, 2.5));
            else if (e.key === "ArrowLeft" || e.key === "ArrowRight")
              setYaw((y) =>
                clamp(y + (e.key === "ArrowRight" ? 5 : -5), -180, 180),
              );
            else
              setPitch((p) =>
                clamp(p + (e.key === "ArrowUp" ? 5 : -5), -70, 70),
              );
          }
        }}
      >
        Real frames and AI silhouettes stacked through time. Use the timeline
        and camera controls below.
      </canvas>
      <div className="space-y-3 p-3 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => onPlaying(!playing)} aria-pressed={playing}>
              {playing ? "Pause" : "Play"}
            </Button>
            <Button
              onClick={() => {
                clearGesture();
                setMode("orbit");
              }}
              aria-pressed={mode === "orbit"}
            >
              Rotate
            </Button>
            <Button
              onClick={() => {
                clearGesture();
                setMode("slice");
              }}
              aria-pressed={mode === "slice"}
            >
              Drag time
            </Button>
            <Button onClick={resetView}>Reset view</Button>
          </div>
          <output
            data-testid="time-output"
            aria-live="off"
            className="font-mono text-xs tabular-nums"
          >
            {seconds} s · Frame {index + 1} / {gallery.frames.length}
          </output>
        </div>
        <label className="block text-xs" htmlFor={`${id}-time`}>
          Time slice
          <input
            id={`${id}-time`}
            type="range"
            min={0}
            max={last}
            step={1}
            value={index}
            aria-valuetext={`${seconds} seconds, frame ${index + 1} of ${gallery.frames.length}`}
            onChange={(e) => {
              onPlaying(false);
              onIndex(Number(e.target.value));
            }}
            className={`${rangeClass} mt-2 block`}
          />
        </label>
        <div className="flex items-center gap-3">
          <Button
            aria-label="Zoom out"
            onClick={() => setZoom((z) => clamp(z - 0.2, 0.5, 2.5))}
          >
            −
          </Button>
          <label className="flex-1 text-xs">
            Zoom · {Math.round(zoom * 100)}%
            <input
              aria-label="Zoom"
              type="range"
              min="0.5"
              max="2.5"
              step="0.01"
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className={`${rangeClass} mt-1 block`}
            />
          </label>
          <Button
            aria-label="Zoom in"
            onClick={() => setZoom((z) => clamp(z + 0.2, 0.5, 2.5))}
          >
            +
          </Button>
        </div>
        <p
          id={`${id}-help`}
          className="text-xs leading-relaxed text-neutral-500"
        >
          Drag to {mode === "orbit" ? "rotate; pinch to zoom" : "scrub time"}.{" "}
          {expanded
            ? "Scroll over the volume to zoom. "
            : "Use Fullscreen for scroll-to-zoom. "}
          The timeline always controls time. Focus the volume for arrow keys,
          +/− zoom and 0 to reset.
        </p>
        {notice && (
          <p
            role="status"
            aria-label="Fullscreen status"
            className="text-xs text-neutral-500"
          >
            {notice}
          </p>
        )}
        <details open={!expanded}>
          <summary className="cursor-pointer py-1 text-xs">
            Camera controls
          </summary>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            {[
              {
                label: "Rotation",
                value: yaw,
                min: -180,
                max: 180,
                set: setYaw,
              },
              { label: "Tilt", value: pitch, min: -70, max: 70, set: setPitch },
              {
                label: "Time-axis spacing",
                value: depth,
                min: 400,
                max: 1200,
                set: setDepth,
              },
            ].map((control) => (
              <label key={control.label} className="block text-xs">
                {control.label}
                <input
                  aria-label={control.label}
                  type="range"
                  min={control.min}
                  max={control.max}
                  value={control.value}
                  onChange={(e) => control.set(Number(e.target.value))}
                  className={`${rangeClass} mt-2 block`}
                />
              </label>
            ))}
          </div>
          <label className="mt-3 flex min-h-10 items-center gap-3 text-xs">
            <input
              type="checkbox"
              checked={ghosts}
              onChange={(e) => setGhosts(e.target.checked)}
              className="h-4 w-4 accent-emerald-600"
            />
            Show faint frame stack
          </label>
        </details>
      </div>
    </div>
  );
  return (
    <>
      {!expanded && content}
      <dialog
        ref={dialog}
        aria-labelledby={`${id}-title`}
        onCancel={(e) => {
          e.preventDefault();
          closeExpanded();
        }}
        className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-auto border-0 bg-[var(--background)] p-0 text-[var(--foreground)] backdrop:bg-black/80"
      >
        {expanded && content}
      </dialog>
    </>
  );
}
