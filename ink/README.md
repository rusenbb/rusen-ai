# ink

A small Manim-style animation engine that draws in pen and ink: Leonardo's
notebooks, Cajal's neurons. Cream paper, black and sepia ink, red only as the
accent. Every mark is a pen stroke with pressure and a little tremor, so
everything animates as *drawing*, not as fading shapes.

Nothing here is part of the site build.

```sh
cd ink && npm install
node --experimental-strip-types examples/neuron.ts --video     # out/neuron.mp4
```

## Writing a scene (TypeScript)

```ts
import { Scene, neuron, node, arrow, tex, text, draw, recolor, indicate, cameraTo, group, palette, v } from "./src/index.ts";

const s = new Scene();                       // 1920x1080, 60 fps, paper
const n = neuron({ seed: 11, size: 26 }).at(860, 470);
s.play(draw(n, { duration: 7 }));            // pen draws soma, dendrites, axon
s.play(recolor(n.items[2], palette.red));    // parts: soma, dendrites, axon
s.wait(1);

s.snap("out/check.png");                     // frame at the end so far
s.snap("out/mid.png", { time: 3.2 });        // any moment
s.undo();                                    // drop the last step
await s.render("out/scene.mp4");             // .mov / .webm = transparent ink
```

Every frame is a pure function of time, so `snap` at any moment, `storyboard`
(a contact sheet), `undo`/`redo` and `timeline()` (start/end of every
animation, to sync with narration) all work without replaying a video.

### Pieces

| 2D | |
| --- | --- |
| `neuron({ kind, size, reach, dendrites, axonAngle, axonLength, spines, seed })` | Cajal-style cell; parts `soma`, `dendrites`, `axon` |
| `node(c, r, label, { shade })` | circle + label, optional hatched shadow |
| `arrow(a, b, { bend, head })`, `line`, `curve(points)`, `circle`, `box`, `dot` | hand-drawn marks |
| `hatch(region, bbox, { angle, spacing, tone, cross })` | Leonardo hatching, tone-driven |
| `stipple(inside, bbox, { tone })` | dotted tone |
| `text(s)` / `tex("w_1 x^2")` | Geist Serif prose / STIX italic math with `_` `^` |
| `group(...).withLag(0.5)` | draw children one after another (or overlapping). A node lives in one group; to animate several existing nodes together use `s.play(...each(nodes, fadeOut))` |
| `captions(scene)` → `say(text, hold)`, `clear()`, `srt(path)` | pen-written captions at the bottom, plus a matching `.srt` subtitle file |

| 3D (projected through `scene.camera`, hidden lines removed, far lines thinner) | |
| --- | --- |
| `surface(f, { range, grid, shade, contours })` | loss landscape `y = f(x, z)` |
| `axes3d(size)`, `points3d(points)`, `path3d(points, { arrow })` | embedding spaces, vectors, trajectories |
| `path3d(...).behind(surface)` | a path on the surface that hides behind hills |
| `pin(label, fig3d, [x, y, z])` | 2D label stuck to a 3D point |

Animations: `draw`, `undraw`, `fadeIn`, `fadeOut`, `moveTo`, `shift`,
`scaleTo`, `rotateTo`, `opacityTo`, `recolor`, `indicate`, `cameraTo`, `each`
(2D `cx, cy, zoom`; 3D `yaw, pitch, dist`), `custom`. `play(a, b)` runs them
together; `play(a, { duration: 2 })` sets the length; easings in `ease`.

A full worked example, one concept end to end with captions, is
`examples/rational-agent.ts` (~90 s).

## Building step by step (CLI)

A scene can also be a JSON list of ops, edited one step at a time. This is how
Claude draws: add a piece, look at the snapshot, undo if it's wrong.

```sh
bin/ink new s.json
bin/ink do s.json '{"op":"draw","id":"cell","make":"neuron","args":{"seed":3,"kind":"stellate"},"at":[700,540],"duration":4}'
bin/ink do s.json '{"op":"draw","id":"eq","make":"tex","args":{"text":"h_t = σ(W x_t + b)","size":46},"at":[1300,540]}'
bin/ink snap s.json out/now.png          # --at 2.5 for a moment, --width 960 for a quick look
bin/ink undo s.json                      # redo, ls, board, timeline
bin/ink do s.json '{"op":"together","ops":[{"op":"recolor","id":"cell.axon","color":"red"},{"op":"indicate","id":"eq"}]}'
bin/ink render s.json out/s.mp4
```

Ops: `draw`, `add`, `fadeIn` (these create: `make` + `args` + `at`), `wait`,
`remove`, `undraw`, `fadeOut`, `move`, `shift`, `scale`, `rotate`, `opacity`,
`recolor`, `indicate`, `camera`, `together`. `id.part` addresses parts
(`cell.axon`). Makers: `neuron node circle dot line arrow curve box text tex
surface axes3d points3d path3d` (`surface` takes `"f": "Math.sin(x)*z"`).
Colours: `ink sepia faded red` or any hex.

## Video

`.mp4` is H.264 on paper. `.mov` (ProRes 4444) and `.webm` (VP9) are ink on a
transparent background, for laying the drawing over footage in an editor.
1080p60 takes about 2–5 s of CPU per second of video (the 3D scenes are the slow ones).

Fonts: Geist Serif/Mono (OFL), STIX Two Text (OFL), in `fonts/`.
