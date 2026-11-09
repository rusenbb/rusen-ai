import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import SegmentAnythingExperience from "./SegmentAnythingExperience";
import type { DecodeResult } from "./hooks/useSAM";

const mocks = vi.hoisted(() => ({ encodeImage: vi.fn(), decodePoints: vi.fn(), clearCache: vi.fn() }));
vi.mock("./hooks/useSAM", () => ({ useSAM: () => mocks }));
vi.mock("./components/SampleImages", () => ({
  SAMPLE_IMAGES: [{ url: "/demo-images/dog.jpg", alt: "Dog" }],
  sampleHint: () => "Click the dog",
  default: ({ onSelect }: { onSelect: (url: string) => void }) => <button onClick={() => onSelect("/demo-images/dog.jpg")}>Select sample</button>,
}));
vi.mock("./components/SegmentCanvas", () => ({ default: ({ onPointAdd, maskData, overlay }: { onPointAdd: (x: number, y: number, label: 1) => void; maskData: Float32Array | null; overlay: React.ReactNode }) => <div><button onClick={() => onPointAdd(0.5, 0.5, 1)}>Add point</button><span>{maskData ? "Mask visible" : "No mask"}</span>{overlay}</div> }));
vi.mock("./components/ControlPanel", () => ({ default: ({ onClearPoints }: { onClearPoints: () => void }) => <button onClick={onClearPoints}>Clear points</button> }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.encodeImage.mockResolvedValue(1000);
});

it("shows the sample with a hint and encodes nothing until the first click", async () => {
  render(<SegmentAnythingExperience />);
  expect(screen.getByText("Click the dog")).toBeInTheDocument();
  await act(async () => fireEvent.click(screen.getByText("Select sample")));
  expect(mocks.encodeImage).not.toHaveBeenCalled();
});

it("answers the first click once the image is encoded", async () => {
  mocks.decodePoints.mockResolvedValueOnce({ masks: [new Float32Array([1])], dims: { w: 1, h: 1 }, candidates: [{ index: 0, iouScore: 0.9 }] });
  render(<SegmentAnythingExperience />);
  await act(async () => fireEvent.click(screen.getByText("Add point")));
  expect(mocks.encodeImage).toHaveBeenCalledWith("/demo-images/dog.jpg");
  expect(mocks.decodePoints).toHaveBeenCalledOnce();
  expect(screen.getByText("Mask visible")).toBeInTheDocument();
});

it("does not restore a mask after its prompts were cleared", async () => {
  let finish!: (result: DecodeResult) => void;
  mocks.decodePoints.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
  render(<SegmentAnythingExperience />);
  await act(async () => fireEvent.click(screen.getByText("Add point")));
  fireEvent.click(screen.getByText("Clear points"));
  await act(async () => finish({ masks: [new Float32Array([1])], dims: { w: 1, h: 1 }, candidates: [{ index: 0, iouScore: 0.9 }] }));
  expect(screen.getByText("No mask")).toBeInTheDocument();
});
