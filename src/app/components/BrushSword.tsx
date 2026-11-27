/**
 * A sword drawn as one brush stroke: a curved, tapering blade in seal red
 * with dry-brush streaks, a guard and a wrapped grip. Sits over a word in
 * the home hero and sweeps in once on load.
 */
export default function BrushSword({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 300 44" aria-hidden="true" focusable="false">
      <defs>
        <mask id="brush-sword-dry">
          <rect width="300" height="44" fill="#fff" />
          <path d="M70 29.2C150 23.4 225 15.4 288 8.2" stroke="#000" strokeWidth="0.9" fill="none" opacity="0.85" />
          <path d="M120 27.6C190 21.6 240 15.2 280 10.4" stroke="#000" strokeWidth="0.6" fill="none" opacity="0.7" />
          <path d="M58 31.4C110 28.2 150 25.6 185 22.6" stroke="#000" strokeWidth="0.5" fill="none" opacity="0.6" />
        </mask>
      </defs>
      <g fill="var(--seal, #d6402b)" stroke="none" mask="url(#brush-sword-dry)">
        {/* Blade: thick at the guard, curving up to a fine point. */}
        <path d="M47 24C120 19 212 11 297 4.6C214 17.5 126 32.4 47 37.4Z" />
        {/* Guard */}
        <path d="M39.5 16.5C41.2 15.9 43 16.4 43.8 17.7L50.5 41C50.9 42.4 49.5 43.4 47.9 42.9C46.6 42.5 45.8 41.6 45.4 40.4Z" />
      </g>
      {/* Grip, wrapped */}
      <path
        d="M6 34.6L39 30.6"
        stroke="var(--seal, #d6402b)"
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray="4.2 1.6"
        fill="none"
      />
    </svg>
  );
}
