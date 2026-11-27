import { HIKARI_PATH, HIKARI_SEAL_TRANSFORM, SEAL_PAPER, SEAL_RED } from "./hikariGlyph";

/**
 * The 光 seal: the brand mark, a vermilion square with the hikari glyph cut
 * in paper. Drawn as a path so it renders the same everywhere, with no CJK
 * web font to load.
 */
export default function HikariSeal({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 512 512" aria-hidden="true" focusable="false">
      <rect width="512" height="512" rx="36" fill={SEAL_RED} />
      <path d={HIKARI_PATH} transform={HIKARI_SEAL_TRANSFORM} fill={SEAL_PAPER} />
    </svg>
  );
}
