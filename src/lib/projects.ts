export type ProjectCollection = "demos" | "nerdy-stuff";
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
};

export const PROJECTS: ProjectMeta[] = [
  {
    id: "segment-anything",
    title: "Segment Anything",
    slug: "segment-anything",
    collection: "demos",
    status: "live",
    summary:
      "Type what you see. Get pixel-perfect masks. 840M-param SAM3 running entirely in your browser.",
    description:
      "Text-prompted image segmentation via SAM3, fully client-side with ONNX Runtime Web.",
    tags: ["Computer Vision", "SAM3", "ONNX", "WebGPU"],
    domains: ["CV"],
    capabilities: ["Segmentation", "Zero-shot"],
    tech: ["SAM3", "ONNX Runtime Web", "WebGPU", "WASM"],
    order: 5,
    featuredHome: true,
  },
  {
    id: "paper-pilot",
    title: "Paper Pilot",
    slug: "paper-pilot",
    collection: "demos",
    status: "live",
    summary:
      "Enter a DOI, get article summaries and explanations. Perfect for engineers and medical students.",
    description: "Summarize and explain academic papers from DOI input.",
    tags: ["LLM", "OpenRouter", "Academic"],
    domains: ["NLP", "Research"],
    capabilities: ["Summarization", "Q&A"],
    tech: ["OpenRouter", "CrossRef", "arXiv"],
    order: 10,
    featuredHome: true,
  },
  {
    id: "data-forge",
    title: "Data Forge",
    slug: "data-forge",
    collection: "demos",
    status: "live",
    summary:
      "Define tables and relationships, let AI generate realistic fake data for your testing needs.",
    description:
      "Generate realistic relational fake datasets from schema prompts.",
    tags: ["LLM", "Data Engineering"],
    domains: ["Data Engineering"],
    capabilities: ["Generation", "Schema Modeling"],
    tech: ["OpenRouter", "JSON", "SQL"],
    order: 20,
    featuredHome: true,
  },
  {
    id: "query-craft",
    title: "Query Craft",
    slug: "query-craft",
    collection: "demos",
    status: "live",
    summary:
      "Describe what you need in plain English, get SQL queries instantly.",
    description: "Generate SQL from plain-language intents.",
    tags: ["Text-to-SQL", "NLP"],
    domains: ["NLP", "Data Engineering"],
    capabilities: ["Text-to-SQL", "Prompting"],
    tech: ["OpenRouter", "SQL"],
    order: 30,
    featuredHome: true,
  },
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
  },
  {
    id: "vision-anything",
    title: "Vision Anything",
    slug: "vision-anything",
    collection: "demos",
    status: "coming-soon",
    summary:
      "Zero-shot image classification. Upload an image, define classes, see what the model thinks.",
    description: "Zero-shot image classification with custom labels.",
    tags: ["Vision", "CLIP", "Zero-shot"],
    domains: ["CV"],
    capabilities: ["Classification"],
    tech: ["CLIP", "Transformers.js"],
    order: 50,
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
      "Simple rules, complex behavior. An interactive essay on cellular automata, segregation, and unexplained highways.",
    description:
      "A guided, interactive exploration of emergence through four systems: Elementary CA, Game of Life, Schelling's Segregation, and Langton's Ant.",
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
    collection: "nerdy-stuff",
    status: "live",
    summary:
      "Fight trained bots in a full 30x30 tactical arena with checkpoint-based difficulties.",
    description:
      "2D tactical duel with trained RL checkpoints, pickups, hazards, and interpretable policy signals.",
    tags: ["Reinforcement Learning", "Games", "Visualization"],
    domains: ["RL", "Computational Tools"],
    capabilities: ["Simulation", "Inference"],
    tech: ["React", "Canvas", "DQN"],
    order: 40,
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
    id: "temperature-playground",
    title: "Temperature Playground",
    slug: "temperature-playground",
    collection: "nerdy-stuff",
    status: "live",
    summary:
      "Same prompt, different temperatures. See how randomness affects model output.",
    description: "Prompt sampling behavior across temperature values.",
    tags: ["LLM", "Sampling"],
    domains: ["NLP"],
    capabilities: ["Sampling", "Visualization"],
    tech: ["Local LLM", "Transformers.js"],
    order: 70,
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
];

export function getProjectPath(project: ProjectMeta): string {
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
