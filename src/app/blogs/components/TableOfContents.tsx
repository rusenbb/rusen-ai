"use client";

import { useEffect, useState } from "react";
import type { Heading } from "@/lib/blog";

// Distance from the top of the viewport (sticky header + breathing room) used
// both as the IntersectionObserver top inset and the fallback "above the fold"
// line. Keep in sync with the scroll-margin-top on .post-prose headings.
const TOP_OFFSET = 96;

export default function TableOfContents({
  headings,
  label,
}: {
  headings: Heading[];
  label: string;
}) {
  const [activeId, setActiveId] = useState<string>("");
  const minDepth = headings.reduce((m, h) => Math.min(m, h.depth), 6);

  useEffect(() => {
    const els = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => el !== null);
    if (!els.length) return;

    const visible = new Set<string>();

    const recompute = () => {
      // Prefer the topmost heading currently inside the near-top band.
      const inBand = headings.find((h) => visible.has(h.id));
      if (inBand) {
        setActiveId(inBand.id);
        return;
      }
      // Band empty (e.g. deep inside a long section): fall back to the last
      // heading that has scrolled above the offset line.
      let above = "";
      for (const h of headings) {
        const el = document.getElementById(h.id);
        if (el && el.getBoundingClientRect().top - TOP_OFFSET <= 0) above = h.id;
      }
      if (above) setActiveId(above);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target.id);
          else visible.delete(e.target.id);
        }
        recompute();
      },
      { rootMargin: `-${TOP_OFFSET}px 0px -68% 0px`, threshold: 0 }
    );

    els.forEach((el) => observer.observe(el));
    recompute();
    return () => observer.disconnect();
  }, [headings]);

  return (
    <nav className="post-toc" aria-label={label}>
      <div className="post-toc-head">
        <span className="signal-blip-sm" />
        {label}
      </div>
      <ul className="post-toc-list">
        {headings.map((h) => (
          <li
            key={h.id}
            className={`post-toc-item${activeId === h.id ? " is-active" : ""}`}
            style={{ paddingLeft: `${(h.depth - minDepth) * 0.85}rem` }}
          >
            <a href={`#${h.id}`} onClick={() => setActiveId(h.id)}>
              <span className="post-toc-marker" aria-hidden="true" />
              <span className="post-toc-text">{h.text}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
