export const THEME_STORAGE_KEY = "rusen-ui-theme";
export const THEME_EVENT = "rusen-theme-change";

/** Light or dark: what canvases and `prefers-color-scheme` care about. */
export type ThemeMode = "light" | "dark";

/**
 * The themes a visitor cycles through, in order. Each one is a mode plus a
 * colour palette; the palette's tokens live in globals.css under
 * html[data-palette]. The default palette has no attribute.
 */
export const THEMES = {
  light: { mode: "light", palette: "default", label: "light" },
  dark: { mode: "dark", palette: "default", label: "dark" },
  phosphor: { mode: "dark", palette: "phosphor", label: "phosphor" },
  "phosphor-paper": { mode: "light", palette: "phosphor", label: "phosphor paper" },
} as const;

export type SiteTheme = keyof typeof THEMES;
export type Palette = (typeof THEMES)[SiteTheme]["palette"];
export const THEME_ORDER = Object.keys(THEMES) as SiteTheme[];

export function isSiteTheme(value: unknown): value is SiteTheme {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(THEMES, value);
}

export function getSystemTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function getStoredTheme(): SiteTheme | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isSiteTheme(value) ? value : null;
  } catch {
    return null;
  }
}

/** The current mode, read from the document so canvases match what is painted. */
export function getResolvedTheme(): ThemeMode {
  if (typeof document !== "undefined") {
    const active = document.documentElement.dataset.theme;
    if (active === "light" || active === "dark") return active;
  }

  const stored = getStoredTheme();
  return stored ? THEMES[stored].mode : getSystemTheme();
}

export function getPalette(): Palette {
  if (typeof document !== "undefined" && document.documentElement.dataset.palette === "phosphor") {
    return "phosphor";
  }
  return "default";
}

/** The full theme on screen, combining the mode and the palette. */
export function getActiveTheme(): SiteTheme {
  const mode = getResolvedTheme();
  const palette = getPalette();
  return THEME_ORDER.find((theme) => THEMES[theme].mode === mode && THEMES[theme].palette === palette) ?? mode;
}

export function nextTheme(current: SiteTheme): SiteTheme {
  return THEME_ORDER[(THEME_ORDER.indexOf(current) + 1) % THEME_ORDER.length];
}

export function applyTheme(theme: SiteTheme): void {
  if (typeof document === "undefined") return;
  const { mode, palette } = THEMES[theme];
  const root = document.documentElement;
  root.dataset.theme = mode;
  if (palette === "default") delete root.dataset.palette;
  else root.dataset.palette = palette;
  root.style.colorScheme = mode;
  root.classList.toggle("dark", mode === "dark");
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: mode }));
}

export function setThemePreference(theme: SiteTheme): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // The active theme still works when storage is unavailable or blocked.
  }
  applyTheme(theme);
}

export function subscribeTheme(listener: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const handleStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) {
      applyTheme(isSiteTheme(event.newValue) ? event.newValue : getSystemTheme());
      listener();
    }
  };
  const handleThemeEvent = () => listener();
  const handleMediaChange = () => {
    if (!getStoredTheme()) {
      applyTheme(getSystemTheme());
      listener();
    }
  };

  window.addEventListener(THEME_EVENT, handleThemeEvent);
  window.addEventListener("storage", handleStorage);
  mediaQuery.addEventListener("change", handleMediaChange);

  return () => {
    window.removeEventListener(THEME_EVENT, handleThemeEvent);
    window.removeEventListener("storage", handleStorage);
    mediaQuery.removeEventListener("change", handleMediaChange);
  };
}

/** A colour token as "r, g, b" for canvas rgba() strings; falls back when the token is not a hex colour. */
export function readTokenRgb(name: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(value);
  return match ? `${parseInt(match[1], 16)}, ${parseInt(match[2], 16)}, ${parseInt(match[3], 16)}` : fallback;
}
