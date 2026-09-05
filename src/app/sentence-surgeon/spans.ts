export interface TextSpan {
  start: number;
  end: number;
}

const normalized = (text: string) =>
  text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/** Align uncased WordPieces to original UTF-16 spans; never guess an unknown token. */
export function wordPieceSpans(
  text: string,
  tokens: readonly string[],
): (TextSpan | null)[] {
  let plain = "";
  let offset = 0;
  const positions: TextSpan[] = [];
  for (const character of text) {
    const value = normalized(character);
    for (let i = 0; i < value.length; i++)
      positions.push({ start: offset, end: offset + character.length });
    if (!value && positions.length)
      positions[positions.length - 1].end = offset + character.length;
    plain += value;
    offset += character.length;
  }
  let cursor = 0;
  return tokens.map((token) => {
    // Without offsets, an unknown token makes subsequent alignment ambiguous.
    if (token.startsWith("[")) {
      cursor = plain.length;
      return null;
    }
    const value = normalized(token.replace(/^##/, ""));
    const start = plain.indexOf(value, cursor);
    if (!value || start < 0) return null;
    cursor = start + value.length;
    return { start: positions[start].start, end: positions[cursor - 1].end };
  });
}

export function replaceSpan(
  text: string,
  span: TextSpan,
  replacement: string,
): string {
  return (
    text.slice(0, span.start) +
    replacement.replace(/^##/, "") +
    text.slice(span.end)
  );
}
