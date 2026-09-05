/** A token may end halfway through a Unicode character. Show those bytes explicitly. */
export function tokenDisplay(bytes: readonly number[]): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(
      Uint8Array.from(bytes),
    );
  } catch {
    return (
      "⟦" +
      bytes.map((value) => value.toString(16).padStart(2, "0")).join(" ") +
      "⟧"
    );
  }
}

export function byteBoundaries(
  tokens: readonly { bytes: readonly number[] }[],
): Set<number> {
  let position = 0;
  return new Set(tokens.map((token) => (position += token.bytes.length)));
}

export function characterHint(text: string): string {
  return /[çğıöşüÇĞİÖŞÜ]/.test(text)
    ? "Turkish-specific characters found. This character check does not determine the language."
    : "No Turkish-specific characters found. Language is unknown: ASCII text can also be Turkish.";
}
