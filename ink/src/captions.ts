// On-screen captions that are written by the pen, plus an .srt file with the
// same timings, so YouTube gets real subtitles for free.
import { writeFileSync } from "node:fs";
import { draw, fadeOut } from "./anim.ts";
import type { Node } from "./node.ts";
import type { Scene } from "./scene.ts";
import { palette } from "./style.ts";
import { text, type TextOpts } from "./text.ts";

export function captions(s: Scene, o: TextOpts & { x?: number; y?: number } = {}) {
  let cur: Node | null = null;
  const cues: { start: number; end: number; text: string }[] = [];
  const close = () => { if (cues.length && cues[cues.length - 1].end < 0) cues[cues.length - 1].end = s.duration; };
  return {
    /** Write a caption (replacing the previous one) and hold it for `hold` seconds. */
    say(t: string, hold = 1.6) {
      if (cur) s.play(fadeOut(cur, { duration: 0.35 }));
      close();
      const n = text(t, { size: 38, color: palette.ink, ...o }).at(o.x ?? s.width / 2, o.y ?? s.height - 80);
      cues.push({ start: s.duration, end: -1, text: t });
      s.play(draw(n, { duration: Math.min(2.4, 0.5 + t.length * 0.035) }));
      s.wait(hold);
      cur = n;
      return n;
    },
    /** Lift the current caption off the page. */
    clear(duration = 0.5) {
      if (cur) s.play(fadeOut(cur, { duration }));
      close();
      cur = null;
    },
    get current() { return cur; },
    srt(path: string) {
      close();
      const ts = (x: number) => {
        const ms = Math.round(x * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, sec = Math.floor(ms / 1000) % 60;
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")},${String(ms % 1000).padStart(3, "0")}`;
      };
      writeFileSync(path, cues.map((c, i) => `${i + 1}\n${ts(c.start)} --> ${ts(c.end)}\n${c.text}\n`).join("\n"));
      return path;
    },
  };
}
