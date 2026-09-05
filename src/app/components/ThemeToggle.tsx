"use client";

import { useSyncExternalStore } from "react";
import {
  getResolvedTheme,
  setThemePreference,
  subscribeTheme,
  type ThemeMode,
} from "./theme";
import NavWord from "./NavWord";
import { useHydrated } from "./useHydrated";

function nextTheme(current: ThemeMode): ThemeMode {
  return current === "dark" ? "light" : "dark";
}

export default function ThemeToggle({ label }: { label: string }) {
  const hydrated = useHydrated();
  const theme = useSyncExternalStore<ThemeMode>(
    subscribeTheme,
    getResolvedTheme,
    () => "light",
  );

  const handleToggle = () => {
    const updated = nextTheme(getResolvedTheme());
    setThemePreference(updated);
  };

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      disabled={!hydrated}
      onClick={handleToggle}
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
      title={`Switch to ${isDark ? "light" : "dark"} theme`}
      className="theme-toggle group inline-flex items-center justify-center self-center font-mono tabular-nums leading-none text-neutral-700 transition hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-neutral-50"
    >
      <NavWord word={`${label}: ${isDark ? "0" : "1"}`} preserveCase />
      <span className="sr-only">
        Current theme: {isDark ? "dark" : "light"}
      </span>
    </button>
  );
}
