import { maskBoundary } from "./mask-boundary";
import { videoVolumeClips as clips } from "@/lib/video-volume-content";
import { decodeMask, type InferredVideoFrame } from "./inference-contract";
export { clips };
export type Clip = (typeof clips)[number];
export type Analysis = {
  version: 1;
  clipId: string;
  frames: InferredVideoFrame[];
};
export type PreparedObject = {
  id: number;
  label: string;
  score: number | null;
  outline: Path2D;
  fill: Path2D;
};
export type PreparedFrame = { time: number; objects: PreparedObject[] };
export type Gallery = {
  clipId: string;
  atlas: ImageBitmap;
  frames: PreparedFrame[];
};
export const colors = [
  "#6ee7cb",
  "#f2a6d0",
  "#f4cc76",
  "#a6b5ff",
  "#91d8ed",
  "#bde584",
];
export const objectColor = (id: number) => colors[(id - 1) % colors.length];

/** Validate the static result before allocating masks or preparing drawing paths. */
export function validateAnalysis(value: unknown, clip: Clip): Analysis {
  if (!value || typeof value !== "object") throw new Error("Invalid analysis.");
  const data = value as Analysis;
  if (
    data.version !== 1 ||
    data.clipId !== clip.id ||
    !Array.isArray(data.frames) ||
    data.frames.length !== clip.frameCount
  )
    throw new Error("Analysis does not match this clip.");
  for (const [index, frame] of data.frames.entries()) {
    if (
      !frame ||
      frame.time !== index / clip.fps ||
      !Array.isArray(frame.objects) ||
      frame.objects.length > 4
    )
      throw new Error("Invalid sampled frame.");
    const ids = new Set<number>();
    for (const object of frame.objects) {
      if (
        !object ||
        !Number.isSafeInteger(object.id) ||
        object.id < 1 ||
        ids.has(object.id) ||
        !clip.labels.includes(object.label) ||
        typeof object.score !== "number" ||
        !Number.isFinite(object.score) ||
        object.score < 0 ||
        object.score > 1 ||
        object.mask?.width !== 256 ||
        object.mask?.height !== 256 ||
        !Array.isArray(object.mask.counts)
      )
        throw new Error("Invalid inferred object.");
      ids.add(object.id);
      decodeMask(object.mask);
    }
  }
  return data;
}

/** Each edge comes directly from a foreground/background boundary; no invented contours. */
export function prepareFrames(data: Analysis): PreparedFrame[] {
  return data.frames.map((frame) => ({
    time: frame.time,
    objects: frame.objects.map((object) => {
      const pixels = decodeMask(object.mask),
        w = object.mask.width,
        h = object.mask.height;
      const outline = new Path2D(),
        fill = new Path2D();
      for (const [x, y, xx, yy] of maskBoundary(pixels, w, h)) {
        outline.moveTo((x / w) * 640, (y / h) * 360);
        outline.lineTo((xx / w) * 640, (yy / h) * 360);
      }
      for (let y = 0; y < h; y++) {
        let run = -1;
        for (let x = 0; x <= w; x++) {
          const on = x < w && pixels[y * w + x];
          if (on) {
            if (run < 0) run = x;
          } else if (run >= 0) {
            fill.rect(
              (run / w) * 640,
              (y / h) * 360,
              ((x - run) / w) * 640,
              360 / h,
            );
            run = -1;
          }
        }
      }
      return {
        id: object.id,
        label: object.label,
        score: object.score,
        outline,
        fill,
      };
    }),
  }));
}
