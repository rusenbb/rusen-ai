/**
 * Toggle for the global ASCII background. Lets the user disable the
 * animation when they want a quieter page or to save a few CPU cycles.
 *
 * Persists in localStorage and broadcasts changes via a custom event so
 * the renderer (DataBackground) and the toggle button (Footer) stay in
 * sync without prop drilling.
 */

export const BG_DISABLED_KEY = "rusen-bg-disabled";
export const PHOTO_BG_DISABLED_KEY = "rusen-bg-disabled:photos";
export const BG_TOGGLE_EVENT = "rusen-bg-toggle";

export type BackgroundScope = "global" | "photos";

const BACKGROUND_PREFERENCES: Record<
  BackgroundScope,
  { key: string; defaultDisabled: boolean }
> = {
  global: { key: BG_DISABLED_KEY, defaultDisabled: false },
  photos: { key: PHOTO_BG_DISABLED_KEY, defaultDisabled: true },
};
const volatilePreferences: Partial<Record<BackgroundScope, boolean>> = {};

export function getBackgroundScope(pathname: string | null): BackgroundScope {
  return pathname === "/photos" || pathname?.startsWith("/photos/")
    ? "photos"
    : "global";
}

export function isBgDisabledByDefault(scope: BackgroundScope = "global"): boolean {
  return BACKGROUND_PREFERENCES[scope].defaultDisabled;
}

export function isBgDisabled(scope: BackgroundScope = "global"): boolean {
  const preference = BACKGROUND_PREFERENCES[scope];
  if (typeof window === "undefined") return preference.defaultDisabled;
  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(preference.key);
  } catch {
    return volatilePreferences[scope] ?? preference.defaultDisabled;
  }
  if (stored === "1") return true;
  if (stored === "0") return false;
  return preference.defaultDisabled;
}

export function setBgDisabled(
  disabled: boolean,
  scope: BackgroundScope = "global",
): void {
  if (typeof window === "undefined") return;
  const preference = BACKGROUND_PREFERENCES[scope];
  try {
    if (disabled === preference.defaultDisabled) {
      window.localStorage.removeItem(preference.key);
    } else {
      window.localStorage.setItem(preference.key, disabled ? "1" : "0");
    }
    delete volatilePreferences[scope];
  } catch {
    volatilePreferences[scope] = disabled;
  }
  window.dispatchEvent(new Event(BG_TOGGLE_EVENT));
}

export function subscribeBgToggle(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (
      e.key === BG_DISABLED_KEY ||
      e.key === PHOTO_BG_DISABLED_KEY
    ) listener();
  };
  window.addEventListener(BG_TOGGLE_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(BG_TOGGLE_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}
