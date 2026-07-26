import { fireEvent, render, screen } from "@testing-library/react";
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

  it("renders stable text destinations without tape mechanics", () => {
    const { container } = render(<Header />);
    const photosLink = screen.getByRole("link", { name: "Photos" });
    const nerdyLink = screen.getByRole("link", { name: "Nerdy Stuff" });

    expect(photosLink.querySelector(".site-nav-word-frame")).toHaveAttribute(
      "data-nav-word",
      "PHOTOS",
    );
    expect(nerdyLink.querySelector(".site-nav-word-frame")).toHaveAttribute(
      "data-nav-word",
      "NERDY",
    );
    expect(container.querySelectorAll(".site-nav-link")).toHaveLength(6);
    expect(container.querySelector(".site-nav-home")).toHaveAttribute("href", "/");
    expect(container.querySelector(".site-nav-home .site-nav-word-frame"))
      .toHaveAttribute("data-nav-word", "rusen.ai");
    expect(container.querySelector(".site-nav-home .site-brand-dot"))
      .toHaveTextContent(".");
    expect(photosLink).toHaveAttribute("aria-current", "page");
    expect(photosLink).toHaveAttribute("data-nav-selected", "true");

    expect(container.querySelectorAll(".site-nav-row .site-nav-word-frame")).toHaveLength(7);
    expect(container.querySelector(".site-nav-cell-code")).not.toBeInTheDocument();
    expect(container.querySelector(".site-nav-read-head")).not.toBeInTheDocument();
    expect(container.querySelector(".site-nav-step")).not.toBeInTheDocument();
    expect(container.querySelector(".site-nav-rail")).not.toBeInTheDocument();
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

  it("keeps the labeled theme state as a simple trailing control", () => {
    const { container } = render(<Header />);

    expect(screen.getByRole("link", { name: "Demos" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "CV" })).toBeInTheDocument();
    expect(container.querySelector(".site-nav-theme button")).toHaveAccessibleName("Theme: 1");
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
});
