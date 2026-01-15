# Learnings & Gotchas

## Qwen3 Think Tags Cause Output Truncation — 2025-01-11 (Updated 2026-01-15)

**Problem**: Qwen3 models emit `<think>...</think>` tags for chain-of-thought reasoning. The model behavior is unpredictable - it may put response inside tags, use multiple tags, or leave tags unclosed.

**Bad approaches**:
```typescript
// V1: Destroys content after unclosed <think> tags
content = content.replace(/<think>[\s\S]*/, "");

// V2: Complex logic that truncates at second <think> tag
const unclosedIndex = result.indexOf("<think>");
result = beforeThink || afterThink; // Misses content after multiple tags
```

**Solution** (in `useWebLLM.ts`) - keep it simple:
```typescript
function stripThinkTags(content: string): string {
  // Remove complete <think>...</think> blocks (non-greedy)
  let result = content.replace(/<think>[\s\S]*?<\/think>/g, "");

  // Remove any remaining orphaned <think> or </think> tags
  result = result.replace(/<\/?think>/g, "");

  return result.trim();
}
```

**Why this works**: Only content inside COMPLETE `<think>...</think>` blocks is removed. All other content is preserved, with just the tag text stripped. Handles all edge cases: unclosed tags, multiple tags, streaming.

**Also**: Append `/no_think` to user prompts to suppress thinking mode (but Qwen3 0.6B often ignores this).

## Semantic Scholar CORS Requires Proxy — 2025-01-11

**Problem**: Semantic Scholar API doesn't allow browser CORS requests.

**Error**: `Access to fetch has been blocked by CORS policy`

**Solution**: Route through Cloudflare Pages Function proxy:
```typescript
const ssUrl = `https://api.semanticscholar.org/graph/v1/paper/...`;
const response = await fetch(`/api/proxy?url=${encodeURIComponent(ssUrl)}`);
```

## arXiv XML Parsing Requires Namespace-Aware Methods — 2025-01-11

**Problem**: arXiv API returns Atom XML. Standard `querySelector` doesn't find elements.

**Bad approach**:
```typescript
doc.querySelector("entry"); // Returns null
```

**Solution**: Use namespace-aware methods:
```typescript
const ATOM_NS = "http://www.w3.org/2005/Atom";
const entries = doc.getElementsByTagNameNS(ATOM_NS, "entry");
```

## PDF.js Memory Leaks Without Cleanup — 2025-01-11

**Problem**: PDF documents weren't being destroyed after text extraction, causing memory leaks.

**Solution**: Always call `pdf.destroy()` in finally block:
```typescript
let pdf = null;
try {
  pdf = await pdfjsLib.getDocument({ url }).promise;
  // ... extract text
} finally {
  if (pdf) {
    try {
      await pdf.destroy();
    } catch {
      // Ignore cleanup errors
    }
  }
}
```

## WebLLM Model Hot-Swap Race Condition — 2025-01-11

**Problem**: Rapid model switching could cause race conditions where two models load simultaneously.

**Solution**: Use loading lock with promise ref:
```typescript
const loadingPromiseRef = useRef<Promise<void> | null>(null);

const loadModel = useCallback(async (modelId: string) => {
  // Wait for any in-progress loading
  if (loadingPromiseRef.current) {
    await loadingPromiseRef.current;
  }

  const loadPromise = (async () => {
    // ... loading logic
  })();

  loadingPromiseRef.current = loadPromise;
  await loadPromise;
  loadingPromiseRef.current = null;
}, []);
```

## State Updates After Unmount Warning — 2025-01-11

**Problem**: WebLLM loading is async. If component unmounts during load, React warns about state updates.

**Solution**: Track mounted state with ref:
```typescript
const isMountedRef = useRef(true);

useEffect(() => {
  isMountedRef.current = true;
  return () => { isMountedRef.current = false; };
}, []);

// In async functions:
if (isMountedRef.current) {
  setIsReady(true);
}
```

## WASM Dynamic Import for SSR Compatibility — 2025-01-11

**Problem**: WASM modules fail during Next.js SSR because `WebAssembly` isn't available server-side.

**Solution**: Dynamic import with blob URL pattern:
```typescript
// Don't import at top level
const wasmModule = await import(/* webpackIgnore: true */ blobUrl);
```

The `webpackIgnore: true` comment prevents Next.js from trying to bundle the dynamic import.

## PDF.js Worker Must Match Library Version — 2025-01-11

**Problem**: PDF.js worker version mismatch causes cryptic errors.

**Solution**: Use version from the imported library:
```typescript
import * as pdfjsLib from "pdfjs-dist";
pdfjsLib.GlobalWorkerOptions.workerSrc =
  `//cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
```

Note: jsDelivr has `.mjs` extension, cdnjs uses `.js`. Use the correct CDN endpoint.

## CrossRef Abstracts Have JATS Tags — 2025-01-11

**Problem**: CrossRef abstracts contain JATS XML tags like `<jats:p>`, `<jats:italic>`.

**Solution**: Strip all JATS and HTML tags:
```typescript
function cleanAbstract(abstract: string | undefined): string | null {
  if (!abstract) return null;
  return abstract
    .replace(/<\/?jats:[^>]+>/g, "")  // JATS tags
    .replace(/<[^>]+>/g, "")           // Other HTML
    .replace(/&lt;/g, "<")             // Entities
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim() || null;
}
```

## Data Forge JSON Response Format — 2025-01-11

**Problem**: LLM sometimes wraps JSON in markdown code blocks or adds explanatory text.

**Solution**: Use WebLLM's structured output with JSON schema:
```typescript
const response = await engine.chat.completions.create({
  messages: [...],
  response_format: { type: "json_object", schema: jsonSchema },
});
```

This forces the model to output valid JSON matching the schema.
