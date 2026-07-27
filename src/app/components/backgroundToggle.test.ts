import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BG_DISABLED_KEY,
  PHOTO_BG_DISABLED_KEY,
  getBackgroundScope,
  isBgDisabled,
  setBgDisabled,
} from "./backgroundToggle";

describe("background preferences", () => {
  beforeEach(() => {
    const storedValues = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storedValues.get(key) ?? null,
      setItem: (key: string, value: string) => storedValues.set(key, value),
      removeItem: (key: string) => storedValues.delete(key),
      clear: () => storedValues.clear(),
      key: (index: number) => Array.from(storedValues.keys())[index] ?? null,
      get length() {
        return storedValues.size;
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("defaults the photo archive off without changing the global preference", () => {
    expect(getBackgroundScope("/photos")).toBe("photos");
    expect(isBgDisabled("photos")).toBe(true);
    expect(isBgDisabled("global")).toBe(false);
    expect(window.localStorage.getItem(BG_DISABLED_KEY)).toBeNull();
    expect(window.localStorage.getItem(PHOTO_BG_DISABLED_KEY)).toBeNull();
  });

  it("lets the photo background be enabled independently", () => {
    setBgDisabled(false, "photos");

    expect(isBgDisabled("photos")).toBe(false);
    expect(isBgDisabled("global")).toBe(false);
    expect(window.localStorage.getItem(PHOTO_BG_DISABLED_KEY)).toBe("0");
    expect(window.localStorage.getItem(BG_DISABLED_KEY)).toBeNull();
  });

  it("falls back safely when browser storage is unavailable", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => { throw new DOMException("Blocked", "SecurityError"); },
      setItem: () => { throw new DOMException("Blocked", "SecurityError"); },
      removeItem: () => { throw new DOMException("Blocked", "SecurityError"); },
    });

    expect(isBgDisabled("global")).toBe(false);
    expect(isBgDisabled("photos")).toBe(true);
    expect(() => setBgDisabled(true, "global")).not.toThrow();
    expect(isBgDisabled("global")).toBe(true);
  });
});
