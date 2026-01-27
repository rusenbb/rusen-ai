# rusen.ai

Full-stack AI demo platform showcasing LLM integrations, browser-based ML, and interactive visualizations.

**Live:** [rusen.ai](https://rusen.ai)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16, React 19 |
| Styling | Tailwind CSS 4, Geist font |
| TypeScript | 5.9 (strict mode) |
| ML/AI | Transformers.js, OpenRouter API |
| Visualization | Three.js, UMAP-js |
| Deployment | Cloudflare Pages |

## Demos

### Featured

- **[Paper Pilot](/demos/paper-pilot)** - Academic paper summarizer with multi-source fetching, PDF extraction, and AI-powered summaries
- **[Data Forge](/demos/data-forge)** - Visual schema builder that generates realistic test data with foreign key awareness
- **[Query Craft](/demos/query-craft)** - Natural language to SQL translator with schema validation
- **[Classify Anything](/demos/classify-anything)** - Zero-shot text classification running entirely in-browser

### Educational (Nerdy Stuff)

- **[Embedding Explorer](/nerdy-stuff/embedding-explorer)** - Interactive word embedding visualization with vector arithmetic
- **[Rusenizer](/nerdy-stuff/rusenizer)** - Turkish-optimized tokenizer comparison
- **[Temperature Playground](/nerdy-stuff/temperature-playground)** - LLM sampling visualization

## Project Structure

```
src/
├── app/
│   ├── demos/              # Interactive AI demos
│   ├── nerdy-stuff/        # Educational visualizations
│   └── components/         # Page-level components
├── components/ui/          # Shared UI components
├── hooks/                  # Shared React hooks
└── lib/                    # Utilities and config

functions/
└── api/
    ├── llm.ts              # LLM proxy with model fallback
    └── proxy.ts            # CORS proxy for academic APIs
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/rusenbirben/rusen-ai.git
cd rusen-ai

# Install dependencies
npm install

# Copy environment example
cp .env.example .env.local

# Start development server
npm run dev
```

### Environment Variables

See `.env.example` for required configuration. At minimum, you need:

- `OPENROUTER_API_KEY_0` - OpenRouter API key for LLM access

## Architecture

### LLM Integration

```
Client → /api/llm (Cloudflare Function) → OpenRouter API
                                        ↓
                    Fallback chain: Gemini 2.0 Flash → Llama 3.3 70B → ...
```

- Round-robin key rotation (up to 10 keys)
- Rate limiting: 30 req/min per IP
- Streaming via Server-Sent Events

### Browser ML

- Transformers.js for zero-shot classification
- Models cached in IndexedDB
- WASM backend for consistency

### State Management

- `useReducer` for complex state
- localStorage for persistence
- URL hash for shareable state

## Scripts

```bash
npm run dev      # Development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Deployment

Deployed automatically to Cloudflare Pages on push to `main`.

### Cloudflare Configuration

Required secrets:
- `OPENROUTER_API_KEY_0` through `OPENROUTER_API_KEY_9` (API keys)

## License

MIT
