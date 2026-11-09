import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BG_DISABLED_KEY,
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

  it("defaults on and stores only a disabled choice", () => {
    expect(isBgDisabled()).toBe(false);
    setBgDisabled(true);
    expect(isBgDisabled()).toBe(true);
    expect(window.localStorage.getItem(BG_DISABLED_KEY)).toBe("1");
    setBgDisabled(false);
    expect(window.localStorage.getItem(BG_DISABLED_KEY)).toBeNull();
  });

  it("falls back safely when browser storage is unavailable", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => { throw new DOMException("Blocked", "SecurityError"); },
      setItem: () => { throw new DOMException("Blocked", "SecurityError"); },
      removeItem: () => { throw new DOMException("Blocked", "SecurityError"); },
    });

    expect(isBgDisabled()).toBe(false);
    expect(() => setBgDisabled(true)).not.toThrow();
    expect(isBgDisabled()).toBe(true);
  });
});
