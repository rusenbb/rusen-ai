# Activation steering lab

The lab offers two evaluated thematic recipes: **Food & cooking after block 20**
and **Magic & fantasy after block 25**, both at strength 1. Each passed four of
five held-out openings on native CPU and four of five on browser WASM under a
qualitative admission rule. The rule requires a recognizable theme, an
interpretable continuation and a connection to the supplied opening. This is a
small development-agent review, not a blinded human benchmark or a claim about
all inputs. Awkward grammar, poetic drift and model-name intrusions remain.

The other four candidates in the final admission study were rejected. Earlier
searches also explored different examples, pooling rules, layers, strengths,
injection scopes and models. `public/steering/search-history.json` preserves
1,148 development outputs, including failures. The separate final study,
reviews, exact pairs, native vectors, browser vectors, controls and zero checks
are in `public/steering/direction-evaluation.json`. Do not select recipes merely
because a keyword appears or next-token probabilities change.

## Input and intervention

All three conditions receive the shared instruction:

> Continue the story from the assistant opening, in English. Write only the continuation.

The user's opening follows the assistant header as unfinished assistant text.
The original and activation conditions receive the same opening and instruction.
The prompt condition additionally receives the visible theme instruction as a
system message. Outputs display the common opening followed by the actual
continuation. This is an English-fiction continuation experiment; the admission
results do not establish general chat, factual-answer or cross-language control.

The pinned q8 SmolLM2-360M-Instruct has 32 transformer blocks and a 960-dimensional
residual stream. For each of 1–8 matched contrasts, the unmodified model supplies
the last token's residual. The vector is the raw mean of target-minus-contrast
differences. The recipe is remeasured on the actual inference backend at run time,
using the same implementation as custom pairs. No native vector is silently
substituted for a browser vector.

The ONNX export fuses the residual merge and RMSNorm. We add delta to the previous
MLP branch immediately before the merge, so both the normalized path and residual
bypass receive r + m + delta. The fused operator remains intact; delta = 0
preserves its numerical behavior. A separate capture reports r + m before the
intervention. Neither vocabulary logits nor model weights are edited.

The prompt/prefill pass receives zero delta. Only generated-token activations
receive strength × direction. Thus original and steered share their first token;
the first edited state affects the second prediction. The measured residuals and
distributions use that shared context. If generation ends earlier, the measurement
is before an edit could occur. A comparison is rejected if the contexts differ
before the intervention. Each condition has its own KV cache and seeded sampler.

Default evaluation decoding uses temperature 0.7, seed 42, top-40 sampling and a
64-token budget. Temperature 0 enables greedy decoding. The distribution display
uses softmax at temperature 1 before sampling. Distribution distance and repeated
trigrams are diagnostics, not semantic scores. Intermediate strengths, other
seeds/temperatures, longer outputs and reversed directions are exploratory.

## Verification and reproduction

Model: `HuggingFaceTB/SmolLM2-360M-Instruct`
Revision: `a10cc1512eabd3dde888204e902eca88bddb4951`
File: `onnx/model_quantized.onnx` (364,564,671 bytes)
SHA-256: `57987a3a24dc34ad2cb5e7e566840ccaece095e35a24ae4fc5b3086c7ddd6918`

Download the pinned `config.json`, `tokenizer.json`, `tokenizer_config.json` and
`onnx/model_quantized.onnx` into `output/steering-360m` using Hugging Face Hub.
With the repository's pinned Node/npm environment and installed dependencies:

```sh
npm exec -- tsx scripts/verify-activation-steering.ts output/steering-360m
npm exec -- tsx scripts/evaluate-steering.ts output/steering-360m public/steering/direction-evaluation.json output/replay.json
```

The first script verifies the model fingerprint and compares all 49,152 initial
logits with the unmodified export at all five available custom intervention
locations. The ONNX unit fixture checks both edited paths and exact zero control.
The replay script performs the recorded CPU study, including rejected recipes,
with original, prompt-only, equal-norm seeded random-vector and steered conditions.
It refuses to overwrite existing evidence. JSONL preserves progress before the
complete JSON report is written.

The recorded browser study measures its own contrast vectors. It includes five
shared original continuations, all 30 steered continuations, and six separate
zero-control checks. Every zero check matched the complete original token
sequence. Maximum recorded residual-addition error was 0.0000306 on native CPU
and 0.0000268 in WASM. These describe the archived study, not every possible input.

The model is downloaded on demand, fingerprint-checked and cached. Inference
stays in a worker. A desktop browser with free memory is recommended for the
365 MB model. Browser and native outputs can differ; compare conditions within
a backend. Exported live runs include the exact settings, shared instruction,
measured direction, residuals, sampled token IDs and comparison logits.

Sources: [ActAdd](https://arxiv.org/abs/2308.10248),
[CAA](https://aclanthology.org/2024.acl-long.828/).
Norm preservation was explored but was not part of the admitted recipes;
see [the geometric analysis](https://arxiv.org/abs/2606.06735) for why direction
and activation magnitude need separate consideration.
