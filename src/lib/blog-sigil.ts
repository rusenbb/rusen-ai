/**
 * A post's "sigil": a tiny fingerprint built from the post's own text, drawn
 * as ASCII next to its title on the blog index.
 *
 * The post is cut into `SIGIL_ROWS` equal stretches of words. Each row lists
 * the lengths (in words) of the sentences that end in that stretch, so the
 * picture is the rhythm of the writing: long winding sentences make long
 * blocks, quick ones make short ticks. The hue comes from the post's most
 * frequent content word, so related posts do not share colours by accident
 * of position.
 */

export const SIGIL_ROWS = 7;

export type Sigil = {
  /** Sentence lengths in words, per row. */
  rows: number[][];
  /** 0..359, derived from the most frequent content word. */
  hue: number;
  /** Letters from the post, used for the scramble-in animation. */
  letters: string;
};

const STOP = new Set(
  (
    "the a an and or but of to in on for with is are was were be been it this that as at by from " +
    "we you i they he she not no do does did have has had can will would should could there their " +
    "our your my its if then so than into about what which who when how all more most also just " +
    "bir ve ile bu da de için çok gibi daha olan olarak ama ya ne en her şey ki mi mu mı mü değil " +
    "kadar sonra önce bunu şu o ben sen biz siz onlar var yok"
  ).split(" "),
);

/** Strip markdown that is not prose: code, links' targets, images, markup. */
function proseOf(body: string): string {
  return body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/^#+\s*/gm, "")
    .replace(/[*_>#|-]+/g, " ");
}

function hashHue(word: string): number {
  let h = 2166136261;
  for (let i = 0; i < word.length; i++) h = Math.imul(h ^ word.charCodeAt(i), 16777619);
  return (h >>> 0) % 360;
}

export function buildSigil(body: string): Sigil {
  const prose = proseOf(body);
  const sentences = prose
    .split(/(?<=[.!?…])\s+|\n{2,}/)
    .map((s) => s.trim().split(/\s+/).filter(Boolean).length)
    .filter((n) => n > 0);

  const total = sentences.reduce((a, b) => a + b, 0);
  const rows: number[][] = Array.from({ length: SIGIL_ROWS }, () => []);
  let seen = 0;
  for (const len of sentences) {
    seen += len;
    const row = Math.min(SIGIL_ROWS - 1, Math.floor(((seen - 1) / Math.max(1, total)) * SIGIL_ROWS));
    rows[row].push(len);
  }

  const counts = new Map<string, number>();
  for (const raw of prose.toLocaleLowerCase("tr").match(/\p{L}{3,}/gu) ?? []) {
    if (!STOP.has(raw)) counts.set(raw, (counts.get(raw) ?? 0) + 1);
  }
  let top = "";
  let best = 0;
  for (const [w, n] of counts) {
    if (n > best || (n === best && w < top)) {
      top = w;
      best = n;
    }
  }

  const letters = (prose.match(/\p{L}/gu) ?? []).slice(0, 240).join("");
  return { rows, hue: hashHue(top), letters };
}
