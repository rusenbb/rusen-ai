# Project improvements — September 2026

Authorized scope: all 42 recommendations for the first 20 registry projects;
Eduport, vaultdb and metuclass are excluded. Preserve the existing Cloudflare
Pages deployment. Feature branches are stacked; commits remain reviewable.

- [x] Classify Anything: absolute score bars; multi-label mode.
- [x] Segment Anything: latest-request ownership; visible inference/export errors.
- [x] Vision Anything: image-aligned masks; honest map names and scales.
- [x] Curve Fitter: held-out classification; editable regression noise/count.
- [x] Convolution Lab: fixed/raw scale; inspectable pooling window.
- [x] Sampling Lab: sample-only reconstruction; inspect individual samples.
- [x] Decision Boundary: reproducible noise; move/relabel/delete points.
- [x] Pathfinding Showdown: undo terrain edits; full ordered frontier.
- [x] Pulse Board: reconnect/stale connection; weather request ownership; visibility-aware polling/backoff.
- [x] RL-Arena: Python/TypeScript environment parity; checkpoint provenance and evaluation context.
- [x] Outguess: remove unsupported population claim; separate hinted/blind scoring.
- [x] Emergence: reproducible reset/new seed; lazy initialization and offscreen pause.
- [x] Game of Life: real speed and single step; reset camera.
- [x] Embedding Explorer: surfaced errors/validated vectors; fixed projection scale.
- [x] Sentence Surgeon: original-text replacement; cancellation and cleared prediction state.
- [x] Rusenizer: byte boundaries; honest language heuristic; scoped reproducible tokenizer comparison.
- [x] Fourier Sketch: reconstruction error; distinguish synthetic closing edge.
- [x] Optimizer Racetrack: offscreen versus divergence; convergence versus step limit.
- [x] Steering LLMs: one real causal model, identical sampling controls, explicit output-logit intervention.
- [x] RuseN-Gram: corpus counts/probabilities; visible backoff and smoothing.
Release gates: lint, TypeScript, tests, static export, browser interactions, GitHub CI, then production verification. Deployment outcome is recorded with the release PR.

Evaluation claims stay narrow: synthetic experiments illustrate mechanisms;
tokenizer comparisons describe the committed example corpus, not Turkish text
in general; legacy RL assets retain unknown provenance as unknown. No expensive
retraining is required to validate existing environment rules.

## Verification evidence

- Local suite: 115 tests; all 35 route/navigation browser checks passed.
- Arena: 25 controlled CPU transitions agree across Python and TypeScript, including both 68-value observations. Neutral habit and no manual dash direction are explicit test conditions.
- Tokenizer: six committed examples give 34 Rusenizer tokens vs 56 cl100k_base tokens (39.29% reduction on that corpus only). Reproduce with `npm run benchmark:tokenizer`.
- Steering: DistilGPT2 revision `a41c10485c18a64b6606729b6a082330cbd8f49e`, merged q8 decoder SHA-256 `dfd02dcbfccb31d289cac235f71cecad357030866fe7019f05a36b1c5692afba`. CPU zero-strength control reproduced identical text. With seed 42, temperature 0.8 and strength 4, first-step target mass changed from 0.006767 to 0.527356 for the default prompt. This is an illustrative intervention check, not a general quality benchmark.
