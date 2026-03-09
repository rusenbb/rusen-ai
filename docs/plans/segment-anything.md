# Segment Anything

Text-prompted image segmentation running entirely in the browser. No backend, no API, no install.

## Goal

Build a page on rusen.ai where anyone can upload an image, type a word like "cat" or "car", and get a pixel-perfect segmentation mask — all running client-side in the browser using SAM3 (Segment Anything Model 3) via ONNX Runtime Web.

This is a portfolio showpiece: a 840M-parameter computer vision model running at production quality in a browser tab, with zero server costs.

## Validated

This plan is backed by a completed validation. The full three-model pipeline was tested:

| Environment | Score | Time | Notes |
|---|---|---|---|
| Python FP32 (CPU) | 0.9471 | 7.61s | Baseline |
| Python INT8 (CPU) | 0.9495 | 4.50s | Quality preserved, 2x faster |
| Browser WASM | 0.9402 | 94.69s | Works. WebGPU not yet tested |

The INT8 quantized models total 888 MB (466 + 387 + 35). Quality is nearly identical to full precision.

Validation code: `~/Desktop/codebase-shared/rusen/sam3-browser-validation/`

## Architecture

Three ONNX models, loaded sequentially, executed in a pipeline:

```
User uploads image
       │
       ▼
┌─────────────────┐
│ Image Encoder    │  466 MB, ViT backbone
│ (sam3_image_encoder.onnx)
└────────┬────────┘
         │ vision_pos_enc, backbone_fpn (6 tensors)
         │
User types text prompt ──────────┐
                                 │
                          ┌──────▼──────────┐
                          │ Language Encoder  │  387 MB, CLIP text encoder
                          │ (sam3_language_encoder.onnx)
                          └──────┬───────────┘
                                 │ text_memory, text_attention_mask (2 tensors)
                                 │
         ┌───────────────────────┘
         │
┌────────▼────────┐
│ Decoder          │  35 MB, DETR-style
│ (sam3_decoder.onnx)
└────────┬────────┘
         │ boxes, scores, masks
         ▼
Canvas overlay (mask + bounding box)
```

Key detail: the image encoder is the bottleneck (85s on WASM, ~3.6s on CPU). Language encoder is fast (0.29s). Decoder is moderate (9.13s on WASM). The image only needs to be encoded once — multiple text prompts can reuse the same image embedding.

## Execution Providers

Priority order:
1. **WebGPU** — fastest, requires Chrome 113+ with WebGPU enabled. On Linux, may need `chrome://flags/#enable-unsafe-webgpu`
2. **WASM** — fallback, works everywhere, 5-15x slower

The page should detect WebGPU availability and show the user which provider is active. If WebGPU is unavailable, show a non-blocking note about how to enable it.

## Model Hosting

Models are static files. Two options:

### Option A: Same-origin (Cloudflare Pages)
- Place models in `public/models/sam3/` or similar
- Cloudflare Pages has a 25 MB per-file limit for free tier

This is a problem. The image encoder is 466 MB and the language encoder is 387 MB. Cloudflare Pages cannot host these directly.

### Decision: HuggingFace Hub
- Upload quantized models to a public HuggingFace repo (`rusen/sam3-browser-int8`)
- Fetch via `https://huggingface.co/rusen/sam3-browser-int8/resolve/main/{file}`
- Free, public CDN, proper CORS headers, unlimited bandwidth
- Models are fetched once and cached by the browser's HTTP cache

## Tokenization

The validation used hardcoded token IDs for common words. Production needs a real CLIP BPE tokenizer.

Options:
1. **Port the CLIP tokenizer to JS** — the vocab is ~49K tokens, the BPE merges file is ~500 KB. This is a one-time implementation
2. **Use an existing JS CLIP tokenizer** — `@anthropic-ai/tokenizer` won't work (different tokenizer). `clip-bpe-js` or similar packages exist
3. **Bundle the Python tokenizer output** — pre-tokenize a vocabulary of common words server-side, ship as JSON lookup

Recommended: Option 1. The CLIP tokenizer is well-documented (OpenAI published the BPE merges). A standalone ~200-line JS implementation covers it. Ship `bpe_simple_vocab_16e6.txt.gz` (~1.3 MB compressed) alongside the models.

## UI Design

### Layout

```
┌──────────────────────────────────────────────┐
│  Segment Anything                             │
│  Text-prompted segmentation in your browser   │
├──────────────────────────────────────────────┤
│                                              │
│  ┌──────────────────────────────────────┐    │
│  │                                      │    │
│  │           Image Canvas               │    │
│  │    (drag & drop / click to upload)   │    │
│  │                                      │    │
│  └──────────────────────────────────────┘    │
│                                              │
│  ┌──────────────────┐  ┌─────────────────┐   │
│  │ 🔍 cat           │  │  Segment        │   │
│  └──────────────────┘  └─────────────────┘   │
│                                              │
│  ┌──────────────────────────────────────┐    │
│  │  Status: Image encoded (3.2s)        │    │
│  │  Provider: WebGPU (NVIDIA RTX 5070)  │    │
│  └──────────────────────────────────────┘    │
│                                              │
├──────────────────────────────────────────────┤
│  Models: ████████████░░ 72% (640/888 MB)     │
└──────────────────────────────────────────────┘
```

### Interaction Flow

1. **First visit**: Show a "Load Models" button. Display model sizes and estimated download time. User must opt-in (888 MB is not a casual download).

2. **Model loading**: Show per-model progress bars. Once loaded, models are cached — subsequent visits skip download.

3. **Image upload**: Drag-and-drop or file picker. Show the image on canvas. Automatically run the image encoder. Show encoding progress/time.

4. **Text prompt**: Type a word or phrase. Hit Enter or click Segment. Runs language encoder + decoder. Show results in ~1-10s depending on provider.

5. **Results**: Overlay the segmentation mask on the image with semi-transparent color. Show bounding box. Show confidence score. Allow toggling mask visibility.

6. **Re-prompt**: User types a different word. Only language encoder + decoder run (image embedding is cached). This should be fast (~10s WASM, ~1-2s WebGPU).

### Key UX Decisions

- **No automatic model loading on page load** — 888 MB must be opt-in
- **Cache image embeddings** — re-prompting the same image should be instant for the encoder step
- **Show timing breakdowns** — users should see what's happening and how long each step takes
- **Graceful degradation** — WASM fallback works everywhere, just slower
- **Mobile note** — 888 MB models won't work well on mobile. Show a note for small screens

## State Management

```ts
type State = {
  // Model loading
  modelsStatus: 'idle' | 'downloading' | 'creating-sessions' | 'ready' | 'error';
  downloadProgress: { encoder: number; language: number; decoder: number }; // 0-100
  executionProvider: 'webgpu' | 'wasm' | null;

  // Image
  imageFile: File | null;
  imageEncoded: boolean;
  imageEncodingTime: number | null;

  // Prompt
  textPrompt: string;

  // Inference
  inferenceStatus: 'idle' | 'encoding-image' | 'encoding-text' | 'decoding' | 'done' | 'error';
  results: {
    scores: number[];
    boxes: number[][];
    masks: Float32Array | null;
    timings: { imageEncoder: number; languageEncoder: number; decoder: number };
  } | null;

  // Error
  error: string | null;
};
```

Use `useReducer` following the project convention.

## File Structure

```
src/app/demos/segment-anything/
  page.tsx                 # Main page component
  types.ts                 # State, Action types, initialState
  reducers.ts              # Pure reducer
  components/
    ModelLoader.tsx         # Download progress, load button
    ImageCanvas.tsx         # Canvas with drag-drop, mask overlay
    PromptInput.tsx         # Text input + segment button
    ResultsPanel.tsx        # Scores, timings, provider info
    StatusBar.tsx           # Current operation status
  utils/
    onnx.ts                # Model loading, session management
    tokenizer.ts           # CLIP BPE tokenizer
    imageProcessing.ts     # Resize, RGBA→RGB CHW conversion
    maskOverlay.ts         # Render mask on canvas
  workers/
    inference.worker.ts    # Web Worker for heavy inference (optional)
  __tests__/
    reducers.test.ts
    tokenizer.test.ts
```

## Project Registration

Add to `src/lib/projects.ts`:

```ts
{
  id: "segment-anything",
  title: "Segment Anything",
  slug: "segment-anything",
  collection: "demos",
  status: "live",
  summary: "Type what you see. Get pixel-perfect masks. 840M-param SAM3 running entirely in your browser.",
  description: "Text-prompted image segmentation via SAM3, fully client-side with ONNX Runtime Web.",
  tags: ["Computer Vision", "SAM3", "ONNX", "WebGPU"],
  domains: ["CV"],
  capabilities: ["Segmentation", "Zero-shot"],
  tech: ["SAM3", "ONNX Runtime Web", "WebGPU", "WASM"],
  order: 5,
  featuredHome: true,
}
```

Order 5 puts it first in the demos list. `featuredHome: true` because this is a flagship project — the first CV demo on the site, and running an 840M model in-browser is genuinely impressive.

## CLIP Tokenizer Implementation

The tokenizer needs:
1. Load the BPE vocabulary file (~49K tokens, ~1.3 MB gzipped)
2. Byte-pair encoding logic (standard BPE algorithm)
3. Special tokens: `<|startoftext|>` (49406), `<|endoftext|>` (49407)
4. Max context length: 32 tokens (SAM3's language encoder input)

The algorithm:
1. Lowercase input, split on whitespace + punctuation
2. Convert each word to UTF-8 bytes, then to the BPE byte-to-unicode mapping
3. Iteratively merge the most frequent pair according to the merge table
4. Map final tokens to integer IDs
5. Pad to 32 with zeros, prepend start token, append end token

Reference: OpenAI's `simple_tokenizer.py` from the original CLIP repo. It's ~80 lines of Python. The JS port will be similar.

## Implementation Sequence

### Phase 1: Foundation
1. Register project in `projects.ts`
2. Create directory structure
3. Set up types, reducer, and basic page layout
4. Implement image upload with drag-drop and canvas display

### Phase 2: Model Infrastructure
5. Implement model fetching with progress (reuse validated `fetchModel` pattern)
6. Add WebGPU detection and provider selection
7. Create ONNX session management (load, cache, dispose)
8. Upload quantized models to Cloudflare R2 or HuggingFace

### Phase 3: Inference Pipeline
9. Port CLIP BPE tokenizer to TypeScript
10. Implement image preprocessing (resize to 1008x1008, RGBA→RGB CHW)
11. Wire up full pipeline: encode image → encode text → decode → results
12. Cache image embeddings for re-prompting

### Phase 4: Visualization
13. Implement mask overlay rendering on canvas
14. Add bounding box drawing
15. Show confidence scores and timing breakdowns
16. Add mask toggle and opacity controls

### Phase 5: Polish
17. Add loading states and error handling
18. Mobile/small-screen warning
19. Browser compatibility notes (WebGPU flag)
20. Performance optimizations (Web Worker for preprocessing, streaming decode)
21. Write tests for reducer and tokenizer

## Performance Expectations

| Step | WASM (validated) | WebGPU (estimated) |
|---|---|---|
| Image encoder | 85s | 5-15s |
| Language encoder | 0.3s | 0.1-0.3s |
| Decoder | 9s | 1-3s |
| **Total** | **94s** | **6-18s** |

WebGPU estimates are based on published onnxruntime-web benchmarks showing 5-15x speedup over WASM for vision transformers. These need to be validated once the user enables WebGPU.

The 6-18s range with WebGPU is genuinely usable. The 94s WASM time is a patience test but still works.

## Risks

### Model size (888 MB download)
Mitigation: explicit opt-in, progress bars, browser caching. After first load, models are cached. Consider a Service Worker for persistent caching.

### WebGPU availability
Mitigation: WASM fallback works everywhere. Clear messaging about enabling WebGPU for better performance.

### int64 on WebGPU
WebGPU doesn't support int64 natively. The validation showed WASM fallback handles this transparently via onnxruntime-web's automatic operator partitioning. No code changes needed.

### CLIP tokenizer accuracy
The validation used hardcoded tokens. A full BPE implementation must produce identical token IDs. Mitigation: compare JS tokenizer output against Python `osam` tokenizer for a set of test words before shipping.

### Memory pressure
888 MB of model weights + intermediate tensors. May cause issues on machines with < 8 GB RAM. Mitigation: show memory usage, dispose sessions when navigating away.

### Cloudflare Pages file size limit
25 MB per file on free tier. Models are 35-466 MB each. Cannot host on Pages directly. Must use R2, HuggingFace, or another CDN.

## Naming

Working title: **Segment Anything**

It's direct, immediately communicates what it does, and the "Anything" suffix matches the existing "Classify Anything" in the portfolio. The connection to Meta's SAM (Segment Anything Model) is a feature, not a bug — users who know SAM will be impressed it's running in their browser.

Alternatives:
- `Segment It` — shorter, punchier
- `Text2Mask` — technical, describes the I/O
- `Mask Anything` — variant
