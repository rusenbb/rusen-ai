import { GLYPHS } from "../glyphs";

describe("GLYPHS map", () => {
  const REQUIRED = ["R", "U", "Ş", "E", "N", "B", "Y", "Z", "A", "HEART"];

  it.each(REQUIRED)("contains glyph %s", (key) => {
    expect(GLYPHS).toHaveProperty(key);
  });

  it("each letter glyph is 5 cells wide", () => {
    const letters = ["R", "U", "Ş", "E", "N", "B", "Y", "Z", "A"];
    for (const key of letters) {
      const glyph = GLYPHS[key];
      for (const row of glyph) {
        expect(row.length).toBe(5);
      }
    }
  });

  it("most letters are 7 rows tall", () => {
    const sevenRow = ["R", "U", "E", "N", "B", "Y", "Z", "A"];
    for (const key of sevenRow) {
      expect(GLYPHS[key].length).toBe(7);
    }
  });

  it("Ş is 8 rows tall (extra row for cedilla)", () => {
    expect(GLYPHS["Ş"].length).toBe(8);
  });

  it("HEART is 8 wide x 7 tall", () => {
    const h = GLYPHS["HEART"];
    expect(h.length).toBe(7);
    for (const row of h) {
      expect(row.length).toBe(8);
    }
  });

  it("every row uses only '0' and '1' characters", () => {
    for (const key of Object.keys(GLYPHS)) {
      for (const row of GLYPHS[key]) {
        expect(row).toMatch(/^[01]+$/);
      }
    }
  });
});
