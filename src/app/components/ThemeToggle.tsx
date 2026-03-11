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
      className={`group relative inline-flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border transition duration-300 ${
        isDark
          ? "border-neutral-700/90 bg-[radial-gradient(circle_at_35%_30%,rgba(248,250,252,0.12),rgba(31,41,55,0.94)_55%,rgba(2,6,23,1)_100%)] text-neutral-100 shadow-[0_10px_36px_rgba(2,6,23,0.42)]"
          : "border-amber-200/90 bg-[radial-gradient(circle_at_35%_30%,rgba(255,255,255,0.98),rgba(254,243,199,0.92)_45%,rgba(251,191,36,0.9)_78%,rgba(245,158,11,0.96)_100%)] text-amber-950 shadow-[0_10px_36px_rgba(251,191,36,0.28)]"
      }`}
    >
      <span
        className={`absolute inset-[3px] rounded-full transition duration-300 ${
          isDark
            ? "bg-[radial-gradient(circle_at_62%_38%,rgba(248,250,252,0.18),rgba(17,24,39,0)_24%),radial-gradient(circle_at_50%_50%,rgba(148,163,184,0.10),rgba(2,6,23,0)_70%)]"
            : "bg-[radial-gradient(circle_at_38%_34%,rgba(255,255,255,0.9),rgba(255,255,255,0)_24%),radial-gradient(circle_at_50%_50%,rgba(254,240,138,0.42),rgba(254,240,138,0)_68%)]"
        }`}
        aria-hidden="true"
      />
      <span
        className={`absolute left-2 top-2 text-[9px] font-mono tracking-[0.24em] transition ${
          isDark ? "text-neutral-500" : "text-amber-950/70"
        }`}
      >
        0
      </span>
      <span
        className={`absolute bottom-2 right-2 text-[9px] font-mono tracking-[0.24em] transition ${
          isDark ? "text-neutral-200" : "text-amber-900/45"
        }`}
      >
        1
      </span>
      <span
        className={`relative z-10 block h-5 w-5 rounded-full border transition duration-300 ${
          isDark
            ? "border-neutral-300/40 bg-[radial-gradient(circle_at_40%_38%,rgba(255,255,255,0.88),rgba(226,232,240,0.28)_42%,rgba(148,163,184,0.06)_75%,rgba(0,0,0,0)_76%)] shadow-[0_0_18px_rgba(226,232,240,0.22)]"
            : "border-white/80 bg-[radial-gradient(circle_at_38%_34%,#ffffff,#fef08a_46%,#f59e0b_100%)] shadow-[0_0_22px_rgba(251,191,36,0.5)]"
        }`}
      >
        <span
          className={`absolute inset-0 rounded-full transition ${
            isDark
              ? "bg-[radial-gradient(circle_at_60%_40%,rgba(15,23,42,0)_38%,rgba(15,23,42,0.92)_42%)]"
              : "opacity-0"
          }`}
          aria-hidden="true"
        />
      </span>
    </button>
  );
}
