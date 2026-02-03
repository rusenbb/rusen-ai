# Technical Documentation

Detailed architecture documentation for rusen.ai.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Frontend Architecture](#frontend-architecture)
3. [API Layer](#api-layer)
4. [Browser ML Integration](#browser-ml-integration)
5. [Demo Implementations](#demo-implementations)
6. [State Management](#state-management)
7. [Deployment](#deployment)

---

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser                                  │
├─────────────────────────────────────────────────────────────────┤
│  Next.js App (Static Export)                                    │
│  ├── Cloud LLM Demos ──────────┐                                │
│  │   (Paper Pilot, Query Craft, │                               │
│  │    Data Forge)               │                               │
│  │                              ▼                               │
│  │                    ┌─────────────────┐                       │
│  │                    │   useAPI Hook   │                       │
│  │                    └────────┬────────┘                       │
│  │                             │                                │
│  └─────────────────────────────┼────────────────────────────────│
│                                │                                │
│  Browser ML Demos              │                                │
│  (Classify Anything,           │                                │
│   Embedding Explorer,          │                                │
│   Temperature Playground)      │                                │
│           │                    │                                │
│           ▼                    │                                │
│  ┌─────────────────┐           │                                │
│  │ Transformers.js │           │                                │
│  │ (WASM Runtime)  │           │                                │
│  └─────────────────┘           │                                │
│           │                    │                                │
│           ▼                    │                                │
│  ┌─────────────────┐           │                                │
│  │   IndexedDB     │           │                                │
│  │ (Model Cache)   │           │                                │
│  └─────────────────┘           │                                │
└────────────────────────────────┼────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Cloudflare Edge                               │
├─────────────────────────────────────────────────────────────────┤
│  Pages Functions                                                 │
│  ├── /api/llm ─────────────────────────────────────────────────▶│
│  │   (LLM Proxy)                                                │
│  │   • API key rotation (10 keys)                               │
│  │   • Model fallback chains                                    │
│  │   • Rate limiting (30/min/IP)                                │
│  │   • Streaming support                                        │
│  │                                                              │
│  └── /api/proxy ───────────────────────────────────────────────▶│
│      (CORS Proxy)                                               │
│      • Academic API whitelist                                   │
│      • 1-hour cache                                             │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    External Services                             │
├─────────────────────────────────────────────────────────────────┤
│  OpenRouter API                                                  │
│  ├── google/gemini-2.5-flash                                    │
│  ├── deepseek/deepseek-v3.2-20251201                            │
│  ├── x-ai/grok-4.1-fast                                         │
│  └── openai/gpt-oss-120b                                        │
│                                                                  │
│  Academic APIs (via proxy)                                       │
│  ├── CrossRef, Semantic Scholar                                  │
│  ├── arXiv, Unpaywall                                           │
│  └── OpenAlex, CORE                                             │
└─────────────────────────────────────────────────────────────────┘
```

### Request Flow

**Cloud LLM Request:**
```
User Action → React Component → useAPI.generate() → fetch(/api/llm)
    → Cloudflare Function → Rate Limit Check → API Key Selection
    → OpenRouter API → Model Fallback (if 429/5xx) → Stream Response
    → processStream() → onStream callback → UI Update
```

**Browser ML Request:**
```
User Action → React Component → useClassifier/useEmbedding/useLocalLLM
    → Check IndexedDB Cache → Load Model (if needed) → Run Inference
    → Return Results → UI Update
```

---

## Frontend Architecture

### Directory Structure

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (fonts, header)
│   ├── page.tsx                  # Home page
│   ├── globals.css               # Tailwind + custom animations
│   ├── components/               # App-level components
│   │   ├── Header.tsx            # Navigation
│   │   ├── DemoCard.tsx          # Demo preview cards
│   │   └── DataBackground.tsx    # Visual background
│   ├── demos/                    # Cloud LLM demos
│   │   ├── paper-pilot/
│   │   ├── query-craft/
│   │   ├── data-forge/
│   │   └── classify-anything/
│   └── nerdy-stuff/              # Browser ML demos
│       ├── embedding-explorer/
│       ├── temperature-playground/
│       └── rusenizer/
├── components/
│   └── ui/                       # Shared UI library
│       ├── Button.tsx
│       ├── Alert.tsx
│       ├── Card.tsx
│       ├── Spinner.tsx
│       ├── EmptyState.tsx
│       ├── ModelSelector.tsx
│       └── index.ts              # Barrel export
├── hooks/
│   ├── useAPI.ts                 # Unified LLM hook
│   └── index.ts
└── lib/
    ├── api.ts                    # API URL management
    ├── config.ts                 # Models, timeouts, settings
    └── design-tokens.ts          # Design system tokens
```

### Component Hierarchy

```
RootLayout
├── Header (navigation)
├── DataBackground (visual)
└── Page Content
    └── Demo Page ("use client")
        ├── Error Alert
        ├── Main Interface
        │   ├── Input Components
        │   ├── Action Buttons
        │   └── Output/Results
        └── Info Section
```

### UI Component Library

All shared components in `src/components/ui/`:

| Component | Props | Purpose |
|-----------|-------|---------|
| `Button` | variant, size, loading, icon | Primary actions |
| `Alert` | variant, title, dismissible | Error/success messages |
| `Card` | header, footer, padding | Content containers |
| `Spinner` | size, color | Loading states |
| `EmptyState` | icon, title, description | Empty placeholders |
| `ModelSelector` | value, onChange, models | LLM model dropdown |

### Styling System

**Tailwind CSS 4** with custom configuration:

```css
/* globals.css */
:root {
  --background: #fafafa;
  --foreground: #171717;
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0c0c0f;
    --foreground: #ededed;
  }
}
```

**Design Tokens** (`src/lib/design-tokens.ts`):
- Colors (accent, error, success, neutral scale)
- Spacing (padding, gaps)
- Focus states (ring styles)

---

## API Layer

### Cloudflare Functions

#### `/api/llm` - LLM Proxy

**Location:** `functions/api/llm.ts`

**Purpose:** Secure proxy for OpenRouter API calls

**Features:**
- API key rotation (round-robin across 10 keys)
- Use-case-specific model fallback chains
- Rate limiting (30 req/min per IP)
- Streaming support (SSE)
- JSON mode for structured output

**Model Fallback Chains:**

| Use Case | Primary | Fallbacks |
|----------|---------|-----------|
| paper-pilot | Gemini 2.5 Flash | Gemini 3 Flash, DeepSeek V3.2, Grok 4.1, GPT OSS |
| query-craft | Gemini 2.5 Flash | DeepSeek V3.2, Grok Code, Gemini Lite, GPT OSS |
| data-forge | Gemini 2.5 Flash | Gemini Lite, DeepSeek V3.2, Grok 4.1, GPT OSS |
| default | Gemini 2.5 Flash | Gemini Lite, DeepSeek V3.2, Grok 4.1, GPT OSS |

**Request Format:**
```typescript
{
  messages: [{ role: "system" | "user", content: string }],
  model?: string,           // Specific model or omit for auto
  max_tokens?: number,
  temperature?: number,
  stream?: boolean,
  response_format?: { type: "json_object" },
  use_case?: string         // Determines fallback chain
}
```

**Response Headers:**
- `X-RateLimit-Remaining` - Requests left in window
- `X-Model-Used` - Which model processed request

#### `/api/proxy` - CORS Proxy

**Location:** `functions/api/proxy.ts`

**Purpose:** Bypass CORS for academic APIs

**Whitelisted Domains:**
- arXiv, Semantic Scholar, CrossRef
- Unpaywall, OpenAlex, CORE
- PubMed, BioRxiv, Nature, PLOS, Zenodo

### Client-Side API Hook

**Location:** `src/hooks/useAPI.ts`

**Interface:**
```typescript
function useAPI(selectedModel: string, config: UseAPIConfig): UseAPIReturn

interface UseAPIConfig {
  useCase: UseCase;
  defaultStream?: boolean;
  defaultMaxTokens?: number;
  defaultTemperature?: number;
}

interface UseAPIReturn {
  isGenerating: boolean;
  error: string | null;
  rateLimitRemaining: number | null;
  lastModelUsed: string | null;
  generate: (options: GenerateOptions) => Promise<GenerationResult>;
  clearError: () => void;
}
```

**Streaming Implementation:**
- Uses ReadableStream API
- 50ms debounce on UI updates (batching)
- Partial JSON extraction during stream for real-time display

---

## Browser ML Integration

### Transformers.js Setup

All browser ML uses `@huggingface/transformers` with WASM backend.

### Models Used

| Demo | Model | Size | Purpose |
|------|-------|------|---------|
| Classify Anything | Xenova/mobilebert-uncased-mnli | ~100MB | Zero-shot classification |
| Temperature Playground | HuggingFaceTB/SmolLM-135M-Instruct | ~270MB | Token-by-token generation |
| Embedding Explorer | mixedbread-ai/mxbai-embed-xsmall-v1 | ~50MB | 384-dim embeddings |

### Hook Implementations

#### `useClassifier` (Classify Anything)

```typescript
// src/app/demos/classify-anything/hooks/useClassifier.ts

interface UseClassifierReturn {
  isLoading: boolean;
  loadingProgress: number;
  error: string | null;
  classify: (text: string, labels: string[]) => Promise<ClassificationResult[]>;
}
```

- Loads MobileBERT model on first use
- Caches in IndexedDB
- Returns confidence scores for each label

#### `useLocalLLM` (Temperature Playground)

```typescript
// src/app/nerdy-stuff/temperature-playground/hooks/useLocalLLM.ts

generateTokenByToken(prompt, options, callbacks): void

callbacks: {
  onToken: ({ token, tokenId, selectedProbability, topProbabilities }) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}
```

- Generates tokens one at a time
- Exposes full probability distribution
- Custom softmax with temperature scaling

#### `useEmbedding` (Embedding Explorer)

```typescript
// src/app/nerdy-stuff/embedding-explorer/hooks/useEmbedding.ts

interface UseEmbeddingReturn {
  embed: (text: string) => Promise<number[]>;
  embedBatch: (texts: string[]) => Promise<Map<string, number[]>>;
  getCached: (text: string) => number[] | null;
}
```

- 384-dimensional vectors
- In-memory cache for embeddings
- Cosine similarity utilities

---

## Demo Implementations

### Paper Pilot

**Purpose:** Academic paper summarization and Q&A

**Data Flow:**
1. User enters DOI/arXiv ID
2. `paperFetcher.ts` queries multiple APIs (CrossRef, arXiv, Semantic Scholar)
3. PDF extracted via pdfjs-dist if available
4. User selects summary type (TL;DR, Technical, ELI5, Key Findings)
5. `useAPI` streams summary from LLM
6. Q&A uses paper content as context

**Key Files:**
- `page.tsx` - Main component
- `reducers.ts` - State management
- `utils/paperFetcher.ts` - Multi-source paper fetching

### Query Craft

**Purpose:** Natural language to SQL translation

**Data Flow:**
1. User builds schema (tables, columns, types, foreign keys)
2. User enters natural language query
3. Schema + query sent to LLM with JSON mode
4. Response parsed for `{ sql, explanation }`
5. SQL syntax highlighted and displayed

**Features:**
- 4 SQL dialects (PostgreSQL, MySQL, SQLite, SQL Server)
- Preset schemas (e-commerce, social media)
- URL hash for shareable queries
- localStorage persistence

### Data Forge

**Purpose:** Generate realistic test data from schema

**Data Flow:**
1. User defines schema with relationships
2. Dependency graph built (parent tables first)
3. Tables generated in parallel at each dependency level
4. LLM generates contextually-aware data
5. Export to SQL INSERT, JSON, or CSV

**Key Feature:** Dependency-aware generation ensures foreign keys reference existing rows.

### Classify Anything

**Purpose:** Zero-shot text classification

**Data Flow:**
1. User defines custom labels
2. User enters text to classify
3. MobileBERT model loaded (cached in IndexedDB)
4. Zero-shot inference returns confidence per label
5. Results displayed as ranked list

**Key Feature:** Runs entirely in browser - no data leaves device.

---

## State Management

### Pattern: useReducer + Types

Each demo follows this pattern:

```typescript
// types.ts
interface State {
  // Demo-specific state
}

type Action =
  | { type: "SET_X"; payload: X }
  | { type: "CLEAR" }
  | { type: "ADD_ITEM"; payload: Item };

// reducers.ts
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_X":
      return { ...state, x: action.payload };
    // ...
  }
}

// page.tsx
const [state, dispatch] = useReducer(reducer, initialState);
```

### Persistence Strategies

| Strategy | Used By | Purpose |
|----------|---------|---------|
| URL Hash | Query Craft, Data Forge | Shareable state |
| localStorage | Query Craft | Persist schema/history |
| In-memory | Paper Pilot | Session-only |

### URL State Encoding

```typescript
// Encode state to URL
const encoded = btoa(JSON.stringify(state));
window.location.hash = encoded;

// Decode state from URL
const decoded = JSON.parse(atob(window.location.hash.slice(1)));
```

---

## Deployment

### Cloudflare Pages

**Build Configuration:**
- Framework: Next.js (Static Export)
- Build command: `npm run build`
- Output directory: `out`

**Environment Secrets:**
```
OPENROUTER_API_KEY_01
OPENROUTER_API_KEY_02
...
OPENROUTER_API_KEY_10
```

### Static Export

Next.js configured for static export:

```typescript
// next.config.ts
const config = {
  output: "export",
  images: { unoptimized: true },
};
```

All pages pre-rendered at build time. Client-side hydration enables interactivity.

### CI/CD

1. Push to `main` branch
2. Cloudflare Pages auto-builds
3. Functions deployed to edge
4. Static assets served from CDN

### Development vs Production

| Aspect | Development | Production |
|--------|-------------|------------|
| API calls | Proxy through rusen.ai | Direct to /api/* |
| Functions | Not available locally | Cloudflare Workers |
| Build | `next dev` | `next build` (static) |
