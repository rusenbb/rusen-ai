"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Button, DemoHeader, DemoPage, Details } from "@/components/ui";
import { HEIGHT } from "./scene";
import { VolumeViewer } from "./volume-viewer";
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
    [intro, setIntro] = useState(true);
  const video = useRef<HTMLVideoElement>(null);
  const ready = gallery?.clipId === clip.id;
  const matches = ready
    ? gallery.frames[index].objects.filter(
        (o) => filter === "all" || o.label === filter,
      )
    : [];
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
    if (video.current) {
      video.current.pause();
      video.current.currentTime = 0;
    }
  }
  function choose(id: string) {
    if (id === selected) return;
    abort.current?.abort();
    setIntro(false);
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
    <DemoPage>
      <DemoHeader
        eyebrow="Video segmentation"
        title="Video Volume"
        description="Drag to turn three seconds of video stacked into a block, where each moving object leaves a shape through time."
      />
      <div
        className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:max-w-4xl sm:grid-cols-8 sm:overflow-visible sm:px-0 sm:pb-0"
        role="group"
        aria-label="Choose a video"
      >
        {clips.map((item) => (
          <button
            key={item.id}
            onClick={() => choose(item.id)}
            aria-pressed={selected === item.id}
            title={item.title}
            className={`relative w-24 shrink-0 cursor-pointer border p-0.5 transition-[opacity,border-color] sm:w-auto focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[var(--line-strong)] ${selected === item.id ? "border-[var(--line-strong)]" : "border-[var(--line)] opacity-55 hover:opacity-100"}`}
          >
            <Image
              src={item.poster}
              alt=""
              width={640}
              height={360}
              className="block aspect-video w-full object-cover"
            />
            <span className="sr-only">{item.title}</span>
          </button>
        ))}
      </div>
      {ready && gallery ? (
        <VolumeViewer
          key={clip.id}
          gallery={gallery}
          title={clip.title}
          fps={clip.fps}
          index={index}
          filter={filter}
          labels={clip.labels}
          playing={playing}
          autoRotate={intro}
          onIndex={setIndex}
          onFilter={setFilter}
          onPlaying={setPlaying}
          onReset={reset}
          onInteract={() => setIntro(false)}
          caption={
            <div
              id="query-result"
              className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[0.7rem] uppercase tracking-[0.08em] text-[var(--sub)]"
            >
              <span className="text-[var(--foreground)]">{clip.title}</span>
              <span>
                {matches.length} {matches.length === 1 ? "object" : "objects"}{" "}
                in this frame
              </span>
              <ul aria-label="Track legend" className="flex flex-wrap gap-3">
                {matches.map((o) => (
                  <li key={o.id} className="flex items-center gap-1.5">
                    <span
                      aria-hidden="true"
                      className="h-2 w-2 rounded-full"
                      style={{ background: objectColor(o.id) }}
                    />
                    {o.label} {o.id}
                  </li>
                ))}
              </ul>
              <span className="normal-case tracking-normal sm:ml-auto">
                Video: {clip.author}, {clip.license}
              </span>
            </div>
          }
        />
      ) : (
        <div
          className="flex flex-col items-center justify-center gap-5 border border-[var(--line)] bg-[var(--surface)]"
          style={{ height: "clamp(18rem, calc(100svh - 29rem), 40rem)" }}
        >
          <p
            role="status"
            className="font-mono text-xs uppercase tracking-[0.08em] text-[var(--muted)]"
          >
            {status}
          </p>
          {status.startsWith("Loading analyzed") ? (
            <Button
              size="sm"
              onClick={() => {
                abort.current?.abort("cancel");
                setStatus("Loading cancelled.");
              }}
            >
              Cancel loading
            </Button>
          ) : (
            <Button size="sm" onClick={retry}>
              Retry
            </Button>
          )}
        </div>
      )}
      <Details summary="Source, models and licence">
        <div className="grid gap-6 md:grid-cols-2">
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
          <div className="space-y-3 leading-relaxed">
            <p>
              <a className="underline" href={clip.source}>
                {clip.sourceTitle}
              </a>{" "}
              by {clip.author},{" "}
              <a className="underline" href={clip.licenseUrl}>
                {clip.license}
              </a>
              . {clip.modifications} The excerpt starts at {clip.sourceOffset}{" "}
              seconds in the original. Clip, poster and frame atlas keep the
              source licence. The player shows the excerpt at its original frame
              rate, without outlines.
            </p>
            {clip.minimumTrackFrames > 0 && (
              <p>
                Only tracks seen in at least {clip.minimumTrackFrames} of{" "}
                {clip.frameCount} frames are shown.
              </p>
            )}
          </div>
        </div>
        <div className="mt-6 space-y-3 leading-relaxed">
          <p>
            The outlines were computed in advance on a CPU, so the page loads
            only images and JSON. DETR finds known object classes, and SAM 2.1
            draws a pixel mask for each detected box. Each colour is one object,
            matched from frame to frame by box overlap (IoU), not by SAM&apos;s
            temporal memory. Fast motion, occlusion and missed detections can
            split or swap objects, and missed frames stay as gaps.
          </p>
          <p>
            DETR ResNet-50 (q8), confidence ≥ 0.70, duplicate-box suppression at
            IoU 0.60, up to 3 detections per class and 4 per frame. SAM 2.1
            Hiera Tiny (uint8), highest predicted-IoU mask, logits &gt; 0, 256 ×
            256 masks. Association IoU ≥ 0.15 with two missed-frame grace (up to
            0.25 seconds between detections). Twelve samples per second; no
            interpolated masks.
          </p>
          <p>
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
              This clip&apos;s results and pinned model revisions (JSON)
            </a>
          </p>
        </div>
      </Details>
    </DemoPage>
  );
}
