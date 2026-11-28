// Contact sheet of the logos in the data folder (trademarks of their owners).
//   INK_DATA=~/ink-data node --experimental-strip-types examples/logos.ts
import { Scene, logo, logos, text, palette } from "../src/index.ts";

const all = logos();
const keys = Object.keys(all);
const cols = 4, rows = Math.ceil(keys.length / cols), W = 480, H = 260;
const s = new Scene({ width: cols * W, height: rows * H + 110 });
s.add(text("LOGOS · logo(name)", { size: 40, font: "mono", color: palette.faded }).at((cols * W) / 2, 55));
for (const [i, k] of keys.entries()) {
  const x = (i % cols) * W + W / 2, y = 110 + Math.floor(i / cols) * H;
  const l = await logo(k, { fit: [400, 150] });
  s.add(l.at(x, y + 100));
  s.add(text(all[k].name, { size: 20, font: "mono", color: palette.faded }).at(x, y + 225));
}
s.snap("out/logos.png");
