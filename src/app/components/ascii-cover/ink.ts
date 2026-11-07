/**
 * Glyph colour for the ASCII covers and sigils. On a dark screen glyphs
 * glow (brighter = lighter). On paper they are printed: most cells in the
 * page's ink, only the brightest keep the scene's hue as a spot colour.
 */
export function glyphStyle(hue: number, v: number, dark: boolean): string {
  const vq = Math.min(15, Math.round(v * 15));
  const alpha = 0.25 + (vq / 15) * 0.75;
  if (dark) return `hsla(${hue}, 78%, ${32 + vq * 3.6}%, ${alpha})`;
  if (vq >= 11) return `hsla(${hue}, 72%, 36%, ${alpha})`;
  return `rgba(28, 26, 22, ${0.12 + (vq / 15) * 0.6})`;
}

/** Cache key matching the quantisation `glyphStyle` uses. */
export function glyphKey(hue: number, v: number): number {
  return (Math.round(hue / 6) % 60) * 16 + Math.min(15, Math.round(v * 15));
}
