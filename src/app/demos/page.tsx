import DemoCard from "../components/DemoCard";

export default function DemosPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-4">Demos</h1>
      <p className="text-neutral-600 dark:text-neutral-400 mb-12 max-w-2xl">
        Interactive AI tools you can try right now. Most run entirely in your browser.
      </p>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <DemoCard
          title="Paper Pilot"
          description="Enter a DOI, get article summaries and explanations. Perfect for engineers and medical students."
          href="/demos/paper-pilot"
          tags={["NLP", "RAG", "Gradio"]}
          status="coming-soon"
        />
        <DemoCard
          title="Data Forge"
          description="Define tables and relationships, let AI generate realistic fake data for your testing needs."
          href="/demos/data-forge"
          tags={["LLM", "Data Engineering"]}
          status="live"
        />
        <DemoCard
          title="Query Craft"
          description="Describe what you need in plain English, get SQL queries instantly."
          href="/demos/query-craft"
          tags={["Text-to-SQL", "NLP"]}
          status="coming-soon"
        />
        <DemoCard
          title="Classify Anything"
          description="Zero-shot text classification. Define your own classes, paste any text, get predictions."
          href="/demos/classify-anything"
          tags={["Zero-shot", "Transformers.js"]}
          status="coming-soon"
        />
        <DemoCard
          title="Vision Anything"
          description="Zero-shot image classification. Upload an image, define classes, see what the model thinks."
          href="/demos/vision-anything"
          tags={["Vision", "CLIP", "Zero-shot"]}
          status="coming-soon"
        />
        <DemoCard
          title="Pulse Board"
          description="Live dashboard with Chainlink oracle prices, ISS tracker, earthquakes, weather, GitHub trending, and more."
          href="/demos/pulse-board"
          tags={["Real-time", "Blockchain", "Space"]}
          status="live"
        />
        <DemoCard
          title="Voice Morph"
          description="Prompt-guided voice transformation. Change how audio sounds with text descriptions."
          href="/demos/voice-morph"
          tags={["Audio", "Gradio", "Advanced"]}
          status="coming-soon"
        />
      </div>
    </div>
  );
}
