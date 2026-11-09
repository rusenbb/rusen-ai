"use client";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from "react";
import { Button, Details, Segmented, Slider } from "@/components/ui";
import { clamp, DEFAULT_PITCH, DEFAULT_YAW, HEIGHT, WIDTH } from "./scene";
import { createVolumeCache, drawVolume, type VolumeCache } from "./render";
import type { Gallery } from "./gallery";

const LABEL =
  "font-mono text-[0.7rem] uppercase tracking-[0.08em] text-[var(--sub)]";
/** Arrival motion: a slow swing around the default view, stopped by any interaction. */
const SWING_DEGREES = 26;
const SWING_PERIOD_MS = 14000;
const SWING_DURATION_MS = 2 * SWING_PERIOD_MS;

type Props = {
  gallery: Gallery;
  title: string;
  fps: number;
  index: number;
  filter: string;
  labels: readonly string[];
  playing: boolean;
  /** Swing the camera slowly on arrival unless the visitor prefers reduced motion. */
  autoRotate: boolean;
  onIndex: (index: number) => void;
  onFilter: (filter: string) => void;
  onPlaying: (playing: boolean) => void;
  onReset: () => void;
  onInteract: () => void;
  /** One line under the controls: objects in this frame and the source credit. */
  caption?: ReactNode;
};
type Position = { x: number; y: number };
export function VolumeViewer({
  gallery,
  title,
  fps,
  index,
  filter,
  labels,
  playing,
  autoRotate,
  onIndex,
  onFilter,
  onPlaying,
  onReset,
  onInteract,
  caption,
}: Props) {
  const [yaw, setYaw] = useState(DEFAULT_YAW),
    [pitch, setPitch] = useState(DEFAULT_PITCH),
    [depth, setDepth] = useState(800),
    [zoom, setZoom] = useState(1),
    [ghosts, setGhosts] = useState(true),
    [mode, setMode] = useState<"orbit" | "slice">("orbit"),
    [expanded, setExpanded] = useState(false),
    [swinging, setSwinging] = useState(false),
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
  /** Any deliberate input ends the arrival swing. */
  const interact = () => {
    setSwinging(false);
    onInteract();
  };

  useEffect(() => {
    if (!autoRotate) return;
    const timer = window.setTimeout(() => {
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches)
        setSwinging(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [autoRotate]);
  useEffect(() => {
    if (!swinging) return;
    let frameId = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      if (elapsed > SWING_DURATION_MS) {
        setYaw(DEFAULT_YAW);
        setSwinging(false);
        return;
      }
      setYaw(
        DEFAULT_YAW +
          SWING_DEGREES * Math.sin((elapsed / SWING_PERIOD_MS) * 2 * Math.PI),
      );
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [swinging]);

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
    interact();
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
    setSwinging(false);
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
    interact();
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
  const camera = (set: (value: number) => void) => (value: number) => {
    interact();
    set(value);
  };
  const content = (
    <div
      ref={surface}
      className={
        expanded
          ? "flex h-dvh w-screen flex-col overflow-auto bg-[var(--background)] p-3 sm:p-5"
          : ""
      }
    >
      {expanded && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2
            id={`${id}-title`}
            className="font-mono text-sm uppercase tracking-[0.08em]"
          >
            {title}
          </h2>
          <Button size="sm" onClick={closeExpanded}>
            Close fullscreen
          </Button>
        </div>
      )}
      <canvas
        ref={canvas}
        role="img"
        tabIndex={0}
        aria-label={`Time volume of ${title} at ${seconds} seconds. Drag to ${mode === "orbit" ? "rotate" : "scrub time"}.`}
        aria-describedby={`${id}-help`}
        className="block w-full cursor-grab select-none border border-[var(--line)] bg-[#090e12] active:cursor-grabbing focus-visible:outline-1 focus-visible:outline-[var(--line-strong)]"
        style={{
          height: expanded
            ? "max(140px, calc(100dvh - 210px))"
            : "clamp(18rem, calc(100svh - 29rem), 40rem)",
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
            interact();
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
        Video frames and object outlines stacked through time. Use the time
        slider below.
      </canvas>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-3">
        <Button
          size="sm"
          variant="primary"
          className="w-20"
          onClick={() => {
            interact();
            onPlaying(!playing);
          }}
          aria-pressed={playing}
        >
          {playing ? "Pause" : "Play"}
        </Button>
        <div className="order-last flex min-w-0 basis-full items-center gap-3 sm:order-none sm:basis-0 sm:flex-1">
          <label htmlFor={`${id}-time`} className={LABEL}>
            Time
          </label>
          <input
            id={`${id}-time`}
            aria-label="Time slice"
            type="range"
            min={0}
            max={last}
            step={1}
            value={index}
            aria-valuetext={`${seconds} seconds, frame ${index + 1} of ${gallery.frames.length}`}
            onChange={(e) => {
              interact();
              onPlaying(false);
              onIndex(Number(e.target.value));
            }}
            className="ui-slider min-w-0 flex-1"
          />
          <output
            data-testid="time-output"
            aria-live="off"
            className="shrink-0 font-mono text-xs tabular-nums"
          >
            {seconds} s · Frame {index + 1} / {gallery.frames.length}
          </output>
        </div>
        <div className="ml-auto flex gap-2 sm:ml-0">
          {!expanded && (
            <Button ref={opener} size="sm" onClick={openExpanded}>
              Fullscreen
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => {
              resetView();
              onReset();
            }}
          >
            Reset
          </Button>
        </div>
      </div>
      {notice && (
        <p
          role="status"
          aria-label="Fullscreen status"
          className="mt-2 text-xs text-[var(--muted)]"
        >
          {notice}
        </p>
      )}
      {caption}
      <Details summary="View options" className="mt-5">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex items-center gap-2">
              <span className={LABEL}>Drag on the volume</span>
              <Segmented
                label="Drag on the volume"
                options={[
                  { value: "orbit", label: "Rotate" },
                  { value: "slice", label: "Scrub time" },
                ]}
                value={mode}
                onChange={(next) => {
                  interact();
                  clearGesture();
                  setMode(next);
                }}
              />
            </div>
            {labels.length > 1 && (
              <div className="flex items-center gap-2">
                <span className={LABEL}>Objects</span>
                <Segmented
                  label="Objects"
                  options={["all", ...labels].map((label) => ({
                    value: label,
                    label: label === "all" ? "All" : label,
                  }))}
                  value={filter}
                  onChange={onFilter}
                />
              </div>
            )}
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Slider
              label="Zoom"
              min={0.5}
              max={2.5}
              step={0.01}
              value={zoom}
              display={`${Math.round(zoom * 100)}%`}
              onChange={camera(setZoom)}
            />
            <Slider
              label="Rotation"
              min={-180}
              max={180}
              value={Math.round(yaw)}
              display={`${Math.round(yaw)}°`}
              onChange={camera(setYaw)}
            />
            <Slider
              label="Tilt"
              min={-70}
              max={70}
              value={Math.round(pitch)}
              display={`${Math.round(pitch)}°`}
              onChange={camera(setPitch)}
            />
            <Slider
              label="Time-axis spacing"
              min={400}
              max={1200}
              value={depth}
              onChange={camera(setDepth)}
            />
          </div>
          <label className="flex items-center gap-3 font-mono text-[0.7rem] uppercase tracking-[0.08em] text-[var(--muted)]">
            <input
              type="checkbox"
              checked={ghosts}
              onChange={(e) => setGhosts(e.target.checked)}
              className="h-4 w-4 accent-[var(--foreground)]"
            />
            Show faint frame stack
          </label>
          <p id={`${id}-help`}>
            Drag the volume to{" "}
            {mode === "orbit" ? "rotate it; pinch to zoom" : "scrub time"}.{" "}
            {expanded
              ? "Scroll over it to zoom. "
              : "In fullscreen, scroll to zoom. "}
            With the volume focused, arrow keys rotate, + and − zoom, and 0
            resets the camera.
          </p>
        </div>
      </Details>
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
