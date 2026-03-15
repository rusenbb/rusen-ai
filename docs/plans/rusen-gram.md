# RuseN-Gram And Rusenizer v2

## Goal

Build two connected projects:

- `RuseN-Gram`: a Turkish-first statistical language modeling playground with
  skip-gram-style features, base/assistant interpolation, and explicit feature
  traces
- `Rusenizer v2`: a retrained tokenizer with better corpus coverage and more
  rigorous evaluation than the current Wikipedia-only v1 story

## Current Branch Status

- external corpus builder now writes deterministic train/validation/test JSONL
  splits with source provenance
- browser artifact now uses a learned BPE tokenizer plus exported discounted
  n-gram models for base and assistant corpora
- Rusenizer v2 has a real shared foundation artifact and held-out metrics,
  surfaced on the site
- remaining limitation: the currently accessible assistant corpora still produce
  noisy response starts, so the branch is honest about the model being real but
  still weak in prompt-sensitive generation quality

## Product Thesis

The point is not to imitate a transformer with a weak baseline. The point is to
show how much assistant-like behavior can emerge from pure statistics when:

- the base language model is trained on broad Turkish text
- a second statistical model is trained on instruction/dialogue data
- the two are interpolated at inference time
- skip features are allowed to capture sparse context cues

## Implementation Stages

### Stage 0

Ship a browser-friendly MVP for the site.

- interactive `/rusen-gram` route
- statistical next-token explorer
- base vs assistant vs blend framing
- explicit contribution trace for the selected token

### Stage 1

Establish the offline data pipeline.

- corpus ingestion for Turkish general text
- corpus ingestion for Turkish/multilingual assistant-style data
- normalization and deduplication
- held-out evaluation splits

### Stage 2

Train Rusenizer v2.

- compare BPE vs Unigram/SentencePiece candidates
- evaluate by domain:
  - formal prose
  - colloquial Turkish
  - mixed Turkish-English
  - code/comments
  - instruction/dialogue

### Stage 3

Train statistical language models.

- contiguous Modified Kneser-Ney baseline
- skip-gram feature model for the base corpus
- skip-gram feature model for the assistant corpus
- interpolation experiments

### Stage 4

Export browser artifacts.

- compact tokenizer assets
- compact LM tables / sparse feature weights
- Web Worker inference path
- explanation-friendly feature trace format

### Stage 5

Upgrade the site UX.

- RuseN-Gram:
  - autocomplete
  - counterfactual token removal
  - feature toggles
  - assistant blend presets
- Rusenizer:
  - v1 vs v2 comparison
  - corpus provenance
  - benchmark dashboard

## Data Plan

### Base Turkish corpus

Target sources:

- Turkish Wikipedia
- cleaned Turkish web text
- deduplicated Turkish crawl data
- optional code/comments slice

### Assistant corpus

Target sources:

- OpenAssistant rows with Turkish content
- multilingual instruction corpora with Turkish prompts/responses where available
- translated/synthetic instruction data only if quality checks pass

## Evaluation Plan

### RuseN-Gram

- held-out perplexity on general Turkish
- held-out perplexity on assistant-style Turkish
- top-k next-token accuracy
- artifact size
- browser inference latency
- qualitative prompt suite for assistant behavior

### Rusenizer v2

- token count vs v1
- token count vs cl100k_base
- bytes per token
- morphology stress cases
- mixed-domain robustness

## Design Constraints

- static-export friendly
- browser-first experience
- honest communication about what is real vs illustrative
- Turkish-first product quality, not English-first with Turkish examples pasted on
