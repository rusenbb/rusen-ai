import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import FullAttentionPanel from "./components/FullAttentionPanel";
import type { AttentionMask, UseClipSeg } from "./hooks/useClipSeg";
import VisionAnythingPage from "./page";

const { classify } = vi.hoisted(() => ({ classify: vi.fn() }));
vi.mock("./hooks/useVisionClassifier", () => ({
  useVisionClassifier: () => ({ classify, status: "ready", isLoading: false }),
}));
vi.mock("./hooks/useClipSeg", () => ({
  useClipSeg: () => ({ status: "idle", segment: vi.fn() }),
}));
vi.mock("./components/HeatmapCanvas", () => ({ default: () => null }));

describe("vision inference lifecycle", () => {
  it("does not restart a batch when only model progress changes", async () => {
    let resolve!: (masks: AttentionMask[]) => void;
    const segmentBatch = vi.fn(
      () =>
        new Promise<AttentionMask[]>((done) => {
          resolve = done;
        }),
    );
    const clipSeg: UseClipSeg = {
      status: "idle",
      progress: 0,
      error: null,
      load: vi.fn(),
      segment: vi.fn(),
      segmentBatch,
    };
    const props = {
      imageUrl: "/demo-images/dog.jpg",
      labels: ["dog"],
      initialLabel: "dog",
      clipSeg,
      onClose: vi.fn(),
    };
    const { rerender } = render(<FullAttentionPanel {...props} />);
    rerender(
      <FullAttentionPanel
        {...props}
        clipSeg={{ ...clipSeg, status: "loading", progress: 50 }}
      />,
    );
    await act(async () =>
      resolve([{ width: 1, height: 1, data: new Float32Array([1]) }]),
    );
    expect(segmentBatch).toHaveBeenCalledOnce();
    expect(screen.queryByText(/Computing attention/)).not.toBeInTheDocument();
  });

  it.each(["Street", "Clear image"])("ignores pending classification after clicking %s", async (action) => {
    let resolve!: (results: { label: string; score: number }[]) => void;
    classify.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      }),
    );
    render(<VisionAnythingPage />);
    fireEvent.click(screen.getByRole("button", { name: "Dog" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Classify" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: action }),
    );
    await act(async () =>
      resolve([{ label: "stale-dog-prediction", score: 0.9 }]),
    );
    expect(screen.queryByText("stale-dog-prediction")).not.toBeInTheDocument();
    const button = screen.getByRole("button", { name: "Classify" });
    if (action === "Clear image") expect(button).toBeDisabled();
    else expect(button).toBeEnabled();
  });
});
