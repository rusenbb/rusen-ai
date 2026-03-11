"use client";

import { useState } from "react";
import { applyTheme, getResolvedTheme, type ThemeMode, THEME_STORAGE_KEY } from "./theme";

function nextTheme(current: ThemeMode): ThemeMode {
  return current === "dark" ? "light" : "dark";
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>(() =>
    typeof document === "undefined"
      ? "light"
      : (document.documentElement.dataset.theme as ThemeMode | undefined) ?? getResolvedTheme(),
  );

  const handleToggle = () => {
    const updated = nextTheme(theme);
    window.localStorage.setItem(THEME_STORAGE_KEY, updated);
    applyTheme(updated);
    setTheme(updated);
  };

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
      title={`Switch to ${isDark ? "light" : "dark"} theme`}
      className="group relative inline-flex h-11 items-center rounded-full border border-neutral-300/70 bg-white/75 px-1.5 text-neutral-700 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur-md transition hover:border-neutral-400 dark:border-neutral-700/70 dark:bg-neutral-950/70 dark:text-neutral-100"
    >
      <span
        className={`absolute top-1.5 h-8 w-[4.5rem] rounded-full border transition-all duration-300 ${
          isDark
            ? "left-[calc(100%-4.875rem)] border-neutral-700 bg-neutral-900 shadow-[0_8px_24px_rgba(2,6,23,0.35)]"
            : "left-1.5 border-neutral-200 bg-neutral-50 shadow-[0_8px_24px_rgba(148,163,184,0.25)]"
        }`}
        aria-hidden="true"
      />
      <span className="relative z-10 grid grid-cols-2 items-center gap-1">
        <span className="flex w-[4.5rem] items-center justify-center gap-1.5 px-2 text-[11px] font-mono uppercase tracking-[0.22em]">
          <span className={`${isDark ? "text-neutral-500" : "text-neutral-900"}`}>0</span>
          <span className={`${isDark ? "text-neutral-500" : "text-neutral-700"}`}>Day</span>
        </span>
        <span className="flex w-[4.5rem] items-center justify-center gap-1.5 px-2 text-[11px] font-mono uppercase tracking-[0.22em]">
          <span className={`${isDark ? "text-neutral-100" : "text-neutral-400"}`}>1</span>
          <span className={`${isDark ? "text-neutral-200" : "text-neutral-500"}`}>Night</span>
        </span>
      </span>
    </button>
  );
}
