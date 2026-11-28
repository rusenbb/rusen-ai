// A loss landscape in ink: the surface is drawn, the camera orbits,
// and a red path of gradient descent rolls down to the minimum.
import { Scene, surface, path3d, points3d, draw, cameraTo, fadeIn, text, palette, ease, type V3 } from "../src/index.ts";

const f = (x: number, z: number) => 0.9 * Math.exp(-((x - 1) ** 2 + (z + 0.6) ** 2) / 1.2) - 1.3 * Math.exp(-((x + 0.9) ** 2 + (z - 0.8) ** 2) / 1.6) + 0.06 * (x * x + z * z) + 0.15 * Math.sin(1.7 * x) * Math.cos(1.3 * z);

const s = new Scene();
s.camera.base.yaw = -0.7;
s.camera.base.pitch = 0.5;
const land = surface(f, { range: [-3, 3], grid: 16, shade: true }, 150).at(960, 600).named("loss");

// gradient descent from a high point
const path: V3[] = [];
let x = 2.3, z = 2.5;
for (let i = 0; i < 140; i++) {
  path.push([x, f(x, z) + 0.03, z]);
  const e = 1e-3;
  const gx = (f(x + e, z) - f(x - e, z)) / (2 * e), gz = (f(x, z + e) - f(x, z - e)) / (2 * e);
  x -= 0.12 * gx; z -= 0.12 * gz;
}
const descent = path3d(path, { color: palette.red, width: 2.6 }, 150).at(960, 600).behind(land).named("descent");
const ball = points3d([path[path.length - 1]], { r: 6, color: palette.red }, 150).at(960, 600).behind(land).named("minimum");
const title = text("loss", { size: 44, color: palette.ink }).at(300, 140);

s.play(draw(land, { duration: 6 }), cameraTo(s.camera, { yaw: -0.2 }, { duration: 6, ease: ease.inOut }));
s.play(draw(title, { duration: 0.6 }));
s.play(draw(descent, { duration: 2.5, ease: ease.inOut }));
s.play(fadeIn(ball, { duration: 0.3 }));
s.play(cameraTo(s.camera, { yaw: 0.5, pitch: 0.75 }, { duration: 3 }));
s.wait(1);

s.snap("out/loss-final.png");
s.snap("out/loss-mid.png", { time: 7 });
s.storyboard("out/loss-storyboard.png", 6);
if (process.argv.includes("--video")) await s.render("out/loss.mp4");
