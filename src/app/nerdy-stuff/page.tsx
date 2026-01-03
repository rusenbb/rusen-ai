import DemoCard from "../components/DemoCard";

export default function NerdyStuffPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-4">Nerdy Stuff</h1>
      <p className="text-neutral-600 dark:text-neutral-400 mb-12 max-w-2xl">
        Under the hood explorations. See how AI actually works with interactive visualizations.
      </p>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <DemoCard
          title="Embedding Explorer"
          description="Visualize how words and sentences cluster in vector space. See semantic similarity in action."
          href="/nerdy-stuff/embedding-explorer"
          tags={["Embeddings", "Visualization", "3D"]}
          status="coming-soon"
        />
        <DemoCard
          title="Rusenizer"
          description="My Turkish-optimized tokenizer. Compare with GPT-4 and see ~45% token savings on Turkish text."
          href="/nerdy-stuff/rusenizer"
          tags={["Tokenization", "NLP", "Turkish"]}
          status="live"
        />
        <DemoCard
          title="Tokenizer Battle"
          description="Compare tokenization across GPT, Llama, Claude, and more. See why token counts differ."
          href="/nerdy-stuff/tokenizer-battle"
          tags={["Tokenization", "Comparison"]}
          status="coming-soon"
        />
        <DemoCard
          title="Attention Heatmap"
          description="Visualize where transformer models look when processing text. See attention patterns."
          href="/nerdy-stuff/attention-heatmap"
          tags={["Attention", "Transformers", "Visualization"]}
          status="coming-soon"
        />
        <DemoCard
          title="Token Probabilities"
          description="See the top candidate tokens at each generation step. Understand how LLMs make choices."
          href="/nerdy-stuff/token-probabilities"
          tags={["LLM", "Probabilities"]}
          status="coming-soon"
        />
        <DemoCard
          title="Temperature Playground"
          description="Same prompt, different temperatures. See how randomness affects model output."
          href="/nerdy-stuff/temperature-playground"
          tags={["LLM", "Sampling"]}
          status="coming-soon"
        />
        <DemoCard
          title="RuseN-Gram"
          description="My personal N-Gram model. Old school meets new school language modeling."
          href="/nerdy-stuff/rusen-gram"
          tags={["N-Gram", "Classic ML"]}
          status="coming-soon"
        />
      </div>
    </div>
  );
}
