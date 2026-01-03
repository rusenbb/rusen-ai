import Link from "next/link";

export default function Home() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      {/* Hero Section */}
      <section className="text-center mb-20">
        <h1 className="text-5xl font-bold mb-6">
          Hi, I&apos;m Rusen
        </h1>
        <p className="text-xl text-neutral-600 dark:text-neutral-400 mb-8 max-w-2xl mx-auto">
          AI &amp; Data Engineer building interactive tools that run in your browser.
          No servers, no API costs, just pure client-side magic.
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
        <h2 className="text-2xl font-bold mb-8">Featured Demos</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <DemoPreview
            title="Paper Pilot"
            description="Enter a DOI, get article summaries and explanations for engineers and medical students."
            href="/demos/paper-pilot"
          />
          <DemoPreview
            title="Data Forge"
            description="Define tables and relationships, let AI generate realistic fake data for testing."
            href="/demos/data-forge"
          />
          <DemoPreview
            title="Query Craft"
            description="Describe what you need in plain English, get SQL queries instantly."
            href="/demos/query-craft"
          />
        </div>
      </section>

      {/* Nerdy Stuff Preview */}
      <section>
        <h2 className="text-2xl font-bold mb-8">Under The Hood</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <DemoPreview
            title="Embedding Explorer"
            description="Visualize how words and sentences cluster in vector space."
            href="/nerdy-stuff/embedding-explorer"
          />
          <DemoPreview
            title="Rusenizer"
            description="My custom tokenizer. See how text gets broken into tokens."
            href="/nerdy-stuff/rusenizer"
          />
          <DemoPreview
            title="Temperature Playground"
            description="Same prompt, different temperatures. See how randomness affects output."
            href="/nerdy-stuff/temperature-playground"
          />
        </div>
      </section>
    </div>
  );
}

function DemoPreview({ title, description, href }: { title: string; description: string; href: string }) {
  return (
    <Link
      href={href}
      className="block p-6 border border-neutral-200 dark:border-neutral-800 rounded-lg hover:border-neutral-400 dark:hover:border-neutral-600 transition group"
    >
      <h3 className="font-semibold text-lg mb-2 group-hover:opacity-80 transition">{title}</h3>
      <p className="text-neutral-600 dark:text-neutral-400 text-sm">{description}</p>
    </Link>
  );
}
