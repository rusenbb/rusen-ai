import { expect, it } from "vitest";
import { replaceSpan, wordPieceSpans } from "./spans";

it("replaces only the selected WordPiece, preserving casing, accents and whitespace", () => {
  const text = "Café  PLAYING!";
  const spans = wordPieceSpans(text, ["cafe", "play", "##ing", "!"]);
  expect(replaceSpan(text, spans[2]!, "##ed")).toBe("Café  PLAYed!");
  expect(replaceSpan(text, spans[0]!, "Tea")).toBe("Tea  PLAYING!");
  expect(wordPieceSpans("🧬", ["[UNK]"])).toEqual([null]);
});
