"use client";

import { useSyncExternalStore } from "react";
import { isBgDisabled, setBgDisabled, subscribeBgToggle } from "./bgToggle";

/**
 * Home-page kicker chip rendered as a button: same look as the static
 * kicker, but clicking it toggles the global ASCII background — mirrors
 * the BgToggle in the Footer so the home gets a discoverable second
 * affordance for the same setting.
 */
export default function BgKickerToggle() {
  const disabled = useSyncExternalStore<boolean>(
    subscribeBgToggle,
    isBgDisabled,
    () => false,
  );

  const onClick = () => setBgDisabled(!disabled);
  const aria = disabled
    ? "Enable background animation"
    : "Disable background animation";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={aria}
      title={aria}
      className="kicker cursor-pointer hover:border-[var(--line-strong)] transition-colors"
    >
      <span
        aria-hidden="true"
        className={
          disabled
            ? "inline-block w-[0.45rem] h-[0.45rem] rounded-full bg-neutral-400 dark:bg-neutral-600"
            : "signal-blip"
        }
      />
      DATA, DATA EVERYWHERE
    </button>
  );
}
