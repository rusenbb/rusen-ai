# Activation steering lab

The lab runs the pinned q8 SmolLM2-135M-Instruct ONNX model in a browser worker.
It instruments an actual intermediate residual stream; neither model weights nor
vocabulary logits are edited. Each selected location is after 5, 10, 15, 20 or
25 complete transformer blocks, before the next block's normalization.

The upstream ONNX export fuses a residual merge and RMSNorm. A delta is added to
the previous block's MLP branch immediately before this merge, so both the
normalized path and residual bypass receive r + m + delta. Keeping the fused
operator preserves the original model's numerical behavior at delta = 0.
The added capture output reports r + m before the intervention.

For each of 1–8 paired contrast texts, capture the final token's 576-value
residual. Average positive-minus-negative differences; do not normalize the
result. Strength 1 adds one mean difference. The delta is broadcast over all
prompt positions and all subsequent generated tokens. Each condition owns its
KV cache and seeded sampler. Prompt control adds the displayed instruction;
activation control uses exactly the original user prompt.

Temperature 0 uses greedy decoding; other settings use seeded top-40 sampling.
The distribution display and total variation use raw softmax at temperature 1,
before sampling, to make the first shared context comparable. Neither total
variation nor repeated token trigrams is a semantic quality score.

## Reproduction

Model: `HuggingFaceTB/SmolLM2-135M-Instruct`
Revision: `12fd25f77366fa6b3b4b768ec3050bf629380bac`
File: `onnx/model_quantized.onnx` (137,147,981 bytes)
SHA-256: `ecc1a19eece6494e2963cf74f78ace35916e8d0b803168ddd41db00979f18e39`

Use the existing uv environment to download that revision's `config.json`,
`tokenizer.json`, `tokenizer_config.json` and `onnx/model_quantized.onnx`:

```sh
uv run hf download HuggingFaceTB/SmolLM2-135M-Instruct config.json tokenizer.json tokenizer_config.json onnx/model_quantized.onnx --revision 12fd25f77366fa6b3b4b768ec3050bf629380bac --local-dir output/activation-model
npx tsx scripts/verify-activation-steering.ts output/activation-model
```

The verification checks the model fingerprint and compares all 49,152 first-step
logits against the unmodified export at all five intervention locations. The
unit test runs a real ONNX residual fixture and verifies both edited paths.
Browser runs can be exported with their input examples, model revision,
settings, extracted direction, residuals, logits and generated token IDs.

## Exploratory evidence and limits

`public/steering/evaluation.json` records 12 layer/strength conditions and nine
new prompt/preset combinations, each with original, prompt-only and steered
outputs. The initial development pass also inspected the three preset prompts.
An earlier unfused-normalization implementation was rejected because rounding
changes could alter greedy outputs; it is not the shipped implementation.

Native zero-control first-step logits match the unmodified graph exactly at all
five exposed locations. Browser WASM zero control also produces identical text
and zero distribution distance. At strength 1 the measured browser residual
addition error was at most 0.0000024 in the checked run.

Nature and storytelling produce visible topic/style changes; they can also
ignore the original task (for example, replacing weekend suggestions with a
poem). Optimism is subtler and inconsistent. Reversing a direction does not
guarantee fluent opposite behavior. Large interventions can repeat or produce
nonsense. The model's English writing quality is limited and output budgets can
truncate responses. CPU and WASM outputs can differ; comparisons are within a
single backend. These are transparent illustrations, not a benchmark victory or
validated universal concept directions.

Sources: [ActAdd](https://arxiv.org/abs/2308.10248),
[CAA](https://arxiv.org/abs/2312.06681),
[Eiffel Tower Llama](https://dlouapre-eiffel-tower-llama.hf.space/).
