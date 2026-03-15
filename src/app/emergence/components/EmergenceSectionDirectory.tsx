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
                  ? "border-neutral-100 bg-white text-neutral-950 shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_0_32px_rgba(244,244,245,0.18)] dark:border-neutral-200 dark:bg-neutral-50 dark:text-neutral-950"
                  : "border-neutral-300 px-3 py-1.5 text-neutral-600 hover:border-neutral-900 hover:text-neutral-900 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-300 dark:hover:text-neutral-100"
              }`}
            >
              {isFocused && (
                <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_65%)] dark:bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_65%)]" />
              )}
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
              className={`group relative overflow-hidden rounded-xl border p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] transition ${
                isFocused
                  ? "border-neutral-100 bg-white text-neutral-950 shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_18px_48px_rgba(248,250,252,0.12)] dark:border-neutral-200 dark:bg-neutral-50 dark:text-neutral-950"
                  : "border-neutral-300 bg-white/92 hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-950/40 dark:hover:border-neutral-600"
              }`}
            >
              {isFocused && (
                <>
                  <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_60%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.1),transparent_60%)]" />
                  <span className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-neutral-900/90 dark:bg-neutral-950" />
                </>
              )}

              <div className="relative">
                <div className={`text-[10px] font-mono uppercase tracking-[0.22em] transition ${
                  isFocused
                    ? "text-neutral-700 dark:text-neutral-700"
                    : "text-neutral-500"
                }`}>
                  {sectionIndexLabel(index)}
                </div>
                <h2 className={`mt-2 text-sm font-semibold transition ${
                  isFocused
                    ? "text-neutral-950"
                    : "text-neutral-900 dark:text-neutral-100"
                }`}>
                  {section.title}
                </h2>
                <p className={`mt-1 text-sm transition ${
                  isFocused
                    ? "text-neutral-700"
                    : "text-neutral-700 dark:text-neutral-400"
                }`}>
                  {section.summary}
                </p>

                <div className="mt-4 flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.18em]">
                  <span className={isFocused ? "text-neutral-700" : "text-neutral-500 dark:text-neutral-500"}>
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
