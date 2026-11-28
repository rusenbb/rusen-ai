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

### Layers

Everything is built from the layer below it, nothing skips a layer:

| Layer | File | What |
| --- | --- | --- |
| 0 · pen | `stroke.ts` | a stroke: pressure, tremor, taper, ink pooling |
| 1 · primitives | `primitives.ts`, `text.ts` | `line curve arc circle box dot arrow polyline hatch stipple text tex` |
| 2 · components | `components.ts`, `neuron.ts`, `three.ts` | `node brace bubble bar waves signal robot dirt axes(.plot .vec .scatter) matrix table`, `neuron`, `surface axes3d points3d path3d` |
| 3 · figures | `figures.ts` | characters and compound diagrams: `agent({ aligned })`, `network([3, 4, 4, 2])` |
| 4 · patterns | `patterns.ts` | storytelling moves: `sense`, `travel`, `loop`, `forward`, `backprop`, `columns`, `crown` |

`examples/catalog.ts` renders one sheet per layer; `examples/backprop.ts` shows
layers 3 and 4 together. Components return groups with named parts
(`bar.fill`, `node.ring`, `net.edges[l][i][j]`), so a scene can animate a part.

Animations: `draw`, `drawTo` (partial, e.g. a bar filling to 30 %), `undraw`,
`fadeIn`, `fadeOut`, `moveTo`, `moveAlong(node, path)`, `shift`, `scaleTo`,
`rotateTo`, `opacityTo`, `recolor` (smooth ink blend), `indicate`, `cameraTo`,
`morph(a, b)` (stroke-by-stroke transform; arrays allowed; uses base positions), `each`
(2D `cx, cy, zoom`; 3D `yaw, pitch, dist`), `custom`. `play(a, b)` runs them
together; `play(a, { duration: 2 })` sets the length; easings in `ease`.

A full worked example, one concept shown end to end with almost no words, is
`examples/rational-agent.ts` (~56 s).

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
