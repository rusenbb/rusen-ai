import Link from "next/link";

export default function Home() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      {/* Hero Section */}
      <section className="text-center mb-20">
        <p className="text-sm font-mono text-neutral-500 dark:text-neutral-500 mb-4 tracking-wider">
          DATA, DATA EVERYWHERE
        </p>
        <h1 className="text-5xl font-bold mb-6">
          Data is eating the world.
        </h1>
        <p className="text-xl text-neutral-600 dark:text-neutral-400 mb-4 max-w-2xl mx-auto">
          I&apos;m Rusen, an AI &amp; Data Engineer building tools to make sense of it all.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/demos"
            className="px-6 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg font-medium hover:opacity-90 transition"
          >
            Explore Demos
          </Link>
          <Link
            href="/nerdy-stuff"
            className="px-6 py-3 border border-neutral-300 dark:border-neutral-700 rounded-lg font-medium hover:border-neutral-500 transition"
          >
            Nerdy Stuff
          </Link>
        </div>
      </section>

      {/* Featured Demos */}
      <section className="mb-20">
        <h2 className="text-2xl font-bold mb-2">Featured Demos</h2>
        <p className="text-neutral-500 dark:text-neutral-500 mb-8">Tools that transform data into insights</p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <DemoPreview
            title="Paper Pilot"
            description="Enter a DOI, get article summaries and explanations for engineers and medical students."
            href="/demos/paper-pilot"
            tag="NLP"
          />
          <DemoPreview
            title="Data Forge"
            description="Define tables and relationships, let AI generate realistic fake data for testing."
            href="/demos/data-forge"
            tag="Generation"
          />
          <DemoPreview
            title="Query Craft"
            description="Describe what you need in plain English, get SQL queries instantly."
            href="/demos/query-craft"
            tag="Text-to-SQL"
          />
        </div>
      </section>

      {/* Nerdy Stuff Preview */}
      <section className="mb-20">
        <h2 className="text-2xl font-bold mb-2">Under The Hood</h2>
        <p className="text-neutral-500 dark:text-neutral-500 mb-8">See how the data sausage is made</p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <DemoPreview
            title="Embedding Explorer"
            description="Visualize how words and sentences cluster in vector space."
            href="/nerdy-stuff/embedding-explorer"
            tag="Vectors"
          />
          <DemoPreview
            title="Rusenizer"
            description="Turkish-optimized tokenizer. Compare BPE vs morphological approaches."
            href="/nerdy-stuff/rusenizer"
            tag="Tokenization"
          />
          <DemoPreview
            title="Temperature Playground"
            description="Same prompt, different temperatures. See how randomness affects output."
            href="/nerdy-stuff/temperature-playground"
            tag="LLM"
          />
        </div>
      </section>
    </div>
  );
}

function DemoPreview({ title, description, href, tag }: { title: string; description: string; href: string; tag?: string }) {
  return (
    <Link
      href={href}
      className="block p-6 border border-neutral-200 dark:border-neutral-800 rounded-lg hover:border-neutral-400 dark:hover:border-neutral-600 transition group"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-lg group-hover:opacity-80 transition">{title}</h3>
        {tag && (
          <span className="text-xs px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded font-mono">
            {tag}
          </span>
        )}
      </div>
      <p className="text-neutral-600 dark:text-neutral-400 text-sm">{description}</p>
    </Link>
  );
}
