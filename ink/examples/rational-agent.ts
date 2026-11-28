// "Rasyonel ajan", shown rather than told. Almost no words: the idea is
// carried by what the agent senses, what it does, and what it scores.
//   1. a two-room world, dirt, a robot vacuum
//   2. it senses (waves, a thought bubble showing what it saw) and acts (sweeps)
//   3. a bar fills as the world gets cleaner: the performance measure
//   4. the robot and world collapse into the abstract loop: percept in, action out
//   5. two agents side by side; only one fills its bar. That one is rational.
import {
  Scene, box, node, arrow, curve, circle, dot, text, hatch, group, draw, undraw, fadeIn, fadeOut, each,
  moveAlong, moveTo, drawTo, recolor, indicate, cameraTo, morph, palette, v, rng, pen, dotStrokes,
  Figure, type Node, type Vec, ease,
} from "../src/index.ts";

const s = new Scene();

// ------------------------------------------------------------------ builders
function robot(k: number, seed: number) {
  const r = 44 * k;
  const body = node(v(0, 0), r, "", { seed, shade: true, width: 2.6 * Math.sqrt(k) });
  const bumper = curve(Array.from({ length: 9 }, (_, i) => { const a = Math.PI * (1.15 + (0.7 * i) / 8); return v(Math.cos(a) * r * 0.75, Math.sin(a) * r * 0.75); }), { seed: seed + 1, width: 2.4 * Math.sqrt(k) });
  body.add(bumper);
  return body;
}

/** Dirt as ink specks, ordered so that undrawing removes them in the order a path passes over them. */
function dirt(c: Vec, w: number, h: number, path: Vec[], seed: number, n = 170, k = 1) {
  const R = rng(seed);
  const pts: { p: Vec; t: number }[] = [];
  let acc = 0;
  const L = [0];
  for (let i = 1; i < path.length; i++) L.push((acc += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y)));
  while (pts.length < n) {
    const p = v(c.x + (R() - 0.5) * w, c.y + (R() - 0.5) * h);
    if (Math.hypot((p.x - c.x) / (w / 2), (p.y - c.y) / (h / 2)) > 1) continue;
    let best = 0, bd = Infinity;
    for (let i = 0; i < path.length; i++) { const d = Math.hypot(path[i].x - p.x, path[i].y - p.y); if (d < bd) { bd = d; best = i; } }
    pts.push({ p, t: L[best] });
  }
  pts.sort((a, b) => b.t - a.t); // last drawn = first swept
  return new Figure(pts.map(({ p }, i) => {
    const a = R() * 6.28, l = R.range(0.8, 2.2) * k;
    return pen([p, v(p.x + Math.cos(a) * l, p.y + Math.sin(a) * l)], { seed: seed + i, width: 2.6 * Math.max(k, 0.85), wobble: 0, taper: [0, 0], blot: 0, color: palette.sepia });
  }));
}

/** Densify a polyline so moveAlong and the dirt ordering agree. */
function dense(ps: Vec[], step = 6) {
  const out: Vec[] = [ps[0]];
  for (let i = 1; i < ps.length; i++) {
    const a = ps[i - 1], b = ps[i], n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / step));
    for (let j = 1; j <= n; j++) out.push(v(a.x + ((b.x - a.x) * j) / n, a.y + ((b.y - a.y) * j) / n));
  }
  return out;
}

function world(ox: number, oy: number, k: number, seed: number) {
  const W = 520 * k, H = 360 * k;
  const roomA = box(ox, oy, W, H, { seed, width: 2.4 * Math.sqrt(k) });
  const roomB = box(ox + W, oy, W, H, { seed: seed + 1, width: 2.4 * Math.sqrt(k) });
  const start = v(ox + 110 * k, oy + 95 * k);
  const rows = [175, 230, 285].map((y) => oy + y * k);
  const sweep = (dx: number) => [v(ox + dx + 130 * k, rows[0]), v(ox + dx + 390 * k, rows[0]), v(ox + dx + 390 * k, rows[1]), v(ox + dx + 130 * k, rows[1]), v(ox + dx + 130 * k, rows[2]), v(ox + dx + 390 * k, rows[2])];
  const sweepA = dense([start, ...sweep(0)]);
  const sweepB = dense(sweep(W));
  const transit = dense([sweepA[sweepA.length - 1], v(ox + W * 0.98, oy + 230 * k), sweepB[0]]);
  const dirtA = dirt(v(ox + 260 * k, oy + 230 * k), 280 * k, 120 * k, sweepA, seed + 10, 170, k);
  const dirtB = dirt(v(ox + W + 260 * k, oy + 230 * k), 280 * k, 120 * k, sweepB, seed + 20, 170, k);
  const bot = robot(k, seed + 30).at(start.x, start.y);
  const bx = ox + 2 * W + 60 * k, bw = 44 * k;
  const barFrame = box(bx, oy, bw, H, { seed: seed + 40, width: 2 * Math.sqrt(k) });
  const barFill = hatch((p) => p.x > bx + 4 * k && p.x < bx + bw - 4 * k && p.y > oy + 4 * k && p.y < oy + H - 4 * k, { x: bx, y: oy, w: bw, h: H }, { seed: seed + 41, angle: Math.PI, spacing: 4.5 * k, width: 1.6 * Math.sqrt(k), curl: 0.02 });
  return { roomA, roomB, dirtA, dirtB, bot, barFrame, barFill, sweepA, sweepB, transit, start, W, H };
}

/** Three arcs fanning out of the robot towards what it senses. */
function waves(at: Vec, angle: number, k = 1, seed = 1) {
  return group(...[62, 82, 102].map((r, i) => curve(Array.from({ length: 9 }, (_, j) => { const a = angle - 0.5 + j / 8; return v(at.x + Math.cos(a) * r * k, at.y + Math.sin(a) * r * k); }), { seed: seed + i, width: 1.6 * k, color: palette.faded }))).withLag(0.5);
}
function sense(at: Vec, angle: number, k = 1, seed = 1, times = 2) {
  for (let i = 0; i < times; i++) {
    const w = waves(at, angle, k, seed + i * 7);
    s.play(draw(w, { duration: 0.45 }));
    s.play(fadeOut(w, { duration: 0.35 }));
  }
}

// ------------------------------------------------------------------ 1. the world
const W1 = world(400, 330, 1, 100);
s.play(draw(group(W1.roomA, W1.roomB).withLag(0.7), { duration: 1.8 }));
s.play(draw(W1.dirtA, { duration: 1.1 }));
s.play(draw(W1.dirtB, { duration: 1.1 }));
s.play(draw(W1.bot, { duration: 1.2 }));
s.wait(0.4);

// ------------------------------------------------------------------ 2. sense, think, act
const toDirtA = Math.atan2(560 - W1.start.y, 660 - W1.start.x);
sense(W1.start, toDirtA, 1, 200);
// a thought bubble shows what it perceived: a tiny dirty room
const bub = v(W1.start.x + 150, W1.start.y - 170);
const trail = group(circle(v(W1.start.x + 52, W1.start.y - 58), 6, { seed: 301 }), circle(v(W1.start.x + 82, W1.start.y - 98), 10, { seed: 302 }));
const cloud = circle(bub, 70, { seed: 303, width: 2 });
const miniRoom = box(bub.x - 38, bub.y - 26, 76, 52, { seed: 304, width: 1.6 });
const miniDirt = dirt(v(bub.x, bub.y + 4), 46, 24, [v(bub.x - 30, bub.y), v(bub.x + 30, bub.y)], 305, 28, 0.5);
s.play(draw(trail, { duration: 0.5 }));
s.play(draw(cloud, { duration: 0.7 }));
s.play(draw(miniRoom, { duration: 0.6 }), draw(miniDirt, { duration: 0.6 }));
s.wait(0.6);

// the bar that will measure how well it does
s.play(draw(W1.barFrame, { duration: 0.8 }));

// act: sweep room A, the dirt goes as it passes, the bar rises
s.play(...each([trail, cloud, miniRoom, miniDirt], (n) => fadeOut(n, { duration: 0.5 })));
s.play(moveAlong(W1.bot, W1.sweepA, { duration: 4 }), undraw(W1.dirtA, { duration: 4, ease: ease.linear }));
s.play(drawTo(W1.barFill, 0.5, { duration: 1 }));

// move on, sense again, sweep B
s.play(moveAlong(W1.bot, W1.transit, { duration: 1.6, ease: ease.inOut }));
sense(W1.sweepB[0], Math.atan2(80, 120), 1, 400, 1);
s.play(moveAlong(W1.bot, W1.sweepB, { duration: 4 }), undraw(W1.dirtB, { duration: 4, ease: ease.linear }));
s.play(drawTo(W1.barFill, 1, { from: 0.5, duration: 1 }));
s.play(indicate(W1.barFrame, { amount: 0.04 }));
s.wait(0.6);

// ------------------------------------------------------------------ 3. the abstraction
const agentC = v(620, 520), worldC = v(1330, 520);
const agentNode = circle(agentC, 70, { seed: 501, width: 2.6 });
const worldBox = box(worldC.x - 200, worldC.y - 170, 400, 340, { seed: 502, width: 2.6 });
// the robot is wherever the sweep ended
const botEnd = W1.sweepB[W1.sweepB.length - 1];
s.play(moveTo(W1.bot, agentC.x, agentC.y, { duration: 1.4 }), fadeOut(W1.barFrame, { duration: 1 }), fadeOut(W1.barFill, { duration: 1 }), morph([W1.roomA, W1.roomB], worldBox, { duration: 1.6 }));
// the robot's body becomes a plain circle: "an agent"
const botAtCentre = robot(1, 130).at(agentC.x, agentC.y);
s.play(morph(botAtCentre, agentNode, { duration: 1.2 }), fadeOut(W1.bot, { duration: 0.2 }));
void botEnd;

const pArrow = arrow(v(worldC.x - 215, worldC.y - 70), v(agentC.x + 85, agentC.y - 40), { seed: 511, bend: 0.18, width: 2.4 });
const aArrow = arrow(v(agentC.x + 85, agentC.y + 40), v(worldC.x - 215, worldC.y + 70), { seed: 512, bend: 0.18, width: 2.4 });
const pLbl = text("algı", { size: 34, color: palette.faded }).at(975, 380);
const aLbl = text("eylem", { size: 34, color: palette.faded }).at(975, 665);
s.play(draw(pArrow, { duration: 0.9 }));
s.play(draw(pLbl, { duration: 0.5 }));
s.play(draw(aArrow, { duration: 0.9 }));
s.play(draw(aLbl, { duration: 0.5 }));

// a signal runs round the loop, faster each time: sensing, then acting
const shaft = (f: Figure) => f.strokes[0].pts.map((p) => v(p.x, p.y));
const pk = new Figure(dotStrokes(v(0, 0), 7, { seed: 520 })).at(worldC.x - 215, worldC.y - 70);
s.play(fadeIn(pk, { duration: 0.3 }));
for (const [i, d] of [1.4, 1.0, 0.7].entries()) {
  s.play(recolor(pk, null, { duration: 0.15 }), moveAlong(pk, shaft(pArrow), { duration: d, ease: ease.inOut }));
  s.play(indicate(agentNode, { duration: 0.35, amount: 0.08 }));
  s.play(recolor(pk, palette.red, { duration: 0.15 }), moveAlong(pk, shaft(aArrow), { duration: d, ease: ease.inOut }));
  s.play(indicate(worldBox, { duration: 0.35, amount: 0.03 }));
  if (i < 2) s.play(moveTo(pk, worldC.x - 215, worldC.y - 70, { duration: 0.01 }));
}
s.wait(0.6);
s.play(...each([pArrow, aArrow, pLbl, aLbl, pk, agentNode, worldBox], (n) => fadeOut(n, { duration: 0.9 })));

// ------------------------------------------------------------------ 4. two agents, one measure
const k = 0.62;
const oy2 = 540 - (360 * k) / 2 - 20;
const L = world(150, oy2, k, 700), Rw = world(1000, oy2, k, 800);
// mirror layout: right world further right
s.play(
  draw(group(L.roomA, L.roomB), { duration: 1.4 }), draw(group(Rw.roomA, Rw.roomB), { duration: 1.4 }),
  draw(L.barFrame, { duration: 1 }), draw(Rw.barFrame, { duration: 1 }),
);
s.play(draw(L.dirtA, { duration: 0.8 }), draw(L.dirtB, { duration: 0.8 }), draw(Rw.dirtA, { duration: 0.8 }), draw(Rw.dirtB, { duration: 0.8 }));
s.play(draw(L.bot, { duration: 0.8 }), draw(Rw.bot, { duration: 0.8 }));

// left: wanders without looking; right: senses, then cleans where the dirt is
const R = rng(9);
const wander = dense([L.start, ...Array.from({ length: 7 }, () => v(150 + (40 + R() * 560) * k, oy2 + (50 + R() * 260) * k))]);
sense(Rw.start, Math.atan2(80, 90), k, 900, 1);
const third = Math.floor(wander.length / 3);
const w1 = wander.slice(0, third + 1), w2 = wander.slice(third, 2 * third + 1), w3 = wander.slice(2 * third);
s.play(
  moveAlong(L.bot, w1, { duration: 3 }), drawTo(L.dirtA, 0.85, { from: 1, duration: 3 }), drawTo(L.barFill, 0.1, { duration: 3 }),
  moveAlong(Rw.bot, Rw.sweepA, { duration: 3 }), undraw(Rw.dirtA, { duration: 3, ease: ease.linear }), drawTo(Rw.barFill, 0.5, { duration: 3, ease: ease.linear }),
);
s.play(moveAlong(L.bot, w2, { duration: 0.9 }), moveAlong(Rw.bot, Rw.transit, { duration: 0.9, ease: ease.inOut }));
s.play(
  moveAlong(L.bot, w3, { duration: 3 }), drawTo(L.dirtA, 0.72, { from: 0.85, duration: 3 }), drawTo(L.barFill, 0.22, { from: 0.1, duration: 3 }),
  moveAlong(Rw.bot, Rw.sweepB, { duration: 3 }), undraw(Rw.dirtB, { duration: 3, ease: ease.linear }), drawTo(Rw.barFill, 1, { from: 0.5, duration: 3, ease: ease.linear }),
);
s.wait(0.5);
s.play(recolor(Rw.barFill, palette.red, { duration: 1 }), recolor(Rw.barFrame, palette.red, { duration: 1 }));
const word = text("rasyonel", { size: 52, color: palette.red }).at(1000 + 540 * k, oy2 + 360 * k + 80);
s.play(draw(word, { duration: 1 }));
s.wait(2.5);

export { s };
if (process.argv.includes("--snap")) {
  console.log("duration", s.duration.toFixed(1));
  s.storyboard("out/agent-board.png", 12, 640);
}
if (process.argv.includes("--video")) await s.render("out/rational-agent.mp4");
