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
- [ ] Rusenizer: byte boundaries; honest language heuristic; scoped reproducible tokenizer comparison.
- [x] Fourier Sketch: reconstruction error; distinguish synthetic closing edge.
- [x] Optimizer Racetrack: offscreen versus divergence; convergence versus step limit.
- [ ] Steering LLMs: one real causal model, identical sampling controls, explicit output-logit intervention.
- [ ] RuseN-Gram: corpus counts/probabilities; visible backoff and smoothing.
- [ ] Final lint, TypeScript, tests, static export, browser interactions and CI.
- [ ] Merge and verify production deployment.

Evaluation claims stay narrow: synthetic experiments illustrate mechanisms;
tokenizer comparisons describe the committed example corpus, not Turkish text
in general; legacy RL assets retain unknown provenance as unknown. No expensive
retraining is required to validate existing environment rules.
