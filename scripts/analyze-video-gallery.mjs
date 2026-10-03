/** Offline only. No video or inference requests are sent to a remote service.
 * Node >=22.6 with --experimental-strip-types. Model files must already be local.
 * Usage: VIDEO_MODEL_ROOT=/absolute/cache node --experimental-strip-types scripts/analyze-video-gallery.mjs <id|all> <frames-root> [pilot]
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import {
  AutoModelForImageSegmentation,
  AutoProcessor,
  Sam2Model,
  RawImage,
  Tensor,
  env,
} from "@huggingface/transformers";
import {
  DetectionTracker,
  parseDetections,
} from "../src/app/video-volume/tracking.ts";
import { encodeMask } from "../src/app/video-volume/inference-contract.ts";
const DETECTOR = {
  id: "Xenova/detr-resnet-50-panoptic",
  revision: "ea24b2d4e0bfae31f0a1299ba3fb892a2df064de",
  dtype: "q8",
};
const SEGMENTER = {
  id: "onnx-community/sam2.1-hiera-tiny-ONNX",
  revision: "814a066640debee5a91e70aa401fb8e17e030503",
  dtype: "uint8",
};
const [id, frameRoot, mode] = process.argv.slice(2);
if (!id || !frameRoot || !process.env.VIDEO_MODEL_ROOT)
  throw new Error("Provide an id, frames directory and VIDEO_MODEL_ROOT.");
env.allowRemoteModels = false;
env.localModelPath = process.env.VIDEO_MODEL_ROOT + "/";
const manifest = JSON.parse(
  readFileSync("src/content/video-volume.json", "utf8"),
);
const selected = manifest.filter((clip) => id === "all" || clip.id === id);
if (!selected.length) throw new Error("Unknown clip.");
const options = {
  device: "cpu",
  session_options: { intraOpNumThreads: 2, interOpNumThreads: 1 },
};
const detector = await AutoModelForImageSegmentation.from_pretrained(
  DETECTOR.id,
  { ...options, dtype: DETECTOR.dtype },
);
const dp = await AutoProcessor.from_pretrained(DETECTOR.id);
dp.image_processor.size = { shortest_edge: 384, longest_edge: 640 };
const sam = await Sam2Model.from_pretrained(SEGMENTER.id, {
  ...options,
  dtype: SEGMENTER.dtype,
});
const sp = await AutoProcessor.from_pretrained(SEGMENTER.id);
const dispose = (record) => {
  for (const value of Object.values(record))
    if (value instanceof Tensor) value.dispose();
};
try {
  for (const clip of selected) {
    const missedFrameAllowance = Math.ceil(clip.fps * 0.25) - 1;
    const tracker = new DetectionTracker(missedFrameAllowance);
    const frames = [];
    const indices =
      mode === "pilot"
        ? [0]
        : Array.from({ length: clip.frameCount }, (_, i) => i);
    for (const index of indices) {
      const start = performance.now();
      const path = resolve(
        frameRoot,
        clip.id,
        String(index + 1).padStart(3, "0") + ".jpg",
      );
      const image = await RawImage.read(path);
      const input = await dp(image);
      const output = await detector(input);
      const [, n, c] = output.logits.dims;
      const detections = clip.labels
        .flatMap((label) =>
          parseDetections(
            output.logits.data,
            output.pred_boxes.data,
            n,
            c,
            detector.config.id2label,
            label,
            0.7,
          ),
        )
        .sort((a, b) => b.score - a.score)
        .slice(0, 4);
      const tracks = tracker.update(detections);
      const objects = [];
      let si = {},
        embeddings = {};
      if (tracks.length) {
        si = await sp(image);
        embeddings = await sam.get_image_embeddings(si);
        for (const track of tracks) {
          const box = new Tensor(
            "float32",
            Float32Array.from(track.box.map((x) => x * 1024)),
            [1, 1, 4],
          );
          const masks = await sam({ ...embeddings, input_boxes: box });
          const [, , candidates, h, w] = masks.pred_masks.dims;
          let best = 0;
          for (let k = 1; k < candidates; k++)
            if (masks.iou_scores.data[k] > masks.iou_scores.data[best])
              best = k;
          const data = new Uint8Array(w * h);
          for (let i = 0; i < data.length; i++)
            data[i] = masks.pred_masks.data[best * data.length + i] > 0 ? 1 : 0;
          objects.push({
            id: track.id,
            label: track.label,
            score: track.score,
            box: track.box,
            maskScore: Number(masks.iou_scores.data[best]),
            mask: encodeMask(data, w, h),
          });
          if (mode === "pilot")
            await new RawImage(
              Uint8ClampedArray.from(data, (x) => x * 255),
              w,
              h,
              1,
            ).save(resolve(frameRoot, clip.id, `pilot-${track.id}.png`));
          box.dispose();
          dispose(masks);
        }
      }
      frames.push({
        time: index / clip.fps,
        sourceFrameSha256: createHash("sha256")
          .update(readFileSync(path))
          .digest("hex"),
        milliseconds: Math.round(performance.now() - start),
        objects,
      });
      dispose(input);
      dispose(output);
      dispose(si);
      dispose(embeddings);
      console.log(
        JSON.stringify({
          clip: clip.id,
          frame: index,
          ms: frames.at(-1).milliseconds,
          objects: objects.map((o) => ({
            id: o.id,
            label: o.label,
            score: +o.score.toFixed(3),
            maskScore: +o.maskScore.toFixed(3),
          })),
        }),
      );
    }
    const result = {
      version: 1,
      clipId: clip.id,
      detector: DETECTOR,
      segmenter: SEGMENTER,
      tracking: "detection-association",
      missedFrameAllowance,
      association: `Class-matched greedy IoU >= 0.15; ${missedFrameAllowance} missed-frame grace (up to 0.25 seconds between detections). No temporal SAM memory.`,
      detectionThreshold: 0.7,
      detectorResize: { shortestEdge: 384, longestEdge: 640 },
      boxNmsIoU: 0.6,
      maxPerClass: 3,
      inferenceDevice: "cpu",
      maxObjects: 4,
      maskThreshold: 0,
      samplingFps: clip.fps,
      interpolatedMasks: false,
      frameCount: frames.length,
      frames,
    };
    if (mode !== "pilot")
      selectPersistentTracks(result, clip.minimumTrackFrames);
    const destination =
      mode === "pilot"
        ? resolve(frameRoot, clip.id, "pilot.json")
        : resolve("public/video-volume", clip.id, "analysis.json");
    mkdirSync(resolve("public/video-volume", clip.id), { recursive: true });
    writeFileSync(destination, JSON.stringify(result) + "\n");
  }
} finally {
  await detector.dispose();
  await sam.dispose();
}
