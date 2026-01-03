"use client";

// Dot patterns for each letter (5x7 grid)
const letters: Record<string, number[][]> = {
  D: [
    [1,1,1,1,0],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,1,1,1,0],
  ],
  A: [
    [0,1,1,1,0],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,1,1,1,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
  ],
  T: [
    [1,1,1,1,1],
    [0,0,1,0,0],
    [0,0,1,0,0],
    [0,0,1,0,0],
    [0,0,1,0,0],
    [0,0,1,0,0],
    [0,0,1,0,0],
  ],
};

const word = ['D', 'A', 'T', 'A'];

export default function DataBackground() {
  const dotSize = 6;
  const gap = 10;
  const letterGap = 24;

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Base dot grid */}
      <div className="absolute inset-0 dot-grid opacity-15" />

      {/* DATA made of dots */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex" style={{ gap: letterGap }}>
          {word.map((letter, letterIndex) => (
            <div
              key={letterIndex}
              className={`letter-dots letter-${letterIndex}`}
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(5, ${dotSize}px)`,
                gap: gap,
              }}
            >
              {letters[letter].flat().map((filled, dotIndex) => (
                <div
                  key={dotIndex}
                  style={{
                    width: dotSize,
                    height: dotSize,
                    borderRadius: '50%',
                    backgroundColor: filled ? 'currentColor' : 'transparent',
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
