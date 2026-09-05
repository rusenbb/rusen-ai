import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Header from "./Header";

let pathname = "/photos";

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("./ThemeToggle", () => ({
  default: ({ label }: { label: string }) => (
    <button type="button">{label}: 1</button>
  ),
}));

describe("Header navigation", () => {
  beforeEach(() => {
    pathname = "/photos";
  });

  it("exposes labeled destinations and the current page", () => {
    render(<Header />);
    const photosLink = screen.getByRole("link", { name: "Photos" });
    for (const [name, href] of [["Home", "/"], ["Demos", "/demos"], ["Nerdy Stuff", "/nerdy-stuff"], ["Bulletin", "/bulletin"], ["Photos", "/photos"], ["Blog", "/blogs"], ["CV", "/cv"]]) {
      expect(screen.getByRole("link", { name, exact: true })).toHaveAttribute("href", href);
    }
    expect(screen.getByRole("button", { name: "Theme: 1" })).toBeInTheDocument();
    expect(photosLink).toHaveAttribute("aria-current", "page");
  });

  it("marks the home word as selected on the home page", () => {
    pathname = "/";
    const { container } = render(<Header />);

    expect(container.querySelector(".site-nav-home")).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(container.querySelector(".site-nav-home")).toHaveAttribute(
      "data-nav-selected",
      "true",
    );
  });

  it("does not mislabel an unknown route as home", () => {
    pathname = "/missing-page";
    const { container } = render(<Header />);

    expect(container.querySelector(".site-nav-home")).not.toHaveAttribute(
      "data-nav-selected",
    );
    expect(container.querySelector("[data-nav-selected=true]")).not.toBeInTheDocument();
  });

  it.each([
    ["/curve-fitter", "Demos"],
    ["/emergence", "Nerdy Stuff"],
    ["/bulletin/vaultdb", "Bulletin"],
    ["/blogs/example-post", "Blog"],
    ["/cv/tr", "CV"],
  ])("selects the parent nav item for %s", (subpage, parentLabel) => {
    pathname = subpage;
    render(<Header />);

    expect(screen.getByRole("link", { name: parentLabel })).toHaveAttribute(
      "data-nav-selected",
      "true",
    );
    expect(screen.getByRole("link", { name: parentLabel })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("opens the same words in a simple mobile list", () => {
    const { container } = render(<Header />);

    fireEvent.click(screen.getByRole("button", { name: "Toggle menu" }));

    expect(screen.getByRole("group", { name: "Mobile navigation" }))
      .toBeInTheDocument();
    expect(container.querySelectorAll(".site-mobile-nav-link")).toHaveLength(6);
    expect(
      container.querySelector('.site-mobile-nav-link[aria-label="Photos"]'),
    ).toHaveAttribute("data-nav-selected", "true");
    expect(
      container.querySelector('.site-mobile-nav-link[aria-label="Photos"] .site-nav-word-frame'),
    ).toHaveAttribute("data-nav-word", "PHOTOS");
    expect(container.querySelector(".site-mobile-nav-theme button"))
      .toHaveAccessibleName("Theme: 1");
    expect(container.querySelector(".site-mobile-nav-home")).toHaveAttribute("href", "/");
    expect(container.querySelector(".site-mobile-nav-home"))
      .toHaveAccessibleName("Home");
  });

  it("returns focus to the mobile menu trigger when Escape closes the menu", async () => {
    render(<Header />);
    const trigger = screen.getByRole("button", { name: "Toggle menu" });
    fireEvent.click(trigger);
    const photos = screen.getAllByRole("link", { name: "Photos" }).at(-1)!;
    photos.focus();

    fireEvent.keyDown(window, { key: "Escape" });

    await waitFor(() => expect(trigger).toHaveFocus());
    expect(screen.queryByRole("group", { name: "Mobile navigation" }))
      .not.toBeInTheDocument();
  });
});
