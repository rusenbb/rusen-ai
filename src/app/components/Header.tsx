"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BookNavIcon,
  BulletinNavIcon,
  CameraNavIcon,
  CvNavIcon,
  EinsteinNavIcon,
  GearsNavIcon,
} from "./NavigationIcons";
import ThemeToggle from "./ThemeToggle";

const links = [
  {
    href: "/demos",
    label: "Demos",
    tapeCode: "000",
    icon: GearsNavIcon,
  },
  {
    href: "/nerdy-stuff",
    label: "Nerdy Stuff",
    shortLabel: "Nerdy",
    tapeCode: "001",
    icon: EinsteinNavIcon,
  },
  {
    href: "/bulletin",
    label: "Bulletin",
    tapeCode: "010",
    icon: BulletinNavIcon,
  },
  {
    href: "/photos",
    label: "Photos",
    tapeCode: "011",
    icon: CameraNavIcon,
  },
  {
    href: "/blogs",
    label: "Blog",
    tapeCode: "100",
    icon: BookNavIcon,
  },
  {
    href: "/cv",
    label: "CV",
    tapeCode: "101",
    icon: CvNavIcon,
  },
] as const;

export default function Header() {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileTapeRef = useRef<HTMLDivElement>(null);

  const updateMobileTape = useCallback(() => {
    const tape = mobileTapeRef.current;
    if (!tape) return;

    const cells = Array.from(
      tape.querySelectorAll<HTMLElement>("[data-mobile-tape-cell]"),
    );
    const tapeCenter = tape.scrollTop + tape.clientHeight / 2;
    let focusedCell: HTMLElement | null = null;
    let focusedDistance = Number.POSITIVE_INFINITY;

    cells.forEach((cell) => {
      const cellCenter = cell.offsetTop + cell.offsetHeight / 2;
      const signedDistance = (cellCenter - tapeCenter) / cell.offsetHeight;
      const distance = Math.min(Math.abs(signedDistance) / 2.25, 1);
      const scale = 1 - distance * 0.14;
      const opacity = 1 - distance * 0.7;
      const tilt = Math.max(-1, Math.min(1, signedDistance)) * -16;

      cell.style.setProperty("--mobile-tape-scale", scale.toFixed(3));
      cell.style.setProperty("--mobile-tape-opacity", opacity.toFixed(3));
      cell.style.setProperty("--mobile-tape-tilt", `${tilt.toFixed(2)}deg`);

      const absoluteDistance = Math.abs(cellCenter - tapeCenter);
      if (absoluteDistance < focusedDistance) {
        focusedDistance = absoluteDistance;
        focusedCell = cell;
      }
    });

    cells.forEach((cell) => {
      if (cell === focusedCell) {
        cell.dataset.focused = "true";
      } else {
        delete cell.dataset.focused;
      }
    });
  }, []);

  const centerMobileCell = useCallback((cell: HTMLElement) => {
    const tape = mobileTapeRef.current;
    if (!tape) return;

    tape.scrollTo({
      top: cell.offsetTop - (tape.clientHeight - cell.offsetHeight) / 2,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }, []);

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

  useEffect(() => {
    if (!mobileNavOpen) return;

    const frame = window.requestAnimationFrame(() => {
      const tape = mobileTapeRef.current;
      if (!tape) return;

      const activeIndex = links.findIndex(
        (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
      );
      const initialIndex = activeIndex >= 0 ? activeIndex : 0;
      const initialCell = tape.querySelector<HTMLElement>(
        `[data-mobile-index="${initialIndex}"]`,
      );

      if (initialCell) {
        tape.scrollTop = initialCell.offsetTop - (tape.clientHeight - initialCell.offsetHeight) / 2;
      }
      updateMobileTape();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [mobileNavOpen, pathname, updateMobileTape]);

  return (
    <header className="ui-surface sticky top-0 z-[90] border-b border-neutral-200/70 dark:border-neutral-800/70 backdrop-blur-sm">
      <nav className="relative max-w-6xl mx-auto px-4 py-3 sm:py-4 md:py-3" ref={mobileMenuRef}>
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="text-lg sm:text-xl font-bold hover:opacity-80 transition">
            rusen.ai
          </Link>

          <div className="site-nav-rail hidden md:flex items-center">
            <Link href="/" className="site-nav-tape-leader" aria-label="Home">
              <span>Turing</span>
              <span>Tape</span>
              <small>NAV::07</small>
            </Link>
            {links.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="site-nav-icon"
                  aria-label={item.label}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span className="site-nav-cell-code" aria-hidden="true">{item.tapeCode}</span>
                  <Icon />
                  <span className="site-nav-cell-label" aria-hidden="true">
                    {"shortLabel" in item ? item.shortLabel : item.label}
                  </span>
                </Link>
              );
            })}
            <div className="site-nav-theme-cell">
              <span className="site-nav-cell-code" aria-hidden="true">110</span>
              <ThemeToggle />
              <span className="site-nav-cell-label" aria-hidden="true">Theme</span>
            </div>
            <span className="site-nav-read-head" aria-hidden="true" />
          </div>

          <div className="md:hidden flex items-center">
            <button
              type="button"
              onClick={() => setMobileNavOpen((v) => !v)}
              className="inline-flex items-center justify-center w-11 h-11 border border-[var(--line)] text-neutral-700 dark:text-neutral-200"
              aria-label="Toggle menu"
              aria-expanded={mobileNavOpen}
              aria-controls="mobile-nav"
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
          <div id="mobile-nav" className="site-mobile-tape-panel md:hidden">
            <div className="site-mobile-tape-heading">
              <Link
                href="/"
                className="site-mobile-tape-home"
                aria-label="Home"
                onClick={() => setMobileNavOpen(false)}
              >
                Turing Tape
              </Link>
              <span aria-hidden="true">NAV::07 / Scroll</span>
            </div>
            <div className="site-mobile-tape-stage">
              <div
                ref={mobileTapeRef}
                className="site-mobile-tape"
                role="group"
                aria-label="Mobile navigation tape"
                onScroll={updateMobileTape}
              >
                {links.map((item, index) => {
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileNavOpen(false)}
                      onFocus={(event) => centerMobileCell(event.currentTarget)}
                      className="site-mobile-tape-cell"
                      aria-current={isActive ? "page" : undefined}
                      data-mobile-tape-cell
                      data-mobile-index={index}
                      data-focused={isActive ? "true" : undefined}
                    >
                      <span className="site-mobile-tape-code" aria-hidden="true">
                        {item.tapeCode}
                      </span>
                      <item.icon />
                      <span className="site-mobile-tape-label">{item.label}</span>
                    </Link>
                  );
                })}
                <div
                  className="site-mobile-tape-cell site-mobile-tape-theme"
                  data-mobile-tape-cell
                  data-mobile-index={links.length}
                >
                  <span className="site-mobile-tape-code" aria-hidden="true">110</span>
                  <ThemeToggle />
                  <span className="site-mobile-tape-label" aria-hidden="true">Theme</span>
                </div>
              </div>
              <span className="site-mobile-tape-head" aria-hidden="true" />
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
