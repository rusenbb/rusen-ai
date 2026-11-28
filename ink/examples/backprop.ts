// Layer 4 in action: a network is drawn, a forward pass runs through it,
// then the error flows back (backprop) and the weights settle.
import { Scene, network, forward, backprop, draw, tex, palette, v } from "../src/index.ts";

const s = new Scene();
const net = network(v(960, 520), [3, 4, 4, 2], { seed: 3, width: 1100, height: 460, r: 30, labels: [["x_1", "x_2", "x_3"], [], [], ["ŷ_1", "ŷ_2"]] });
s.play(draw(net, { duration: 4 }));
s.wait(0.4);
forward(s, net, { duration: 0.9 });
const loss = tex("L", { size: 56, color: palette.red }).at(1600, 520);
s.play(draw(loss, { duration: 0.6 }));
backprop(s, net, { duration: 1 });
s.wait(1.2);

s.storyboard("out/backprop-board.png", 9, 640);
if (process.argv.includes("--video")) await s.render("out/backprop.mp4");
