import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useClassifier } from "./classify-anything/hooks/useClassifier";
import { useEmbedding } from "./embedding-explorer/hooks/useEmbedding";
import { useSAM } from "./segment-anything/hooks/useSAM";
import { useFillMask } from "./sentence-surgeon/hooks/useFillMask";
import { useVisionClassifier } from "./vision-anything/hooks/useVisionClassifier";

const transformerMocks = vi.hoisted(() => ({
  pipeline: vi.fn(),
  samFromPretrained: vi.fn(),
  processorFromPretrained: vi.fn(),
}));

vi.mock("@huggingface/transformers", () => ({
  env: {},
  pipeline: transformerMocks.pipeline,
  Sam2Model: { from_pretrained: transformerMocks.samFromPretrained },
  AutoProcessor: { from_pretrained: transformerMocks.processorFromPretrained },
  Tensor: class {},
  RawImage: class {},
}));

describe("browser model loading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not initialize any model just because its hook mounted", async () => {
    const classifier = renderHook(() => useClassifier());
    const vision = renderHook(() => useVisionClassifier());
    const embedding = renderHook(() => useEmbedding());
    const fillMask = renderHook(() => useFillMask());
    const sam = renderHook(() => useSAM(vi.fn()));

    await act(async () => {
      await Promise.resolve();
    });

    expect(transformerMocks.pipeline).not.toHaveBeenCalled();
    expect(transformerMocks.samFromPretrained).not.toHaveBeenCalled();
    expect(transformerMocks.processorFromPretrained).not.toHaveBeenCalled();

    classifier.unmount();
    vision.unmount();
    embedding.unmount();
    fillMask.unmount();
    sam.unmount();
  });

  it("initializes classification lazily on the first classification", async () => {
    transformerMocks.pipeline.mockResolvedValueOnce(
      vi.fn().mockResolvedValue({
        labels: ["relevant", "irrelevant"],
        scores: [0.9, 0.1],
      }),
    );
    const { result } = renderHook(() => useClassifier());

    await act(async () => {
      await result.current.classify("A useful result", ["relevant", "irrelevant"]);
    });

    expect(transformerMocks.pipeline).toHaveBeenCalledOnce();
    expect(transformerMocks.pipeline).toHaveBeenCalledWith(
      "zero-shot-classification",
      "Xenova/mobilebert-uncased-mnli",
      expect.objectContaining({ device: "wasm" }),
    );
  });
});
