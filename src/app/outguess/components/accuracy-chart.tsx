"use client";

const W = 480;
const H = 160;
const LABEL = "font-mono text-[0.7rem] uppercase tracking-[0.08em] text-[var(--sub)]";

/** Running share of presses the AI guessed, with the chance line for reference. */
export function AccuracyChart({ hits, chance, chanceLabel }: { hits: boolean[]; chance: number; chanceLabel: string }) {
  const y = (value: number) => H - value * H;
  const points: number[] = [];
  for (let index = 0, right = 0; index < hits.length; index++) {
    if (hits[index]) right += 1;
    points.push(right / (index + 1));
  }
  const dx = W / Math.max(1, points.length - 1);
  const path = points.map((value, index) => `${index ? "L" : "M"}${(index * dx).toFixed(1)} ${y(value).toFixed(1)}`).join(" ");

  return (
    <figure className="min-w-0">
      <figcaption className={`mb-2 flex justify-between ${LABEL}`}>
        <span>AI hit rate over your presses</span>
        <span>{points.length ? `${Math.round(points.at(-1)! * 100)}%` : ""}</span>
      </figcaption>
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="block h-40 w-full overflow-visible border-y border-[var(--line)]"
          role="img"
          aria-label={points.length ? `AI hit rate ${Math.round(points.at(-1)! * 100)}% after ${points.length} presses; ${chanceLabel} is ${Math.round(chance * 100)}%` : "No presses yet"}
        >
          <line x1={0} x2={W} y1={y(chance)} y2={y(chance)} stroke="var(--sub)" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
          {points.length > 1 ? (
            <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          ) : null}
        </svg>
        <span className={`absolute right-0 ${LABEL}`} style={{ top: `calc(${(1 - chance) * 100}% + 2px)` }}>
          {chanceLabel} {Math.round(chance * 100)}%
        </span>
        <span className={`absolute right-0 top-1 ${LABEL}`}>100%</span>
        <span className={`absolute bottom-1 right-0 ${LABEL}`}>0%</span>
        {points.length === 0 ? (
          <span className="absolute inset-x-0 top-6 text-center text-sm text-[var(--muted)]">The line starts with your first press</span>
        ) : null}
      </div>
    </figure>
  );
}
