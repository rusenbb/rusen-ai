/** Structured data (schema.org JSON-LD) for search engines and agents. */
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  // Escape "<" so the JSON cannot close the script tag.
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
