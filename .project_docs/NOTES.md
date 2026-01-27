# RUSEN.AI Portfolio - Project Notes

## Overview

Full-stack AI demo platform showcasing LLM integrations, browser-based ML, and interactive visualizations. Built with Next.js 16 + React 19, deployed on Cloudflare Pages.

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16.1.1, React 19.2.3 |
| Styling | Tailwind CSS 4, Geist font |
| TypeScript | 5.9.3 (strict) |
| ML/AI | Transformers.js 3.8.1, OpenRouter API |
| Visualization | Three.js, UMAP-js |
| PDF | pdfjs-dist 5.4.530 |
| Deployment | Cloudflare Pages (static export + functions) |

---

## Directory Structure

```
src/
├── app/
│   ├── demos/                  # Main interactive demos
│   │   ├── classify-anything/  # Zero-shot classification (browser ML)
│   │   ├── paper-pilot/        # Academic paper summarizer
│   │   ├── query-craft/        # Natural language to SQL
│   │   └── data-forge/         # Schema-aware test data generator
│   ├── nerdy-stuff/            # Educational visualizations
│   │   ├── embedding-explorer/ # Word embedding visualization
│   │   ├── rusenizer/          # Turkish tokenizer comparison
│   │   └── temperature-playground/
│   └── components/             # Shared UI components
├── lib/
│   └── api.ts                  # API URL management
functions/
└── api/
    ├── llm.ts                  # LLM proxy with fallback models
    └── proxy.ts                # CORS proxy for academic APIs
```

---

## Demos Summary

### Featured Demos

**Paper Pilot** (`/demos/paper-pilot`)
- Fetch papers by DOI/arXiv ID, generate summaries (TL;DR, Technical, ELI5, Key Findings)
- 6+ academic API integrations (CrossRef, Semantic Scholar, OpenAlex, Unpaywall, arXiv)
- PDF extraction, Q&A interface, keyboard shortcuts

**Data Forge** (`/demos/data-forge`)
- Visual schema builder, generates realistic test data
- Dependency-aware: generates parent tables before children
- 4 SQL dialects, shareable URLs, export to SQL/JSON/CSV

**Query Craft** (`/demos/query-craft`)
- Natural language → SQL conversion
- Interactive schema builder, query history
- Shareable schemas via URL

**Classify Anything** (`/demos/classify-anything`)
- Zero-shot text classification with custom labels
- Runs entirely in browser (MobileBERT via Transformers.js)
- No server needed, privacy-preserving

### Educational (Nerdy Stuff)

- **Embedding Explorer**: 2D vector space visualization, vector arithmetic
- **Rusenizer**: Turkish-optimized tokenizer (~45% token savings)
- **Temperature Playground**: Sampling visualization

---

## Architecture Patterns

### LLM Integration
```
Client → /api/llm (Cloudflare Function) → OpenRouter API
                                        ↓
                    Fallback chain: Gemini 2.0 Flash → Llama 3.3 70B → ...
```
- 10 API keys rotated (round-robin)
- Rate limit: 30 req/min per IP
- Streaming via Server-Sent Events

### Browser ML
- Transformers.js for zero-shot classification
- Models cached in IndexedDB
- WASM backend (forced for consistency)

### State Management
- `useReducer` for complex state (all major demos)
- Discriminated unions for type-safe actions
- localStorage for persistence (Query Craft)
- URL hash for shareable state (Data Forge, Query Craft)

### Data Flow (Paper Pilot)
1. Parse input (DOI, arXiv ID, URL)
2. Parallel fetch from 6 academic APIs
3. Extract PDF text if available
4. Stream LLM summary generation
5. Q&A with context from paper

---

## Key Files

| File | Purpose |
|------|---------|
| `functions/api/llm.ts` | LLM proxy, model fallback, rate limiting |
| `functions/api/proxy.ts` | CORS proxy for academic APIs |
| `src/app/demos/paper-pilot/utils/paperFetcher.ts` | Multi-source academic data fetching |
| `src/app/demos/data-forge/utils/generation.ts` | Dependency-aware table generation |
| `src/app/demos/classify-anything/hooks/useClassifier.ts` | Transformers.js model lifecycle |

---

## Environment

**Dev:** `npm run dev` - localhost, proxies to prod API
**Build:** `npm run build` - static export
**Deploy:** Cloudflare Pages (auto-deploy on push to main)

**Secrets (Cloudflare):**
- `OPENROUTER_API_KEY_0` through `OPENROUTER_API_KEY_9`

---

## Notable Design Decisions

1. **Hybrid processing**: Heavy LLM work on cloud, classification in browser
2. **No backend DB**: All transient data, designed for demos
3. **Graceful degradation**: Fallback chains for LLMs and APIs
4. **React Compiler**: Auto-memoization enabled
5. **Streaming UX**: Real-time token display reduces perceived latency

---

## Session Log

### 2025-01-27
- Deep codebase exploration completed
- Documented architecture, demos, patterns
- No active work in progress
