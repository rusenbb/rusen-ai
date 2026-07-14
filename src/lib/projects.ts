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
    id: "forest-inspector",
    title: "Forest Inspector",
    slug: "forest-inspector",
    collection: "demos",
    status: "live",
    summary:
      "Ask whether to play outside: inspect a categorical split's information gain, then see a small forest vote on the same weather.",
    description:
      "Interactive categorical decision-tree and random-forest lab with visible information gain, paths, and ensemble voting.",
    tags: ["Decision Trees", "Random Forest", "Information Gain"],
    domains: ["ML", "Computational Tools"],
    capabilities: ["Classification", "Interpretability"],
    tech: ["TypeScript", "Information Gain", "Bagging"],
    order: 50,
  },
  {
    id: "curve-fitter",
    title: "Curve Fitter",
    slug: "curve-fitter",
    collection: "demos",
    status: "live",
    summary:
      "Scrub real gradient updates as lines, polynomials, and tiny networks learn what their hypotheses can and cannot represent.",
    description:
      "Interactive regression and neural-network playground with actual training traces, held-out fitting, XOR, and nonlinear boundaries.",
    tags: ["Regression", "Neural Networks", "Nonlinearity"],
    domains: ["ML"],
    capabilities: ["Regression", "Visualization"],
    tech: ["TypeScript", "Gradient Descent", "SVG"],
    order: 52,
  },
  {
    id: "convolution-lab",
    title: "Convolution Lab",
    slug: "convolution-lab",
    collection: "demos",
    status: "live",
    summary:
      "Run editable kernels over real RGB or B/W photos, move a receptive field, and inspect the exact pixels behind each feature response.",
    description:
      "Interactive RGB and luminance image-convolution playground for kernels, padding, stride, and pooling.",
    tags: ["Convolution", "Computer Vision", "Kernels"],
    domains: ["CV"],
    capabilities: ["Visualization", "Image Processing"],
    tech: ["Canvas", "TypeScript"],
    order: 54,
  },
  {
    id: "adversarial-sketch",
    title: "Adversarial Sketch",
    slug: "adversarial-sketch",
    collection: "demos",
    status: "live",
    summary:
      "Nudge a held-out handwritten digit along a real model gradient and see why a tiny pixel change can change a prediction.",
    description:
      "Transparent browser-side adversarial-example lab training a logistic classifier on real 8x8 handwritten digits.",
    tags: ["Robustness", "Gradients", "Adversarial Examples"],
    domains: ["ML"],
    capabilities: ["Interpretability", "Visualization"],
    tech: ["TypeScript", "Logistic Regression", "Gradient Descent"],
    order: 56,
  },
  {
    id: "pathfinding-showdown",
    title: "Pathfinding Showdown",
    slug: "pathfinding-showdown",
    collection: "demos",
    status: "live",
    summary:
      "Step through every frontier decision as BFS, Dijkstra, greedy best-first, and A* search the same terrain.",
    description:
      "Interactive pathfinding trace with a scrubber, visible frontier, decision reasons, and compact final comparison.",
    tags: ["Algorithms", "A*", "Visualization"],
    domains: ["Computational Tools"],
    capabilities: ["Simulation", "Visualization"],
    tech: ["TypeScript", "Search Algorithms", "DOM"],
    order: 58,
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
    id: "outguess",
    title: "Outguess",
    slug: "outguess",
    collection: "demos",
    status: "live",
    summary:
      "Try to be unpredictable. A tiny AI predicts your next key press, and catches humans about 70% of the time.",
    description:
      "Predictor-vs-human key-tapping game. You try to be random; a small AI tries to call each next press. Most people get caught about 70% of the time.",
    tags: ["N-Gram", "PPM", "Game", "Aaronson Oracle"],
    domains: ["Computational Tools"],
    capabilities: ["Inference", "Visualization"],
    tech: ["Markov Chains", "PPM"],
    order: 90,
  },
  {
    id: "fourier-sketch",
    title: "Fourier Sketch",
    slug: "fourier-sketch",
    collection: "nerdy-stuff",
    status: "live",
    summary:
      "Draw a path, then watch rotating Fourier epicycles reconstruct it one harmonic at a time.",
    description:
      "Interactive discrete-Fourier-transform sketchpad with live epicycles and reconstruction quality.",
    tags: ["Fourier Transform", "Signals", "Visualization"],
    domains: ["Computational Tools"],
    capabilities: ["Visualization", "Simulation"],
    tech: ["Canvas", "TypeScript"],
    order: 35,
  },
  {
    id: "backprop-microscope",
    title: "Backprop Microscope",
    slug: "backprop-microscope",
    collection: "nerdy-stuff",
    status: "live",
    summary:
      "Move one target dot and watch an exact gradient update bend a single neuron's curve toward it.",
    description:
      "Interactive one-neuron backpropagation lab with an exact chain rule and finite-difference check.",
    tags: ["Backpropagation", "Autodiff", "Neural Networks"],
    domains: ["ML"],
    capabilities: ["Interpretability", "Visualization"],
    tech: ["TypeScript", "Gradient Descent", "SVG"],
    order: 40,
  },
  {
    id: "causal-sandbox",
    title: "Causal Sandbox",
    slug: "causal-sandbox",
    collection: "nerdy-stuff",
    status: "live",
    summary:
      "See why umbrella carriers can have wetter shoes even when umbrellas do not cause wet shoes.",
    description:
      "Interactive causal-inference illustration of confounding, observation, and fair assignment.",
    tags: ["Causality", "DAGs", "Simpson's Paradox"],
    domains: ["ML", "Data Science"],
    capabilities: ["Simulation", "Visualization"],
    tech: ["TypeScript", "Probability", "SVG"],
    order: 45,
  },
  {
    id: "attention-arena",
    title: "Attention Arena",
    slug: "attention-arena",
    collection: "nerdy-stuff",
    status: "live",
    summary:
      "Ask a visible query, then see softmax turn matching memory keys into a weighted answer.",
    description: "Interactive attention mechanics lab using an explicit soft weighted lookup.",
    tags: ["Attention", "Transformers", "Interpretability"],
    domains: ["NLP"],
    capabilities: ["Visualization", "Interpretability"],
    tech: ["TypeScript", "Softmax", "Linear Algebra"],
    order: 50,
  },
  {
    id: "optimizer-racetrack",
    title: "Optimizer Racetrack",
    slug: "optimizer-racetrack",
    collection: "nerdy-stuff",
    status: "live",
    summary:
      "Release SGD, Momentum, RMSProp, and Adam on the same loss landscape and watch their paths, wobbles, and failures diverge.",
    description:
      "Interactive optimizer comparison on small, inspectable loss landscapes.",
    tags: ["Optimization", "SGD", "Adam"],
    domains: ["ML"],
    capabilities: ["Simulation", "Visualization"],
    tech: ["TypeScript", "SVG"],
    order: 55,
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
    featuredHome: true,
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
    featuredHome: true,
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
    featuredHome: true,
    summary:
      "CLI tool to sync ODTUClass course files to your local machine. Tracks changes so subsequent syncs only pull new or updated files.",
    description:
      "Python CLI for incremental sync of METU course materials (PDFs, slides, homeworks) organized by course and section.",
    tags: ["Python", "CLI", "METU"],
    domains: ["Tools"],
    capabilities: ["Incremental sync"],
    tech: ["Python 3.11+"],
    order: 30,
    repoUrl: "https://github.com/rusenbb/metu-class-automation",
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
