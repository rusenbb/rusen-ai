import { onnx } from "onnx-proto";
import { LAYERS, MODEL_SHAPE } from "./presets";
export const HIDDEN_SIZE = MODEL_SHAPE.hidden;

/** Add delta to the residual stream after `layer` complete transformer blocks.
 * The pinned export fuses the residual merge with the next block's RMSNorm.
 * Add delta on the MLP branch immediately before that merge: r + (m + delta).
 * Keep the original fused operator so delta=0 preserves its numerical behavior.
 * Both normalized attention input and residual bypass receive the edited sum.
 */
export function instrumentModel(bytes: Uint8Array, layer: number): Uint8Array {
  if (!(LAYERS as readonly number[]).includes(layer))
    throw new Error("Unsupported intervention layer.");
  const model = onnx.ModelProto.decode(bytes);
  const graph = model.graph;
  if (!graph?.node || !graph.input || !graph.output)
    throw new Error("Missing model graph.");
  const index = graph.node.findIndex(
    (node) =>
      node.name === `/model/layers.${layer}/input_layernorm/SkipLayerNorm`,
  );
  const original = graph.node[index];
  if (
    !original ||
    original.opType !== "SkipSimplifiedLayerNormalization" ||
    original.input?.length !== 3 ||
    !original.output?.[3]
  )
    throw new Error(
      "The model revision does not match the residual-stream instrumentation.",
    );
  const raw = "steering_residual_before";
  const branch = "steering_residual_branch";
  const inputs = [...original.input];
  original.input[1] = branch;
  graph.node.splice(
    index,
    0,
    onnx.NodeProto.create({
      name: "steering_capture",
      opType: "Add",
      input: inputs.slice(0, 2),
      output: [raw],
    }),
    onnx.NodeProto.create({
      name: "steering_addition",
      opType: "Add",
      input: [inputs[1], "steering_delta"],
      output: [branch],
    }),
  );
  const tensor = (name: string, sequence: string | number) =>
    onnx.ValueInfoProto.create({
      name,
      type: {
        tensorType: {
          elemType: 1,
          shape: {
            dim: [
              { dimValue: 1 },
              typeof sequence === "string"
                ? { dimParam: sequence }
                : { dimValue: sequence },
              { dimValue: HIDDEN_SIZE },
            ],
          },
        },
      },
    });
  graph.input.push(tensor("steering_delta", 1));
  graph.output.push(
    tensor(raw, "sequence_length"),
    tensor(original.output[3], "sequence_length"),
  );
  return onnx.ModelProto.encode(model).finish();
}
