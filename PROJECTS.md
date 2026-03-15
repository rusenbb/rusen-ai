# Projects Registry

This file is the human-readable registry for the projects in `rusen.ai`.

Status legend:
- `live` - available on the site
- `to-do` - planned, not live yet

## Demos

| Project | Status | Path | Summary |
|---|---|---|---|
| Paper Pilot | `live` | `/demos/paper-pilot` | Summarize and explain academic papers from DOI input. |
| Data Forge | `live` | `/demos/data-forge` | Generate realistic relational fake datasets from schema prompts. |
| Query Craft | `live` | `/demos/query-craft` | Generate SQL from plain-language intents. |
| Classify Anything | `live` | `/demos/classify-anything` | Zero-shot text classification in the browser. |
| Vision Anything | `to-do` | `/demos/vision-anything` | Zero-shot image classification with custom labels. |
| Pulse Board | `live` | `/demos/pulse-board` | Live multi-signal dashboard with streaming data sources. |
| Adaptive Arena | `live` | `/adaptive-arena` | 30x30 tactical arena where a seeded bot learns the player's habits and adapts online. |
| Voice Morph | `to-do` | `/demos/voice-morph` | Prompt-guided voice transformation. |

## Nerdy Stuff

| Project | Status | Path | Summary |
|---|---|---|---|
| Game of Life | `live` | `/nerdy-stuff/game-of-life` | Interactive cellular automata world and camera controls. |
| Embedding Explorer | `live` | `/nerdy-stuff/embedding-explorer` | Visual semantic geometry with embeddings, UMAP, and steering-style arithmetic. |
| Rusenizer | `live` | `/nerdy-stuff/rusenizer` | Turkish-focused tokenizer experimentation playground. |
| Optimization | `live` | `/optimization` | One unified optimization lab for gradient methods, black-box search, and high-dimensional training intuition. |
| Attention Heatmap | `to-do` | `/nerdy-stuff/attention-heatmap` | Transformer attention visualization toolkit. |
| RuseN-Gram | `to-do` | `/nerdy-stuff/rusen-gram` | Classic N-gram language modeling playground. |

## Additional To-do

| Project | Status | Proposed Area | Summary |
|---|---|---|---|
| Steering LLMs | `to-do` | Interpretability / Control | Explore whether concepts can be induced or strengthened in a model through steering vectors, interventions, and explainability tools. |

## Active Planning

| Project | Plan |
|---|---|
| Adaptive Arena | [docs/plans/adaptive-arena.md](./docs/plans/adaptive-arena.md) |

## Notes

- The site-facing registry currently lives in [src/lib/projects.ts](./src/lib/projects.ts).
- `PROJECTS.md` is the top-level overview for planning, naming, and curation.
- When a project moves from `to-do` to `live`, update both this file and `src/lib/projects.ts`.
