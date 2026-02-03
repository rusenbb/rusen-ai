# Voice Morph: Text-Guided Voice Transformation in the Browser

A proposal for building a novel browser-based voice transformation system using aligned pretrained models.

## Executive Summary

**Goal:** Build a browser-native voice transformation system where users describe how they want to sound in natural language (e.g., "deeper and warmer", "vintage radio announcer") and hear their voice transformed accordingly.

**Approach:** Instead of training from scratch, we align existing pretrained models with a small adapter layer:
- Use pretrained speech encoders (HuBERT/ContentVec) for content extraction
- Use pretrained CLAP for text-to-audio alignment
- Use pretrained vocoders (Vocos/HiFi-GAN) for audio reconstruction
- Train only a tiny adapter (~5-10MB) that bridges text descriptions to voice modifications

**Why this is novel:** No one has built a browser-ready, text-guided voice conversion system. Existing solutions either require heavy Python backends (RVC, OpenVoice) or are limited to basic DSP effects.

---

## Problem Statement

### Current Landscape

| Approach | Quality | Browser? | Text-Guided? |
|----------|---------|----------|--------------|
| Web Audio DSP (pitch, reverb) | Low | Yes | No (sliders) |
| RVC / So-VITS-SVC | High | No (~1GB+) | No (voice targets) |
| OpenVoice / CosyVoice | High | No (Python) | Partial |
| API Services (ElevenLabs) | High | Yes (API) | Yes |
| **Our Approach** | Medium-High | **Yes (~100-200MB)** | **Yes** |

### The Gap

Users want to say "make me sound like a mysterious narrator" and have it work. Current browser options are:
1. **DSP effects** - Can't truly transform voice characteristics
2. **Upload-to-API** - Not self-contained, privacy concerns, costs money

---

## Proposed Solution

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           VOICE MORPH ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   User's Voice ──────────────────────────────────────────────────────────┐   │
│        │                                                                 │   │
│        ▼                                                                 │   │
│   ┌─────────────────┐                                                    │   │
│   │ Content Encoder │  Pretrained: HuBERT or ContentVec (~95MB)          │   │
│   │    (Frozen)     │  Extracts speaker-independent content features     │   │
│   └────────┬────────┘                                                    │   │
│            │                                                             │   │
│            ▼                                                             │   │
│   Content Features (768-dim per frame)                                   │   │
│            │                                                             │   │
│            │         ┌─────────────────────────────────────────────┐     │   │
│            │         │              ADAPTER MODULE                 │     │   │
│            │         │           (This is what we train)           │     │   │
│            │         │              ~5-10MB total                  │     │   │
│            │         ├─────────────────────────────────────────────┤     │   │
│            │         │                                             │     │   │
│            └────────►│   ┌─────────────┐    ┌─────────────┐       │     │   │
│                      │   │   Content   │    │    Text     │       │     │   │
│                      │   │  Projection │    │  Projection │       │     │   │
│   "deeper, warmer"   │   │  (Linear)   │    │  (Linear)   │       │     │   │
│         │            │   └──────┬──────┘    └──────┬──────┘       │     │   │
│         │            │          │                  │              │     │   │
│         ▼            │          └────────┬─────────┘              │     │   │
│   ┌───────────┐      │                   │                        │     │   │
│   │   CLAP    │      │                   ▼                        │     │   │
│   │  (Frozen) │──────┼───►      ┌─────────────────┐               │     │   │
│   │  ~300MB   │      │          │  Transformer    │               │     │   │
│   └───────────┘      │          │   (2 layers)    │               │     │   │
│                      │          │  Combines text  │               │     │   │
│                      │          │  + content      │               │     │   │
│                      │          └────────┬────────┘               │     │   │
│                      │                   │                        │     │   │
│                      │                   ▼                        │     │   │
│                      │          Modified Features                 │     │   │
│                      │                                             │     │   │
│                      └─────────────────────────────────────────────┘     │   │
│                                          │                               │   │
│                                          ▼                               │   │
│                                 ┌─────────────────┐                      │   │
│                                 │ Mel Projection  │                      │   │
│                                 │    (Linear)     │                      │   │
│                                 └────────┬────────┘                      │   │
│                                          │                               │   │
│                                          ▼                               │   │
│                                   Mel Spectrogram                        │   │
│                                          │                               │   │
│                                          ▼                               │   │
│                                 ┌─────────────────┐                      │   │
│                                 │     Vocos       │  Pretrained (~10MB)  │   │
│                                 │    (Frozen)     │  Fast neural vocoder │   │
│                                 └────────┬────────┘                      │   │
│                                          │                               │   │
│                                          ▼                               │   │
│                                 Transformed Voice                        │   │
│                                                                          │   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Why This Works

1. **Content Encoder (HuBERT/ContentVec)** - Already trained to extract what you're saying, not who's saying it
2. **CLAP** - Already trained to understand audio-text relationships ("warm", "deep", "bright")
3. **Vocos** - Already trained to reconstruct high-quality audio from mel spectrograms
4. **Adapter** - Only needs to learn: "given these content features and this text description, what mel spectrogram should I produce?"

---

## Technical Deep Dive

### Pretrained Models

#### 1. Content Encoder: ContentVec (Recommended)

[ContentVec](https://github.com/auspicious3000/contentvec) is specifically designed for speaker disentanglement.

| Property | Value |
|----------|-------|
| Base | HuBERT architecture |
| Parameters | ~95M (base), ~317M (large) |
| Output | 768-dim features per frame |
| Speaker Leakage | 5.20% (lowest among SSL models) |
| ONNX Available | Yes (can convert) |

**Why ContentVec over HuBERT?**
- Explicitly trained to remove speaker information
- Uses voice conversion during training to disentangle content
- Better for our use case where we want to modify speaker characteristics

**Alternative:** Use middle layers (7-12) of HuBERT/WavLM which contain more content than speaker info.

#### 2. Text Encoder: CLAP

[CLAP (Contrastive Language-Audio Pretraining)](https://github.com/LAION-AI/CLAP) maps text and audio to a shared embedding space.

| Property | Value |
|----------|-------|
| Model | laion/clap-htsat-fused |
| Parameters | ~150M |
| Text Embedding | 512-dim |
| Audio Embedding | 512-dim |
| ONNX Available | Yes ([Xenova/clap-htsat-unfused](https://huggingface.co/Xenova/clap-htsat-unfused)) |

**Key Insight from [Text2FX](https://arxiv.org/abs/2409.18847):**
- CLAP embeddings encode meaningful audio attributes
- Directional manipulation in CLAP space works: `audio_embed + α * text_direction`
- Can find "directions" for concepts like "warm", "bright", "deep"

#### 3. Vocoder: Vocos

[Vocos](https://huggingface.co/wetdog/vocos-mel-24khz-onnx) is a fast, lightweight vocoder.

| Property | Value |
|----------|-------|
| Parameters | ~5-10M |
| Speed | Real-time capable |
| Input | 80-bin mel spectrogram |
| Output | 24kHz audio |
| ONNX Available | Yes |

**Why Vocos over HiFi-GAN?**
- Faster (predicts spectral coefficients, not waveform)
- Smaller model size
- ONNX version readily available

### The Adapter Module

This is the **only part we train**:

```python
class VoiceMorphAdapter(nn.Module):
    def __init__(
        self,
        content_dim: int = 768,      # ContentVec output
        text_dim: int = 512,          # CLAP text embedding
        hidden_dim: int = 512,
        mel_dim: int = 80,            # Vocos input
        num_layers: int = 2,
    ):
        super().__init__()

        # Project content features to hidden dim
        self.content_proj = nn.Linear(content_dim, hidden_dim)

        # Project text embedding to hidden dim
        self.text_proj = nn.Linear(text_dim, hidden_dim)

        # Small transformer to combine content + text guidance
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=hidden_dim,
            nhead=8,
            dim_feedforward=hidden_dim * 4,
            batch_first=True,
        )
        self.transformer = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)

        # Project to mel spectrogram
        self.mel_proj = nn.Linear(hidden_dim, mel_dim)

    def forward(
        self,
        content_features: Tensor,    # [B, T, 768] from ContentVec
        text_embedding: Tensor,      # [B, 512] from CLAP
    ) -> Tensor:
        # Project content
        content = self.content_proj(content_features)  # [B, T, 512]

        # Project and expand text embedding to sequence length
        text = self.text_proj(text_embedding)          # [B, 512]
        text = text.unsqueeze(1).expand(-1, content.size(1), -1)  # [B, T, 512]

        # Combine via addition (can also try concatenation + projection)
        combined = content + text  # [B, T, 512]

        # Transform
        transformed = self.transformer(combined)  # [B, T, 512]

        # Project to mel
        mel = self.mel_proj(transformed)  # [B, T, 80]

        return mel
```

**Parameter Count:**
- content_proj: 768 × 512 = 393K
- text_proj: 512 × 512 = 262K
- transformer (2 layers): ~4.2M
- mel_proj: 512 × 80 = 41K
- **Total: ~5M parameters (~20MB fp32, ~5MB int8)**

---

## Training Strategy

### Dataset Requirements

We need pairs of: `(voice_a, voice_b, text_description)` where `text_description` describes how `voice_b` differs from `voice_a`.

**Data Sources:**

| Dataset | Size | Use Case |
|---------|------|----------|
| [VCTK](https://datashare.ed.ac.uk/handle/10283/3443) | 44 hours, 110 speakers | Same sentences, different speakers |
| [LibriSpeech](https://www.openslr.org/12) | 1000 hours | Diverse content |
| [Expresso](https://speechbot.github.io/expresso/) | Emotional speech | Same speaker, different emotions |
| [DAPS](https://archive.org/details/daps_dataset) | Different recording conditions | Same speaker, different acoustics |

**Synthetic Data Generation:**

```python
# Generate training pairs using existing TTS
def generate_pair(text: str, speaker_a: str, speaker_b: str) -> Tuple[Audio, Audio, str]:
    voice_a = tts.synthesize(text, speaker=speaker_a)
    voice_b = tts.synthesize(text, speaker=speaker_b)

    # Generate description using speaker metadata or audio analysis
    description = describe_difference(voice_a, voice_b)
    # e.g., "deeper voice with more resonance"

    return voice_a, voice_b, description
```

### Training Loop

```python
def train_step(batch):
    voice_source, voice_target, description = batch

    # Extract content from source (frozen)
    with torch.no_grad():
        content_features = content_encoder(voice_source)
        text_embedding = clap.encode_text(description)
        target_mel = mel_spectrogram(voice_target)

    # Only adapter has gradients
    predicted_mel = adapter(content_features, text_embedding)

    # Reconstruction loss
    mel_loss = F.l1_loss(predicted_mel, target_mel)

    # Optional: CLAP consistency loss
    # Ensure the output audio matches the text description in CLAP space
    with torch.no_grad():
        reconstructed = vocoder(predicted_mel)
        output_embedding = clap.encode_audio(reconstructed)
    clap_loss = 1 - F.cosine_similarity(output_embedding, text_embedding).mean()

    loss = mel_loss + 0.1 * clap_loss

    return loss
```

### Training Configuration

| Parameter | Value |
|-----------|-------|
| Batch Size | 16-32 |
| Learning Rate | 1e-4 (AdamW) |
| Training Steps | 50K-100K |
| GPU | Single RTX 3090/4090 or A100 |
| Estimated Time | 4-12 hours |
| Estimated Cost | ~$10-50 (cloud GPU) |

---

## Browser Deployment

### Model Sizes (Estimated)

| Component | Original | Quantized (int8) | Source |
|-----------|----------|------------------|--------|
| ContentVec (base) | 380 MB | ~95 MB | Convert from HF |
| CLAP (text only) | 600 MB | ~150 MB | Xenova/clap-htsat-unfused |
| Adapter | 20 MB | ~5 MB | Our trained model |
| Vocos | 40 MB | ~10 MB | wetdog/vocos-mel-24khz-onnx |
| **Total** | **1040 MB** | **~260 MB** | |

**Optimization strategies:**
- Use CLAP text encoder only (don't need audio encoder at inference)
- Quantize to int8/fp16
- Use smaller ContentVec variant if available
- Consider model distillation

### Transformers.js Integration

```typescript
// voice-morph.ts
import { pipeline, env } from '@huggingface/transformers';

class VoiceMorph {
  private contentEncoder: any;
  private clapTextEncoder: any;
  private adapter: any;
  private vocoder: any;

  async load(onProgress?: (progress: number) => void) {
    // Load models in parallel
    const [content, clap, adapter, vocoder] = await Promise.all([
      this.loadONNX('contentvec-base', onProgress),
      this.loadONNX('clap-text-encoder', onProgress),
      this.loadONNX('voice-morph-adapter', onProgress),
      this.loadONNX('vocos-mel-24khz', onProgress),
    ]);

    this.contentEncoder = content;
    this.clapTextEncoder = clap;
    this.adapter = adapter;
    this.vocoder = vocoder;
  }

  async transform(audioBuffer: Float32Array, description: string): Promise<Float32Array> {
    // 1. Extract content features
    const contentFeatures = await this.contentEncoder.run(audioBuffer);

    // 2. Encode text description
    const textEmbedding = await this.clapTextEncoder.run(description);

    // 3. Run adapter to get modified mel spectrogram
    const mel = await this.adapter.run({
      content: contentFeatures,
      text: textEmbedding,
    });

    // 4. Reconstruct audio with vocoder
    const output = await this.vocoder.run(mel);

    return output;
  }
}
```

### Audio Pipeline

```typescript
// Real-time audio processing
class VoiceMorphProcessor extends AudioWorkletProcessor {
  private morph: VoiceMorph;
  private buffer: Float32Array[] = [];
  private chunkSize = 4096; // ~170ms at 24kHz

  process(inputs: Float32Array[][], outputs: Float32Array[][]) {
    const input = inputs[0][0];
    this.buffer.push(input);

    // Process in chunks
    if (this.getTotalSamples() >= this.chunkSize) {
      const chunk = this.getChunk();
      this.morph.transform(chunk, this.description).then(output => {
        this.outputQueue.push(output);
      });
    }

    // Output processed audio
    if (this.outputQueue.length > 0) {
      outputs[0][0].set(this.outputQueue.shift());
    }

    return true;
  }
}
```

---

## Alternative Approaches

### Approach A: CLAP Direction Vectors (Simpler)

Instead of training an adapter, pre-compute "directions" in CLAP space:

```python
# Pre-compute direction for "deep voice"
deep_samples = load_audio_samples("deep_voices/*.wav")
normal_samples = load_audio_samples("normal_voices/*.wav")

deep_centroid = mean([clap.encode_audio(s) for s in deep_samples])
normal_centroid = mean([clap.encode_audio(s) for s in normal_samples])

deep_direction = deep_centroid - normal_centroid

# At runtime: find audio features that match target embedding
target_embedding = clap.encode_audio(source) + alpha * deep_direction
```

**Pros:** No training needed, conceptually simple
**Cons:** Limited to predefined attributes, can't handle arbitrary prompts

### Approach B: Diffusion-Based (Higher Quality)

Use a diffusion model similar to [Seed-VC](https://github.com/Plachtaa/seed-vc):

```
Content Features + Text Embedding → DiT → Mel Spectrogram
```

**Pros:** Higher quality, more flexible
**Cons:** Larger model (~200-400MB), slower inference (multiple denoising steps)

### Approach C: Neural Codec Tokens (Most Flexible)

Use EnCodec/DAC tokens instead of mel spectrograms:

```
Audio → EnCodec Encoder → Tokens → Adapter → Modified Tokens → EnCodec Decoder → Audio
```

**Pros:** More information preserved, potentially higher quality
**Cons:** EnCodec ONNX conversion is challenging, larger pipeline

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| ONNX conversion fails | Medium | High | Fallback to API-based inference |
| Model too large for browser | Medium | High | Aggressive quantization, model pruning |
| Quality insufficient | Medium | Medium | Increase adapter size, add diffusion |
| Training doesn't converge | Low | High | Use proven architectures, more data |
| Latency too high | Medium | Medium | Chunk-based processing, WebWorker |

---

## Implementation Timeline

### Phase 1: Feasibility Prototype (1-2 weeks)

- [ ] Convert ContentVec to ONNX and test in browser
- [ ] Test CLAP text encoder in Transformers.js
- [ ] Convert Vocos to ONNX and test
- [ ] Build minimal pipeline: content → identity mel → vocoder
- [ ] Verify end-to-end audio quality

### Phase 2: Adapter Training (2-3 weeks)

- [ ] Prepare training dataset (VCTK + synthetic)
- [ ] Implement adapter architecture
- [ ] Train adapter with mel reconstruction loss
- [ ] Add CLAP consistency loss
- [ ] Evaluate on held-out test set
- [ ] Export to ONNX

### Phase 3: Browser Integration (1-2 weeks)

- [ ] Build Transformers.js wrapper
- [ ] Implement AudioWorklet for real-time processing
- [ ] Add model caching (IndexedDB)
- [ ] Build demo UI
- [ ] Performance optimization

### Phase 4: Demo Polish (1 week)

- [ ] Add preset prompts ("radio announcer", "whispered", etc.)
- [ ] Visualize transformation (before/after spectrograms)
- [ ] Add manual fine-tuning controls
- [ ] Write documentation

**Total: 5-8 weeks**

---

## Success Criteria

### Minimum Viable Product

1. User can record 5-10 seconds of audio
2. User can type a transformation prompt
3. System produces transformed audio in <5 seconds
4. Transformed audio is intelligible (same words)
5. Transformation is perceptible (sounds different)
6. Works entirely in browser (no API calls)

### Stretch Goals

1. Real-time processing (<500ms latency)
2. Quality comparable to Seed-VC
3. Model size <150MB total
4. Support for multiple languages

---

## References

### Key Papers

1. **ContentVec** - [An Improved Self-Supervised Speech Representation by Disentangling Speakers](https://arxiv.org/abs/2204.09224)
2. **CLAP** - [Large-scale Contrastive Language-Audio Pretraining](https://arxiv.org/abs/2211.06687)
3. **Text2FX** - [Harnessing CLAP Embeddings for Text-Guided Audio Effects](https://arxiv.org/abs/2409.18847)
4. **Seed-VC** - [Zero-shot Voice Conversion with Diffusion Transformers](https://arxiv.org/abs/2411.09943)
5. **AdaptVC** - [High Quality Voice Conversion with Adaptive Learning](https://arxiv.org/abs/2501.01347)
6. **TES-VC** - [Text-Driven Framework for Multi-Attribute Speech Conversion](https://arxiv.org/abs/2506.07036)
7. **Vocos** - [Closing the Gap Between Time-Domain and Fourier-Based Neural Vocoders](https://arxiv.org/abs/2306.00814)

### Code Repositories

- [ContentVec](https://github.com/auspicious3000/contentvec)
- [LAION CLAP](https://github.com/LAION-AI/CLAP)
- [Seed-VC](https://github.com/Plachtaa/seed-vc)
- [Vocos](https://github.com/gemelo-ai/vocos)
- [Transformers.js](https://github.com/huggingface/transformers.js)

### Pretrained Models (Hugging Face)

- [Xenova/clap-htsat-unfused](https://huggingface.co/Xenova/clap-htsat-unfused) - CLAP ONNX
- [wetdog/vocos-mel-24khz-onnx](https://huggingface.co/wetdog/vocos-mel-24khz-onnx) - Vocos ONNX
- [facebook/hubert-base-ls960](https://huggingface.co/facebook/hubert-base-ls960) - HuBERT
- [Xenova/wav2vec2-base-960h](https://huggingface.co/Xenova/wav2vec2-base-960h) - Wav2Vec2 ONNX

---

## Appendix: Example Prompts

The system should handle prompts like:

**Voice Characteristics:**
- "deeper voice"
- "higher pitched"
- "more nasal"
- "breathier"
- "raspier"

**Stylistic:**
- "radio announcer"
- "news anchor"
- "sports commentator"
- "movie trailer narrator"
- "ASMR whisper"

**Emotional:**
- "more excited"
- "calmer"
- "mysterious"
- "authoritative"
- "friendly"

**Environmental:**
- "in a large hall"
- "over the phone"
- "through a walkie-talkie"
- "vintage recording"

**Combined:**
- "deep voice with slight reverb, like a movie villain"
- "bright and energetic, like a morning radio host"
- "warm and intimate, like telling a bedtime story"
