#!/usr/bin/env python3
"""Quantize and patch custom SAM3 ONNX exports for browser WebGPU use."""

from __future__ import annotations

import argparse
import pathlib
import shutil
import tempfile

import onnx
from onnx import TensorProto, numpy_helper
from onnxruntime.quantization import QuantType, quantize_dynamic
from onnxruntime.transformers import float16

MODEL_NAMES = (
    "sam3_image_encoder",
    "sam3_language_encoder",
    "sam3_decoder",
)


def get_file_size_mb(path: pathlib.Path) -> float:
    total = path.stat().st_size
    data_path = path.with_suffix(path.suffix + ".data")
    if data_path.exists():
        total += data_path.stat().st_size
    return total / (1024 * 1024)


def clear_value_info(model: onnx.ModelProto) -> None:
    del model.graph.value_info[:]


def set_input_type(
    model: onnx.ModelProto, input_names: set[str], elem_type: int
) -> None:
    for inp in model.graph.input:
        if inp.name in input_names:
            inp.type.tensor_type.elem_type = elem_type


def cast_initializer_if_present(
    model: onnx.ModelProto, initializer_name: str, dtype: str, elem_type: int
) -> bool:
    for initializer in model.graph.initializer:
        if initializer.name != initializer_name:
            continue
        array = numpy_helper.to_array(initializer).astype(dtype)
        initializer.CopyFrom(numpy_helper.from_array(array, name=initializer.name))
        initializer.data_type = elem_type
        return True
    return False


def cast_constant_if_present(
    model: onnx.ModelProto, output_name: str, dtype: str, elem_type: int
) -> bool:
    for node in model.graph.node:
        if node.op_type != "Constant" or output_name not in node.output:
            continue
        for attr in node.attribute:
            if attr.name != "value" or not attr.HasField("t"):
                continue
            array = numpy_helper.to_array(attr.t).astype(dtype)
            attr.t.CopyFrom(numpy_helper.from_array(array))
            attr.t.data_type = elem_type
            return True
    return False


def patch_language_encoder_for_browser(model: onnx.ModelProto) -> str:
    set_input_type(model, {"tokens"}, TensorProto.INT32)

    if cast_initializer_if_present(model, "val_0", "int32", TensorProto.INT32):
        return "initializer:val_0"

    for node in model.graph.node:
        if node.op_type != "Equal" or "tokens" not in node.input:
            continue
        other = next(inp for inp in node.input if inp != "tokens")
        if cast_initializer_if_present(model, other, "int32", TensorProto.INT32):
            return f"initializer:{other}"
        if cast_constant_if_present(model, other, "int32", TensorProto.INT32):
            return f"constant:{other}"

    raise RuntimeError("Could not find the language token comparison constant")


def patch_decoder_for_browser(model: onnx.ModelProto) -> str:
    set_input_type(
        model,
        {"original_height", "original_width", "box_labels"},
        TensorProto.INT32,
    )
    return "inputs-only"


def quantize_model(model_path: pathlib.Path, output_path: pathlib.Path) -> None:
    quantize_dynamic(
        str(model_path),
        str(output_path),
        weight_type=QuantType.QUInt8,
    )


def build_fp16_image_encoder(
    source_path: pathlib.Path, output_path: pathlib.Path
) -> None:
    model = onnx.load(str(source_path), load_external_data=False)
    op_block_list = set(float16.DEFAULT_OP_BLOCK_LIST)
    op_block_list.add("DynamicQuantizeLinear")
    converted = float16.convert_float_to_float16(
        model,
        keep_io_types=True,
        disable_shape_infer=False,
        op_block_list=op_block_list,
    )
    onnx.save(converted, str(output_path))


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Prepare browser-friendly SAM3 WebGPU artifacts"
    )
    parser.add_argument(
        "--input-dir",
        type=pathlib.Path,
        required=True,
        help="Directory containing sam3_image_encoder.onnx, sam3_language_encoder.onnx, sam3_decoder.onnx",
    )
    parser.add_argument(
        "--output-dir",
        type=pathlib.Path,
        required=True,
        help="Directory for the INT8 + browser-patched models",
    )
    parser.add_argument(
        "--fp16-output-dir",
        type=pathlib.Path,
        default=None,
        help="Optional directory for the mixed-precision WebGPU variant",
    )
    args = parser.parse_args()

    input_dir = args.input_dir
    output_dir = args.output_dir
    fp16_output_dir = args.fp16_output_dir or output_dir.with_name(
        f"{output_dir.name}_fp16"
    )

    output_dir.mkdir(parents=True, exist_ok=True)
    fp16_output_dir.mkdir(parents=True, exist_ok=True)

    tmp_dir = pathlib.Path(tempfile.mkdtemp(prefix="sam3_webgpu_quant_"))
    try:
        print("=" * 60)
        print("Preparing SAM3 browser artifacts")
        print("=" * 60)

        for model_name in MODEL_NAMES:
            src = input_dir / f"{model_name}.onnx"
            tmp = tmp_dir / f"{model_name}.onnx"
            dst = output_dir / f"{model_name}.onnx"

            print(f"\n--- {model_name} ---")
            print(f"  Original: {get_file_size_mb(src):.1f} MB")
            print("  Quantizing to INT8...")
            quantize_model(src, tmp)

            model = onnx.load(str(tmp), load_external_data=False)
            patch_info = "none"
            if model_name == "sam3_language_encoder":
                patch_info = patch_language_encoder_for_browser(model)
            elif model_name == "sam3_decoder":
                patch_info = patch_decoder_for_browser(model)

            clear_value_info(model)
            onnx.save(model, str(dst))

            print(f"  Final: {get_file_size_mb(dst):.1f} MB")
            if patch_info != "none":
                print(f"  Browser patch: {patch_info}")

        print(f"\n{'-' * 60}")
        print("Building mixed-precision image encoder...")
        shutil.copy2(
            output_dir / "sam3_language_encoder.onnx",
            fp16_output_dir / "sam3_language_encoder.onnx",
        )
        shutil.copy2(
            output_dir / "sam3_decoder.onnx",
            fp16_output_dir / "sam3_decoder.onnx",
        )
        build_fp16_image_encoder(
            output_dir / "sam3_image_encoder.onnx",
            fp16_output_dir / "sam3_image_encoder_fp16.onnx",
        )
        print(
            f"  fp16 image encoder: {get_file_size_mb(fp16_output_dir / 'sam3_image_encoder_fp16.onnx'):.1f} MB"
        )

        print(f"\n{'=' * 60}")
        print("Summary")
        print(f"{'=' * 60}")
        for model_name in MODEL_NAMES:
            print(
                f"  {model_name}: {get_file_size_mb(output_dir / f'{model_name}.onnx'):.1f} MB"
            )
        print(
            f"  sam3_image_encoder_fp16: {get_file_size_mb(fp16_output_dir / 'sam3_image_encoder_fp16.onnx'):.1f} MB"
        )
        print(f"  INT8 output dir: {output_dir}")
        print(f"  fp16 output dir: {fp16_output_dir}")
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


if __name__ == "__main__":
    main()
