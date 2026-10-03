import { createProjection, HEIGHT, WIDTH, type Point } from "./scene";
import { objectColor, type Gallery } from "./gallery";
type Context = CanvasRenderingContext2D;
function path(ctx: Context, points: readonly Point[]) {
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
}
export function drawFrame(
  ctx: Context,
  gallery: Gallery,
  index: number,
  filter: string,
) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.drawImage(
    gallery.atlas,
    (index % 4) * WIDTH,
    Math.floor(index / 4) * HEIGHT,
    WIDTH,
    HEIGHT,
    0,
    0,
    WIDTH,
    HEIGHT,
  );
  for (const object of gallery.frames[index].objects) {
    if (filter !== "all" && filter !== object.label) continue;
    ctx.fillStyle = ctx.strokeStyle = objectColor(object.id);
    ctx.globalAlpha = 0.2;
    ctx.fill(object.fill);
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1.5;
    ctx.stroke(object.outline);
  }
}
export type View = {
  index: number;
  yaw: number;
  pitch: number;
  depth: number;
  zoom: number;
  filter: string;
  ghosts: boolean;
};
export type VolumeCache = {
  canvas: HTMLCanvasElement;
  key: string;
  atlas: ImageBitmap | null;
};
export function createVolumeCache(): VolumeCache {
  return { canvas: document.createElement("canvas"), key: "", atlas: null };
}
export function drawVolume(
  canvas: HTMLCanvasElement,
  frame: HTMLCanvasElement,
  gallery: Gallery,
  view: View,
  cache: VolumeCache,
) {
  const ctx = canvas.getContext("2d"),
    fc = frame.getContext("2d");
  if (!ctx || !fc) return;
  const { width, height } = canvas.getBoundingClientRect();
  if (!width || !height) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (
    canvas.width !== Math.round(width * dpr) ||
    canvas.height !== Math.round(height * dpr)
  ) {
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "#090e12";
  ctx.fillRect(0, 0, width, height);
  const p = createProjection(
    width,
    height,
    view.yaw,
    view.pitch,
    view.depth,
    view.zoom,
  );
  const border = (t: number) =>
    [
      [0, 0],
      [WIDTH, 0],
      [WIDTH, HEIGHT],
      [0, HEIGHT],
    ].map(([x, y]) => p(x, y, t));
  const transform = (context: Context, index: number) => {
    const t = index / (gallery.frames.length - 1),
      o = p(0, 0, t),
      x = p(WIDTH, 0, t),
      y = p(0, HEIGHT, t);
    context.transform(
      (x[0] - o[0]) / WIDTH,
      (x[1] - o[1]) / WIDTH,
      (y[0] - o[0]) / HEIGHT,
      (y[1] - o[1]) / HEIGHT,
      o[0],
      o[1],
    );
  };
  // Faint source frames and the box depend on the camera, not the selected time.
  // Cache them at display resolution; all inferred contours are still drawn at every sample.
  const key = [
    width,
    height,
    dpr,
    view.yaw,
    view.pitch,
    view.depth,
    view.zoom,
    view.ghosts,
  ].join(",");
  if (cache.key !== key || cache.atlas !== gallery.atlas) {
    cache.canvas.width = canvas.width;
    cache.canvas.height = canvas.height;
    const background = cache.canvas.getContext("2d")!;
    background.setTransform(dpr, 0, 0, dpr, 0, 0);
    background.fillStyle = "#090e12";
    background.fillRect(0, 0, width, height);
    background.strokeStyle = "#435058";
    background.lineWidth = 0.8;
    for (const t of [0, 1]) {
      path(background, border(t));
      background.stroke();
    }
    for (const [x, y] of [
      [0, 0],
      [WIDTH, 0],
      [WIDTH, HEIGHT],
      [0, HEIGHT],
    ]) {
      background.beginPath();
      background.moveTo(...p(x, y, 0));
      background.lineTo(...p(x, y, 1));
      background.stroke();
    }
    if (view.ghosts)
      for (let i = 0; i < gallery.frames.length; i += 3) {
        background.save();
        transform(background, i);
        background.globalAlpha = 0.055;
        background.drawImage(
          gallery.atlas,
          (i % 4) * WIDTH,
          Math.floor(i / 4) * HEIGHT,
          WIDTH,
          HEIGHT,
          0,
          0,
          WIDTH,
          HEIGHT,
        );
        background.restore();
      }
    cache.key = key;
    cache.atlas = gallery.atlas;
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(cache.canvas, 0, 0);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // Reverse the plane order when viewing the other side of the time axis.
  const order = Array.from({ length: gallery.frames.length }, (_, i) => i);
  if (Math.cos((view.yaw * Math.PI) / 180) < 0) order.reverse();
  for (const i of order) {
    ctx.save();
    transform(ctx, i);
    if (i === view.index) {
      drawFrame(fc, gallery, i, view.filter);
      ctx.drawImage(frame, 0, 0);
    }
    ctx.globalAlpha = i === view.index ? 1 : 0.6;
    ctx.lineWidth = i === view.index ? 2 : 1;
    for (const object of gallery.frames[i].objects) {
      if (view.filter !== "all" && object.label !== view.filter) continue;
      ctx.strokeStyle = objectColor(object.id);
      ctx.stroke(object.outline);
    }
    ctx.restore();
  }
  path(ctx, border(view.index / (gallery.frames.length - 1)));
  ctx.strokeStyle = "#edf8f4";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.fillStyle = "#afc0c7";
  ctx.font = "11px monospace";
  ctx.fillText("0.00 s", 22, height - 20);
  ctx.textAlign = "right";
  ctx.fillText(
    `TIME → ${gallery.frames.at(-1)!.time.toFixed(3)} s`,
    width - 22,
    height - 20,
  );
  ctx.textAlign = "left";
}
