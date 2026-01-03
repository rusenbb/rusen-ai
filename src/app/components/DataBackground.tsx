"use client";

// SVG paths for letters (simplified block letters)
const letterPaths = {
  D: "M0,0 L60,0 Q100,0 100,50 Q100,100 60,100 L0,100 L0,0 M20,20 L20,80 L55,80 Q80,80 80,50 Q80,20 55,20 L20,20",
  A: "M50,0 L100,100 L80,100 L70,75 L30,75 L20,100 L0,100 L50,0 M50,25 L35,65 L65,65 L50,25",
  T: "M0,0 L100,0 L100,20 L60,20 L60,100 L40,100 L40,20 L0,20 L0,0",
};

export default function DataBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Base dot grid - always visible, low opacity */}
      <div className="absolute inset-0 dot-grid opacity-10" />

      {/* Letter masks - same dot grid but clipped to letter shapes, animated */}
      <div className="absolute inset-0 flex items-center justify-center gap-4">
        {['D', 'A', 'T', 'A'].map((letter, i) => (
          <svg
            key={i}
            viewBox="0 0 100 100"
            className="w-16 h-20 md:w-24 md:h-28 lg:w-32 lg:h-36"
            style={{ overflow: 'visible' }}
          >
            <defs>
              <clipPath id={`letter-${i}`}>
                <path d={letterPaths[letter as keyof typeof letterPaths]} fillRule="evenodd" />
              </clipPath>
            </defs>
            {/* Dot grid clipped to letter shape */}
            <foreignObject
              width="100"
              height="100"
              clipPath={`url(#letter-${i})`}
              className={`letter-mask letter-${i}`}
            >
              <div
                className="w-full h-full dot-grid-dense"
                style={{ width: '100%', height: '100%' }}
              />
            </foreignObject>
          </svg>
        ))}
      </div>
    </div>
  );
}
