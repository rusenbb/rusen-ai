"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import navigation from "@/content/navigation.json";
import NavWord from "./NavWord";
import ThemeToggle from "./ThemeToggle";
import { useHydrated } from "./useHydrated";

const { home, items: links, ui: navUi } = navigation;

function matchesRoute(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

function getSelectedNavIndex(pathname: string) {
  if (pathname === home.href) return 0;

  const linkIndex = links.findIndex(
    (item) => matchesRoute(pathname, item.href)
      || item.routeAliases.some((route) => matchesRoute(pathname, route)),
  );
  if (linkIndex >= 0) return linkIndex + 1;
  return -1;
}

function BrandWordmark() {
  return (
    <>
      {Array.from(home.word).map((glyph, index) => (
        <span
          key={`${glyph}-${index}`}
          className={glyph === home.accentGlyph ? "site-brand-dot" : undefined}
        >
          {glyph}
        </span>
      ))}
    </>
  );
}

export default function Header() {
  const hydrated = useHydrated();
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const selectedNavIndex = getSelectedNavIndex(pathname);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileToggleRef = useRef<HTMLButtonElement>(null);

  const closeMobileNav = useCallback((restoreFocus = false) => {
    setMobileNavOpen(false);
    if (restoreFocus) {
      window.requestAnimationFrame(() => mobileToggleRef.current?.focus());
    }
  }, []);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(target)) {
        setMobileNavOpen(false);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && mobileNavOpen) {
        closeMobileNav(true);
      }
    };

    document.addEventListener("mousedown", onDocClick);
    window.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("keydown", onEscape);
    };
  }, [closeMobileNav, mobileNavOpen]);

  return (
    <header className="ui-surface sticky top-0 z-[90] border-b border-neutral-200/70 dark:border-neutral-800/70 backdrop-blur-sm">
      <nav className="relative max-w-6xl mx-auto px-4 py-3 sm:py-4 md:py-3" ref={mobileMenuRef}>
        <div className="flex items-center justify-between gap-3 md:justify-center">
          <Link href="/" className="text-lg sm:text-xl font-bold hover:opacity-80 transition md:hidden">
            <BrandWordmark />
          </Link>

          <div className="site-nav-row hidden md:flex">
            <Link
              href={home.href}
              className="site-nav-home"
              data-nav-selected={selectedNavIndex === 0 ? "true" : undefined}
              aria-label={home.label}
              aria-current={pathname === home.href ? "page" : undefined}
            >
              <NavWord word={home.word} accentGlyph={home.accentGlyph} preserveCase />
            </Link>
            {links.map((item, index) => {
              const navIndex = index + 1;
              const isActive = selectedNavIndex === navIndex;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="site-nav-link"
                  data-nav-selected={isActive ? "true" : undefined}
                  aria-label={item.label}
                  aria-current={isActive ? "page" : undefined}
                >
                  <NavWord word={item.word} />
                </Link>
              );
            })}
            <div className="site-nav-theme">
              <ThemeToggle label={navUi.themeLabel} />
            </div>
          </div>

          <div className="md:hidden flex items-center">
            <button
              ref={mobileToggleRef}
              disabled={!hydrated}
              type="button"
              onClick={() => setMobileNavOpen((v) => !v)}
              className="inline-flex items-center justify-center w-11 h-11 border border-[var(--line)] text-neutral-700 dark:text-neutral-200"
              aria-label={navUi.menuLabel}
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
          <div id="mobile-nav" className="site-mobile-nav-panel md:hidden">
            <div className="site-mobile-nav-heading">
              <Link
                href={home.href}
                className="site-mobile-nav-home"
                data-nav-selected={selectedNavIndex === 0 ? "true" : undefined}
                aria-label={home.label}
                aria-current={pathname === home.href ? "page" : undefined}
                onClick={() => closeMobileNav()}
              >
                <NavWord word={home.word} accentGlyph={home.accentGlyph} preserveCase />
              </Link>
              <span aria-hidden="true">{navUi.mobileHeading}</span>
            </div>
            <div className="site-mobile-nav-list" role="group" aria-label="Mobile navigation">
              {links.map((item, index) => {
                const isActive = selectedNavIndex === index + 1;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => closeMobileNav()}
                    className="site-mobile-nav-link"
                    data-nav-selected={isActive ? "true" : undefined}
                    aria-label={item.label}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <NavWord word={item.word} />
                  </Link>
                );
              })}
              <div className="site-mobile-nav-theme">
                <ThemeToggle label={navUi.themeLabel} />
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
