import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ThemeToggle from "./ThemeToggle";
import { THEME_STORAGE_KEY } from "./theme";

describe("ThemeToggle", () => {
  beforeEach(() => {
    const storedValues = new Map<string, string>();

    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );
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
    document.documentElement.dataset.theme = "light";
    document.documentElement.style.colorScheme = "light";
    document.documentElement.classList.remove("dark");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete document.documentElement.dataset.theme;
    document.documentElement.style.colorScheme = "";
    document.documentElement.classList.remove("dark");
  });

  it("updates the document theme, persisted preference, and accessible state", () => {
    render(<ThemeToggle label="Theme" />);

    fireEvent.click(screen.getByRole("button", { name: "Switch to dark theme" }));

    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(document.documentElement).toHaveClass("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(screen.getByRole("button", { name: "Switch to light theme" }))
      .toContainElement(document.querySelector('[data-nav-word="Theme: 0"]'));

    fireEvent.click(screen.getByRole("button", { name: "Switch to light theme" }));

    expect(document.documentElement).toHaveAttribute("data-theme", "light");
    expect(document.documentElement).not.toHaveClass("dark");
    expect(document.documentElement.style.colorScheme).toBe("light");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
    expect(screen.getByRole("button", { name: "Switch to dark theme" }))
      .toContainElement(document.querySelector('[data-nav-word="Theme: 1"]'));
  });
});
