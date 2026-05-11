"use client";

import { useSyncExternalStore } from "react";
import {
  getResolvedTheme,
  setThemePreference,
  subscribeTheme,
  type ThemeMode,
} from "./theme";

function nextTheme(current: ThemeMode): ThemeMode {
  return current === "dark" ? "light" : "dark";
}

export default function ThemeToggle() {
  const theme = useSyncExternalStore<ThemeMode>(
    subscribeTheme,
    getResolvedTheme,
    () => "light",
  );

  const handleToggle = () => {
    const updated = nextTheme(theme);
    setThemePreference(updated);
  };

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
      title={`Switch to ${isDark ? "light" : "dark"} theme`}
      className="group inline-flex h-9 w-9 items-center justify-center self-center rounded-md text-neutral-700 transition hover:bg-neutral-100 hover:text-neutral-950 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-50"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="transition-transform duration-200 group-hover:-translate-y-px"
      >
        {isDark ? (
          <>
            <path d="M12 3v2" />
            <path d="M12 19v2" />
            <path d="M3 12h2" />
            <path d="M19 12h2" />
            <path d="m5.6 5.6 1.4 1.4" />
            <path d="m17 17 1.4 1.4" />
            <path d="m18.4 5.6-1.4 1.4" />
            <path d="m7 17-1.4 1.4" />
            <circle cx="12" cy="12" r="4" />
          </>
        ) : (
          <path d="M20.4 14.4A8 8 0 0 1 9.6 3.6 8 8 0 1 0 20.4 14.4Z" />
        )}
      </svg>
      <span className="sr-only">
        Current theme: {isDark ? "dark" : "light"}
      </span>
    </button>
  );
}
