import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import LangPicker from "./LangPicker";

describe("LangPicker", () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("only offers languages that are present on a scoped archive page", () => {
    document.documentElement.dataset.blogLang = "en";
    render(<LangPicker available={["tr"]} forced="tr" />);

    expect(screen.getByRole("button", { name: "TR" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.queryByRole("button", { name: "EN" })).not.toBeInTheDocument();
  });

  it("updates the document filter and persisted preference", async () => {
    document.documentElement.dataset.blogLang = "en";
    render(<LangPicker />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "TR" }));
      await Promise.resolve();
    });

    expect(document.documentElement.dataset.blogLang).toBe("tr");
    expect(window.localStorage.getItem("blogLang")).toBe("tr");
  });
});
