import type { CSSProperties } from "react";

const WRITE_GLYPHS = ["█", "0", "1", "_"] as const;

export default function NavWord({
  word,
  accentGlyph,
  preserveCase = false,
}: {
  word: string;
  accentGlyph?: string;
  preserveCase?: boolean;
}) {
  return (
    <span
      className={`site-nav-word-frame${preserveCase ? " site-nav-word-frame-brand" : ""}`}
      data-nav-word={word}
      aria-hidden="true"
    >
      <span className="site-nav-word-bracket site-nav-word-bracket-start">[</span>
      <span className="site-nav-word">
        {Array.from(word).map((glyph, index) => (
          <span
            key={`${glyph}-${index}`}
            className="site-nav-glyph"
            style={{ "--glyph-delay": `${170 + index * 52}ms` } as CSSProperties}
          >
            <span
              className={`site-nav-glyph-source${glyph === accentGlyph ? " site-brand-dot" : ""}`}
            >
              {glyph}
            </span>
            <span className="site-nav-glyph-write">
              {WRITE_GLYPHS[index % WRITE_GLYPHS.length]}
            </span>
          </span>
        ))}
      </span>
      <span className="site-nav-word-bracket site-nav-word-bracket-end">]</span>
      <span className="site-nav-word-cursor" />
    </span>
  );
}
