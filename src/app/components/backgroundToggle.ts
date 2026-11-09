/**
 * Toggle for the home page's ASCII background. Lets the user disable the
 * animation when they want a quieter page or to save a few CPU cycles.
 *
 * Persists in localStorage and broadcasts changes via a custom event so
 * the renderer (DataBackground) and the toggle buttons stay in sync
 * without prop drilling.
 */

export const BG_DISABLED_KEY = "rusen-bg-disabled";
const BG_TOGGLE_EVENT = "rusen-bg-toggle";

// Used when browser storage is blocked, so the toggle still works for the visit.
let volatileDisabled: boolean | undefined;

export function isBgDisabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(BG_DISABLED_KEY) === "1";
  } catch {
    return volatileDisabled ?? false;
  }
}

export function setBgDisabled(disabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (disabled) window.localStorage.setItem(BG_DISABLED_KEY, "1");
    else window.localStorage.removeItem(BG_DISABLED_KEY);
    volatileDisabled = undefined;
  } catch {
    volatileDisabled = disabled;
  }
  window.dispatchEvent(new Event(BG_TOGGLE_EVENT));
}

export function subscribeBgToggle(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === BG_DISABLED_KEY) listener();
  };
  window.addEventListener(BG_TOGGLE_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(BG_TOGGLE_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}
