// @vitest-environment node
import { expect, it } from "vitest";
import { onnx } from "onnx-proto";
import { InferenceSession, Tensor } from "onnxruntime-node";
import { HIDDEN_SIZE, instrumentModel } from "./graph";

it("adds the intervention to both residual and normalized paths and preserves zero control", async () => {
  const info = (name: string) => ({
    name,
    type: {
      tensorType: {
        elemType: 1,
        shape: {
          dim: [{ dimValue: 1 }, { dimValue: 2 }, { dimValue: HIDDEN_SIZE }],
        },
      },
    },
  });
  const residual = "/model/layers.15/input_layernorm/output_3";
  const source = onnx.ModelProto.encode(
    onnx.ModelProto.create({
      irVersion: 7,
      opsetImport: [
        { domain: "", version: 17 },
        { domain: "com.microsoft", version: 1 },
      ],
      graph: {
        name: "residual_fixture",
        input: [info("r"), info("m")],
        output: [info("normalized"), info(residual)],
        initializer: [
          {
            name: "weight",
            dataType: 1,
            dims: [HIDDEN_SIZE],
            floatData: Array(HIDDEN_SIZE).fill(1),
          },
        ],
        node: [
          {
            name: "/model/layers.15/input_layernorm/SkipLayerNorm",
            domain: "com.microsoft",
            opType: "SkipSimplifiedLayerNormalization",
            input: ["r", "m", "weight"],
            output: ["normalized", "", "", residual],
            attribute: [{ name: "epsilon", type: 1, f: 1e-5 }],
          },
        ],
      },
    }),
  ).finish();
  const original = await InferenceSession.create(source);
  const modified = await InferenceSession.create(instrumentModel(source, 15));
  const r = Float32Array.from(
    { length: 2 * HIDDEN_SIZE },
    (_, i) => ((i % 17) - 8) / 10,
  );
  const m = Float32Array.from(
    { length: 2 * HIDDEN_SIZE },
    (_, i) => ((i % 13) - 6) / 10,
  );
  const feeds = {
    r: new Tensor("float32", r, [1, 2, HIDDEN_SIZE]),
    m: new Tensor("float32", m, [1, 2, HIDDEN_SIZE]),
  };
  const baseline = await original.run(feeds);
  try {
    for (const strength of [0, 1, -1]) {
      const delta = Float32Array.from(
        { length: HIDDEN_SIZE },
        (_, i) => (strength * ((i % 7) - 3)) / 10,
      );
      const input = new Tensor("float32", delta, [1, 1, HIDDEN_SIZE]);
      const output = await modified.run({ ...feeds, steering_delta: input });
      try {
        const expected = Float32Array.from(
          r,
          (_, i) => r[i] + Math.fround(m[i] + delta[i % HIDDEN_SIZE]),
        );
        const actual = output[residual].data as Float32Array;
        for (let i = 0; i < expected.length; i++)
          expect(actual[i]).toBeCloseTo(expected[i], 5);
        if (strength === 0)
          expect(Array.from(output.normalized.data as Float32Array)).toEqual(
            Array.from(baseline.normalized.data as Float32Array),
          );
        for (let token = 0; token < 2; token++) {
          const slice = expected.slice(
            token * HIDDEN_SIZE,
            (token + 1) * HIDDEN_SIZE,
          );
          const rms = Math.sqrt(
            slice.reduce((s, x) => s + x * x, 0) / HIDDEN_SIZE + 1e-5,
          );
          for (let j = 0; j < HIDDEN_SIZE; j++)
            expect(
              Number(output.normalized.data[token * HIDDEN_SIZE + j]),
            ).toBeCloseTo(slice[j] / rms, 5);
        }
      } finally {
        input.dispose();
        Object.values(output).forEach((t) => t.dispose());
      }
    }
  } finally {
    Object.values(baseline).forEach((t) => t.dispose());
    Object.values(feeds).forEach((t) => t.dispose());
    await original.release();
    await modified.release();
  }
});
