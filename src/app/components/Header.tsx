"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export default function Header() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(target)) {
        setMobileNavOpen(false);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileNavOpen(false);
      }
    };

    document.addEventListener("mousedown", onDocClick);
    window.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("keydown", onEscape);
    };
  }, []);

  const links = [
    { href: "/demos", label: "Demos" },
    { href: "/nerdy-stuff", label: "Nerdy Stuff" },
    { href: "/cv", label: "CV" },
  ];

  return (
    <header className="ui-surface sticky top-0 z-[90] border-b border-neutral-200/70 dark:border-neutral-800/70 backdrop-blur-sm">
      <nav className="max-w-6xl mx-auto px-4 py-3 sm:py-4" ref={mobileMenuRef}>
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="text-lg sm:text-xl font-bold hover:opacity-80 transition">
            rusen.ai
          </Link>

          <div className="hidden md:flex gap-6 items-center">
            {links.map((item) => (
              <Link key={item.href} href={item.href} className="hover:opacity-80 transition">
                {item.label}
              </Link>
            ))}
          </div>

          <div className="md:hidden flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMobileNavOpen((v) => !v)}
              className="inline-flex items-center justify-center w-9 h-9 rounded-md border border-neutral-300/70 dark:border-neutral-700/70 text-neutral-700 dark:text-neutral-200"
              aria-label="Toggle menu"
              aria-expanded={mobileNavOpen}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                {mobileNavOpen ? (
                  <>
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </>
                ) : (
                  <>
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>

        {mobileNavOpen && (
          <div className="md:hidden mt-3 pt-3 border-t border-neutral-200/70 dark:border-neutral-800/70 space-y-2">
            {links.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileNavOpen(false)}
                className="block px-3 py-2.5 rounded-md text-sm font-medium text-neutral-800 dark:text-neutral-100 hover:bg-neutral-100/80 dark:hover:bg-neutral-800/70"
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </nav>
    </header>
  );
}
