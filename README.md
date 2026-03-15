# rusen.ai

Interactive AI demos, browser ML experiments, and computational essays.

Live site: [rusen.ai](https://rusen.ai)

## What This Repo Is

This is the source for my personal site and demo collection. The project is a
static-exported Next.js app with root-level routes for interactive AI tools,
simulation-heavy explainers, and portfolio content.

The current site mixes:

- browser-side ML demos such as classification, segmentation, tokenization, and embedding exploration
- interactive essays and labs such as Emergence, Optimization, and Temperature Playground
- game-like systems such as RL-Arena and the standalone Game of Life experience
- portfolio pages such as the homepage, demos index, nerdy-stuff index, and CV

## Current Live Projects

### Demos

| Route | Project | Description |
|-------|---------|-------------|
| `/classify-anything` | Classify Anything | Zero-shot text classification in the browser with custom labels |
| `/segment-anything` | Segment Anything | In-browser image segmentation with SAM 2.1 Tiny via WebAssembly |
| `/pulse-board` | Pulse Board | Multi-signal live dashboard for crypto, weather, earthquakes, and public data |
| `/adaptive-arena` | RL-Arena | Tactical arena game against trained RL checkpoints |

### Nerdy Stuff

| Route | Project | Description |
|-------|---------|-------------|
| `/emergence` | Emergence | Interactive essay on cellular automata, synchrony, segregation, highways, and criticality |
| `/optimization` | Optimization | Interactive lab for gradient descent, black-box search, and high-dimensional optimization |
| `/game-of-life` | Game of Life | Standalone playground for the site’s cellular automata world |
| `/embedding-explorer` | Embedding Explorer | Visual semantic geometry with embeddings and UMAP |
| `/rusenizer` | Rusenizer | Turkish tokenizer playground and comparison tool |
| `/temperature-playground` | Temperature Playground | Pre-generated token trees for exploring sampling temperature and branching |

Project metadata for the site lives in [src/lib/projects.ts](./src/lib/projects.ts).

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16, React 19, React Compiler |
| Language | TypeScript 5.9 |
| Styling | Tailwind CSS 4 |
| Browser ML | `@huggingface/transformers`, WASM, IndexedDB caching |
| Visualization | Canvas 2D, Three.js, UMAP |
| PDF / Assets | `@react-pdf/renderer`, static JSON/content assets |
| Testing | Vitest, React Testing Library |
| Python tooling | `uv`, PyTorch, Transformers |
| Deployment | Static export on Cloudflare Pages |

## Repository Shape

```text
src/
├── app/                         # Route-level pages and app-specific components
│   ├── adaptive-arena/
│   ├── classify-anything/
│   ├── cv/
│   ├── emergence/
│   ├── embedding-explorer/
│   ├── game-of-life/
│   ├── optimization/
│   ├── pulse-board/
│   ├── rusenizer/
│   ├── segment-anything/
│   └── temperature-playground/
├── components/ui/               # Shared layout and UI primitives
├── components/optimization/     # Shared optimization rendering primitives
├── content/                     # Site content such as CV data
└── lib/                         # Shared helpers, registries, and math utilities

public/
├── segment-anything/            # Sample images and browser model assets
└── temperature-playground/data/ # Pre-generated token-tree JSON

scripts/
├── generate_temperature_trees.py
├── ship_temperature_data.py
├── prepare_sam3_webgpu_models.py
├── train_adaptive_arena.py
└── train-adaptive-arena.ts
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- Python 3.12+ if you want to run the generation/training scripts
- `uv` for Python environment management

### Install and run

```bash
git clone https://github.com/rusenbb/rusen-ai.git
cd rusen-ai
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Optional Python setup

```bash
uv sync
```

That is only needed for the Python-backed scripts such as temperature tree
generation and RL-Arena training.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Build the static export |
| `npm run start` | Start the production server locally |
| `npm run lint` | Run ESLint |
| `npm test` | Run Vitest in watch mode |
| `npm run test:run` | Run Vitest once |
| `npm run deploy` | Deploy the exported site to Cloudflare Pages |
| `npm run train:adaptive-arena:deps` | Sync `uv` env and install pinned CUDA PyTorch |
| `npm run train:adaptive-arena` | Train RL-Arena checkpoints with the Python trainer |
| `npm run train:adaptive-arena:ts` | Run the legacy TypeScript trainer |

## Generated Assets And Data

Some experiences rely on precomputed or shipped assets rather than live backend
calls.

- `public/temperature-playground/data/` contains shipped token-tree data used by the Temperature Playground
- `scripts/generate_temperature_trees.py` regenerates the raw branching data
- `scripts/ship_temperature_data.py` trims and splits that data for frontend use
- `public/segment-anything/` contains sample images and related browser assets for the segmentation demo

## Architecture Notes

- The site is statically exported with `output: "export"` in [next.config.ts](./next.config.ts).
- Routes are top-level app routes like `/segment-anything` and `/temperature-playground`, not nested under `/demos/...`.
- Project cards and indexes are driven by the shared registry in [src/lib/projects.ts](./src/lib/projects.ts).
- Several interactive pages use shipped JSON assets or browser-side inference to avoid needing a live backend.

## Documentation

- [PROJECTS.md](./PROJECTS.md) - Human-readable project registry and roadmap
- [DOCUMENTATION.md](./DOCUMENTATION.md) - Broader technical notes
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Contribution guidance
- [CLAUDE.md](./CLAUDE.md) - Repo-specific assistant guidance

## License

MIT
