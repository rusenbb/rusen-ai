# rusen.ai

Full-stack AI demo platform showcasing LLM integrations, browser-based ML, and interactive visualizations.

**Live:** [rusen.ai](https://rusen.ai)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16, React 19 (with Compiler) |
| Language | TypeScript 5.9 (strict) |
| Styling | Tailwind CSS 4, Geist font |
| Cloud ML | OpenRouter API (Gemini, DeepSeek, Grok) |
| Browser ML | Transformers.js (MobileBERT, SmolLM, mxbai-embed) |
| Visualization | Three.js, UMAP-js |
| Testing | Vitest, React Testing Library |
| Deployment | Cloudflare Pages + Functions |

## Demos

### Cloud LLM Demos

| Demo | Description |
|------|-------------|
| [Paper Pilot](https://rusen.ai/demos/paper-pilot) | Academic paper summarizer with multi-source fetching (arXiv, CrossRef, Semantic Scholar), PDF extraction, multiple summary types, and Q&A |
| [Query Craft](https://rusen.ai/demos/query-craft) | Natural language to SQL translator with visual schema builder, 4 SQL dialects, shareable URLs |
| [Data Forge](https://rusen.ai/demos/data-forge) | Schema-aware test data generator with foreign key relationships, parallel generation, export to SQL/JSON/CSV |

### Browser ML Demos

| Demo | Description |
|------|-------------|
| [Classify Anything](https://rusen.ai/demos/classify-anything) | Zero-shot text classification with custom labels, runs entirely in browser (MobileBERT) |
| [Embedding Explorer](https://rusen.ai/nerdy-stuff/embedding-explorer) | Word embedding visualization with vector arithmetic (king - man + woman = queen) |
| [Rusenizer](https://rusen.ai/nerdy-stuff/rusenizer) | Turkish-optimized tokenizer comparison (~45% fewer tokens than GPT-4) |

## Project Structure

```
src/
├── app/
│   ├── demos/                 # Cloud LLM demos
│   │   ├── paper-pilot/
│   │   ├── query-craft/
│   │   ├── data-forge/
│   │   └── classify-anything/
│   ├── nerdy-stuff/           # Browser ML demos
│   │   ├── embedding-explorer/
│   │   └── rusenizer/
│   └── components/            # Page-level components (Header, DemoCard)
├── components/ui/             # Shared UI library (Button, Alert, Card, Spinner)
├── hooks/                     # Shared hooks (useAPI)
└── lib/                       # Config, utilities, design tokens

functions/api/
├── llm.ts                     # LLM proxy with model fallback
└── proxy.ts                   # CORS proxy for academic APIs
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
git clone https://github.com/rusenbb/rusen-ai.git
cd rusen-ai
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Note:** In development, LLM API calls proxy through production (`rusen.ai`) since Cloudflare Functions aren't available locally.

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run lint` | Run ESLint |
| `npm test` | Run tests in watch mode |
| `npm run test:run` | Run tests once |
| `npm run train:adaptive-arena:deps` | Sync the `uv` Python env and install the pinned CUDA PyTorch build (`torch==2.10.0`, `cu128`) |
| `npm run train:adaptive-arena` | Train RL-Arena checkpoints with the Python/PyTorch trainer |
| `npm run train:adaptive-arena:ts` | Run the legacy TypeScript trainer |

### RL-Arena Training

RL-Arena checkpoint generation now runs through `uv` and PyTorch. On the current NVIDIA setup, the supported install path is the pinned `cu128` wheel:

```bash
npm run train:adaptive-arena:deps
npm run train:adaptive-arena
```

## Architecture Overview

### LLM Integration

```
Browser → useAPI hook → /api/llm (Cloudflare Function) → OpenRouter API
```

- **Model fallback:** Gemini 2.5 Flash → DeepSeek V3.2 → Grok 4.1 → GPT OSS
- **Rate limiting:** 30 requests/minute per IP
- **Streaming:** Server-Sent Events with 50ms debounced UI updates
- **API keys:** Up to 10 keys with round-robin rotation

### Browser ML

- **Transformers.js** loads models into browser via WASM
- **IndexedDB** caches models for fast reloads
- **Models used:** MobileBERT (classification), SmolLM-135M (generation), mxbai-embed-xsmall (embeddings)

### State Management

- `useReducer` for complex demo state
- URL hash encoding for shareable state
- localStorage for persistence

## Deployment

Auto-deploys to Cloudflare Pages on push to `main`.

### Cloudflare Secrets Required

```
OPENROUTER_API_KEY_01
OPENROUTER_API_KEY_02
...
OPENROUTER_API_KEY_10
```

## Documentation

- [PROJECTS.md](./PROJECTS.md) - Human-readable registry of all projects and planned ideas
- [CLAUDE.md](./CLAUDE.md) - Instructions for AI assistants
- [DOCUMENTATION.md](./DOCUMENTATION.md) - Technical architecture details
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Contribution guidelines

## License

MIT
