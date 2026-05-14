import Link from "next/link";

import {
  getAllSeries,
  getStandalonePosts,
  formatDate,
  readUnit,
} from "@/lib/blog";
import LangPicker from "./components/LangPicker";
import AccordionGroup from "./components/AccordionGroup";

export const metadata = {
  title: "Blog — rusen.ai",
  description:
    "Essays on AI, programming, and how the two are reshaping each other.",
};

export default function BlogIndex() {
  const series = getAllSeries();
  const standalone = getStandalonePosts();
  const seriesEntriesCount = series.reduce((sum, s) => sum + s.posts.length, 0);
  const standaloneCount = standalone.length;

  return (
    <main className="blog-shell">
      <div className="idx-head">
        <span className="blog-kicker">Writings</span>
        <h1>Essays, organised by argument.</h1>
        <p className="lede">
          Most of what I write builds on what came before. Posts are grouped
          into running series, with standalone pieces in their own section. Tap
          any section header to expand it.
        </p>
        <div style={{ marginTop: "1.5rem" }}>
          <LangPicker />
        </div>
      </div>

      <div className="idx-content-panel">
      {series.map((s, i) => (
        <AccordionGroup
          key={s.id}
          num={`${String(i + 1).padStart(2, "0")} //`}
          title={
            <>
              <span data-post-lang="en">{s.title.en}</span>
              <span data-post-lang="tr">{s.title.tr}</span>
            </>
          }
          count={`${String(s.posts.length).padStart(2, "0")} ENTRIES`}
          defaultOpen={i === 0}
        >
          <div className="series-list">
            {s.posts.map((p) => (
              <div
                key={p.slug}
                className="series-entry"
                data-post-lang={p.lang}
              >
                <Link
                  href={`/blogs/${p.slug}`}
                  className="series-entry-cover"
                  aria-label={p.title}
                >
                  {p.title}
                </Link>
                <span className="part">
                  {p.lang === "tr" ? "Bölüm" : "Part"}{" "}
                  {String(p.seriesOrder ?? 0).padStart(2, "0")} ·{" "}
                  {formatDate(p.date, p.lang)} · {p.readingMinutes}{" "}
                  {readUnit(p.lang)}
                </span>
                <h3>{p.title}</h3>
                <p className="desc">{p.description}</p>
                <div className="meta">
                  <span className="lang-badge">{p.lang.toUpperCase()}</span>
                </div>
              </div>
            ))}
          </div>
        </AccordionGroup>
      ))}

      {standalone.length > 0 && (
        <AccordionGroup
          num={`${String(series.length + 1).padStart(2, "0")} //`}
          title={
            <>
              <span data-post-lang="en">Standalone</span>
              <span data-post-lang="tr">Bağımsız</span>
            </>
          }
          count={`${String(standalone.length).padStart(2, "0")} ENTRIES`}
          defaultOpen={series.length === 0}
        >
          {standalone.map((p) => (
            <Link
              key={p.slug}
              href={`/blogs/${p.slug}`}
              className="standalone-entry"
              data-post-lang={p.lang}
            >
              <span className="date">{formatDate(p.date, p.lang)}</span>
              <div>
                <h3>{p.title}</h3>
                <p>{p.description}</p>
              </div>
              <span className="right">
                <span>{p.readingMinutes} {readUnit(p.lang)}</span>
                <span className="lang-badge">{p.lang.toUpperCase()}</span>
              </span>
            </Link>
          ))}
        </AccordionGroup>
      )}
      </div>

      <p
        style={{
          fontFamily: "var(--font-geist-mono), monospace",
          fontSize: "0.7rem",
          letterSpacing: "0.14em",
          color: "var(--sub)",
          textTransform: "uppercase",
          marginTop: "3rem",
        }}
      >
        {seriesEntriesCount + standaloneCount} entries indexed
      </p>
    </main>
  );
}
