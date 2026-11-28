// "Rasyonel ajan" from first principles, as one continuous drawing.
// 1) agent/environment loop  2) a two-room vacuum world, step by step
// 3) a performance measure as tally marks  4) the definition.
import {
  Scene, box, node, arrow, line, curve, text, tex, hatch, stipple, group, draw, undraw, fadeIn, fadeOut, each,
  moveTo, recolor, indicate, cameraTo, palette, v, type Node, type Anim, Figure, lineStroke, ease, captions,
} from "../src/index.ts";

const s = new Scene();

// captions are written by the pen and also saved as .srt subtitles
const cap = captions(s);
const say = cap.say;

// ---------------------------------------------------------------- 1. title
const title = text("Rasyonel ajan", { size: 84 }).at(960, 470);
const rule = line(v(760, 540), v(1160, 540), { seed: 2, width: 1.6 });
s.play(draw(title, { duration: 1.4 }));
s.play(draw(rule, { duration: 0.6 }));
s.wait(1);
s.play(fadeOut(title), fadeOut(rule));

// ---------------------------------------------------------------- 2. the loop
const agentBox = box(470, 380, 380, 240, { seed: 5, width: 2.4 });
const agentLbl = text("ajan", { size: 46 }).at(660, 330);
const envBox = box(1120, 300, 420, 400, { seed: 8, width: 2.4 });
const envShade = hatch((p) => p.x > 1130 && p.x < 1530 && p.y > 310 && p.y < 690, { x: 1120, y: 300, w: 420, h: 400 }, {
  seed: 9, spacing: 9, width: 0.9, alpha: 0.5, tone: (p) => 0.25 + 0.5 * ((p.x - 1120) / 420),
});
const envLbl = text("çevre", { size: 46 }).at(1330, 250);
const percept = arrow(v(1110, 400), v(865, 430), { seed: 11, bend: -0.12, width: 2.2 });
const action = arrow(v(865, 570), v(1110, 600), { seed: 12, bend: -0.12, width: 2.2 });
const pLbl = text("algı", { size: 36, color: palette.faded }).at(990, 365);
const aLbl = text("eylem", { size: 36, color: palette.faded }).at(990, 650);
const q = text("?", { size: 90 }).at(660, 505);

s.play(draw(agentBox, { duration: 1.2 }), draw(agentLbl, { duration: 0.8 }));
say("Bir ajan düşünelim: dünyanın içinde yaşayan bir şey.", 1.0);
s.play(draw(envBox, { duration: 1.2 }), draw(envLbl, { duration: 0.8 }));
s.play(draw(envShade, { duration: 1.6 }));
say("Onun dışındaki her şey: çevre.", 0.8);
s.play(draw(percept, { duration: 1 }), draw(pLbl, { duration: 0.8 }));
say("Ajan çevreyi algılar...", 0.6);
s.play(draw(action, { duration: 1 }), draw(aLbl, { duration: 0.8 }));
say("...ve çevreye bir eylemle karşılık verir.", 0.8);
s.play(draw(q, { duration: 0.6 }));
say("Peki içeride ne olmalı?", 1.0);
const fn = tex("f : algı → eylem", { size: 48 }).at(660, 500);
s.play(fadeOut(q, { duration: 0.4 }));
s.play(draw(fn, { duration: 1.2 }), recolor(fn, palette.red, { duration: 0.01 }));
say("Bir fonksiyon: her algıya bir eylem. Ajan fonksiyonu.", 1.4);
const loop = [agentBox, agentLbl, envBox, envShade, envLbl, percept, action, pLbl, aLbl, fn];
cap.clear(0.4);
s.play(...each(loop, (n) => undraw(n, { duration: 1.6 })));

// ---------------------------------------------------------------- 3. vacuum world
const roomA = box(460, 360, 420, 300, { seed: 21, width: 2.4 });
const roomB = box(880, 360, 420, 300, { seed: 22, width: 2.4 });
const lA = text("A", { size: 40, color: palette.faded }).at(500, 400);
const lB = text("B", { size: 40, color: palette.faded }).at(920, 400);
const dirtIn = (x0: number) => (p: { x: number; y: number }) => Math.hypot((p.x - x0) / 120, (p.y - 560) / 55) < 1;
const dirtA = stipple(dirtIn(700), { x: 560, y: 500, w: 280, h: 120 }, { seed: 31, count: 260, size: 2.4, color: palette.sepia });
const dirtB = stipple(dirtIn(1100), { x: 960, y: 500, w: 280, h: 120 }, { seed: 32, count: 260, size: 2.4, color: palette.sepia });
const bot = node(v(0, 0), 46, "", { seed: 41, shade: true, width: 2.6 }).at(600, 470);
// front bumper: an inner arc, so it reads as a robot vacuum seen from above
const bumper = curve(Array.from({ length: 9 }, (_, i) => { const a = Math.PI * (1.15 + 0.7 * i / 8); return v(Math.cos(a) * 33, Math.sin(a) * 33); }), { seed: 42, width: 2.4 });
bot.add(bumper);

const roomsG = group(roomA, roomB).withLag(0.6), labelsG = group(lA, lB);
s.play(draw(roomsG, { duration: 1.6 }), draw(labelsG, { duration: 0.8 }));
say("Küçük bir dünya: iki oda, A ve B.", 0.6);
s.play(draw(dirtA, { duration: 1.2 }), draw(dirtB, { duration: 1.2 }));
say("İkisi de kirli.", 0.4);
s.play(draw(bot, { duration: 1.2 }));
say("Ajanımız bir süpürge. Algısı: hangi odada ve oda kirli mi.", 1.0);

// the agent's table, filled row by row
const tx = 1450, ty = 300;
const head = group(text("algı", { size: 32, color: palette.faded }).at(tx + 90, ty), text("eylem", { size: 32, color: palette.faded }).at(tx + 300, ty));
const hr = line(v(tx - 10, ty + 28), v(tx + 380, ty + 28), { seed: 51, width: 1.4 });
const vr = line(v(tx + 200, ty - 24), v(tx + 200, ty + 270), { seed: 52, width: 1.4 });
const rules = group(hr, vr);
s.play(cameraTo(s.camera, { cx: 1080 }, { duration: 1.2 }), draw(head, { duration: 0.8 }), draw(rules, { duration: 0.8 }));

let row = 0;
const tableParts: Node[] = [head, rules];
function step(p: string, a: string, effect: Anim[], capt: string) {
  const y = ty + 70 + row * 62;
  const pt = text(p, { size: 30, color: palette.faded }).at(tx + 90, y);
  tableParts.push(pt);
  const at = text(a, { size: 32 }).at(tx + 300, y);
  tableParts.push(at);
  s.play(draw(pt, { duration: 0.8 }), indicate(bot, { duration: 0.8, amount: 0.08 }));
  s.play(draw(at, { duration: 0.6 }), recolor(at, palette.red, { duration: 0.01 }));
  say(capt, 0.2);
  s.play(...effect);
  s.play(recolor(at, null, { duration: 0.01 }));
  row++;
}
step("[A, kirli]", "süpür", [undraw(dirtA, { duration: 1.4 })], "A kirliyse: süpür.");
step("[A, temiz]", "sağa", [moveTo(bot, 1040, 470, { duration: 1.4 })], "A temizse: B'ye geç.");
step("[B, kirli]", "süpür", [undraw(dirtB, { duration: 1.4 })], "B kirliyse: yine süpür.");
step("[B, temiz]", "sola", [moveTo(bot, 600, 470, { duration: 1.4 })], "B temizse: A'ya dön.");
say("Dört satırlık bir tablo. Bu, ajan fonksiyonunun ta kendisi.", 1.4);

// ---------------------------------------------------------------- 4. performance measure
s.play(cameraTo(s.camera, { cx: 960 }, { duration: 1 }));
say("Ama iyi bir ajan ne demek? Bunu ajan değil, biz söyleriz.", 1.2);
const pm = text("başarı ölçüsü: her adımda, temiz oda başına +1", { size: 36 }).at(880, 250);
s.play(draw(pm, { duration: 1.6 }));
// tally marks: groups of four strokes and a slash
const tallies: Node[] = [];
for (let g = 0; g < 3; g++) {
  const x0 = 560 + g * 120, y0 = 760;
  const ss = [0, 1, 2, 3].map((k) => lineStroke(v(x0 + k * 18, y0), v(x0 + k * 18 + 3, y0 + 70), { seed: 60 + g * 10 + k, width: 2.2 }));
  ss.push(lineStroke(v(x0 - 10, y0 + 55), v(x0 + 70, y0 + 12), { seed: 69 + g * 10, width: 2.2, color: palette.red }));
  tallies.push(new Figure(ss));
}
const talliesG = group(...tallies);
s.play(draw(talliesG, { duration: 3, ease: ease.linear }));
say("Puanı ölçü belirler; ajan sadece ona göre davranır.", 1.0);

// ---------------------------------------------------------------- 5. definition
const all = [roomsG, labelsG, dirtA, dirtB, bot, pm, talliesG, ...tableParts];
cap.clear(0.4);
s.play(...each(all, (n) => fadeOut(n, { duration: 1 })));
// the rows/table fade too
s.wait(0.3);
const d1 = text("Rasyonel ajan, her algı dizisi için,", { size: 48 }).at(960, 400);
const d2 = text("bildiklerine dayanarak, başarı ölçüsünün", { size: 48 }).at(960, 480);
const d3 = text("beklenen değerini en yükseğe çıkaran eylemi seçer.", { size: 48 }).at(960, 560);
s.play(draw(group(d1, d2, d3).withLag(1), { duration: 5 }));
const under = line(v(560, 600), v(850, 604), { seed: 81, width: 2.6, color: palette.red });
s.play(draw(under, { duration: 0.7 }), recolor(d3, palette.ink, { duration: 0.01 }));
say("Her şeyi bilmesi gerekmez. Bildiğiyle, en iyisini seçmesi yeter.", 2.4);

export { s };
if (process.argv.includes("--snap")) {
  console.log("duration", s.duration.toFixed(1));
  cap.srt("out/rational-agent.srt");
  s.storyboard("out/agent-board.png", 12, 640);
}
if (process.argv.includes("--video")) { cap.srt("out/rational-agent.srt"); await s.render("out/rational-agent.mp4"); }
