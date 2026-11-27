"use client";

import { FOCUS_EVENT, type FocusEggDetail } from "./focusEgg";

/** The first word of the hero quote. Pressing it lights the whole background. */
export default function FocusWord() {
  return (
    <button
      type="button"
      className="focus-egg"
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        window.dispatchEvent(
          new CustomEvent<FocusEggDetail>(FOCUS_EVENT, {
            detail: { x: r.left + r.width / 2, y: r.top + r.height / 2 },
          }),
        );
      }}
    >
      Focus
    </button>
  );
}
