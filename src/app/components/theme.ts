export const THEME_STORAGE_KEY = "rusen-ui-theme";
export const THEME_EVENT = "rusen-theme-change";

export type ThemeMode = "light" | "dark";

export function getSystemTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function getStoredTheme(): ThemeMode | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

export function getResolvedTheme(): ThemeMode {
  if (typeof document !== "undefined") {
    const active = document.documentElement.dataset.theme;
    if (active === "light" || active === "dark") return active;
  }

  return getStoredTheme() ?? getSystemTheme();
}

export function applyTheme(theme: ThemeMode): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document.documentElement.classList.toggle("dark", theme === "dark");
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: theme }));
}

export function setThemePreference(theme: ThemeMode): void {
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
      if (event.newValue === "light" || event.newValue === "dark") {
        applyTheme(event.newValue);
      } else {
        applyTheme(getSystemTheme());
      }
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

/* Colour palettes sit on top of the light/dark mode: each palette defines both. */
export const PALETTE_STORAGE_KEY = "rusen-ui-palette";
export const PALETTES = ["default", "phosphor"] as const;
export type Palette = (typeof PALETTES)[number];

function isPalette(value: unknown): value is Palette {
  return typeof value === "string" && (PALETTES as readonly string[]).includes(value);
}

export function getPalette(): Palette {
  if (typeof document !== "undefined" && isPalette(document.documentElement.dataset.palette)) {
    return document.documentElement.dataset.palette;
  }
  return "default";
}

/** The default palette has no attribute, so the plain token blocks apply. */
export function applyPalette(palette: Palette): void {
  if (typeof document === "undefined") return;
  if (palette === "default") delete document.documentElement.dataset.palette;
  else document.documentElement.dataset.palette = palette;
  // Canvases redraw on the theme event, and a palette change needs the same redraw.
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: getResolvedTheme() }));
}

export function setPalettePreference(palette: Palette): void {
  if (typeof window === "undefined") return;
  try {
    if (palette === "default") window.localStorage.removeItem(PALETTE_STORAGE_KEY);
    else window.localStorage.setItem(PALETTE_STORAGE_KEY, palette);
  } catch {
    // The active palette still works when storage is unavailable or blocked.
  }
  applyPalette(palette);
}

export function nextPalette(current: Palette): Palette {
  return PALETTES[(PALETTES.indexOf(current) + 1) % PALETTES.length];
}

export function subscribePalette(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== PALETTE_STORAGE_KEY) return;
    applyPalette(isPalette(event.newValue) ? event.newValue : "default");
    listener();
  };
  window.addEventListener(THEME_EVENT, listener);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(THEME_EVENT, listener);
    window.removeEventListener("storage", handleStorage);
  };
}

/** A colour token as "r, g, b" for canvas rgba() strings; falls back when the token is not a hex colour. */
export function readTokenRgb(name: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(value);
  return match ? `${parseInt(match[1], 16)}, ${parseInt(match[2], 16)}, ${parseInt(match[3], 16)}` : fallback;
}
