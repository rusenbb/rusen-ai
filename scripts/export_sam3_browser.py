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
import importlib.machinery
import os
import pathlib
import sys
import types
from unittest.mock import MagicMock

import onnx
import torch
from torchvision.transforms import v2
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
    for name in (
        "triton",
        "triton.language",
        "triton.backends",
        "triton.backends.compiler",
        "triton.compiler",
        "triton.compiler.compiler",
    ):
        module = sys.modules[name]
        if getattr(module, "__spec__", None) is None:
            module.__spec__ = importlib.machinery.ModuleSpec(name, loader=None)
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

    # The local SAM3 import path decorates some video helpers with CUDA autocast
    # even though this export runs on CPU. Short-circuit the CUDA capability
    # probes so importing those modules does not trigger lazy CUDA init.
    torch.cuda.is_available = lambda: False  # type: ignore[assignment]
    torch.cuda.is_bf16_supported = lambda *args, **kwargs: False  # type: ignore[assignment]


def build_sam3_model(image_size: int, checkpoint_path: str | None = None):
    import sam3.model_builder as mb
    import sam3.model.vitdet as vitdet
    from sam3.model.position_encoding import PositionEmbeddingSine

    patch_vitdet_rope_for_export(vitdet)

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
    load_checkpoint_for_custom_image_size(model, checkpoint_path)
    return mb._setup_device_and_mode(model, "cpu", True)


def complex_mult(
    xq_real: torch.Tensor,
    xq_imag: torch.Tensor,
    freqs_cis_real: torch.Tensor,
    freqs_cis_imag: torch.Tensor,
) -> torch.Tensor:
    real_part = xq_real * freqs_cis_real - xq_imag * freqs_cis_imag
    imag_part = xq_real * freqs_cis_imag + xq_imag * freqs_cis_real
    return torch.stack([real_part, imag_part], dim=-1)


def apply_rotary_enc_real(
    vitdet_module,
    xq: torch.Tensor,
    xk: torch.Tensor,
    freqs_cis_real: torch.Tensor,
    freqs_cis_imag: torch.Tensor,
    repeat_freqs_k: bool = False,
) -> tuple[torch.Tensor, torch.Tensor]:
    xq_real = xq.float().reshape(*xq.shape[:-1], -1, 2)[..., 0]
    xq_imag = xq.float().reshape(*xq.shape[:-1], -1, 2)[..., 1]
    xk_real = xk.float().reshape(*xk.shape[:-1], -1, 2)[..., 0]
    xk_imag = xk.float().reshape(*xk.shape[:-1], -1, 2)[..., 1]
    freqs_cis_real = vitdet_module.reshape_for_broadcast(freqs_cis_real, xq_real)
    freqs_cis_imag = vitdet_module.reshape_for_broadcast(freqs_cis_imag, xq_imag)
    xq_out = complex_mult(xq_real, xq_imag, freqs_cis_real, freqs_cis_imag).flatten(3)

    if repeat_freqs_k:
        repeat_factor = xk_real.shape[-2] // xq_real.shape[-2]
        freqs_cis_real = freqs_cis_real.repeat(
            *([1] * (freqs_cis_real.ndim - 2)),
            repeat_factor,
            1,
        )
        freqs_cis_imag = freqs_cis_imag.repeat(
            *([1] * (freqs_cis_imag.ndim - 2)),
            repeat_factor,
            1,
        )

    xk_out = complex_mult(xk_real, xk_imag, freqs_cis_real, freqs_cis_imag).flatten(3)
    return xq_out.type_as(xq).to(xq.device), xk_out.type_as(xk).to(xk.device)


def patch_vitdet_rope_for_export(vitdet_module) -> None:
    """Teach the local SAM3 attention blocks to use split RoPE buffers."""

    if getattr(vitdet_module.Attention._apply_rope, "__name__", "") == "_apply_rope_export":
        return

    def _apply_rope_export(self, q, k):
        if not self.use_rope:
            return q, k

        if hasattr(self, "freqs_cos") and hasattr(self, "freqs_sin"):
            return apply_rotary_enc_real(
                vitdet_module,
                q,
                k,
                self.freqs_cos,
                self.freqs_sin,
            )

        assert self.freqs_cis is not None
        return vitdet_module.apply_rotary_enc(q, k, freqs_cis=self.freqs_cis)

    vitdet_module.Attention._apply_rope = _apply_rope_export


def patch_geometry_encoder_export(geometry_module) -> None:
    """Avoid slice-assignment patterns that crash the legacy ONNX exporter."""

    if getattr(geometry_module.concat_padded_sequences, "__name__", "") == "concat_padded_sequences_export":
        return

    def concat_padded_sequences_export(seq1, mask1, seq2, mask2, return_index: bool = False):
        seq1_length, batch_size, hidden_size = seq1.shape
        seq2_length, _, _ = seq2.shape

        geometry_module.torch._assert_async(geometry_module.is_right_padded(mask1))
        geometry_module.torch._assert_async(geometry_module.is_right_padded(mask2))

        actual_seq1_lengths = (~mask1).sum(dim=-1)
        actual_seq2_lengths = (~mask2).sum(dim=-1)
        final_lengths = actual_seq1_lengths + actual_seq2_lengths
        max_length = seq1_length + seq2_length
        concatenated_mask = (
            geometry_module.torch.arange(max_length, device=seq2.device)[None].repeat(batch_size, 1)
            >= final_lengths[:, None]
        )

        concatenated_sequence = geometry_module.torch.zeros(
            (max_length, batch_size, hidden_size),
            device=seq2.device,
            dtype=seq2.dtype,
        )
        seq1_index = geometry_module.torch.arange(seq1_length, device=seq2.device)[:, None].repeat(1, batch_size)
        concatenated_sequence = concatenated_sequence.scatter(
            0,
            seq1_index[:, :, None].expand(-1, -1, hidden_size),
            seq1,
        )

        seq2_index = geometry_module.torch.arange(seq2_length, device=seq2.device)[:, None].repeat(1, batch_size)
        seq2_index = seq2_index + actual_seq1_lengths[None]
        concatenated_sequence = concatenated_sequence.scatter(
            0,
            seq2_index[:, :, None].expand(-1, -1, hidden_size),
            seq2,
        )

        if return_index:
            return concatenated_sequence, concatenated_mask, seq2_index

        return concatenated_sequence, concatenated_mask

    geometry_module.concat_padded_sequences = concat_padded_sequences_export


def load_checkpoint_for_custom_image_size(
    model: torch.nn.Module,
    checkpoint_path: str,
) -> None:
    """Load a SAM3 checkpoint while skipping resolution-specific tensors.

    The upstream checkpoint includes precomputed RoPE buffers whose shapes are
    tied to the default 1008px export. For custom image sizes we let the model
    regenerate those buffers at runtime instead of forcing a mismatched load.
    """

    checkpoint = torch.load(checkpoint_path, map_location="cpu", weights_only=True)
    if "model" in checkpoint and isinstance(checkpoint["model"], dict):
        checkpoint = checkpoint["model"]

    filtered = {
        key.replace("detector.", ""): value
        for key, value in checkpoint.items()
        if "detector" in key
    }

    if getattr(model, "inst_interactive_predictor", None) is not None:
        filtered.update(
            {
                key.replace("tracker.", "inst_interactive_predictor.model."): value
                for key, value in checkpoint.items()
                if "tracker" in key
            }
        )

    model_state = model.state_dict()
    skipped: list[str] = []
    loadable: dict[str, torch.Tensor] = {}

    for key, value in filtered.items():
        target = model_state.get(key)
        if target is None or target.shape != value.shape:
            skipped.append(key)
            continue
        loadable[key] = value

    missing_keys, unexpected_keys = model.load_state_dict(loadable, strict=False)

    if skipped or missing_keys or unexpected_keys:
        print(
            "Checkpoint load summary:",
            f"skipped={len(skipped)}",
            f"missing={len(missing_keys)}",
            f"unexpected={len(unexpected_keys)}",
        )


class BrowserSAM3ImageEncoder(torch.nn.Module):
    """Register SAM3 as a submodule so ONNX keeps weights as initializers."""

    def __init__(self, processor) -> None:
        super().__init__()
        self.model = processor.model
        self._transform = v2.Compose(
            [
                v2.ToDtype(torch.float32, scale=True),
                v2.Normalize(mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5]),
            ]
        )

    def forward(self, image: torch.Tensor) -> tuple[torch.Tensor, ...]:
        image = self._transform(image).unsqueeze(0)
        backbone_out = self.model.backbone._forward_image_no_act_ckpt(image)
        backbone_out.pop("vision_features", None)
        backbone_out.pop("sam2_backbone_out", None)
        return *backbone_out["vision_pos_enc"], *backbone_out["backbone_fpn"]


class BrowserSAM3LanguageEncoder(torch.nn.Module):
    def __init__(self, processor) -> None:
        super().__init__()
        self.model = processor.model

    def forward(
        self, tokens: torch.Tensor
    ) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        text_attention_mask = (tokens != 0).bool()
        inputs_embeds = self.model.backbone.language_backbone.encoder.token_embedding(
            tokens
        )
        _, text_memory = self.model.backbone.language_backbone.encoder(tokens)
        text_attention_mask = text_attention_mask.ne(1)
        text_memory = text_memory.transpose(0, 1)
        text_memory_resized = self.model.backbone.language_backbone.resizer(text_memory)
        return text_attention_mask, text_memory_resized, inputs_embeds.transpose(0, 1)


class BrowserSAM3Decoder(torch.nn.Module):
    def __init__(self, processor) -> None:
        super().__init__()
        self.model = processor.model
        self.processor = processor

    def forward(
        self,
        original_height: torch.Tensor,
        original_width: torch.Tensor,
        vision_pos_enc_0: torch.Tensor,
        vision_pos_enc_1: torch.Tensor,
        vision_pos_enc_2: torch.Tensor,
        backbone_fpn_0: torch.Tensor,
        backbone_fpn_1: torch.Tensor,
        backbone_fpn_2: torch.Tensor,
        language_mask: torch.Tensor,
        language_features: torch.Tensor,
        language_embeds: torch.Tensor,
        box_coords: torch.Tensor,
        box_labels: torch.Tensor,
        box_masks: torch.Tensor,
    ) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        geometric_prompt = self.model._get_dummy_prompt()
        geometric_prompt.box_embeddings = box_coords
        geometric_prompt.box_labels = box_labels
        geometric_prompt.box_mask = box_masks
        state = {
            "original_height": original_height,
            "original_width": original_width,
            "backbone_out": {
                "vision_pos_enc": [
                    vision_pos_enc_0,
                    vision_pos_enc_1,
                    vision_pos_enc_2,
                ],
                "backbone_fpn": [
                    backbone_fpn_0,
                    backbone_fpn_1,
                    backbone_fpn_2,
                ],
                "language_mask": language_mask,
                "language_features": language_features,
                "language_embeds": language_embeds,
            },
            "geometric_prompt": geometric_prompt,
        }
        result = self.processor._forward_grounding(state)
        return result["boxes"], result["scores"], result["masks"]


def export_sam3(
    image_size: int,
    output_dir: pathlib.Path,
    opset: int,
    simplify_model: bool,
    checkpoint_path: str | None = None,
) -> None:
    import sam3.model.geometry_encoders as geometry_encoders
    from samexporter.export_sam3 import Sam3Processor, get_replace_freqs_cis

    output_dir.mkdir(parents=True, exist_ok=True)
    patch_geometry_encoder_export(geometry_encoders)

    model = build_sam3_model(image_size=image_size, checkpoint_path=checkpoint_path)
    model.eval()
    get_replace_freqs_cis(model)
    processor = Sam3Processor(model, resolution=image_size, device="cpu")

    print(f"Exporting image encoder at {image_size}px...", flush=True)
    image_encoder = BrowserSAM3ImageEncoder(processor)
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
    print(f"Saved {encoder_path}", flush=True)

    print("Exporting language encoder...", flush=True)
    language_encoder = BrowserSAM3LanguageEncoder(processor)
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
    print(f"Saved {language_path}", flush=True)

    print("Running dummy encoder/language pass for decoder export...", flush=True)
    with torch.no_grad():
        vpe0, vpe1, vpe2, fpn0, fpn1, fpn2 = image_encoder(dummy_image)
        l_mask, l_feat, l_embed = language_encoder(dummy_tokens)

    print("Exporting decoder...", flush=True)
    decoder = BrowserSAM3Decoder(processor)
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
    print(f"Saved {decoder_path}", flush=True)

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
