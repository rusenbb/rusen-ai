"use client";

import { useCallback, useEffect, useRef } from "react";
import type { ProgressInfo } from "@huggingface/transformers";
import type { SAMAction, SegmentPoint, MaskCandidate } from "../types";

const MODEL_ID = "onnx-community/sam2.1-hiera-tiny-ONNX";

// ── Local type interfaces ────────────────────────────────────────────
//
// Sam2Model is not re-exported from @huggingface/transformers' public
// type surface, but the class exists at runtime and has these methods.
// We type only the interface we actually call rather than using `any`.

interface Sam2ModelLike {
  get_image_embeddings(processed: Record<string, unknown>): Promise<Record<string, unknown>>;
  (inputs: Record<string, unknown>): Promise<{
    pred_masks: unknown;
    iou_scores: { data: ArrayLike<number>; dims: number[] };
  }>;
}

interface ProcessorLike {
  (image: unknown): Promise<{
    reshaped_input_sizes: Array<[number, number]>;
    original_sizes: Array<[number, number]>;
    [key: string]: unknown;
  }>;
  post_process_masks(
    masks: unknown,
    originalSizes: number[][],
    reshapedSizes: number[][],
  ): Promise<Array<{ data: ArrayLike<number>; dims: number[] }>>;
}

interface TensorConstructor {
  new (type: string, data: ArrayLike<number> | ArrayLike<bigint>, shape: number[]): unknown;
}

interface RawImageStatic {
  fromURL(url: string): Promise<unknown>;
}

// ── Public interface ─────────────────────────────────────────────────

export interface DecodeResult {
  masks: Float32Array[];
  candidates: MaskCandidate[];
  dims: { w: number; h: number };
}

export interface UseSAMResult {
  encodeImage: (imageUrl: string) => Promise<void>;
  decodePoints: (points: SegmentPoint[]) => Promise<DecodeResult>;
  clearCache: () => Promise<void>;
}

// ── Hook ─────────────────────────────────────────────────────────────

export function useSAM(dispatch: React.Dispatch<SAMAction>): UseSAMResult {
  const modelRef = useRef<Sam2ModelLike | null>(null);
  const processorRef = useRef<ProcessorLike | null>(null);
  const initPromise = useRef<Promise<void> | null>(null);

  const TensorCtor = useRef<TensorConstructor | null>(null);
  const RawImageCtor = useRef<RawImageStatic | null>(null);

  const embeddingsRef = useRef<Record<string, unknown> | null>(null);
  const reshapedSizesRef = useRef<readonly [number, number] | null>(null);
  const originalSizesRef = useRef<readonly [number, number] | null>(null);

  // ── Model initialization ─────────────────────────────────────────

  const initModel = useCallback(async () => {
    if (initPromise.current) return initPromise.current;
    if (modelRef.current) return;

    initPromise.current = (async () => {
      try {
        dispatch({ type: "MODEL_LOADING" });

        const { Sam2Model, AutoProcessor, env, Tensor, RawImage } =
          await import("@huggingface/transformers");

        env.allowLocalModels = false;
        env.useBrowserCache = true;

        TensorCtor.current = Tensor as unknown as TensorConstructor;
        RawImageCtor.current = RawImage as unknown as RawImageStatic;

        const [model, processor] = await Promise.all([
          Sam2Model.from_pretrained(MODEL_ID, {
            dtype: "uint8",
            device: "wasm",
            progress_callback: (p: ProgressInfo) => {
              if ("progress" in p && typeof p.progress === "number") {
                dispatch({
                  type: "MODEL_PROGRESS",
                  progress: Math.round(p.progress),
                });
              }
            },
          }),
          AutoProcessor.from_pretrained(MODEL_ID),
        ]);

        modelRef.current = model as unknown as Sam2ModelLike;
        processorRef.current = processor as unknown as ProcessorLike;
        dispatch({ type: "MODEL_READY" });
      } catch (err) {
        dispatch({
          type: "MODEL_ERROR",
          error: err instanceof Error ? err.message : "Failed to load model",
        });
        console.error("SAM model init error:", err);
      } finally {
        initPromise.current = null;
      }
    })();

    return initPromise.current;
  }, [dispatch]);

  useEffect(() => {
    const t = setTimeout(() => {
      initModel();
    }, 500);
    return () => clearTimeout(t);
  }, [initModel]);

  // ── Encode image ─────────────────────────────────────────────────

  const encodeImage = useCallback(
    async (imageUrl: string) => {
      const model = modelRef.current;
      const processor = processorRef.current;
      const RawImage = RawImageCtor.current;

      if (!model || !processor || !RawImage) {
        await initModel();
        if (!modelRef.current || !processorRef.current || !RawImageCtor.current) {
          throw new Error("Model not available");
        }
        return encodeImage(imageUrl);
      }

      dispatch({ type: "ENCODE_START" });

      const image = await RawImage.fromURL(imageUrl);
      const processed = await processor(image);

      const reshaped = processed.reshaped_input_sizes[0];
      const original = processed.original_sizes[0];
      reshapedSizesRef.current = [reshaped[0], reshaped[1]] as const;
      originalSizesRef.current = [original[0], original[1]] as const;

      const embeddings = await model.get_image_embeddings(
        processed as unknown as Record<string, unknown>,
      );
      embeddingsRef.current = embeddings;
    },
    [dispatch, initModel],
  );

  // ── Decode points ────────────────────────────────────────────────

  const decodePoints = useCallback(
    async (points: SegmentPoint[]): Promise<DecodeResult> => {
      const model = modelRef.current;
      const processor = processorRef.current;
      const Tensor = TensorCtor.current;
      const embeddings = embeddingsRef.current;
      const reshapedSizes = reshapedSizesRef.current;
      const originalSizes = originalSizesRef.current;

      if (!model || !processor || !Tensor || !embeddings || !reshapedSizes || !originalSizes) {
        throw new Error("Model or embeddings not ready");
      }

      if (points.length === 0) {
        throw new Error("No points to decode");
      }

      const N = points.length;

      const coords = new Float32Array(N * 2);
      const labels = new BigInt64Array(N);
      for (let i = 0; i < N; i++) {
        coords[i * 2 + 0] = points[i].x * reshapedSizes[1];
        coords[i * 2 + 1] = points[i].y * reshapedSizes[0];
      }
      for (let i = 0; i < N; i++) {
        labels[i] = BigInt(points[i].label);
      }

      const input_points = new Tensor("float32", coords, [1, 1, N, 2]);
      const input_labels = new Tensor("int64", labels, [1, 1, N]);

      const output = await model({
        ...embeddings,
        input_points,
        input_labels,
      });

      const masks = await processor.post_process_masks(
        output.pred_masks,
        [[originalSizes[0], originalSizes[1]]],
        [[reshapedSizes[0], reshapedSizes[1]]],
      );

      const maskTensor = masks[0] ?? masks;
      const dims = maskTensor.dims;
      const data = maskTensor.data;

      const H = dims[dims.length - 2];
      const W = dims[dims.length - 1];
      const stride = H * W;
      const numMasks = dims.length >= 3 ? dims[dims.length - 3] : 1;

      const totalExpected = numMasks * stride;
      const dataOffset = data.length - totalExpected;

      const iouData = output.iou_scores.data;
      const iouOffset = iouData.length - numMasks;

      const allMasks: Float32Array[] = [];
      const candidates: MaskCandidate[] = [];

      for (let i = 0; i < Math.min(numMasks, 3); i++) {
        const start = dataOffset + i * stride;
        const mask = new Float32Array(stride);
        for (let j = 0; j < stride; j++) {
          mask[j] = Number(data[start + j]);
        }
        allMasks.push(mask);
        candidates.push({
          index: i as 0 | 1 | 2,
          iouScore: Number(iouData[iouOffset + i]),
        });
      }

      return { masks: allMasks, candidates, dims: { w: W, h: H } };
    },
    [],
  );

  // ── Clear cache ──────────────────────────────────────────────────

  const clearCache = useCallback(async () => {
    try {
      const databases = await indexedDB.databases();
      for (const db of databases) {
        if (
          db.name &&
          (db.name.includes("transformers") || db.name.includes("onnx"))
        ) {
          indexedDB.deleteDatabase(db.name);
        }
      }

      if ("caches" in window) {
        const cacheNames = await caches.keys();
        for (const name of cacheNames) {
          if (
            name.includes("transformers") ||
            name.includes("huggingface")
          ) {
            await caches.delete(name);
          }
        }
      }

      modelRef.current = null;
      processorRef.current = null;
      embeddingsRef.current = null;
      reshapedSizesRef.current = null;
      originalSizesRef.current = null;
    } catch (err) {
      console.error("Error clearing SAM cache:", err);
    }
  }, []);

  return { encodeImage, decodePoints, clearCache };
}
