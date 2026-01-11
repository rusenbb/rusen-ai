# Architectural Decisions

## Client-Side AI with WebLLM — 2025-01-11

**Decision**: Run LLMs entirely in the browser via WebLLM/WebGPU instead of server-side APIs.

**Rationale**:
- **Privacy**: User data never leaves their device - critical for processing academic papers
- **Cost**: Zero API costs; models download once and are cached
- **Offline**: Works without internet after initial model download
- **Educational**: Demonstrates that powerful AI can run locally
- **Portfolio differentiation**: Showcases technical depth vs typical API wrapper demos

**Trade-offs accepted**:
- Requires WebGPU support (Chrome 113+ / Edge 113+)
- Initial model download (400MB-2.5GB depending on model)
- Limited to smaller models (0.6B-4B parameters)
- Slower inference than cloud GPUs

**Alternatives rejected**:
- OpenAI/Anthropic APIs: Expensive, privacy concerns, requires backend
- Self-hosted inference: Requires server infrastructure, maintenance
- Transformers.js: Considered, but WebLLM has better model support and performance

## Qwen3 Model Family — 2025-01-11

**Decision**: Use Qwen3 models (0.6B, 1.7B, 4B) as the primary model family.

**Rationale**:
- Best quality/size ratio for WebLLM-compatible models in early 2025
- Three size options cover different device capabilities
- Strong instruction following and JSON generation
- Good multilingual support (important for Paper Pilot)

**Model characteristics**:
| Model | Size | VRAM | Use Case |
|-------|------|------|----------|
| Qwen3-0.6B | ~400MB | 2GB | Fast inference, basic tasks |
| Qwen3-1.7B | ~1GB | 3GB | Balanced performance |
| Qwen3-4B | ~2.5GB | 5GB | Best quality, complex tasks |

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
