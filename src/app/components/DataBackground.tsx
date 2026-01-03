"use client";

export default function DataBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Base dot grid */}
      <div className="absolute inset-0 dot-grid opacity-20" />

      {/* Animated DATA letters */}
      <div className="absolute inset-0 flex items-center justify-center">
        <svg
          viewBox="0 0 400 100"
          className="w-[80vw] max-w-[800px] h-auto opacity-[0.03]"
          aria-hidden="true"
        >
          <defs>
            <pattern id="dotPattern" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" className="fill-current" />
            </pattern>
          </defs>

          {/* D */}
          <text
            x="20"
            y="75"
            className="data-letter letter-d fill-current"
            style={{ font: 'bold 80px system-ui, sans-serif' }}
          >
            D
          </text>

          {/* A */}
          <text
            x="100"
            y="75"
            className="data-letter letter-a fill-current"
            style={{ font: 'bold 80px system-ui, sans-serif' }}
          >
            A
          </text>

          {/* T */}
          <text
            x="190"
            y="75"
            className="data-letter letter-t fill-current"
            style={{ font: 'bold 80px system-ui, sans-serif' }}
          >
            T
          </text>

          {/* A */}
          <text
            x="270"
            y="75"
            className="data-letter letter-a2 fill-current"
            style={{ font: 'bold 80px system-ui, sans-serif' }}
          >
            A
          </text>
        </svg>
      </div>
    </div>
  );
}
