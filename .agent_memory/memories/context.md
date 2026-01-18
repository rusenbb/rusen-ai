# Project Context

## Overview — 2026-01-18

**rusen.ai** is a portfolio website for Rusen Birben, an AI & Data Engineer. The site showcases interactive AI demos powered by cloud LLMs via OpenRouter.

**Core Philosophy**: "Data is eating the world" — The site demonstrates practical AI applications with a seamless user experience, free for visitors.

**URL**: rusen.ai (hosted on Cloudflare Pages)

## Tech Stack — 2026-01-18

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.1.1 | React framework, App Router |
| React | 19.2.3 | UI library |
| TypeScript | ^5 | Type safety |
| Tailwind CSS | ^4 | Styling (CSS-in-CSS config) |
| OpenRouter API | - | LLM inference (via Cloudflare proxy) |
| PDF.js (pdfjs-dist) | ^5.4.530 | PDF text extraction |
| tiktoken | ^1.0.22 | GPT-4 tokenizer comparison |
| Cloudflare Pages | - | Hosting + Functions |

**Note**: WebLLM was removed in January 2026. See `decisions.md` for rationale.

## Feature Inventory — 2025-01-11

### Demos (AI-powered interactive tools)

**Paper Pilot** (`/demos/paper-pilot`)
- Input: DOI or arXiv ID
- Features: Multi-source paper fetching, PDF text extraction, AI summaries, Q&A
- Data sources: CrossRef, Semantic Scholar, Unpaywall, OpenAlex, arXiv
- Summary types: TL;DR, Technical, ELI5, Key Findings
- Tech: OpenRouter API (Gemini/Llama/Gemma), PDF.js, SSE streaming

**Data Forge** (`/demos/data-forge`)
- Input: Visual database schema builder
- Features: Define tables/columns, foreign keys, generate realistic test data
- Export formats: SQL, JSON, CSV
- Presets: E-commerce, Blog schemas
- Tech: OpenRouter API with JSON mode, parallel generation by dependency level

**Query Craft** (`/demos/query-craft`) — *Planned*
- Natural language to SQL conversion

### Nerdy Stuff (Technical explorations)

**Rusenizer** (`/nerdy-stuff/rusenizer`)
- Turkish-optimized BPE tokenizer
- Side-by-side comparison with GPT-4's cl100k_base
- Shows ~45% token savings on Turkish text
- Tech: Custom WASM tokenizer + tiktoken

**Embedding Explorer** (`/nerdy-stuff/embedding-explorer`) — *Planned*
- Vector space visualization

**Temperature Playground** (`/nerdy-stuff/temperature-playground`) — *Planned*
- LLM temperature comparison

### Static Pages

- **Homepage** (`/`) — Hero, featured demos, stats
- **Demos Index** (`/demos`) — Demo listing
- **Nerdy Stuff Index** (`/nerdy-stuff`) — Tools listing
- **About** (`/about`) — Bio, tech stack, social links

## AI Models Available — 2026-01-18

Models available via OpenRouter (all free tier):

| Model ID | Display Name | Context | Notes |
|----------|--------------|---------|-------|
| auto | Auto (Recommended) | - | Picks best available with fallback |
| google/gemini-2.0-flash-exp:free | Gemini 2.0 Flash | 1M | Primary choice, fast |
| meta-llama/llama-3.3-70b-instruct:free | Llama 3.3 70B | 131K | Reliable, direct output |
| google/gemma-3-27b-it:free | Gemma 3 27B | 131K | Multimodal capable |
| deepseek/deepseek-r1-0528:free | DeepSeek R1 | 164K | Reasoning model |
| qwen/qwen3-coder:free | Qwen3 Coder 480B | 262K | Coding optimized |

**Default**: Auto mode (tries models in priority order until one succeeds)

**Fallback Chain**: Gemini → Llama → Gemma → DeepSeek → Qwen (ordered by reliability)

## External API Dependencies — 2026-01-18

| API | Purpose | CORS | Rate Limit |
|-----|---------|------|------------|
| OpenRouter | LLM inference | No (proxy) | 30 req/min per IP (self-imposed) |
| CrossRef | DOI metadata | Yes | Polite pool (email header) |
| Semantic Scholar | Paper metadata, PDFs | No (proxy) | 100 req/5min |
| Unpaywall | Open access PDF discovery | Yes | Email required |
| OpenAlex | Better abstract coverage | Yes | Polite pool |
| arXiv | Preprint metadata | No (proxy) | None specified |

## Statistics (from homepage) — 2026-01-18

- **67M** tokens trained (Rusenizer)
- **Free** for all users (OpenRouter free tier)
- **6** AI models available

## Owner Information — 2025-01-11

**Name**: Rusen Birben
**Role**: AI & Data Engineer
**GitHub**: github.com/rusenbb
**LinkedIn**: linkedin.com/in/rusenbirben
**Contact**: contact@rusen.ai (used in API headers)

## Development Commands — 2025-01-11

```bash
npm run dev      # Development server (http://localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint check
```

## Deployment — 2026-01-18

- **Platform**: Cloudflare Pages
- **Build**: Automatic on push to main
- **Functions**:
  - `functions/api/proxy.ts` — CORS proxy for blocked APIs
  - `functions/api/llm.ts` — OpenRouter proxy with rate limiting
- **Secrets**: `OPENROUTER_API_KEY_01` through `OPENROUTER_API_KEY_10` (round-robin)
- **Assets**: WASM files served from `/public/wasm/`
