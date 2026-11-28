// An embedding space: axes are drawn, three clusters of words appear as ink
// dots, the camera orbits so depth reads, one vector is drawn in red.
import { Scene, axes3d, points3d, path3d, draw, fadeIn, pin, cameraTo, tex, text, palette, ease, rng, type V3 } from "../src/index.ts";

const s = new Scene();
s.camera.base.yaw = -0.5;
s.camera.base.pitch = 0.35;
const U = 230, C = { x: 820, y: 720 };
const R = rng(5);
const cluster = (c: V3, n: number, sd: number): V3[] => Array.from({ length: n }, () => [c[0] + R.normal(sd), c[1] + R.normal(sd), c[2] + R.normal(sd)] as V3);
const axes = axes3d(2.6, U).at(C.x, C.y).named("axes");
const a = points3d(cluster([1.6, 1.4, 0.4], 26, 0.28), { r: 4.5 }, U).at(C.x, C.y).named("animals");
const b = points3d(cluster([0.3, 0.5, 1.9], 26, 0.3), { r: 4.5, color: palette.sepia }, U).at(C.x, C.y).named("tools");
const c = points3d(cluster([1.9, 0.3, 1.8], 22, 0.25), { r: 4.5, color: palette.faded }, U).at(C.x, C.y).named("places");
const vec = path3d(Array.from({ length: 30 }, (_, i) => [1.6 * i / 29, 1.4 * i / 29, 0.4 * i / 29] as V3), { color: palette.red, arrow: true, width: 2.2 }, U).at(C.x, C.y).named("king");
const label = pin(tex("v_{king}", { size: 44, color: palette.red, align: "left" }), vec, [1.6, 1.4, 0.4], { x: 16, y: -30 });
const title = text("meaning, as position", { size: 38 }).at(960, 110);

s.play(draw(axes, { duration: 1.8 }));
s.play(fadeIn(a, { duration: 0.8 }), cameraTo(s.camera, { yaw: -0.2 }, { duration: 4, ease: ease.inOut }));
s.play(fadeIn(b, { duration: 0.8 }));
s.play(fadeIn(c, { duration: 0.8 }));
s.play(draw(vec, { duration: 1.2 }), draw(title, { duration: 1.2 }));
s.play(draw(label, { duration: 0.5 }));
s.play(cameraTo(s.camera, { yaw: 0.6, pitch: 0.55 }, { duration: 3.5 }));
s.wait(0.8);

s.snap("out/embedding-final.png");
s.storyboard("out/embedding-storyboard.png", 6);
if (process.argv.includes("--video")) await s.render("out/embedding.mp4");
