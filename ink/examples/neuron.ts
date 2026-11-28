// A single Cajal-style neuron is drawn, its axon lights up red, then a note.
import { Scene, neuron, arrow, text, draw, recolor, indicate, palette, v } from "../src/index.ts";

const s = new Scene();
const n = neuron({ seed: 11, size: 26, reach: 7, axonLength: 330 }).at(860, 470).named("neuron");
const label = text("axon", { size: 40, color: palette.red }).at(1240, 760).named("label");
const pointer = arrow(v(1190, 760), v(905, 735), { seed: 4, color: palette.red, bend: -0.15, gap: 6 }).named("pointer");

s.play(draw(n, { duration: 7 }));
s.wait(0.4);
s.play(recolor(n.items[2], palette.red, { duration: 0.2 }), draw(pointer, { duration: 0.8 }));
s.play(draw(label, { duration: 0.6 }));
s.wait(1.2);

s.snap("out/neuron-final.png");
s.storyboard("out/neuron-storyboard.png", 6);
if (process.argv.includes("--video")) await s.render("out/neuron.mp4");
console.log(JSON.stringify(s.timeline()));
