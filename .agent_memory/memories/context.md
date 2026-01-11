# Project Context

## Overview — 2025-01-11

**rusen.ai** is a portfolio website for Rusen Birben, an AI & Data Engineer. The site showcases interactive AI demos that run entirely in the browser using WebLLM and WebGPU.

**Core Philosophy**: "Data is eating the world" — The site demonstrates that powerful AI can run locally without cloud APIs, API costs, or privacy concerns.

**URL**: rusen.ai (hosted on Cloudflare Pages)

## Tech Stack — 2025-01-11

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.1.1 | React framework, App Router |
| React | 19.2.3 | UI library |
| TypeScript | ^5 | Type safety |
| Tailwind CSS | ^4 | Styling (CSS-in-CSS config) |
| WebLLM (@mlc-ai/web-llm) | ^0.2.80 | Browser-based LLM inference |
| PDF.js (pdfjs-dist) | ^5.4.530 | PDF text extraction |
| tiktoken | ^1.0.22 | GPT-4 tokenizer comparison |
| Cloudflare Pages | - | Hosting + Functions |

## Feature Inventory — 2025-01-11

### Demos (AI-powered interactive tools)

**Paper Pilot** (`/demos/paper-pilot`)
- Input: DOI or arXiv ID
- Features: Multi-source paper fetching, PDF text extraction, AI summaries, Q&A
- Data sources: CrossRef, Semantic Scholar, Unpaywall, OpenAlex, arXiv
- Summary types: TL;DR, Technical, ELI5, Key Findings
- Tech: WebLLM (Qwen3), PDF.js, multi-API aggregation

**Data Forge** (`/demos/data-forge`)
- Input: Visual database schema builder
- Features: Define tables/columns, foreign keys, generate realistic test data
- Export formats: SQL, JSON, CSV
- Presets: E-commerce, Blog schemas
- Tech: WebLLM with JSON schema output

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

## AI Models Available — 2025-01-11

All models are Qwen3 family, quantized for browser execution:

| Model ID | Display Name | Download Size | VRAM |
|----------|--------------|---------------|------|
| Qwen3-0.6B-q4f16_1-MLC | Qwen3 0.6B | ~400MB | 2GB |
| Qwen3-1.7B-q4f16_1-MLC | Qwen3 1.7B | ~1GB | 3GB |
| Qwen3-4B-q4f16_1-MLC | Qwen3 4B | ~2.5GB | 5GB |

Default: Qwen3-0.6B (fastest, most compatible)

## External API Dependencies — 2025-01-11

| API | Purpose | CORS | Rate Limit |
|-----|---------|------|------------|
| CrossRef | DOI metadata | Yes | Polite pool (email header) |
| Semantic Scholar | Paper metadata, PDFs | No (proxy) | 100 req/5min |
| Unpaywall | Open access PDF discovery | Yes | Email required |
| OpenAlex | Better abstract coverage | Yes | Polite pool |
| arXiv | Preprint metadata | No (proxy) | None specified |

## Statistics (from homepage) — 2025-01-11

- **67M** tokens trained (Rusenizer)
- **100%** client-side processing
- **0** API costs to users

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

## Deployment — 2025-01-11

- **Platform**: Cloudflare Pages
- **Build**: Automatic on push to main
- **Functions**: `functions/api/proxy.ts` deployed as Pages Function
- **Assets**: WASM files served from `/public/wasm/`
