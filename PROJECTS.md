# Projects Registry

This file is the human-readable registry for the projects in `rusen.ai`.

Status legend:
- `live` - available on the site
- `to-do` - planned, not live yet

## Demos

| Project | Status | Path | Summary |
|---|---|---|---|
| Classify Anything | `live` | `/classify-anything` | Zero-shot text classification in the browser. |
| Segment Anything | `live` | `/segment-anything` | Click-to-segment with SAM 2.1 Tiny via WebAssembly. |
| Vision Anything | `live` | `/vision-anything` | Zero-shot image classification with custom labels via CLIP. |
| Forest Inspector | `live` | `/forest-inspector` | Categorical weather splits, information gain, and small random-forest voting. |
| Curve Fitter | `live` | `/curve-fitter` | Scrubbable gradient-descent traces for regression and tiny nonlinear networks. |
| Convolution Lab | `live` | `/convolution-lab` | Real RGB/B&W image kernels with linked receptive fields and honest pooling. |
| Adversarial Sketch | `live` | `/adversarial-sketch` | Gradient-based pixel nudges against a live browser-side handwritten-digit classifier. |
| Pathfinding Showdown | `live` | `/pathfinding-showdown` | Step through BFS, Dijkstra, greedy best-first, and A* frontier decisions. |
| Pulse Board | `live` | `/pulse-board` | Live multi-signal dashboard (crypto, weather, quakes). |
| RL-Arena | `live` | `/adaptive-arena` | 30x30 tactical arena where a trained bot adapts online. |
| Outguess | `live` | `/outguess` | Try to be unpredictable. A tiny AI predicts your next key press and catches humans about 70% of the time. |

## Nerdy Stuff

| Project | Status | Path | Summary |
|---|---|---|---|
| Emergence | `live` | `/emergence` | Interactive essay on cellular automata, synchrony, segregation, and criticality. |
| Game of Life | `live` | `/game-of-life` | Interactive cellular automata world and camera controls. |
| Embedding Explorer | `live` | `/embedding-explorer` | Visual semantic geometry with embeddings and UMAP. |
| Sentence Surgeon | `live` | `/sentence-surgeon` | Mask any word and watch a small BERT graft predictions back in. |
| Rusenizer | `live` | `/rusenizer` | Turkish-focused tokenizer experimentation playground. |
| Fourier Sketch | `live` | `/fourier-sketch` | Draw a path and reconstruct it with DFT epicycles. |
| Backprop Microscope | `live` | `/backprop-microscope` | Make one neuron move a tanh curve toward a target with exact gradients. |
| Causal Sandbox | `live` | `/causal-sandbox` | See how rain confounds the apparent umbrella and wet-shoes relationship. |
| Attention Arena | `live` | `/attention-arena` | Turn visible feature matches into a softmax-weighted memory lookup. |
| Optimizer Racetrack | `live` | `/optimizer-racetrack` | Race SGD, Momentum, RMSProp, and Adam on a visible loss landscape. |
| Steering LLMs | `to-do` | `/steering-llms` | Concept steering and intervention playground for local language models. |
| RuseN-Gram | `to-do` | `/rusen-gram` | Classic N-gram language modeling playground. |

## Active Planning

| Project | Plan |
|---|---|
| RL-Arena | [docs/plans/adaptive-arena.md](./docs/plans/adaptive-arena.md) |
| Outguess | [docs/plans/outguess.md](./docs/plans/outguess.md) |

## Notes

- The site-facing registry currently lives in [src/lib/projects.ts](./src/lib/projects.ts).
- `PROJECTS.md` is the top-level overview for planning, naming, and curation.
- When a project moves from `to-do` to `live`, update both this file and `src/lib/projects.ts`.
