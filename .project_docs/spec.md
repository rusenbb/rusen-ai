# Technical Specification

## System Architecture

**Last Updated**: 2025-01-11

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (Client)                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  Next.js    │  │  WebLLM     │  │  PDF.js     │              │
│  │  React App  │  │  (WebGPU)   │  │  (WASM)     │              │
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
│  ┌─────────────────┐  ┌─────────────────┐                       │
│  │  Static Assets  │  │  Pages Function │                       │
│  │  (Next.js SSG)  │  │  (CORS Proxy)   │                       │
│  └─────────────────┘  └────────┬────────┘                       │
└────────────────────────────────┼────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      External APIs                               │
├──────────┬──────────┬──────────┬──────────┬─────────────────────┤
│ CrossRef │ Semantic │ Unpaywall│ OpenAlex │       arXiv         │
│   API    │ Scholar  │   API    │   API    │       API           │
└──────────┴──────────┴──────────┴──────────┴─────────────────────┘
```

### Key Design Principles

1. **Client-First**: All AI computation runs in the browser
2. **Progressive Enhancement**: Basic functionality works, AI enhances it
3. **Graceful Degradation**: Failures in one data source don't break the app
4. **Zero Server State**: No databases, no user sessions

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
| @mlc-ai/web-llm | ^0.2.80 | Browser LLM inference via WebGPU |
| pdfjs-dist | ^5.4.530 | PDF text extraction |
| tiktoken | ^1.0.22 | GPT-4 tokenizer (for comparison) |

### Infrastructure

| Technology | Purpose |
|------------|---------|
| Cloudflare Pages | Static hosting + edge functions |
| Cloudflare Pages Functions | CORS proxy for blocked APIs |
| jsDelivr CDN | PDF.js worker delivery |

---

## Module Specifications

### WebLLM Integration

**Location**: `src/app/demos/*/hooks/useWebLLM.ts`

**Interface**:
```typescript
interface UseWebLLMReturn {
  isLoading: boolean;        // Model currently loading
  loadProgress: number;      // 0-1 loading progress
  error: string | null;      // Error message if failed
  isReady: boolean;          // Model ready for inference
  isSupported: boolean | null; // WebGPU support status
  loadedModelId: string | null; // Currently loaded model
  loadModel: (modelId: string) => Promise<void>;
  generate: (system: string, user: string, onStream?: (text: string) => void) => Promise<string>;
  unload: () => Promise<void>;
}
```

**Model Configuration**:
```typescript
const MODEL_OPTIONS = [
  { id: "Qwen3-0.6B-q4f16_1-MLC", vram: "2GB", size: "~400MB" },
  { id: "Qwen3-1.7B-q4f16_1-MLC", vram: "3GB", size: "~1GB" },
  { id: "Qwen3-4B-q4f16_1-MLC", vram: "5GB", size: "~2.5GB" },
];
```

**Inference Parameters**:
- Temperature: 0.5 (Paper Pilot), 0.3 (Data Forge)
- Max tokens: 32768
- Streaming: Enabled for Paper Pilot, disabled for Data Forge

**Qwen3 Think Tag Handling**:
- Append `/no_think` to user prompts
- Strip `<think>...</think>` tags from output (non-greedy regex)
- Preserve content before unclosed think tags

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
| WebGPU not supported | Full-page message with browser recommendations | None (hard requirement) |
| Model load failure | Error banner with retry button | Retry or select different model |
| API fetch failure | Error in fetch progress UI | Partial data shown, try alternate sources |
| PDF extraction failure | Warning, proceed with abstract | Use abstract-only summarization |
| Generation failure | Error in progress UI | Retry with same or different model |

### Error Boundaries

React error boundaries not currently implemented. Errors are caught at the async operation level and displayed via state.

---

## Performance Considerations

### Bundle Splitting

- WebLLM: Dynamically imported on first model load
- PDF.js: Dynamically imported when PDF extraction needed
- tiktoken: Dynamically imported in Rusenizer page only
- WASM: Loaded via fetch, not bundled

### Caching

| Asset | Cache Strategy |
|-------|----------------|
| WebLLM models | Browser Cache API (persistent) |
| Static assets | Cloudflare CDN (immutable) |
| API responses | None (always fresh) |
| PDF.js worker | CDN with version in URL |

### Memory Management

- PDF documents destroyed after text extraction
- WebLLM engine unloaded when switching models
- Mounted ref prevents state updates after unmount

---

## Security Considerations

### CORS Proxy

- Only allows GET requests
- Should validate target URLs against allowlist
- No authentication forwarding

### User Data

- No data persisted server-side
- All AI processing is local
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

None required. All configuration is static.

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
