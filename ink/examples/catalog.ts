// One sheet per layer, so the building blocks can be seen at a glance.
import {
  Scene, text, palette, v, draw, type Node,
  line, curve, arc, circle, box, dot, arrow, hatch, stipple, polyline, tex,
  node, brace, bubble, bar, waves, signal, robot, dirt, axes, matrix, table, neuron, surface, axes3d, points3d, rng, type V3,
  agent, network,
} from "../src/index.ts";

function sheet(title: string, cells: [string, (cx: number, cy: number) => Node[]][], file: string, cols = 4) {
  const s = new Scene({ width: 1920, height: 1080 });
  const rows = Math.ceil(cells.length / cols);
  const cw = 1920 / cols, ch = (1080 - 130) / rows;
  const all: Node[] = [text(title, { size: 40, font: "mono", color: palette.faded }).at(960, 60)];
  cells.forEach(([name, make], i) => {
    const cx = (i % cols) * cw + cw / 2, cy = 130 + Math.floor(i / cols) * ch + ch / 2 - 18;
    all.push(...make(cx, cy));
    all.push(text(name, { size: 22, font: "mono", color: palette.faded }).at(cx, cy + ch / 2 - 10));
  });
  for (const n of all) s.add(n);
  s.snap(file);
}

// ---------------------------------------------------------------- 1. primitives
sheet("1 · PRIMITIVES", [
  ["line", (x, y) => [line(v(x - 120, y + 40), v(x + 120, y - 40), { seed: 1 })]],
  ["curve", (x, y) => [curve([v(x - 130, y + 30), v(x - 40, y - 50), v(x + 40, y + 40), v(x + 130, y - 30)], { seed: 2 })]],
  ["arc", (x, y) => [arc(v(x, y + 40), 100, Math.PI * 1.1, Math.PI * 1.9, { seed: 3 })]],
  ["circle", (x, y) => [circle(v(x, y), 70, { seed: 4 })]],
  ["box", (x, y) => [box(x - 110, y - 65, 220, 130, { seed: 5 })]],
  ["dot", (x, y) => [dot(v(x - 40, y), 4, { seed: 6 }), dot(v(x, y), 7, { seed: 7 }), dot(v(x + 45, y), 11, { seed: 8 })]],
  ["arrow", (x, y) => [arrow(v(x - 120, y + 30), v(x + 120, y - 20), { seed: 9, bend: -0.1 })]],
  ["polyline", (x, y) => [polyline([v(x - 120, y + 50), v(x - 40, y - 50), v(x + 40, y + 40), v(x + 120, y - 40)], { seed: 10 })]],
  ["hatch (tone)", (x, y) => [hatch((p) => Math.hypot(p.x - x, p.y - y) < 75, { x: x - 80, y: y - 80, w: 160, h: 160 }, { seed: 11, spacing: 5, width: 1, tone: (p) => 0.2 + 0.8 * ((p.x - x + 80) / 160), cross: true })]],
  ["stipple", (x, y) => [stipple((p) => Math.hypot(p.x - x, p.y - y) < 75, { x: x - 80, y: y - 80, w: 160, h: 160 }, { seed: 12, count: 380, size: 2.2, tone: (p) => 1 - Math.hypot(p.x - x + 30, p.y - y + 30) / 150 })]],
  ["text", (x, y) => [text("Rasyonel ajan", { size: 42 }).at(x, y)]],
  ["tex", (x, y) => [tex("y = σ(w_1 x_1 + b)", { size: 40 }).at(x, y)]],
], "out/catalog-1-primitives.png");

// ---------------------------------------------------------------- 2. components
const R = rng(4);
const cloud: V3[] = Array.from({ length: 40 }, () => [1 + R.normal(0.4), 1 + R.normal(0.4), 1 + R.normal(0.4)]);
sheet("2 · COMPONENTS", [
  ["node", (x, y) => [node(v(x - 55, y), 44, "x_1", { seed: 1, textOpts: { font: "math" } }), node(v(x + 55, y), 44, "Σ", { seed: 2, shade: true, textOpts: { font: "math" } })]],
  ["brace", (x, y) => [brace(v(x + 120, y + 10), v(x - 120, y + 10), "n", { seed: 3, textOpts: { font: "math" } })]],
  ["bubble", (x, y) => [bubble(v(x - 90, y + 60), v(x + 30, y - 30), 60, { seed: 4 })]],
  ["bar", (x, y) => { const b = bar(x - 20, y - 80, 40, 160, { seed: 5 }); b.fill.base.drawn = 0.6; return [b]; }],
  ["waves", (x, y) => [dot(v(x - 70, y), 6, { seed: 6 }), waves(v(x - 70, y), 0, { seed: 7 })]],
  ["robot", (x, y) => [robot(v(x, y), 52, { seed: 8 })]],
  ["dirt", (x, y) => [dirt(v(x, y), 220, 90, { seed: 9, count: 160 })]],
  ["axes + plot + vec", (x, y) => { const a = axes(x - 140, y - 85, 280, 170, { seed: 10, x: [-1, 3], y: [-1, 2] }); return [a, a.plot((t) => 0.6 + Math.sin(t * 1.6) * 0.8, { seed: 11 }), a.vec(2, 1.2, { seed: 12, color: palette.red })]; }],
  ["matrix", (x, y) => [matrix(v(x, y), [["w_{11}", "w_{12}"], ["w_{21}", "w_{22}"]], { seed: 13 })]],
  ["table", (x, y) => [table(v(x, y), [["algı", "eylem"], ["kirli", "süpür"], ["temiz", "geç"]], { seed: 14, widths: [150, 150], rowH: 44, size: 26 })]],
  ["neuron", (x, y) => [neuron({ seed: 15, size: 12, reach: 5, axonLength: 90 }).at(x, y - 10)]],
  ["surface · points3d", (x, y) => [surface((a, b) => 0.4 * Math.sin(a) * Math.cos(b), { range: [-2.5, 2.5], grid: 10 }, 34).at(x - 80, y + 20), axes3d(1.8, 40).at(x + 70, y + 40), points3d(cloud, { r: 2.2 }, 40).at(x + 70, y + 40)]],
], "out/catalog-2-components.png");

// ---------------------------------------------------------------- 3. figures
const s3 = new Scene();
s3.add(text("3 · FIGURES", { size: 40, font: "mono", color: palette.faded }).at(960, 60));
s3.add(agent(v(330, 420), { seed: 1, aligned: true, size: 150 }), agent(v(640, 420), { seed: 2, aligned: false, size: 150 }));
s3.add(text("agent · aligned", { size: 22, font: "mono", color: palette.faded }).at(330, 640), text("agent · unaligned", { size: 22, font: "mono", color: palette.faded }).at(640, 640));
const net = network(v(1330, 420), [3, 4, 4, 2], { seed: 3, width: 760, height: 380, r: 24, labels: [["x_1", "x_2", "x_3"], [], [], ["y_1", "y_2"]] });
s3.add(net, text("network([3, 4, 4, 2])", { size: 22, font: "mono", color: palette.faded }).at(1330, 700));
s3.snap("out/catalog-3-figures.png");
void draw;
