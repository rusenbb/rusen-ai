"use client";

import { useSyncExternalStore } from "react";
import {
  getActiveTheme,
  nextTheme,
  setThemePreference,
  subscribeTheme,
  THEMES,
  type SiteTheme,
} from "./theme";
import NavWord from "./NavWord";
import { useHydrated } from "./useHydrated";

export default function ThemeToggle({ label }: { label: string }) {
  const hydrated = useHydrated();
  const theme = useSyncExternalStore<SiteTheme>(subscribeTheme, getActiveTheme, () => "light");
  const next = THEMES[nextTheme(theme)].label;

  return (
    <button
      type="button"
      disabled={!hydrated}
      onClick={() => setThemePreference(nextTheme(getActiveTheme()))}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      className="theme-toggle group inline-flex items-center justify-center self-center font-mono leading-none text-foreground transition hover:text-foreground"
    >
      <NavWord word={`${label}: ${THEMES[theme].label}`} preserveCase />
      <span className="sr-only">Current theme: {THEMES[theme].label}</span>
    </button>
  );
}
