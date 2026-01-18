# Technical Specification

## System Architecture

**Last Updated**: 2026-01-18

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (Client)                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  Next.js    │  │  useAPILLM  │  │  PDF.js     │              │
│  │  React App  │  │  (Hook)     │  │  (WASM)     │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                │                      │
│         └────────────────┼────────────────┘                      │
│                          │                                       │
│  ┌───────────────────────┴───────────────────────┐              │
│  │              Application State                 │              │
│  │         (useReducer + React Context)          │              │
│  └───────────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Cloudflare Pages                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  Static Assets  │  │  /api/llm       │  │  /api/proxy     │  │
│  │  (Next.js SSG)  │  │  (LLM Proxy)    │  │  (CORS Proxy)   │  │
│  └─────────────────┘  └────────┬────────┘  └────────┬────────┘  │
└────────────────────────────────┼────────────────────┼───────────┘
                                 │                    │
                                 ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                      External APIs                               │
├──────────┬──────────┬──────────┬──────────┬──────────┬──────────┤
│OpenRouter│ CrossRef │ Semantic │ Unpaywall│ OpenAlex │  arXiv   │
│  (LLM)   │   API    │ Scholar  │   API    │   API    │   API    │
└──────────┴──────────┴──────────┴──────────┴──────────┴──────────┘
```

### Key Design Principles

1. **API-First**: LLM inference via cloud APIs (OpenRouter)
2. **Progressive Enhancement**: Basic functionality works, AI enhances it
3. **Graceful Degradation**: Failures in one model/source don't break the app
4. **Zero Server State**: No databases, no user sessions
5. **Model Fallback**: Automatic failover between models for reliability

---

## Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.1.1 | React framework with App Router |
| React | 19.2.3 | UI components |
| TypeScript | ^5 | Type safety |
| Tailwind CSS | ^4 | Utility-first styling |

### AI/ML

| Technology | Version | Purpose |
|------------|---------|---------|
| OpenRouter API | - | Cloud LLM inference (via proxy) |
| pdfjs-dist | ^5.4.530 | PDF text extraction |
| tiktoken | ^1.0.22 | GPT-4 tokenizer (for comparison) |

**Note**: WebLLM was removed in January 2026. See decisions.md for rationale.

### Infrastructure

| Technology | Purpose |
|------------|---------|
| Cloudflare Pages | Static hosting + edge functions |
| Cloudflare Pages Functions | CORS proxy for blocked APIs |
| jsDelivr CDN | PDF.js worker delivery |

---

## Module Specifications

### API LLM Integration

**Locations**:
- `src/app/demos/paper-pilot/hooks/useAPILLM.ts`
- `src/app/demos/data-forge/hooks/useAPILLM.ts`
- `functions/api/llm.ts` (Cloudflare Function)

**Client Hook Interface**:
```typescript
interface UseAPILLMReturn {
  isGenerating: boolean;         // Currently generating
  error: string | null;          // Error message if failed
  rateLimitRemaining: number | null;  // Requests remaining this minute
  generate: (
    systemPrompt: string,
    userPrompt: string,
    onStream?: (text: string) => void
  ) => Promise<string>;
}

function useAPILLM(selectedModel: string = "auto"): UseAPILLMReturn;
```

**Available Models**:
```typescript
const AVAILABLE_MODELS = [
  { id: "auto", name: "Auto (Recommended)" },
  { id: "google/gemini-2.0-flash-exp:free", name: "Gemini 2.0 Flash" },
  { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B" },
  { id: "google/gemma-3-27b-it:free", name: "Gemma 3 27B" },
  { id: "deepseek/deepseek-r1-0528:free", name: "DeepSeek R1" },
  { id: "qwen/qwen3-coder:free", name: "Qwen3 Coder 480B" },
];
```

**API Proxy Features** (`/api/llm`):
- Rate limiting: 30 req/min per IP
- API key rotation: Up to 10 keys, round-robin
- Model fallback: Automatic on 402/429/5xx errors
- Use-case routing: Different model priority for paper-pilot vs data-forge
- SSE streaming support

**Inference Parameters**:
- Temperature: 0.5
- Max tokens: 16384
- Streaming: Enabled for all demos

---

### Paper Fetching Pipeline

**Location**: `src/app/demos/paper-pilot/utils/paperFetcher.ts`

**Flow**:
```
Input (DOI/arXiv ID)
        │
        ▼
┌───────────────────┐
│  Detect Input Type │
│  (DOI vs arXiv)    │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐     ┌───────────────────┐
│  DOI Path         │     │  arXiv Path       │
│  - CrossRef       │     │  - arXiv API      │
│  - OpenAlex       │     │    (via proxy)    │
│  - Unpaywall      │     └─────────┬─────────┘
│  - Semantic Scholar│              │
└─────────┬─────────┘              │
          │                         │
          └────────────┬────────────┘
                       │
                       ▼
          ┌───────────────────┐
          │  Merge Metadata   │
          │  (best of each)   │
          └─────────┬─────────┘
                    │
                    ▼
          ┌───────────────────┐
          │  Extract PDF Text │
          │  (if available)   │
          └─────────┬─────────┘
                    │
                    ▼
          ┌───────────────────┐
          │  Return Paper     │
          │  Metadata         │
          └───────────────────┘
```

**API Endpoints**:

| API | Endpoint | CORS | Auth |
|-----|----------|------|------|
| CrossRef | `api.crossref.org/works/{doi}` | Yes | Email header |
| OpenAlex | `api.openalex.org/works/doi:{doi}` | Yes | None |
| Unpaywall | `api.unpaywall.org/v2/{doi}?email=` | Yes | Email param |
| Semantic Scholar | `api.semanticscholar.org/graph/v1/paper/` | No | None |
| arXiv | `export.arxiv.org/api/query?id_list=` | No | None |

**Proxy Requirement**: Semantic Scholar and arXiv require routing through `/api/proxy`.

---

### CORS Proxy Function

**Location**: `functions/api/proxy.ts`

**Specification**:
```typescript
export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url).searchParams.get("url");

  // Validate URL (must be allowlisted domain)
  // Fetch with appropriate headers
  // Return with CORS headers
};
```

**Allowed Domains**:
- `api.semanticscholar.org`
- `export.arxiv.org`
- PDF domains from Unpaywall responses

**Response Headers**:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
```

---

### State Management Pattern

**Pattern**: `useReducer` with typed discriminated union actions

**Example (Paper Pilot)**:
```typescript
// State shape
interface PaperPilotState {
  paper: PaperMetadata | null;
  summaries: Summary[];
  qaHistory: QAExchange[];
  generationProgress: GenerationProgress;
  fetchProgress: FetchProgress;
}

// Action types
type PaperPilotAction =
  | { type: "SET_PAPER"; paper: PaperMetadata }
  | { type: "CLEAR_PAPER" }
  | { type: "ADD_SUMMARY"; summary: Summary }
  | { type: "SET_GENERATION_PROGRESS"; progress: Partial<GenerationProgress> }
  // ...

// Reducer
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_PAPER":
      return { ...state, paper: action.paper, summaries: [], qaHistory: [] };
    // ...
  }
}
```

**Rationale**: Centralizes state transitions, ensures type safety, handles derived state resets.

---

### PDF Text Extraction

**Location**: `src/app/demos/paper-pilot/utils/paperFetcher.ts`

**Configuration**:
```typescript
const loadingTask = pdfjsLib.getDocument({
  url: proxyUrl(pdfUrl),  // Route through CORS proxy
  disableAutoFetch: true,  // Don't prefetch
  disableStream: true,     // Simpler memory management
});
```

**Limits**:
- Max 50 pages extracted
- Text cleaned: whitespace normalized, hyphenation removed
- PDF document destroyed after extraction (memory management)

**Worker Setup**:
```typescript
pdfjsLib.GlobalWorkerOptions.workerSrc =
  `//cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
```

---

### WASM Module Loading (Rusenizer)

**Location**: `src/app/nerdy-stuff/rusenizer/page.tsx`

**Assets**:
- `/public/wasm/rusenizer_wasm.js` - JS glue code
- `/public/wasm/rusenizer_wasm_bg.wasm` - WASM binary
- `/public/models/v1/mergeable_ranks.json` - BPE vocabulary

**Loading Sequence**:
```typescript
// 1. Fetch WASM binary
const wasmBytes = await fetch("/wasm/rusenizer_wasm_bg.wasm")
  .then(r => r.arrayBuffer());

// 2. Dynamic import JS (avoids SSR issues)
const jsCode = await fetch("/wasm/rusenizer_wasm.js").then(r => r.text());
const blob = new Blob([jsCode], { type: "application/javascript" });
const blobUrl = URL.createObjectURL(blob);
const wasmModule = await import(/* webpackIgnore: true */ blobUrl);
URL.revokeObjectURL(blobUrl);

// 3. Initialize
await wasmModule.default(wasmBytes);

// 4. Load vocabulary
const ranks = await fetch("/models/v1/mergeable_ranks.json").then(r => r.json());
const tokenizer = new wasmModule.Tokenizer(JSON.stringify(ranks));
```

---

## Data Models

### PaperMetadata

```typescript
interface PaperMetadata {
  // Identifiers
  doi: string | null;
  arxivId: string | null;
  semanticScholarId: string | null;

  // Basic metadata
  title: string;
  authors: string[];
  abstract: string | null;
  journal: string | null;
  publishedDate: string | null;
  url: string;
  subjects: string[];

  // Full text
  fullText: string | null;
  fullTextSource: ContentSource | null;
  hasFullText: boolean;
  wordCount: number;

  // Source tracking
  sources: ContentSourceInfo[];
}
```

### Schema (Data Forge)

```typescript
interface Schema {
  tables: Table[];
  foreignKeys: ForeignKey[];
}

interface Table {
  id: string;
  name: string;
  definition: string;  // Context for AI
  columns: Column[];
  rowCount: number;
}

interface Column {
  id: string;
  name: string;
  type: ColumnType;  // "string" | "integer" | "float" | "boolean" | "date" | "email" | "uuid" | "text"
  nullable: boolean;
  isPrimaryKey: boolean;
}

interface ForeignKey {
  id: string;
  sourceTableId: string;
  sourceColumnId: string;
  targetTableId: string;
  targetColumnId: string;
}
```

---

## Error Handling Strategy

### User-Facing Errors

| Error Type | Display | Recovery |
|------------|---------|----------|
| Rate limit exceeded | Error message with retry time | Wait 1 minute, then retry |
| All models unavailable | Error message | Retry later (automatic fallback failed) |
| API fetch failure | Error in fetch progress UI | Partial data shown, try alternate sources |
| PDF extraction failure | Warning, proceed with abstract | Use abstract-only summarization |
| Generation failure | Error in progress UI | Retry (automatic model fallback) |

### Error Boundaries

React error boundaries not currently implemented. Errors are caught at the async operation level and displayed via state.

---

## Performance Considerations

### Bundle Splitting

- PDF.js: Dynamically imported when PDF extraction needed
- tiktoken: Dynamically imported in Rusenizer page only
- WASM: Loaded via fetch, not bundled

### Caching

| Asset | Cache Strategy |
|-------|----------------|
| Static assets | Cloudflare CDN (immutable) |
| API responses | None (always fresh) |
| PDF.js worker | CDN with version in URL |

### Memory Management

- PDF documents destroyed after text extraction
- Mounted ref prevents state updates after unmount

---

## Security Considerations

### API Key Security

- OpenRouter API keys stored as Cloudflare secrets
- Keys never exposed to client-side code
- Multiple keys with rotation for rate limit distribution
- Keys accessed only in Cloudflare Pages Function

### CORS Proxy

- Only allows GET requests
- Should validate target URLs against allowlist
- No authentication forwarding

### LLM Proxy

- Rate limiting: 30 req/min per IP
- Only proxies to OpenRouter (no arbitrary URLs)
- User content sent to OpenRouter (privacy consideration)

### User Data

- No data persisted server-side
- User prompts sent to OpenRouter for inference
- API requests only fetch public paper metadata

### Dependencies

- All npm packages from public registry
- WASM modules built from known source
- CDN assets (PDF.js worker) version-pinned

---

## Deployment

### Build Process

```bash
npm run build  # Next.js static export
```

### Cloudflare Pages Configuration

- **Build command**: `npm run build`
- **Build output**: `.next` (or `out` for static export)
- **Functions directory**: `functions/`

### Environment Variables

**Cloudflare Secrets** (required for LLM functionality):
```
OPENROUTER_API_KEY_01  # Primary key
OPENROUTER_API_KEY_02  # Optional additional keys
...
OPENROUTER_API_KEY_10  # Up to 10 keys for rotation
```

**Local Development** (`.dev.vars`):
```
OPENROUTER_API_KEY_01=sk-or-v1-...
```

**Note**: `.env` and `.dev.vars` are in `.gitignore` for security.

---

## Future Technical Considerations

### Planned Features

1. **Query Craft**: Will need SQL parsing/validation library
2. **Embedding Explorer**: May need Transformers.js for embedding models
3. **Temperature Playground**: Multiple parallel generations

### Potential Optimizations

1. Service Worker for offline model caching UI
2. SharedArrayBuffer for faster WASM (requires COOP/COEP headers)
3. WebGPU compute shaders for custom operations
