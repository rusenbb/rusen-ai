import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import FullAttentionPanel from "./components/FullAttentionPanel";
import type { AttentionMask, UseClipSeg } from "./hooks/useClipSeg";
import VisionAnythingPage from "./page";

const { classify, segment } = vi.hoisted(() => ({ classify: vi.fn(), segment: vi.fn() }));
vi.mock("./hooks/useVisionClassifier", () => ({
  useVisionClassifier: () => ({ classify, status: "ready", isLoading: false }),
}));
vi.mock("./hooks/useClipSeg", () => ({
  useClipSeg: () => ({ status: "idle", segment }),
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

  it("ignores pending classification after switching to another sample", async () => {
    let resolve!: (results: { label: string; score: number }[]) => void;
    classify.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      }),
    );
    render(<VisionAnythingPage />);
    fireEvent.click(screen.getByRole("button", { name: "Classify" }));
    expect(classify).toHaveBeenCalledWith("/demo-images/dog.jpg", expect.arrayContaining(["a photo of a dog"]));
    fireEvent.click(screen.getByRole("button", { name: "Street" }));
    await act(async () => resolve([{ label: "stale-dog-prediction", score: 0.9 }]));
    expect(screen.queryByText("stale-dog-prediction")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Classify" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Remove a photo of a car" })).toBeEnabled();
  });

  it("shows the top label's map on the image after classifying", async () => {
    classify.mockResolvedValueOnce([
      { label: "a photo of a dog", score: 0.93 },
      { label: "a photo of a wolf", score: 0.07 },
    ]);
    segment.mockResolvedValueOnce({ width: 1, height: 1, data: new Float32Array([1]) });
    render(<VisionAnythingPage />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Classify" })));
    expect(segment).toHaveBeenCalledWith("/demo-images/dog.jpg", "a photo of a dog");
    expect(screen.getByText(/Where the model sees "a photo of a dog"/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "All maps" })).toBeInTheDocument();
  });
});
