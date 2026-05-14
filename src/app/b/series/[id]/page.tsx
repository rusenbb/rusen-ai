import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getAllSeries,
  getSeriesById,
  getTranslation,
  formatDate,
  readUnit,
} from "@/lib/blog";
import LangPicker from "../../components/LangPicker";

export async function generateStaticParams() {
  return getAllSeries().map((s) => ({ id: s.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const series = getSeriesById(id);
  if (!series) return {};
  return {
    title: `${series.title.en} — rusen.ai`,
  };
}

export default async function SeriesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const series = getSeriesById(id);
  if (!series) notFound();

  // Compute "read whole series" totals per language.
  const enPosts = series.posts.filter((p) => p.lang === "en");
  const trPosts = series.posts.filter((p) => p.lang === "tr");
  const enMinutes = enPosts.reduce((sum, p) => sum + p.readingMinutes, 0);
  const trMinutes = trPosts.reduce((sum, p) => sum + p.readingMinutes, 0);

  return (
    <main className="blog-shell" data-no-ripple>
      <div className="series-intro">
        <span className="blog-kicker">Series</span>
        <h1>{series.title.en}</h1>
        <p style={{ color: "var(--muted)", margin: 0, maxWidth: "65ch" }}>
          A running arc — each part builds on what came before. Read them in
          order for the strongest payoff, or dip in anywhere.
        </p>
        <div className="meta">
          <span data-post-lang="en">
            {enPosts.length} parts · ~{enMinutes} min total
          </span>
          <span className="dot" data-post-lang="en">
            ·
          </span>
          <span data-post-lang="en">
            <Link href={`/b/${enPosts[0]?.slug}`}>
              {enPosts[0]?.title ? "Start the series →" : ""}
            </Link>
          </span>

          <span data-post-lang="tr">
            {trPosts.length} bölüm · ~{trMinutes} dk toplam
          </span>
          <span className="dot" data-post-lang="tr">
            ·
          </span>
          <span data-post-lang="tr">
            <Link href={`/b/${trPosts[0]?.slug}`}>
              {trPosts[0]?.title ? "Seriye başla →" : ""}
            </Link>
          </span>
        </div>
        <div style={{ marginTop: "1.25rem" }}>
          <LangPicker />
        </div>
      </div>

      <div className="series-list">
        {series.posts
          .sort((a, b) => (a.seriesOrder ?? 0) - (b.seriesOrder ?? 0))
          .map((p) => {
            const sib = getTranslation(p);
            return (
              <div
                key={p.slug}
                className="series-entry"
                data-post-lang={p.lang}
              >
                <Link
                  href={`/b/${p.slug}`}
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
                  {sib && (
                    <Link href={`/b/${sib.slug}`} className="sib">
                      ⇄ {sib.lang.toUpperCase()}
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </main>
  );
}
