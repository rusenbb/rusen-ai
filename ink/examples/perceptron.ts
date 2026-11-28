// The perceptron, drawn: inputs, weighted arrows, a summing node, an output.
// Then one weight is pointed at in red, and the camera leans in.
import { Scene, node, arrow, text, tex, draw, indicate, cameraTo, group, palette, v, recolor } from "../src/index.ts";

const s = new Scene();
const ins = [0, 1, 2].map((i) => node(v(560, 330 + i * 210), 46, `x_${i + 1}`, { seed: 10 + i, textOpts: { font: "math" } }).named(`x${i + 1}`));
const sum = node(v(1060, 540), 82, "Σ", { seed: 21, shade: true, width: 2.6, textOpts: { font: "math" } }).named("sum");
const out = node(v(1440, 540), 46, "y", { seed: 31, textOpts: { font: "math" } }).named("y");
const wires = ins.map((n, i) => arrow(v(n.base.x, n.base.y), v(sum.base.x, sum.base.y), { seed: 40 + i, gap: 0 }).named(`w${i + 1}`));
// trim arrows so they start/end at the circles
for (const [i, w] of wires.entries()) {
  const a = v(ins[i].base.x, ins[i].base.y), b = v(sum.base.x, sum.base.y);
  wires[i] = arrow(a, b, { seed: 40 + i, gap: 0, bend: [-0.05, 0.0, 0.05][i] }).named(w.name);
}
const trim = (a: { x: number; y: number }, b: { x: number; y: number }, ra: number, rb: number) => {
  const d = Math.hypot(b.x - a.x, b.y - a.y), ux = (b.x - a.x) / d, uy = (b.y - a.y) / d;
  return [v(a.x + ux * (ra + 10), a.y + uy * (ra + 10)), v(b.x - ux * (rb + 12), b.y - uy * (rb + 12))] as const;
};
for (let i = 0; i < 3; i++) {
  const [a, b] = trim(ins[i].base, sum.base, 46, 82);
  wires[i] = arrow(a, b, { seed: 40 + i, bend: [-0.05, 0, 0.05][i] }).named(`w${i + 1}`);
}
const [oa, ob] = trim(sum.base, out.base, 82, 46);
const outArrow = arrow(oa, ob, { seed: 50 });
const wl = [0, 1, 2].map((i) => tex(`w_${i + 1}`, { size: 34, color: palette.faded }).at([790, 790, 815][i], [385, 505, 690][i]));
const caption = text("a weighted sum, then a decision", { size: 36 }).at(960, 930);

s.play(draw(group(...ins).withLag(0.6), { duration: 2 }));
s.play(draw(sum, { duration: 1.6 }));
s.play(draw(group(...wires).withLag(0.5), { duration: 1.6 }));
s.play(draw(group(...wl).withLag(0.4), { duration: 0.9 }));
s.play(draw(outArrow, { duration: 0.6 }), draw(out, { duration: 1 }));
s.play(draw(caption, { duration: 1.2 }));
s.wait(0.5);
s.play(recolor(wires[0], palette.red), recolor(wl[0], palette.red), indicate(wl[0], { amount: 0.25 }));
s.play(cameraTo(s.camera, { zoom: 1.2, cx: 990, cy: 580 }, { duration: 1.8 }));
s.wait(1);

s.snap("out/perceptron-final.png");
s.snap("out/perceptron-wide.png", { time: 9.5 });
s.storyboard("out/perceptron-storyboard.png", 6);
if (process.argv.includes("--video")) await s.render("out/perceptron.mp4");
