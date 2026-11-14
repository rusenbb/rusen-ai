"use client";

import { useEffect, useState } from "react";

type SectionMeta = {
  id: string;
  title: string;
  summary: string;
};

interface EmergenceSectionDirectoryProps {
  sections: readonly SectionMeta[];
}

function sectionIndexLabel(index: number): string {
  return String(index + 1).padStart(2, "0");
}

export default function EmergenceSectionDirectory({
  sections,
}: EmergenceSectionDirectoryProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash.replace(/^#/, "");
      if (sections.some((section) => section.id === hash)) {
        setSelectedId(hash);
      }
    };

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, [sections]);

  const focusedId = hoveredId ?? selectedId;

  return (
    <>
      <nav className="mt-8 flex flex-wrap gap-2" aria-label="Emergence sections">
        {sections.map((section, index) => {
          const isFocused = section.id === focusedId;
          return (
            <a
              key={section.id}
              href={`#${section.id}`}
              onClick={() => setSelectedId(section.id)}
              onMouseEnter={() => setHoveredId(section.id)}
              onMouseLeave={() => setHoveredId(null)}
              onFocus={() => setHoveredId(section.id)}
              onBlur={() => setHoveredId(null)}
              className={`group relative overflow-hidden rounded-full border px-3 py-1.5 text-xs font-mono transition ${
                isFocused
                  ? "border-line-strong bg-foreground text-background"
                  : "border-line text-muted hover:border-line-strong hover:text-foreground"
              }`}
            >
              <span className="relative inline-flex items-center gap-2">
                <span className={`text-[10px] transition ${isFocused ? "opacity-90" : "opacity-55"}`}>
                  {sectionIndexLabel(index)}
                </span>
                <span>{section.title}</span>
              </span>
            </a>
          );
        })}
      </nav>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {sections.map((section, index) => {
          const isFocused = section.id === focusedId;

          return (
            <a
              key={section.id}
              href={`#${section.id}`}
              onClick={() => setSelectedId(section.id)}
              onMouseEnter={() => setHoveredId(section.id)}
              onMouseLeave={() => setHoveredId(null)}
              onFocus={() => setHoveredId(section.id)}
              onBlur={() => setHoveredId(null)}
              className={`group relative overflow-hidden rounded-xl border p-4 transition ${
                isFocused
                  ? "border-line-strong bg-foreground text-background"
                  : "border-line bg-surface hover:border-line-strong"
              }`}
            >
              <div className="relative">
                <div className={`text-[10px] font-mono uppercase tracking-[0.22em] transition ${
                  isFocused
                    ? "text-background opacity-70"
                    : "text-sub"
                }`}>
                  {sectionIndexLabel(index)}
                </div>
                <h2 className={`mt-2 text-sm font-semibold transition ${
                  isFocused
                    ? "text-background"
                    : "text-foreground"
                }`}>
                  {section.title}
                </h2>
                <p className={`mt-1 text-sm transition ${
                  isFocused
                    ? "text-background opacity-80"
                    : "text-muted"
                }`}>
                  {section.summary}
                </p>

                <div className="mt-4 flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.18em]">
                  <span className={isFocused ? "text-background opacity-70" : "text-sub"}>
                    Jump to section
                  </span>
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </>
  );
}
