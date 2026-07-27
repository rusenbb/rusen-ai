import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import AsciiDataBackground from "./AsciiDataBackground";

function mediaQuery(matches: boolean): MediaQueryList {
  return {
    matches,
    media: "(prefers-reduced-motion: reduce)",
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  };
}

describe("AsciiDataBackground lifecycle", () => {
  const callbacks = new Map<number, FrameRequestCallback>();
  let nextFrameId = 1;
  let clearRect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    callbacks.clear();
    nextFrameId = 1;
    vi.stubGlobal("requestAnimationFrame", vi.fn((callback: FrameRequestCallback) => {
      const id = nextFrameId++;
      callbacks.set(id, callback);
      return id;
    }));
    vi.stubGlobal("cancelAnimationFrame", vi.fn((id: number) => {
      callbacks.delete(id);
    }));
    vi.stubGlobal("matchMedia", vi.fn(() => mediaQuery(false)));
    clearRect = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      clearRect,
      drawImage: vi.fn(),
      fillText: vi.fn(),
      scale: vi.fn(),
      setTransform: vi.fn(),
      textAlign: "center",
      textBaseline: "middle",
    } as unknown as CanvasRenderingContext2D);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("sleeps in quiet mode and wakes only for an interaction ripple", () => {
    render(<AsciiDataBackground noise={false} />);
    expect(requestAnimationFrame).toHaveBeenCalledOnce();

    const initialFrame = callbacks.get(1);
    expect(initialFrame).toBeDefined();
    act(() => initialFrame?.(100));
    expect(requestAnimationFrame).toHaveBeenCalledOnce();

    act(() => document.dispatchEvent(new MouseEvent("click", {
      bubbles: true,
      clientX: 40,
      clientY: 50,
    })));
    expect(requestAnimationFrame).toHaveBeenCalledTimes(2);
  });

  it("freezes the field and suppresses ripples for reduced motion", () => {
    vi.mocked(matchMedia).mockReturnValue(mediaQuery(true));
    render(<AsciiDataBackground />);

    expect(requestAnimationFrame).not.toHaveBeenCalled();
    act(() => document.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(requestAnimationFrame).not.toHaveBeenCalled();
  });

  it("caps ambient painting near thirty frames per second", () => {
    render(<AsciiDataBackground />);

    act(() => callbacks.get(1)?.(100));
    expect(clearRect).toHaveBeenCalledOnce();

    act(() => callbacks.get(2)?.(110));
    expect(clearRect).toHaveBeenCalledOnce();

    act(() => callbacks.get(3)?.(140));
    expect(clearRect).toHaveBeenCalledTimes(2);
  });
});
