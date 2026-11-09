"use client";

import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import {
  isBgDisabled,
  setBgDisabled,
  subscribeBgToggle,
} from "./backgroundToggle";
import { hasBackground } from "./DataBackground";

export default function BgToggle() {
  const pathname = usePathname();
  const disabled = useSyncExternalStore<boolean>(
    subscribeBgToggle,
    isBgDisabled,
    () => false,
  );

  // Only the home page has a background to switch (404 is not a route here).
  if (!hasBackground(pathname, false)) return null;

  const onClick = () => setBgDisabled(!disabled);
  const aria = disabled ? "Enable background animation" : "Disable background animation";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={aria}
      title={aria}
      className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.12em] text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50 transition-colors cursor-pointer"
    >
      <span
        aria-hidden="true"
        className={`inline-block w-1.5 h-1.5 rounded-full ${
          disabled ? "bg-neutral-400 dark:bg-neutral-600" : "bg-[var(--signal)]"
        }`}
      />
      bg:{disabled ? "off" : "on"}
    </button>
  );
}
