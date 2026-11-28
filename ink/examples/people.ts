// Contact sheets of everyone in the data folder, one sheet per group.
//   INK_DATA=~/ink-data node --experimental-strip-types examples/people.ts
import { Scene, person, people, text, palette } from "../src/index.ts";

const all = people();
const groups = [...new Set(Object.values(all).map((e) => e.group ?? "people"))];
for (const g of groups) {
  const keys = Object.keys(all).filter((k) => (all[k].group ?? "people") === g);
  const cols = Math.min(6, keys.length), rows = Math.ceil(keys.length / cols);
  const W = 400, H = 500;
  const s = new Scene({ width: cols * W, height: rows * H + 110 });
  s.add(text(`PEOPLE · ${g}`, { size: 40, font: "mono", color: palette.faded }).at((cols * W) / 2, 55));
  for (const [i, k] of keys.entries()) {
    const x = (i % cols) * W + W / 2, y = 110 + Math.floor(i / cols) * H;
    s.add((await person(k, { height: 420 })).at(x, y + 225));
    s.add(text(all[k].name, { size: 24, color: palette.sepia }).at(x, y + 462));
  }
  s.snap(`out/people-${g}.png`);
  console.log(`out/people-${g}.png`);
}
