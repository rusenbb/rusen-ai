import { describe, expect, it } from "vitest";
import { autocompleteTokens, scoreNextTokens } from "../lib/model";

describe("ruseNgram statistical model", () => {
  it("prefers assistant-style openings for how-to prompts when assistant blend is high", () => {
    const ranked = scoreNextTokens(
      "Kullanıcı: Türk kahvesi nasıl yapılır?\nAsistan:",
      [],
      0.9,
    );

    expect(ranked[0]?.token).toBe(" İşte");
  });

  it("prefers generic continuation for the same prompt when assistant blend is low", () => {
    const ranked = scoreNextTokens(
      "Kullanıcı: Türk kahvesi nasıl yapılır?\nAsistan:",
      [],
      0.05,
    );

    expect([" kahve", " bugün", " için"]).toContain(ranked[0]?.token);
  });

  it("builds a short procedural continuation with autocomplete", () => {
    const output = autocompleteTokens(
      "Kullanıcı: Türk kahvesi nasıl yapılır?\nAsistan:",
      [],
      0.9,
      5,
    );

    expect(output).toEqual([" İşte", " adımlar:", "\n1.", " Suyu", " kaynatın."]);
  });
});
