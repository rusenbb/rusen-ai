import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import AsciiCover from "./AsciiCover";

describe("AsciiCover motion", () => {
  const frames = new Map<number, FrameRequestCallback>();
  let nextId = 1;
  let observe: ((entries: { isIntersecting: boolean }[]) => void) | null = null;
  let touchScreen = false;

  beforeEach(() => {
    frames.clear();
    nextId = 1;
    vi.stubGlobal("ResizeObserver", class { observe = vi.fn(); disconnect = vi.fn(); });
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(cb: (entries: { isIntersecting: boolean }[]) => void) {
          observe = cb;
        }
        observe = vi.fn();
        disconnect = vi.fn();
      },
    );
    vi.stubGlobal("requestAnimationFrame", vi.fn((cb: FrameRequestCallback) => {
      const id = nextId++;
      frames.set(id, cb);
      return id;
    }));
    vi.stubGlobal("cancelAnimationFrame", vi.fn((id: number) => frames.delete(id)));
    touchScreen = false;
    vi.stubGlobal("matchMedia", vi.fn((query: string) => ({
      matches: query === "(hover: none)" && touchScreen,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })));
    vi.spyOn(HTMLCanvasElement.prototype, "getBoundingClientRect").mockReturnValue({ width: 350, height: 150, left: 0, top: 0 } as DOMRect);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      clearRect: vi.fn(),
      fillText: vi.fn(),
      setTransform: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("holds still on screen and plays only while its card is hovered", () => {
    const { container } = render(
      <a className="term-card">
        <AsciiCover scene="game-of-life" />
      </a>,
    );
    act(() => observe?.([{ isIntersecting: true }]));
    expect(frames.size).toBe(0);

    const card = container.querySelector(".term-card") as HTMLElement;
    act(() => {
      fireEvent.pointerEnter(card);
    });
    expect(frames.size).toBe(1);

    act(() => {
      fireEvent.pointerLeave(card);
      const [[id, cb]] = [...frames];
      frames.delete(id);
      cb(100);
    });
    expect(frames.size).toBe(0);
  });

  it("on a touch screen, a tap on the cover plays it instead of opening the link", () => {
    touchScreen = true;
    const { container } = render(
      <a className="term-card" href="/somewhere">
        <AsciiCover scene="game-of-life" />
      </a>,
    );
    act(() => observe?.([{ isIntersecting: true }]));
    const canvas = container.querySelector("canvas") as HTMLCanvasElement;
    let navigated = true;
    act(() => {
      navigated = fireEvent.click(canvas);
    });
    // fireEvent returns false when the default action was prevented.
    expect(navigated).toBe(false);
    expect(frames.size).toBe(1);
  });
});
