"use client";

import { useSyncExternalStore } from "react";
import { isBgDisabled, setBgDisabled, subscribeBgToggle } from "./bgToggle";

export default function BgToggle() {
  const disabled = useSyncExternalStore<boolean>(
    subscribeBgToggle,
    isBgDisabled,
    () => false,
  );

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
