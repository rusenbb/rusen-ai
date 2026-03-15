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
      className="group inline-flex items-center justify-center self-center font-mono tabular-nums leading-none text-neutral-700 transition hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-neutral-50"
    >
      <span className="text-[1.15rem] font-medium tracking-[-0.08em] transition-transform duration-200 group-hover:-translate-y-px">
        {isDark ? "0" : "1"}
      </span>
      <span className="sr-only">
        Current theme: {isDark ? "dark" : "light"}
      </span>
    </button>
  );
}
