# Architectural Decisions

## Migration from WebLLM to API-Based Inference — 2026-01-18

**Decision**: Remove WebLLM (browser-based LLM inference) and switch to cloud-based LLM inference via OpenRouter API.

**Rationale**:
- **Context limits**: WebLLM Qwen3 models hard-limited to 4096 context, causing repetition on longer papers
- **User experience**: 400MB-2.5GB model downloads deterred casual visitors
- **Device compatibility**: WebGPU not available on all browsers/devices
- **Quality**: Cloud models (Gemini 2.0 Flash, Llama 3.3 70B) significantly outperform small browser models
- **Reliability**: Model fallback chain ensures service continuity

**Trade-offs accepted**:
- Requires internet connection (no offline mode)
- Rate limiting (30 req/min per IP)
- Dependent on OpenRouter free tier availability
- API keys needed as Cloudflare secrets

**Implementation details**:
- Cloudflare Pages Function (`/api/llm`) proxies requests to OpenRouter
- Up to 10 API keys with round-robin rotation for rate limit distribution
- Automatic model fallback: if primary model fails (402/429/5xx), tries next in chain
- User can override Auto mode to select specific model

**Supersedes**: "Client-Side AI with WebLLM" and "Qwen3 Model Family" decisions from 2025-01-11.

---

## [SUPERSEDED] Client-Side AI with WebLLM — 2025-01-11

> **Note**: This decision was superseded on 2026-01-18 by the migration to API-based inference.

**Original Decision**: Run LLMs entirely in the browser via WebLLM/WebGPU instead of server-side APIs.

**Why it was changed**: The 4096 context limit proved too restrictive for Paper Pilot's use case (full academic papers often exceed this). Additionally, the large model downloads (400MB+) created a poor first-run experience for visitors.

---

## OpenRouter Model Selection — 2026-01-18

**Decision**: Use OpenRouter's free tier with a prioritized fallback chain of models.

**Model priority** (for Paper Pilot):
1. Gemini 2.0 Flash (1M context, fast, no reasoning overhead)
2. Llama 3.3 70B (131K context, reliable)
3. Gemma 3 27B (131K context, multimodal)
4. DeepSeek R1 (reasoning tokens can truncate output)
5. Qwen3 Coder (may have payment issues, last resort)

**Rationale**:
- Gemini first: Best context window (1M), consistently available
- Avoid reasoning models for summarization: DeepSeek R1 uses "reasoning tokens" that can cause output truncation
- Free tier only: Site remains free for all visitors
- Automatic fallback: Users never see "model unavailable" errors

## Multi-Source Paper Fetching — 2025-01-11

**Decision**: Aggregate data from multiple academic APIs rather than relying on a single source.

**Sources used**:
1. **CrossRef** - Primary metadata for DOIs (best coverage)
2. **arXiv** - Direct access for preprints (always has PDF)
3. **Semantic Scholar** - Additional metadata, fields of study
4. **Unpaywall** - Open access PDF discovery
5. **OpenAlex** - Better abstract coverage than CrossRef

**Rationale**:
- No single API has complete data
- CrossRef often missing abstracts → OpenAlex fills gap
- Unpaywall finds legal PDF access → enables full-text extraction
- Semantic Scholar adds semantic metadata (fields of study)

**Implementation**: Parallel fetching with merge logic prioritizing most complete data.

## Cloudflare Pages Function for CORS — 2025-01-11

**Decision**: Use Cloudflare Pages Functions as a CORS proxy instead of third-party services.

**Rationale**:
- Third-party CORS proxies are unreliable and may log requests
- Semantic Scholar and arXiv APIs don't support browser CORS
- Cloudflare Functions deploy alongside the site automatically
- Full control over headers and error handling
- No additional infrastructure to manage

**Implementation**: Single `functions/api/proxy.ts` endpoint that forwards requests.

## PDF.js for Full-Text Extraction — 2025-01-11

**Decision**: Use PDF.js to extract text from academic PDFs in the browser.

**Rationale**:
- Enables full-text analysis without server-side processing
- Works with most academic PDF formats
- Mature library with good browser support
- Lazy-loaded to avoid bundle bloat

**Configuration**:
- Worker loaded from CDN (jsDelivr)
- Limited to 50 pages to prevent memory issues
- Graceful degradation to abstract-only if extraction fails

## Tailwind CSS v4 with CSS-in-CSS — 2025-01-11

**Decision**: Use Tailwind CSS v4 with native CSS `@theme` directive instead of JS config.

**Rationale**:
- Simpler setup with PostCSS-only
- CSS variables for theming (dark mode)
- Smaller bundle size
- Easier to customize without rebuilding

**Theme setup** (`globals.css`):
```css
@import "tailwindcss";

:root {
  --background: #fafafa;
  --foreground: #171717;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
}
```

## useReducer over useState for Complex State — 2025-01-11

**Decision**: Use `useReducer` for demos with complex state interactions.

**Rationale**:
- Centralized state transitions
- Type-safe action dispatch
- Easier to reason about state changes
- Better for derived state (clearing summaries when paper changes)
- Matches Redux patterns for familiarity

**Applied to**: Paper Pilot, Data Forge (both have >5 interdependent state fields)
