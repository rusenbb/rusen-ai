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
  const label = isDark ? "0" : "1";

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
      title={`Switch to ${isDark ? "light" : "dark"} theme`}
      className="relative inline-flex items-center justify-center font-mono tabular-nums hover:opacity-80 transition overflow-hidden h-7 w-7 rounded border border-neutral-300 dark:border-neutral-700 text-sm"
    >
      <span
        className="absolute inset-0 flex items-center justify-center transition-transform duration-300 ease-out"
        style={{ transform: isDark ? "translateY(0)" : "translateY(-100%)" }}
        aria-hidden={!isDark}
      >
        0
      </span>
      <span
        className="absolute inset-0 flex items-center justify-center transition-transform duration-300 ease-out"
        style={{ transform: isDark ? "translateY(100%)" : "translateY(0)" }}
        aria-hidden={isDark}
      >
        1
      </span>
    </button>
  );
}
