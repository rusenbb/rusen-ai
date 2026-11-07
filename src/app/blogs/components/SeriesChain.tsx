"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The parts of a series as a chain under the series header. The newest
 * part pulses; hovering an entry lights its node.
 */
export default function SeriesChain({ parts }: { parts: number[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const latest = parts[parts.length - 1];

  useEffect(() => {
    const section = ref.current?.closest(".idx-section");
    if (!section) return;
    const onOver = (e: Event) => {
      const entry = (e.target as Element).closest<HTMLElement>("[data-part]");
      setActive(entry ? Number(entry.dataset.part) : null);
    };
    const onLeave = () => setActive(null);
    section.addEventListener("pointerover", onOver);
    section.addEventListener("pointerleave", onLeave);
    return () => {
      section.removeEventListener("pointerover", onOver);
      section.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div ref={ref} className="series-chain" aria-hidden="true">
      {parts.map((part, i) => (
        <span key={part} className="series-chain__step">
          {i > 0 && <span className="series-chain__link">──</span>}
          <span
            className="series-chain__node"
            data-active={active === part ? "true" : undefined}
            data-latest={part === latest ? "true" : undefined}
          >
            <span className="series-chain__dot">{part === latest ? "◉" : "●"}</span>
            {String(part).padStart(2, "0")}
          </span>
        </span>
      ))}
    </div>
  );
}
