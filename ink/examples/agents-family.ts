// A short piece with no words but one name: Turing is drawn as an engraving,
// then the agent family grows up beside him, and finally something is put in
// a sandbox that it does not fit in.
//   node --experimental-strip-types examples/agents-family.ts [--video]
import {
  Scene, v, palette, draw, fadeIn, fadeOut, moveTo, scaleTo, recolor, indicate, each, text,
  person, people, reflexAgent, learningAgent, agent, agi, superintelligence, sandbox, occlude,
} from "../src/index.ts";

const s = new Scene();

// 1. Turing, engraved
const turing = (await person("turing", { height: 900 })).at(960, 540);
s.play(draw(turing.outline, { duration: 3.5 }));
s.play(draw(turing.shade, { duration: 8 }));
const name = text(`${people.turing.name}`, { size: 34, color: palette.sepia }).at(960, 1030);
s.play(fadeIn(name, { duration: 0.8 }));
s.wait(1.2);

// 2. he steps aside; the family he made possible grows up in a row
s.play(moveTo(turing, 280, 560), scaleTo(turing, 0.52), moveTo(name, 280, 840), { duration: 1.4 });
const fy = 600;
const reflex = reflexAgent(v(700, fy), { seed: 3, size: 95 });
const learner = learningAgent(v(930, fy), { seed: 4, size: 110 });
const fam = [reflex, learner, agent(v(1170, fy), { seed: 5, size: 125 }), agi(v(1500, fy - 20), { seed: 7, size: 200 })];
for (const f of fam) s.play(draw(f, { duration: 1.6 }));
s.play(indicate(reflex.eye, { duration: 0.8 }));
s.play(indicate(learner.curve, { duration: 0.8 }));
s.wait(1.2);

// 3. everything clears; a sandbox, and a reflex agent fits in it fine
s.play(...each([turing, name, ...fam], (n) => fadeOut(n, { duration: 1 })));
const box = sandbox(v(960, 760), { seed: 9, w: 540, h: 300 });
s.play(draw(box, { duration: 2.4 }));
const small = reflexAgent(v(960, 800), { seed: 21, size: 90 });
s.play(draw(small, { duration: 1.4 }));
s.wait(0.8);
s.play(fadeOut(small, { duration: 0.6 }));

// 4. then the superintelligence: it does not fit
const si = superintelligence(v(960, 700), { seed: 8, size: 560 });
s.play(draw(si, { duration: 5 }));
// the frame behind it becomes hidden: cross-fade to a copy with the covered lines cut away
const hidden = occlude(sandbox(v(960, 760), { seed: 9, w: 540, h: 300 }), si.inside);
s.play(fadeOut(box, { duration: 0.8 }), fadeIn(hidden, { duration: 0.8 }));
s.play(recolor(hidden.band, palette.red, { duration: 1.2 }), recolor(hidden.frame, palette.red, { duration: 1.2 }));
s.wait(2);

const video = process.argv.includes("--video");
s.storyboard("out/agents-family-board.png", 9, 640);
if (video) await s.render("out/agents-family.mp4");
console.log(`${s.duration.toFixed(1)} s`);
