import { describe, expect, it } from "vitest";
import { resolveLoadProgress } from "../utils/loadProgress";

describe("resolveLoadProgress", () => {
  it("prefers aggregate progress_total updates for stable progress", () => {
    const result = resolveLoadProgress(12, "Downloading model...", {
      status: "progress_total",
      name: "onnx-community/sam2.1-hiera-tiny-ONNX",
      progress: 47.6,
      loaded: 476,
      total: 1000,
      files: {
        "onnx/model_a.onnx": { loaded: 200, total: 400 },
        "onnx/model_b.onnx": { loaded: 276, total: 600 },
      },
    });

    expect(result.progress).toBe(48);
    expect(result.message).toBe("Downloading model files...");
  });

  it("never regresses when per-file progress events move backward", () => {
    const first = resolveLoadProgress(0, null, {
      status: "progress",
      name: "onnx-community/sam2.1-hiera-tiny-ONNX",
      file: "onnx/model_a.onnx",
      progress: 63,
      loaded: 630,
      total: 1000,
    });

    const second = resolveLoadProgress(first.progress, first.message, {
      status: "progress",
      name: "onnx-community/sam2.1-hiera-tiny-ONNX",
      file: "onnx/model_b.onnx",
      progress: 4,
      loaded: 40,
      total: 1000,
    });

    expect(first.progress).toBe(63);
    expect(second.progress).toBe(63);
    expect(second.message).toBe("Downloading model_b.onnx...");
  });
});
