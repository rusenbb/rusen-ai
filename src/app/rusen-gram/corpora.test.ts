// @vitest-environment node
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import catalog from "@/content/literary-corpora.json";
import { extractBook } from "./model";
it("ships twelve intact source editions with usable literary boundaries", () => {
  expect(new Set(catalog.map((book) => book.id)).size).toBe(12);
  for (const book of catalog) {
    const bytes = readFileSync(`public${book.path}`);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(book.sha256);
    const text = extractBook(bytes.toString("utf8"), book);
    expect(text.length).toBeGreaterThan(10000);
    expect(text).not.toMatch(
      /Distributed Proofreading Team|Gutenberg License|Ask for Complete free list/i,
    );
  }
});
