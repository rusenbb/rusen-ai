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
  default: () => <button type="button">Theme</button>,
}));

describe("Header navigation tape", () => {
  beforeEach(() => {
    pathname = "/photos";
  });

  it("assigns every destination a stable tape cell", () => {
    const { container } = render(<Header />);
    const photosLink = screen.getByRole("link", { name: "Photos" });
    const nerdyLink = screen.getByRole("link", { name: "Nerdy Stuff" });

    expect(photosLink.querySelector(".site-nav-cell-code")).toHaveTextContent("011");
    expect(photosLink.querySelector(".site-nav-cell-label")).toHaveTextContent("Photos");
    expect(nerdyLink.querySelector(".site-nav-cell-code")).toHaveTextContent("001");
    expect(nerdyLink.querySelector(".site-nav-cell-label")).toHaveTextContent("Nerdy");
    expect(container.querySelectorAll(".site-nav-icon")).toHaveLength(6);
    expect(container.querySelector(".site-nav-tape-leader")).toHaveTextContent("TuringTapeNAV::07");
    expect(container.querySelector(".site-nav-tape-leader")).toHaveAttribute("href", "/");
    expect(container.querySelector(".site-nav-read-head")).toBeEmptyDOMElement();
    expect(photosLink).toHaveAttribute("aria-current", "page");
  });

  it("keeps the theme bit on the same tape without changing accessible names", () => {
    const { container } = render(<Header />);

    expect(screen.getByRole("link", { name: "Demos" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "CV" })).toBeInTheDocument();
    expect(container.querySelector(".site-nav-theme-cell .site-nav-cell-code"))
      .toHaveTextContent("110");
    expect(container.querySelector(".site-nav-theme-cell button"))
      .toHaveAccessibleName("Theme");
  });

  it("opens the same navigation as a vertical mobile tape", () => {
    const { container } = render(<Header />);

    fireEvent.click(screen.getByRole("button", { name: "Toggle menu" }));

    expect(screen.getByRole("group", { name: "Mobile navigation tape" }))
      .toBeInTheDocument();
    expect(container.querySelectorAll("[data-mobile-tape-cell]")).toHaveLength(7);
    expect(container.querySelector('[data-mobile-index="3"]')).toHaveAttribute(
      "data-focused",
      "true",
    );
    expect(container.querySelector(".site-mobile-tape-theme .site-mobile-tape-code"))
      .toHaveTextContent("110");
    expect(container.querySelector(".site-mobile-tape-home")).toHaveAttribute("href", "/");
  });
});
