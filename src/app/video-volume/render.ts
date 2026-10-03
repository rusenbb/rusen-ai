import {
  createProjection,
  HEIGHT,
  WIDTH,
  tracksAt,
  type Kind,
  type Point,
} from "./scene";

type Context = CanvasRenderingContext2D;
function path(ctx: Context, points: readonly Point[]) {
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
}

/** Original vector street scene; no reference-video pixels or external assets. */
export function drawFrame(
  ctx: Context,
  time: number,
  kinds: Kind[],
  highlight = true,
) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = "#a4aaa8";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const facades = [0, 108, 254, 382, 528, 640];
  for (let i = 0; i < facades.length - 1; i++) {
    const x = facades[i],
      w = facades[i + 1] - x;
    ctx.fillStyle = ["#bbc0b8", "#909b97", "#ccd0c3", "#a8b0a7", "#b9b8aa"][i];
    ctx.fillRect(x, 0, w - 3, 166);
    ctx.fillStyle = "#606e6a";
    ctx.fillRect(x + 7, 96, w - 17, 9);
    for (let column = x + 14; column < x + w - 16; column += 33) {
      for (let row = 13; row < 90; row += 39) {
        ctx.fillStyle = "#4b5a58";
        ctx.fillRect(column, row, 19, 27);
        ctx.fillStyle = "#7f9590";
        ctx.fillRect(column + 2, row + 2, 7, 23);
        ctx.fillStyle = "#d5d8cc";
        ctx.fillRect(column - 2, row + 27, 23, 3);
      }
    }
    ctx.fillStyle = "#344844";
    ctx.fillRect(x + 17, 112, w - 37, 47);
    ctx.fillStyle = "#7f9390";
    ctx.fillRect(x + 21, 116, w - 45, 32);
    ctx.fillStyle = "#dedbd0";
    ctx.fillRect(x + 13, 107, w - 29, 6);
    ctx.fillStyle = "#354743";
    ctx.fillRect(x + w / 2 - 2, 115, 4, 44);
  }
  ctx.fillStyle = "#c9c9be";
  ctx.fillRect(0, 164, WIDTH, 26);
  ctx.fillStyle = "#8c928a";
  ctx.fillRect(0, 187, WIDTH, 7);
  ctx.fillStyle = "#505b59";
  ctx.fillRect(0, 194, WIDTH, 126);
  ctx.fillStyle = "#acb3a9";
  for (let x = 10; x < WIDTH; x += 89) ctx.fillRect(x, 247, 44, 3);
  ctx.fillStyle = "#79847e";
  ctx.fillRect(0, 307, WIDTH, 13);
  // Stable visual landmarks make the changing time slice easy to read.
  for (const x of [25, 610]) {
    ctx.fillStyle = "#293d37";
    ctx.fillRect(x, 99, 4, 84);
    ctx.fillStyle = "#e0ddbc";
    ctx.fillRect(x - 5, 92, 14, 9);
  }
  const tracks = tracksAt(time).sort(
    (a, b) =>
      Math.max(...a.points.map((p) => p[1])) -
      Math.max(...b.points.map((p) => p[1])),
  );
  for (const track of tracks) {
    path(ctx, track.points);
    ctx.fillStyle = track.kind === "car" ? "#253d3c" : "#202f31";
    ctx.fill();
    if (track.kind === "car") {
      const [x, y] = track.points[0];
      ctx.fillStyle = "#90aaa5";
      path(ctx, [
        [x + 38, y - 23],
        [x + 50, y - 38],
        [x + 89, y - 38],
        [x + 104, y - 23],
      ]);
      ctx.fill();
      ctx.fillStyle = "#2b4340";
      ctx.fillRect(x + 72, y - 38, 3, 16);
      ctx.fillStyle = "#b9c8b6";
      ctx.fillRect(x + 129, y - 14, 8, 5);
      for (const wx of [x + 26, x + 110]) {
        ctx.beginPath();
        ctx.arc(wx, y + 4, 8, 0, Math.PI * 2);
        ctx.fillStyle = "#182422";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(wx, y + 4, 3, 0, Math.PI * 2);
        ctx.fillStyle = "#abb4ab";
        ctx.fill();
      }
    }
    if (highlight && kinds.includes(track.kind)) {
      path(ctx, track.points);
      ctx.strokeStyle = track.color;
      ctx.lineWidth = 2.4;
      ctx.stroke();
    }
  }
}

export type View = {
  time: number;
  yaw: number;
  pitch: number;
  depth: number;
  kinds: Kind[];
  ghosts: boolean;
};
export function drawVolume(
  canvas: HTMLCanvasElement,
  frame: HTMLCanvasElement,
  view: View,
) {
  const ctx = canvas.getContext("2d");
  const frameContext = frame.getContext("2d");
  if (!ctx || !frameContext) return;
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
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#090e12";
  ctx.fillRect(0, 0, width, height);
  const p = createProjection(width, height, view.yaw, view.pitch, view.depth);
  const border = (t: number) =>
    [
      [0, 0],
      [WIDTH, 0],
      [WIDTH, HEIGHT],
      [0, HEIGHT],
    ].map(([x, y]) => p(x, y, t));
  ctx.strokeStyle = "#435058";
  ctx.lineWidth = 0.8;
  for (const t of [0, 1]) {
    path(ctx, border(t));
    ctx.stroke();
  }
  for (const [x, y] of [
    [0, 0],
    [WIDTH, 0],
    [WIDTH, HEIGHT],
    [0, HEIGHT],
  ]) {
    ctx.beginPath();
    ctx.moveTo(...p(x, y, 0));
    ctx.lineTo(...p(x, y, 1));
    ctx.stroke();
  }
  const paintFrame = (t: number, alpha: number, active: boolean) => {
    drawFrame(frameContext, t, view.kinds, active);
    const o = p(0, 0, t),
      x = p(WIDTH, 0, t),
      y = p(0, HEIGHT, t);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.transform(
      (x[0] - o[0]) / WIDTH,
      (x[1] - o[1]) / WIDTH,
      (y[0] - o[0]) / HEIGHT,
      (y[1] - o[1]) / HEIGHT,
      o[0],
      o[1],
    );
    ctx.drawImage(frame, 0, 0);
    ctx.restore();
    if (active) {
      path(ctx, border(t));
      ctx.strokeStyle = "#edf8f4";
      ctx.lineWidth = 1.6;
      ctx.stroke();
      const [hx, hy] = p(WIDTH / 2, 0, t);
      path(ctx, [
        [hx, hy - 13],
        [hx + 5, hy - 8],
        [hx, hy - 3],
        [hx - 5, hy - 8],
      ]);
      ctx.fillStyle = "#edf8f4";
      ctx.fill();
    }
  };
  const layers = Array.from({ length: 49 }, (_, i) => ({
    t: i / 48,
    active: false,
  }));
  layers.push({ t: view.time, active: true });
  layers.sort((a, b) => b.t - a.t);
  for (const layer of layers) {
    if (layer.active) {
      paintFrame(layer.t, 1, true);
      continue;
    }
    if (view.ghosts && Math.round(layer.t * 48) % 4 === 0)
      paintFrame(layer.t, 0.055, false);
    ctx.lineWidth = 0.85;
    for (const track of tracksAt(layer.t)) {
      if (!view.kinds.includes(track.kind)) continue;
      path(
        ctx,
        track.points.map(([x, y]) => p(x, y, layer.t)),
      );
      ctx.strokeStyle = track.color;
      ctx.globalAlpha = layer.t > view.time ? 0.55 : 0.8;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
  // A time ruler independent of the changing frame.
  ctx.font = "11px monospace";
  ctx.fillStyle = "#afc0c7";
  for (const t of [0, 0.25, 0.5, 0.75, 1]) {
    const [x, y] = p(WIDTH, HEIGHT + 18, t);
    ctx.fillText(`${t * 8}s`, x - 7, y + 8);
  }
}
