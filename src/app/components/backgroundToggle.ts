/**
 * Toggle for the global ASCII background. Lets the user disable the
 * animation when they want a quieter page or to save a few CPU cycles.
 *
 * Persists in localStorage and broadcasts changes via a custom event so
 * the renderer (DataBackground) and the toggle button (Footer) stay in
 * sync without prop drilling.
 */

export const BG_DISABLED_KEY = "rusen-bg-disabled";
export const BG_TOGGLE_EVENT = "rusen-bg-toggle";

export function isBgDisabled(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(BG_DISABLED_KEY) === "1";
}

export function setBgDisabled(disabled: boolean): void {
  if (typeof window === "undefined") return;
  if (disabled) window.localStorage.setItem(BG_DISABLED_KEY, "1");
  else window.localStorage.removeItem(BG_DISABLED_KEY);
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
