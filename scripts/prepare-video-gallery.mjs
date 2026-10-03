/** Rebuild licensed excerpts, exact inference frames and compressed frame atlases.
 * Requires ffmpeg on PATH. Run from repository root:
 * node scripts/prepare-video-gallery.mjs /path/to/originals /path/to/frames
 * Supply the original Commons files as <clip-id>.webm. Hashes must match the manifest.
 * Then run analyze-video-gallery.mjs; no network or external inference is used here.
 */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import sharp from "sharp";
const [sources, frames, only] = process.argv.slice(2);
if (!sources || !frames)
  throw new Error("Provide original-video and extracted-frame directories.");
const manifest = JSON.parse(
  readFileSync("src/content/video-volume.json", "utf8"),
);
const clips = manifest.filter((clip) => !only || clip.id === only);
const ffmpeg = (args) =>
  execFileSync("ffmpeg", ["-v", "error", "-y", ...args], { stdio: "inherit" });
for (const clip of clips) {
  const original = resolve(sources, `${clip.id}.webm`),
    destination = resolve("public/video-volume", clip.id),
    directory = resolve(frames, clip.id);
  if (
    createHash("sha256").update(readFileSync(original)).digest("hex") !==
    clip.sourceSha256
  )
    throw new Error(`Source hash mismatch: ${clip.id}`);
  mkdirSync(destination, { recursive: true });
  mkdirSync(directory, { recursive: true });
  ffmpeg([
    "-ss",
    String(clip.sourceOffset),
    "-i",
    original,
    "-t",
    String(clip.duration),
    "-vf",
    "scale=640:360",
    "-an",
    "-c:v",
    "libx264",
    "-crf",
    "23",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    `${destination}/clip.mp4`,
  ]);
  ffmpeg([
    "-i",
    `${destination}/clip.mp4`,
    "-vf",
    `fps=${clip.fps}`,
    "-frames:v",
    String(clip.frameCount),
    "-q:v",
    "2",
    `${directory}/%03d.jpg`,
  ]);
  ffmpeg(["-i", `${directory}/001.jpg`, `${destination}/poster.webp`]);
  await sharp({
    create: {
      width: 2560,
      height: Math.ceil(clip.frameCount / 4) * 360,
      channels: 3,
      background: "#000",
    },
  })
    .composite(
      Array.from({ length: clip.frameCount }, (_, i) => ({
        input: `${directory}/${String(i + 1).padStart(3, "0")}.jpg`,
        left: (i % 4) * 640,
        top: Math.floor(i / 4) * 360,
      })),
    )
    .webp({ quality: 82, effort: 5 })
    .toFile(`${destination}/frames.webp`);
  writeFileSync(
    `${destination}/ATTRIBUTION.txt`,
    `${clip.sourceTitle}\nBy ${clip.author}\nSource: ${clip.source}\nLicense: ${clip.license} — ${clip.licenseUrl}\nChanges: ${clip.modifications} Start: ${clip.sourceOffset} seconds.\nThe derivative clip, poster, frame atlas and mask data are provided under the same source license.\nInference: DETR ResNet-50 boxes, SAM 2.1 Hiera Tiny image masks; algorithmic IoU association. See analysis.json for parameters and pinned revisions.\nOriginal file SHA-256: ${clip.sourceSha256}\n`,
  );
}
