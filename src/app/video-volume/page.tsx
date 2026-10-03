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
import { HEIGHT, WIDTH } from "./scene";
import { VolumeViewer } from "./volume-viewer";
import { drawFrame } from "./render";
import {
  clips,
  objectColor,
  prepareFrames,
  validateAnalysis,
  type Gallery,
} from "./gallery";
export default function VideoVolumePage() {
  const [selected, setSelected] = useState(clips[0].id),
    [attempt, setAttempt] = useState(0);
  const clip = clips.find((item) => item.id === selected)!;
  const [gallery, setGallery] = useState<Gallery | null>(null),
    [status, setStatus] = useState("Loading analyzed clip…");
  const abort = useRef<AbortController | null>(null);
  const [index, setIndex] = useState(0),
    [filter, setFilter] = useState("all"),
    [playing, setPlaying] = useState(false),
    [resetSerial, setResetSerial] = useState(0);
  const preview = useRef<HTMLCanvasElement>(null),
    video = useRef<HTMLVideoElement>(null);
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
        if (
          bitmap.width !== 2560 ||
          bitmap.height !== Math.ceil(clip.frameCount / 4) * HEIGHT
        )
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
    const context = preview.current?.getContext("2d");
    if (ready && gallery && context) drawFrame(context, gallery, index, filter);
  }, [ready, gallery, index, filter]);
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
    setResetSerial((value) => value + 1);
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
        className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4"
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
          {clips.length} real clips · {clip.frameCount} analyzed frames each ·
          No model download
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
      {ready && gallery ? (
        <VolumeViewer
          key={`${clip.id}-${resetSerial}`}
          gallery={gallery}
          title={clip.title}
          fps={clip.fps}
          index={index}
          filter={filter}
          playing={playing}
          onIndex={setIndex}
          onPlaying={setPlaying}
        />
      ) : (
        <div className="flex h-[340px] flex-col items-center justify-center gap-5 border border-[var(--line)] bg-[#090e12] text-white">
          <p role="status">{status}</p>
          {status.startsWith("Loading analyzed") ? (
            <Button
              style={{ color: "white", borderColor: "#87979b" }}
              onClick={() => {
                abort.current?.abort("cancel");
                setStatus("Loading cancelled.");
              }}
            >
              Cancel loading
            </Button>
          ) : (
            <Button
              style={{ color: "white", borderColor: "#87979b" }}
              onClick={retry}
            >
              Retry
            </Button>
          )}
        </div>
      )}
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
          title="Explore space and time"
          description="Rotate the volume to follow the shapes each object leaves through time."
        >
          <div className="mt-4 space-y-3 text-sm leading-relaxed">
            <p>
              Drag the volume to rotate it. Use the timeline for exact frame
              selection, or choose Drag time to scrub directly on the canvas.
            </p>
            <p>
              Fullscreen gives the volume more room. Scroll or pinch to zoom, or
              use the zoom buttons and camera sliders. Reset view restores the
              camera without changing the selected moment.
            </p>
            <p className="text-neutral-500">
              Every contour is a real model prediction at one sampled moment.
              Missing detections remain gaps; object IDs are associated by box
              overlap.
            </p>
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
              Original frame rate, without masks. The volume above uses{" "}
              {clip.frameCount} samples from this three-second excerpt.
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
            {clip.minimumTrackFrames > 0 && (
              <p className="text-neutral-500">
                This sample shows only tracks observed in at least{" "}
                {clip.minimumTrackFrames} of {clip.frameCount} frames. Short
                transient detections are omitted; missing masks remain gaps.
              </p>
            )}
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
              × 256 masks. Association IoU ≥ 0.15 with two missed-frame grace
              (up to 0.25 seconds between detections). Twelve samples per
              second; no interpolated masks.
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
        Eight openly licensed real videos, analyzed offline on CPU. Playback
        starts only when you press Play. No uploads or paid APIs. Confidence
        scores describe model predictions, not verified accuracy.
      </DemoFootnote>
    </DemoPage>
  );
}
