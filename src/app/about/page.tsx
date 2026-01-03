export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-8">About</h1>

      <section className="mb-12">
        <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-6">
          I&apos;m Rusen Birben, an AI &amp; Data Engineer passionate about making machine learning
          accessible and interactive.
        </p>
        <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-6">
          This site is my playground for experimenting with browser-based AI. Most demos here
          run entirely on your device - no data sent to servers, no API costs, just pure
          client-side machine learning.
        </p>
        <p className="text-lg text-neutral-600 dark:text-neutral-400">
          I believe the best way to understand AI is to play with it. That&apos;s why every demo
          here is interactive - you can see the magic happen in real-time.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4">Tech Stack</h2>
        <ul className="space-y-2 text-neutral-600 dark:text-neutral-400">
          <li>WebLLM - Run LLMs directly in the browser via WebGPU</li>
          <li>Transformers.js - ML models compiled for browser execution</li>
          <li>Gradio / HuggingFace Spaces - For GPU-intensive demos</li>
          <li>Next.js - React framework for the site</li>
          <li>Cloudflare Pages - Hosting with global CDN</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Connect</h2>
        <div className="flex gap-4">
          <a
            href="https://github.com/rusenbb"
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition"
          >
            GitHub
          </a>
          <a
            href="https://linkedin.com/in/rusenbirben"
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition"
          >
            LinkedIn
          </a>
        </div>
      </section>
    </div>
  );
}
