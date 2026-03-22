import { describe, expect, it } from "vitest";

import {
  createSocialCardFromParsedArgs,
  createSocialGraphModel,
  parseCliArgs,
  resolveOptions,
  slugifyWord,
} from "./social-create";

describe("social-create CLI parser", () => {
  it("accepts the single-hyphen style from the design sketch", () => {
    const parsed = parseCliArgs([
      "-word",
      "SAM3",
      "-density",
      "0.5",
      "-maxdotopacity",
      "0.3",
    ]);

    expect(parsed.word).toBe("SAM3");
    expect(parsed.density).toBe("0.5");
    expect(parsed.dotOpacityMax).toBe("0.3");
  });

  it("normalizes defaults and fallback output path", () => {
    const { options, outputPath } = resolveOptions({
      word: "sam3",
    });

    expect(options.word).toBe("SAM3");
    expect(outputPath).toMatch(/generated\/social\/sam3\.svg$/);
  });

  it("supports newline-delimited words up to three lines", () => {
    const { options, outputPath } = resolveOptions({
      word: "game\\nof\\nlife",
    });

    expect(options.word).toBe("GAME\nOF\nLIFE");
    expect(outputPath).toMatch(/generated\/social\/game-of-life\.svg$/);
  });

  it("rejects more than three lines", () => {
    expect(() =>
      resolveOptions({
        word: "a\\nb\\nc\\nd",
      }),
    ).toThrow(/at most 3 lines/i);
  });

  it("accepts tiles as an alternate render mode", () => {
    const { options } = resolveOptions({
      word: "gol",
      mode: "tiles",
    });

    expect(options.renderMode).toBe("tiles");
  });
});

describe("social-create graph generation", () => {
  it("is deterministic for the same word and seed", () => {
    const first = createSocialCardFromParsedArgs({
      word: "SAM3",
      seed: "demo",
    });
    const second = createSocialCardFromParsedArgs({
      word: "SAM3",
      seed: "demo",
    });

    expect(first.svg).toBe(second.svg);
    expect(first.model.nodes.length).toBe(second.model.nodes.length);
    expect(first.model.edges.length).toBe(second.model.edges.length);
  });

  it("creates a dense-enough graph to read as a word-web", () => {
    const model = createSocialGraphModel({
      ...resolveOptions({ word: "SAM3" }).options,
      seed: "sam3-v1",
    });

    expect(model.layout.cells.length).toBeGreaterThan(30);
    expect(model.nodes.length).toBeGreaterThan(model.layout.cells.length);
    expect(model.edges.length).toBeGreaterThan(model.layout.cells.length);
  });

  it("stacks multiline words into taller layouts", () => {
    const model = createSocialGraphModel({
      ...resolveOptions({ word: "game\\nof\\nlife" }).options,
      seed: "gol-stack",
    });

    expect(model.layout.totalRows).toBeGreaterThan(7);
    expect(model.layout.totalCols).toBeGreaterThan(4);
    expect(model.layout.cells.length).toBeGreaterThan(40);
  });

  it("slugifies words for generated asset names", () => {
    expect(slugifyWord("SAM 3 // demo")).toBe("sam-3-demo");
  });

  it("creates a tile-mode model without network nodes", () => {
    const result = createSocialCardFromParsedArgs({
      word: "gol",
      mode: "tiles",
      seed: "tiles-demo",
    });

    expect(result.model.nodes).toHaveLength(0);
    expect(result.model.edges).toHaveLength(0);
    expect(result.svg).toContain("<rect");
  });
});
