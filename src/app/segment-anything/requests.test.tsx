import { act, fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import SegmentAnythingExperience from "./SegmentAnythingExperience";
import type { DecodeResult } from "./hooks/useSAM";

const mocks = vi.hoisted(() => ({ encodeImage: vi.fn().mockResolvedValue(undefined), decodePoints: vi.fn(), clearCache: vi.fn() }));
vi.mock("./hooks/useSAM", () => ({ useSAM: () => mocks }));
vi.mock("./components/SampleImages", () => ({ default: ({ onSelect }: { onSelect: (url: string) => void }) => <button onClick={() => onSelect("/demo-images/dog.jpg")}>Select sample</button> }));
vi.mock("./components/SegmentCanvas", () => ({ default: ({ onPointAdd, maskData }: { onPointAdd: (x: number, y: number, label: 1) => void; maskData: Float32Array | null }) => <div><button onClick={() => onPointAdd(0.5, 0.5, 1)}>Add point</button><span>{maskData ? "Mask visible" : "No mask"}</span></div> }));
vi.mock("./components/ControlPanel", () => ({ default: ({ onClearPoints }: { onClearPoints: () => void }) => <button onClick={onClearPoints}>Clear points</button> }));

it("does not restore a mask after its prompts were cleared", async () => {
  let finish!: (result: DecodeResult) => void;
  mocks.decodePoints.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
  render(<SegmentAnythingExperience />);
  await act(async () => fireEvent.click(screen.getByText("Select sample")));
  fireEvent.click(screen.getByText("Add point"));
  fireEvent.click(screen.getByText("Clear points"));
  await act(async () => finish({ masks: [new Float32Array([1])], dims: { w: 1, h: 1 }, candidates: [{ index: 0, iouScore: 0.9 }] }));
  expect(screen.getByText("No mask")).toBeInTheDocument();
});
