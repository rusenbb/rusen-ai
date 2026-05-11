export type ProjectCollection = "demos" | "nerdy-stuff" | "bulletin";
export type ProjectStatus = "live" | "coming-soon";

export type ProjectMeta = {
  id: string;
  title: string;
  slug: string;
  collection: ProjectCollection;
  status: ProjectStatus;
  summary: string;
  description: string;
  tags: string[];
  domains: string[];
  capabilities: string[];
  tech: string[];
  order: number;
  featuredHome?: boolean;
  repoUrl?: string;
  homepageUrl?: string;
  releaseUrl?: string;
  installCmd?: string;
  platform?: string[];
};

export const PROJECTS: ProjectMeta[] = [
  {
    id: "classify-anything",
    title: "Classify Anything",
    slug: "classify-anything",
    collection: "demos",
    status: "live",
    summary:
      "Zero-shot text classification. Define your own classes, paste any text, get predictions.",
    description: "Zero-shot text classification in the browser.",
    tags: ["Zero-shot", "Transformers.js"],
    domains: ["NLP"],
    capabilities: ["Classification"],
    tech: ["Transformers.js", "MobileBERT"],
    order: 40,
    featuredHome: true,
  },
  {
    id: "segment-anything",
    title: "Segment Anything",
    slug: "segment-anything",
    collection: "demos",
    status: "live",
    summary:
      "Click any object in an image to instantly segment it. SAM 2.1 running entirely in your browser via WebAssembly.",
    description:
      "Interactive image segmentation with SAM 2.1 Tiny, running locally via WASM.",
    tags: ["Segmentation", "SAM", "Transformers.js"],
    domains: ["CV"],
    capabilities: ["Segmentation"],
    tech: ["SAM 2.1", "Transformers.js", "WASM"],
    order: 45,
    featuredHome: true,
  },
  {
    id: "voice-storm",
    title: "Voice Storm",
    slug: "voice-storm",
    collection: "demos",
    status: "live",
    summary:
      "Talk into your microphone. The waveform pulses with your voice and Whisper Tiny transcribes locally — nothing leaves the browser.",
    description:
      "In-browser speech-to-text via Whisper Tiny on WebAssembly, with a live amplitude visualization.",
    tags: ["Audio", "Whisper", "Speech-to-Text"],
    domains: ["Audio"],
    capabilities: ["Transcription", "Live"],
    tech: ["Whisper Tiny", "Web Audio API", "Transformers.js", "WASM"],
    order: 55,
    featuredHome: true,
  },
  {
    id: "vision-anything",
    title: "Vision Anything",
    slug: "vision-anything",
    collection: "demos",
    status: "live",
    summary:
      "Zero-shot image classification. Drop an image, type the labels you care about, see how a CLIP-class model ranks them.",
    description: "Zero-shot image classification with custom labels via CLIP.",
    tags: ["Vision", "CLIP", "Zero-shot"],
    domains: ["CV"],
    capabilities: ["Classification"],
    tech: ["CLIP", "Transformers.js", "WASM"],
    order: 47,
    featuredHome: true,
  },
  {
    id: "pulse-board",
    title: "Pulse Board",
    slug: "pulse-board",
    collection: "demos",
    status: "live",
    summary:
      "Live dashboard with real-time WebSocket crypto prices, Chainlink oracle, earthquakes, weather, and more.",
    description: "Live multi-signal dashboard (crypto, weather, quakes, etc.).",
    tags: ["WebSocket", "Blockchain", "Real-time"],
    domains: ["Data Engineering"],
    capabilities: ["Streaming", "Visualization"],
    tech: ["WebSockets", "Chainlink", "Public APIs"],
    order: 60,
    featuredHome: true,
  },
  {
    id: "voice-morph",
    title: "Voice Morph",
    slug: "voice-morph",
    collection: "demos",
    status: "coming-soon",
    summary:
      "Prompt-guided voice transformation. Change how audio sounds with text descriptions.",
    description: "Prompt-guided voice transformation.",
    tags: ["Audio", "Gradio", "Advanced"],
    domains: ["Audio"],
    capabilities: ["Generation", "Transformation"],
    tech: ["Audio models", "Gradio"],
    order: 70,
  },
  {
    id: "emergence",
    title: "Emergence",
    slug: "emergence",
    collection: "nerdy-stuff",
    status: "live",
    summary:
      "Simple rules, complex behavior. An interactive essay on cellular automata, synchrony, segregation, highways, and critical cascades.",
    description:
      "A guided, interactive exploration of emergence through six systems: Elementary CA, Game of Life, firefly synchronization, Schelling's Segregation, Langton's Ant, and Flocking.",
    tags: ["Emergence", "Interactive Essay", "Simulation"],
    domains: ["Computational Tools"],
    capabilities: ["Simulation", "Visualization"],
    tech: ["Canvas 2D", "Cellular Automata"],
    order: 9,
    featuredHome: true,
  },
  {
    id: "game-of-life",
    title: "Game of Life",
    slug: "game-of-life",
    collection: "nerdy-stuff",
    status: "live",
    summary:
      "The interactive cellular automata world that used to run as the site background, now as a standalone playground.",
    description: "Interactive cellular automata world and camera controls.",
    tags: ["Cellular Automata", "Visualization", "Interactive"],
    domains: ["Computational Tools"],
    capabilities: ["Simulation", "Rendering"],
    tech: ["Canvas", "Custom renderer"],
    order: 10,
  },
  {
    id: "embedding-explorer",
    title: "Embedding Explorer",
    slug: "embedding-explorer",
    collection: "nerdy-stuff",
    status: "live",
    summary:
      "Visualize how texts cluster in vector space using UMAP. See semantic similarity in action.",
    description: "Visual semantic geometry with embedding vectors + UMAP.",
    tags: ["Embeddings", "UMAP", "Transformers.js"],
    domains: ["NLP"],
    capabilities: ["Visualization", "Vector Arithmetic"],
    tech: ["Transformers.js", "UMAP"],
    order: 20,
    featuredHome: true,
  },
  {
    id: "rusenizer",
    title: "Rusenizer",
    slug: "rusenizer",
    collection: "nerdy-stuff",
    status: "live",
    summary:
      "My Turkish-optimized tokenizer. Compare with GPT-4 and see ~45% token savings on Turkish text.",
    description: "Turkish-focused tokenizer experimentation playground.",
    tags: ["Tokenization", "NLP", "Turkish"],
    domains: ["NLP"],
    capabilities: ["Tokenization", "Benchmarking"],
    tech: ["BPE", "WASM"],
    order: 30,
    featuredHome: true,
  },
  {
    id: "adaptive-arena",
    title: "RL-Arena",
    slug: "adaptive-arena",
    collection: "demos",
    status: "live",
    summary:
      "Fight trained bots in a full 30x30 tactical arena with checkpoint-based difficulties.",
    description:
      "2D tactical duel with trained RL checkpoints, pickups, hazards, and interpretable policy signals.",
    tags: ["Reinforcement Learning", "Games", "Visualization"],
    domains: ["RL", "Computational Tools"],
    capabilities: ["Simulation", "Inference"],
    tech: ["React", "Canvas", "DQN"],
    order: 80,
  },
  {
    id: "attention-heatmap",
    title: "Attention Heatmap",
    slug: "attention-heatmap",
    collection: "nerdy-stuff",
    status: "coming-soon",
    summary:
      "Visualize where transformer models look when processing text. See attention patterns.",
    description: "Transformer attention visualization toolkit.",
    tags: ["Attention", "Transformers", "Visualization"],
    domains: ["NLP"],
    capabilities: ["Visualization", "Interpretability"],
    tech: ["Transformers"],
    order: 50,
  },
  {
    id: "steering-llms",
    title: "Steering LLMs",
    slug: "steering-llms",
    collection: "nerdy-stuff",
    status: "coming-soon",
    summary:
      "Probe whether concepts can be induced, strengthened, or redirected inside a model with steering and interpretability tools.",
    description:
      "Concept steering and intervention playground for local language models.",
    tags: ["LLM", "Interpretability", "Steering"],
    domains: ["NLP"],
    capabilities: ["Interpretability", "Control"],
    tech: ["Local LLM", "Transformers.js"],
    order: 60,
  },
  {
    id: "sentence-surgeon",
    title: "Sentence Surgeon",
    slug: "sentence-surgeon",
    collection: "nerdy-stuff",
    status: "live",
    summary:
      "Click any word to remove it. A small BERT predicts what should fill the gap, ranked with probabilities. Click a prediction to graft it in.",
    description:
      "Masked-language-model playground using DistilBERT in the browser; mask a word, see top-K predictions, graft them into the sentence.",
    tags: ["NLP", "BERT", "Masked LM", "Interactive"],
    domains: ["NLP"],
    capabilities: ["Inference", "Visualization"],
    tech: ["DistilBERT", "Transformers.js", "WASM"],
    order: 22,
    featuredHome: true,
  },
  {
    id: "rusen-gram",
    title: "RuseN-Gram",
    slug: "rusen-gram",
    collection: "nerdy-stuff",
    status: "coming-soon",
    summary:
      "My personal N-Gram model. Old school meets new school language modeling.",
    description: "Classic N-gram language modeling playground.",
    tags: ["N-Gram", "Classic ML"],
    domains: ["NLP"],
    capabilities: ["Language Modeling"],
    tech: ["N-grams"],
    order: 80,
  },
  {
    id: "eduport",
    title: "Eduport",
    slug: "eduport",
    collection: "bulletin",
    status: "live",
    summary:
      "Single-user desktop app for tracking university applications. Storage is plain Markdown + YAML, sync-friendly and Obsidian-compatible.",
    description:
      "Tauri + SvelteKit + Python desktop app for tracking universities, programs, labs, applications, and the documents and emails connecting them.",
    tags: ["Tauri", "SvelteKit", "Rust", "Python", "Desktop"],
    domains: ["Desktop", "Productivity"],
    capabilities: ["Local-first", "Markdown-native"],
    tech: ["Tauri 2", "SvelteKit", "FastAPI", "SQLite FTS5"],
    order: 10,
    repoUrl: "https://github.com/rusenbb/eduport",
    releaseUrl: "https://github.com/rusenbb/eduport/releases/latest",
    platform: ["macOS", "Windows", "Linux"],
  },
  {
    id: "vaultdb",
    title: "vaultdb",
    slug: "vaultdb",
    collection: "bulletin",
    status: "live",
    summary:
      "A database engine for your markdown files. Query, filter, mutate, and traverse Obsidian vaults from the command line.",
    description:
      "Rust CLI that treats folders of .md files as database tables, YAML frontmatter as columns, and [[wiki-links]] as a citation graph.",
    tags: ["Rust", "CLI", "Markdown", "Obsidian"],
    domains: ["Tools", "Knowledge management"],
    capabilities: ["Querying", "Graph traversal"],
    tech: ["Rust", "SQLite-free"],
    order: 20,
    repoUrl: "https://github.com/rusenbb/vaultdb",
    homepageUrl: "https://crates.io/crates/vaultdb",
    installCmd: "cargo install vaultdb",
    platform: ["CLI"],
  },
  {
    id: "metuclass",
    title: "metuclass",
    slug: "metuclass",
    collection: "bulletin",
    status: "live",
    summary:
      "CLI tool to sync ODTUClass course files to your local machine. Tracks changes so subsequent syncs only pull new or updated files.",
    description:
      "Python CLI for incremental sync of METU course materials (PDFs, slides, homeworks) organized by course and section.",
    tags: ["Python", "CLI", "METU"],
    domains: ["Tools"],
    capabilities: ["Incremental sync"],
    tech: ["Python 3.11+"],
    order: 30,
    repoUrl: "https://github.com/rusenbb/metuclass",
    installCmd: "pip install metuclass",
    platform: ["CLI"],
  },
];

export function getProjectPath(project: ProjectMeta): string {
  if (project.collection === "bulletin") {
    return `/bulletin/${project.slug}`;
  }
  return `/${project.slug}`;
}

export function getProjectsByCollection(
  collection: ProjectCollection,
): ProjectMeta[] {
  return PROJECTS.filter((project) => project.collection === collection).sort(
    (a, b) => a.order - b.order,
  );
}

export function getFeaturedProjects(
  collection: ProjectCollection,
  limit: number,
): ProjectMeta[] {
  return getProjectsByCollection(collection)
    .filter((project) => project.featuredHome)
    .slice(0, limit);
}

export function findProjectByKey(key: string): ProjectMeta | undefined {
  return PROJECTS.find((project) => project.id === key || project.slug === key);
}
