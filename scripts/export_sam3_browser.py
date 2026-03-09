#!/usr/bin/env python3
"""Export a browser-oriented SAM3 ONNX set at a custom square resolution.

This wraps the installed `samexporter` package, but replaces SAM3's baked-in
1008px builder assumptions with a caller-provided `image_size`.

Use the validation venv to run it, for example:

  /home/rusen/Desktop/codebase-shared/rusen/sam3-browser-validation/.venv/bin/python \
    scripts/export_sam3_browser.py --image-size 720 --output-dir /tmp/sam3_720
"""

from __future__ import annotations

import argparse
import os
import pathlib
import sys
import types
from unittest.mock import MagicMock

import onnx
import torch
DEFAULT_SAM3_REPO = pathlib.Path(
    "/home/rusen/Desktop/codebase-shared/rusen/sam3-browser-validation/sam3"
)


def ensure_import_environment(sam3_repo: pathlib.Path) -> None:
    """Make local SAM3 + samexporter imports work in the validation environment."""
    if str(sam3_repo) not in sys.path:
        sys.path.insert(0, str(sam3_repo))

    # samexporter already mocks triton on import. We patch the additional pieces
    # needed by the local SAM3 checkout in this environment.
    sys.modules.setdefault("psutil", MagicMock())

    triton_module = sys.modules.setdefault("triton", types.ModuleType("triton"))
    triton_language = sys.modules.setdefault("triton.language", MagicMock())
    sys.modules.setdefault("triton.backends", types.ModuleType("triton.backends"))
    sys.modules.setdefault("triton.backends.compiler", MagicMock())
    sys.modules.setdefault("triton.compiler", types.ModuleType("triton.compiler"))
    sys.modules.setdefault("triton.compiler.compiler", MagicMock())
    setattr(triton_module, "language", triton_language)
    setattr(triton_module, "backends", sys.modules["triton.backends"])
    setattr(triton_module, "compiler", sys.modules["triton.compiler"])
    setattr(triton_module, "jit", lambda fn=None, **_: fn if fn is not None else (lambda f: f))
    setattr(
        triton_module,
        "autotune",
        lambda *_, **__: (lambda fn: fn),
    )
    setattr(triton_module, "Config", lambda *_, **__: object())
    setattr(
        triton_module,
        "cdiv",
        lambda x, y: (x + y - 1) // y,
    )
    setattr(triton_language, "constexpr", int)
    setattr(
        sys.modules["triton.backends"],
        "compiler",
        sys.modules["triton.backends.compiler"],
    )
    setattr(
        sys.modules["triton.compiler"],
        "compiler",
        sys.modules["triton.compiler.compiler"],
    )
    sys.modules.setdefault("torch._inductor.runtime.triton_helpers", MagicMock())

    if "pkg_resources" not in sys.modules:
        pkg = types.ModuleType("pkg_resources")

        def resource_filename(package: str, resource_name: str) -> str:
            import importlib

            module = importlib.import_module(package)
            base = os.path.dirname(module.__file__)
            return os.path.join(base, resource_name)

        pkg.resource_filename = resource_filename  # type: ignore[attr-defined]
        sys.modules["pkg_resources"] = pkg


def build_sam3_model(image_size: int, checkpoint_path: str | None = None):
    import sam3.model_builder as mb
    from sam3.model.position_encoding import PositionEmbeddingSine

    bpe_path = mb.pkg_resources.resource_filename(
        "sam3", "assets/bpe_simple_vocab_16e6.txt.gz"
    )
    compile_mode = None

    # The upstream helper hardcodes CUDA tensors when precomputing cache entries.
    # For CPU-side export we skip that precompute and let the model materialize
    # positional encodings lazily.
    position_encoding = PositionEmbeddingSine(
        num_pos_feats=256,
        normalize=True,
        scale=None,
        temperature=10000,
        precompute_resolution=None,
    )
    vit_backbone = mb.ViT(
        img_size=image_size,
        pretrain_img_size=336,
        patch_size=14,
        embed_dim=1024,
        depth=32,
        num_heads=16,
        mlp_ratio=4.625,
        norm_layer="LayerNorm",
        drop_path_rate=0.1,
        qkv_bias=True,
        use_abs_pos=True,
        tile_abs_pos=True,
        global_att_blocks=(7, 15, 23, 31),
        rel_pos_blocks=(),
        use_rope=True,
        use_interp_rope=True,
        window_size=24,
        pretrain_use_cls_token=True,
        retain_cls_token=False,
        ln_pre=True,
        ln_post=False,
        return_interm_layers=False,
        bias_patch_embed=False,
        compile_mode=compile_mode,
    )
    vision_encoder = mb.Sam3DualViTDetNeck(
        position_encoding=position_encoding,
        d_model=256,
        scale_factors=[4.0, 2.0, 1.0, 0.5],
        trunk=vit_backbone,
        add_sam2_neck=False,
    )

    text_encoder = mb._create_text_encoder(bpe_path)
    backbone = mb._create_vl_backbone(vision_encoder, text_encoder)

    encoder = mb._create_transformer_encoder()
    decoder = mb.TransformerDecoder(
        layer=mb.TransformerDecoderLayer(
            activation="relu",
            d_model=256,
            dim_feedforward=2048,
            dropout=0.1,
            cross_attention=mb.MultiheadAttention(
                num_heads=8,
                dropout=0.1,
                embed_dim=256,
            ),
            n_heads=8,
            use_text_cross_attention=True,
        ),
        num_layers=6,
        num_queries=200,
        return_intermediate=True,
        box_refine=True,
        num_o2m_queries=0,
        dac=True,
        boxRPB="log",
        d_model=256,
        frozen=False,
        interaction_layer=None,
        dac_use_selfatt_ln=True,
        resolution=None,
        stride=None,
        use_act_checkpoint=True,
        presence_token=True,
    )
    transformer = mb.TransformerWrapper(
        encoder=encoder,
        decoder=decoder,
        d_model=256,
    )

    model = mb._create_sam3_model(
        backbone=backbone,
        transformer=transformer,
        input_geometry_encoder=mb._create_geometry_encoder(),
        segmentation_head=mb._create_segmentation_head(compile_mode=compile_mode),
        dot_prod_scoring=mb._create_dot_product_scoring(),
        inst_interactive_predictor=None,
        eval_mode=True,
    )

    if checkpoint_path is None:
        checkpoint_path = mb.download_ckpt_from_hf()
    mb._load_checkpoint(model, checkpoint_path)
    return mb._setup_device_and_mode(model, "cpu", True)


def export_sam3(
    image_size: int,
    output_dir: pathlib.Path,
    opset: int,
    simplify_model: bool,
    checkpoint_path: str | None = None,
) -> None:
    from samexporter.export_sam3 import (
        SAM3Decoder,
        SAM3ImageEncoder,
        SAM3LanguageEncoder,
        Sam3Processor,
        get_replace_freqs_cis,
    )

    output_dir.mkdir(parents=True, exist_ok=True)

    model = build_sam3_model(image_size=image_size, checkpoint_path=checkpoint_path)
    get_replace_freqs_cis(model)
    processor = Sam3Processor(model)

    image_encoder = SAM3ImageEncoder(processor)
    dummy_image = torch.zeros(3, image_size, image_size, dtype=torch.uint8)

    encoder_path = output_dir / "sam3_image_encoder.onnx"
    torch.onnx.utils.export(
        image_encoder,
        args=(dummy_image,),
        f=str(encoder_path),
        export_params=True,
        input_names=["image"],
        output_names=[
            "vision_pos_enc_0",
            "vision_pos_enc_1",
            "vision_pos_enc_2",
            "backbone_fpn_0",
            "backbone_fpn_1",
            "backbone_fpn_2",
        ],
        opset_version=opset,
    )

    language_encoder = SAM3LanguageEncoder(processor)
    dummy_tokens = torch.zeros(1, 32, dtype=torch.long)
    language_path = output_dir / "sam3_language_encoder.onnx"
    torch.onnx.utils.export(
        language_encoder,
        args=(dummy_tokens,),
        f=str(language_path),
        export_params=True,
        input_names=["tokens"],
        output_names=["text_attention_mask", "text_memory", "text_embeds"],
        opset_version=opset,
    )

    with torch.no_grad():
        vpe0, vpe1, vpe2, fpn0, fpn1, fpn2 = image_encoder(dummy_image)
        l_mask, l_feat, l_embed = language_encoder(dummy_tokens)

    decoder = SAM3Decoder(model, processor)
    decoder_path = output_dir / "sam3_decoder.onnx"
    torch.onnx.utils.export(
        decoder,
        args=(
            torch.tensor(image_size),
            torch.tensor(image_size),
            vpe0,
            vpe1,
            vpe2,
            fpn0,
            fpn1,
            fpn2,
            l_mask,
            l_feat,
            l_embed,
            torch.zeros(1, 1, 4),
            torch.ones(1, 1, dtype=torch.long),
            torch.ones(1, 1, dtype=torch.bool),
        ),
        f=str(decoder_path),
        export_params=True,
        input_names=[
            "original_height",
            "original_width",
            "vision_pos_enc_0",
            "vision_pos_enc_1",
            "vision_pos_enc_2",
            "backbone_fpn_0",
            "backbone_fpn_1",
            "backbone_fpn_2",
            "language_mask",
            "language_features",
            "language_embeds",
            "box_coords",
            "box_labels",
            "box_masks",
        ],
        output_names=["boxes", "scores", "masks"],
        opset_version=opset,
    )

    if simplify_model:
        from onnxsim import simplify

        for path in (encoder_path, language_path, decoder_path):
            onnx_model = onnx.load(str(path))
            model_simp, check = simplify(onnx_model)
            if not check:
                raise RuntimeError(f"Failed to simplify {path}")
            onnx.save(model_simp, str(path))


def main() -> None:
    parser = argparse.ArgumentParser(description="Export browser SAM3 ONNX models")
    parser.add_argument("--image-size", type=int, required=True)
    parser.add_argument("--output-dir", type=pathlib.Path, required=True)
    parser.add_argument("--opset", type=int, default=18)
    parser.add_argument("--simplify", action="store_true")
    parser.add_argument("--checkpoint-path", type=str, default=None)
    parser.add_argument(
        "--sam3-repo",
        type=pathlib.Path,
        default=DEFAULT_SAM3_REPO,
        help="Path to the local SAM3 checkout used by the validation environment.",
    )
    args = parser.parse_args()

    ensure_import_environment(args.sam3_repo)
    export_sam3(
        image_size=args.image_size,
        output_dir=args.output_dir,
        opset=args.opset,
        simplify_model=args.simplify,
        checkpoint_path=args.checkpoint_path,
    )


if __name__ == "__main__":
    main()
