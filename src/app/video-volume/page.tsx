"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Button,
  DemoFootnote,
  DemoHeader,
  DemoMutedSection,
  DemoPage,
  DemoPanel,
} from "@/components/ui";
import { clamp, DEFAULT_PITCH, DEFAULT_YAW, HEIGHT, WIDTH } from "./scene";
import { drawFrame, drawVolume } from "./render";
import {
  clips,
  objectColor,
  prepareFrames,
  validateAnalysis,
  type Gallery,
} from "./gallery";
const inputClass =
  "w-full accent-emerald-600 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-500";
export default function VideoVolumePage() {
  const [selected, setSelected] = useState(clips[0].id),
    [attempt, setAttempt] = useState(0);
  const clip = clips.find((item) => item.id === selected)!;
  const [gallery, setGallery] = useState<Gallery | null>(null),
    [status, setStatus] = useState("Loading analyzed clip…");
  const abort = useRef<AbortController | null>(null);
  const [index, setIndex] = useState(0),
    [filter, setFilter] = useState("all"),
    [yaw, setYaw] = useState(DEFAULT_YAW),
    [pitch, setPitch] = useState(DEFAULT_PITCH),
    [depth, setDepth] = useState(800),
    [ghosts, setGhosts] = useState(true),
    [playing, setPlaying] = useState(false),
    [mode, setMode] = useState<"slice" | "orbit">("slice");
  const volume = useRef<HTMLCanvasElement>(null),
    preview = useRef<HTMLCanvasElement>(null),
    video = useRef<HTMLVideoElement>(null);
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    index: number;
    yaw: number;
    pitch: number;
  } | null>(null);
  const ready = gallery?.clipId === clip.id;
  const matches = ready
    ? gallery.frames[index].objects.filter(
        (o) => filter === "all" || o.label === filter,
      )
    : [];
  const seconds = (index / clip.fps).toFixed(3);
  useEffect(() => {
    const controller = new AbortController();
    abort.current = controller;
    let bitmap: ImageBitmap | undefined;
    let active = true;
    const timeout = setTimeout(() => controller.abort("timeout"), 15000);
    async function load() {
      try {
        const [json, image] = await Promise.all([
          fetch(clip.analysis, { signal: controller.signal }).then((r) => {
            if (!r.ok) throw new Error();
            return r.json();
          }),
          fetch(clip.atlas, { signal: controller.signal }).then((r) => {
            if (!r.ok) throw new Error();
            return r.blob();
          }),
        ]);
        const data = validateAnalysis(json, clip);
        bitmap = await createImageBitmap(image);
        if (!active || controller.signal.aborted) {
          bitmap.close();
          if (active)
            setStatus(
              controller.signal.reason === "cancel"
                ? "Loading cancelled."
                : "Could not load this clip. Please retry.",
            );
          return;
        }
        if (bitmap.width !== 2560 || bitmap.height !== 2160)
          throw new Error("Invalid frame atlas.");
        setGallery({
          clipId: clip.id,
          atlas: bitmap,
          frames: prepareFrames(data),
        });
        setStatus("Ready");
      } catch {
        if (active) {
          setGallery(null);
          setStatus(
            controller.signal.reason === "cancel"
              ? "Loading cancelled."
              : "Could not load this clip. Please retry.",
          );
        }
      } finally {
        clearTimeout(timeout);
      }
    }
    void load();
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timeout);
      bitmap?.close();
    };
  }, [clip, attempt]);
  useEffect(() => {
    if (!ready || !gallery || !volume.current) return;
    const canvas = volume.current,
      frame = document.createElement("canvas");
    frame.width = WIDTH;
    frame.height = HEIGHT;
    const render = () => {
      drawVolume(canvas, frame, gallery, {
        index,
        yaw,
        pitch,
        depth,
        filter,
        ghosts,
      });
      const context = preview.current?.getContext("2d");
      if (context) drawFrame(context, gallery, index, filter);
    };
    render();
    const observer = new ResizeObserver(render);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [ready, gallery, index, yaw, pitch, depth, filter, ghosts]);
  useEffect(() => {
    if (!playing || !ready) return;
    const timer = setInterval(
      () => setIndex((i) => (i + 1) % clip.frameCount),
      1000 / clip.fps,
    );
    const pause = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener("visibilitychange", pause);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", pause);
    };
  }, [playing, ready, clip]);
  function reset() {
    setPlaying(false);
    setIndex(0);
    setFilter("all");
    setYaw(DEFAULT_YAW);
    setPitch(DEFAULT_PITCH);
    setDepth(800);
    setGhosts(true);
    setMode("slice");
    drag.current = null;
    if (video.current) {
      video.current.pause();
      video.current.currentTime = 0;
    }
  }
  function choose(id: string) {
    if (id === selected) return;
    abort.current?.abort();
    reset();
    setGallery(null);
    setStatus("Loading analyzed clip…");
    setSelected(id);
  }
  function retry() {
    setStatus("Loading analyzed clip…");
    setAttempt((a) => a + 1);
  }
  return (
    <DemoPage width="2xl">
      <DemoHeader
        eyebrow="Real video · Pre-analyzed AI"
        title="Video Volume"
        description="See motion as a shape. Explore real AI masks across time, then pull out any sampled moment."
        actions={<Button onClick={reset}>Reset</Button>}
      />
      <div
        className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5"
        role="group"
        aria-label="Choose a video"
      >
        {clips.map((item) => (
          <button
            key={item.id}
            onClick={() => choose(item.id)}
            aria-pressed={selected === item.id}
            className={`overflow-hidden border text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-500 ${selected === item.id ? "border-emerald-500 bg-emerald-500/10" : "border-[var(--line)]"}`}
          >
            <Image
              src={item.poster}
              alt=""
              width={640}
              height={360}
              className="aspect-video w-full object-cover"
            />
            <span className="block px-3 py-3 text-xs">{item.title}</span>
          </button>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-neutral-500">
          5 real clips · 24 analyzed frames each · No model download
        </p>
        <div className="flex flex-wrap gap-2" aria-label="Object filters">
          {["all", ...clip.labels].map((label) => (
            <Button
              key={label}
              aria-pressed={filter === label}
              onClick={() => setFilter(label)}
            >
              {label === "all" ? "All objects" : label}
            </Button>
          ))}
        </div>
      </div>
      <div className="overflow-hidden border border-[var(--line)]">
        <div className="flex flex-wrap justify-between gap-2 bg-[#090e12] px-4 pt-4 text-xs text-[#afc0c7]">
          <span>{clip.title} · 3 seconds / 8 samples per second</span>
          <span>
            {mode === "slice" ? "Drag sideways through time" : "Drag to rotate"}
          </span>
        </div>
        {ready ? (
          <canvas
            ref={volume}
            role="img"
            aria-label={`Time volume at ${seconds} seconds; ${matches.length} detected objects. Use the controls below to explore.`}
            className="block h-[340px] w-full cursor-grab active:cursor-grabbing sm:h-[500px] lg:h-[560px]"
            style={{ touchAction: mode === "orbit" ? "none" : "pan-y" }}
            onPointerDown={(e) => {
              if (e.button !== 0 || !e.isPrimary) return;
              setPlaying(false);
              e.currentTarget.setPointerCapture(e.pointerId);
              drag.current = {
                id: e.pointerId,
                x: e.clientX,
                y: e.clientY,
                index,
                yaw,
                pitch,
              };
            }}
            onPointerMove={(e) => {
              const start = drag.current;
              if (!start || start.id !== e.pointerId) return;
              const dx = e.clientX - start.x,
                dy = e.clientY - start.y;
              if (mode === "slice")
                setIndex(
                  Math.round(
                    clamp(
                      start.index +
                        (dx / (e.currentTarget.clientWidth * 0.65)) * 23,
                      0,
                      23,
                    ),
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
            Real video frames and detected object silhouettes stacked along
            time. All controls are below.
          </canvas>
        ) : (
          <div className="flex h-[340px] flex-col items-center justify-center gap-5 bg-[#090e12] text-white sm:h-[500px] lg:h-[560px]">
            <p role="status">{status}</p>
            {status.startsWith("Loading analyzed") ? (
              <Button
                onClick={() => {
                  abort.current?.abort("cancel");
                  setStatus("Loading cancelled.");
                }}
              >
                Cancel loading
              </Button>
            ) : (
              <Button onClick={retry}>Retry</Button>
            )}
          </div>
        )}
        <div className="space-y-4 border-t border-[var(--line)] p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={!ready}
                onClick={() => setPlaying((p) => !p)}
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
              data-testid="time-output"
              className="font-mono text-xs tabular-nums"
            >
              {seconds} s · Frame {index + 1} / 24
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
            type="range"
            min="0"
            max="23"
            step="1"
            disabled={!ready}
            value={index}
            aria-valuetext={`${seconds} seconds, frame ${index + 1} of 24`}
            onChange={(e) => {
              setPlaying(false);
              setIndex(Number(e.target.value));
            }}
            className={inputClass}
          />
          <p className="text-xs text-neutral-500">
            Sampled frames only. Masks are not interpolated between samples.
          </p>
        </div>
      </div>
      <p
        role="status"
        id="query-result"
        className="my-4 min-h-5 text-sm text-neutral-500"
      >
        {ready
          ? `${matches.length} detected objects in this frame. Color follows an associated object ID.`
          : status}
      </p>
      <div className="grid gap-6 lg:grid-cols-2">
        <DemoPanel
          title="The selected moment"
          description="The bright plane is this real video frame, with its AI mask overlaid."
        >
          <canvas
            ref={preview}
            width={WIDTH}
            height={HEIGHT}
            role="img"
            aria-label={`${clip.title}, selected frame at ${seconds} seconds`}
            className={`mt-4 block w-full border border-[var(--line)] ${ready ? "" : "invisible"}`}
          />
          <ul
            aria-label="Track legend"
            className="mt-3 flex flex-wrap gap-3 text-xs"
          >
            {matches.map((o) => (
              <li key={o.id} className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-2 w-2 rounded-full"
                  style={{ background: objectColor(o.id) }}
                />
                {o.label} #{o.id}
              </li>
            ))}
          </ul>
        </DemoPanel>
        <DemoPanel
          title="View controls"
          description="Keyboard alternatives to dragging; spread time out to inspect the silhouettes."
        >
          <div className="mt-5 space-y-5">
            {[
              { label: "Rotation", value: yaw, min: 15, max: 70, set: setYaw },
              { label: "Tilt", value: pitch, min: -20, max: 35, set: setPitch },
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
                  className={`${inputClass} mt-3 block`}
                />
              </label>
            ))}
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
      <DemoMutedSection title="Source excerpt" className="mt-6">
        <div className="grid gap-5 md:grid-cols-2">
          <video
            ref={video}
            key={clip.id}
            controls
            playsInline
            preload="none"
            poster={clip.poster}
            src={clip.video}
            className="w-full"
            aria-label={`${clip.title} source video`}
          />
          <div className="space-y-3 text-sm leading-relaxed">
            <p>
              Original frame rate, without masks. The volume above uses 24
              samples from this three-second excerpt.
            </p>
            <p>
              <a className="underline" href={clip.source}>
                {clip.sourceTitle}
              </a>{" "}
              by {clip.author}.{" "}
              <a className="underline" href={clip.licenseUrl}>
                {clip.license}
              </a>
              .
            </p>
            <p className="text-neutral-500">
              {clip.modifications} Excerpt starts at {clip.sourceOffset} seconds
              in the original. Clip, poster and frame atlas retain the source
              license.
            </p>
          </div>
        </div>
      </DemoMutedSection>
      <DemoMutedSection title="How the analysis works" className="mt-6">
        <div className="space-y-3 text-sm leading-relaxed">
          <p>
            These are real model predictions computed in advance, so switching
            clips needs no AI processing in your browser. DETR detects known
            object classes; SAM 2.1 segments each detected box. Every colored
            contour comes from a predicted pixel mask.
          </p>
          <p>
            Object IDs use class-matched box overlap (IoU), not SAM’s temporal
            memory. Fast motion, occlusion and missed detections can split or
            swap IDs. Filters select the analyzed classes; this is not
            open-vocabulary text prompting.
          </p>
          <details>
            <summary className="cursor-pointer py-2">
              Models, sampling and downloadable results
            </summary>
            <p className="mt-2">
              DETR ResNet-50 (q8), confidence ≥ 0.70, duplicate-box suppression
              at IoU 0.60, up to 3 detections per class and 4 per frame. SAM 2.1
              Hiera Tiny (uint8), highest predicted-IoU mask, logits &gt; 0, 256
              × 256 masks. Association IoU ≥ 0.15 with one missed-frame grace.
              Eight samples per second; no interpolated masks.
            </p>
            <p className="mt-3">
              <a
                className="underline"
                href="https://huggingface.co/Xenova/detr-resnet-50-panoptic"
              >
                Detector
              </a>
              {" · "}
              <a
                className="underline"
                href="https://huggingface.co/onnx-community/sam2.1-hiera-tiny-ONNX"
              >
                Segmenter
              </a>
              {" · "}
              <a className="underline" href={clip.analysis}>
                This clip’s results and pinned model revisions (JSON)
              </a>
            </p>
          </details>
        </div>
      </DemoMutedSection>
      <DemoFootnote>
        Five openly licensed real videos, analyzed offline on CPU. Playback
        starts only when you press Play. No uploads or paid APIs. Confidence
        scores describe model predictions, not verified accuracy.
      </DemoFootnote>
    </DemoPage>
  );
}
