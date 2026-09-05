import { expect, it } from "vitest";
import { byteBoundaries, characterHint, tokenDisplay } from "./bytes";

it("keeps partial UTF-8 tokens in byte coordinates instead of inserting replacement characters", () => {
  expect(tokenDisplay([0xc3])).toBe("⟦c3⟧");
  expect(tokenDisplay([0xc3, 0xbc])).toBe("ü");
  expect([...byteBoundaries([{ bytes: [0xc3] }, { bytes: [0xbc] }])]).toEqual([
    1, 2,
  ]);
  expect(characterHint("Merhaba")).toContain("Language is unknown");
});
