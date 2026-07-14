import Link from "next/link";
import BgKickerToggle from "./components/BgKickerToggle";
import { getFeaturedProjects, getProjectPath } from "@/lib/projects";
import { getLatestUniquePosts, formatDate, readUnit } from "@/lib/blog";

export default function Home() {
  const featuredDemos = getFeaturedProjects("demos", 3);
  const featuredNerdy = getFeaturedProjects("nerdy-stuff", 3);
  const featuredBulletin = getFeaturedProjects("bulletin", 3);
  const latestWritings = getLatestUniquePosts(3, "en");

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 sm:py-12 md:py-16">
      {/* Hero */}
      <section className="text-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 leading-tight text-balance">
          Data is eating the world.
        </h1>
        <p className="text-base sm:text-lg md:text-xl text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto text-pretty">
          I&apos;m Rusen, an AI &amp; Data Engineer building tools to make sense of it all.
        </p>
      </section>

      {/* Reserved viewport space for the ASCII background's DATA pulse -
          AsciiDataBackground anchors the letters to this element so they
          sit between the hero and the cards instead of behind them. */}
      <div
        data-bg-anchor="data"
        aria-hidden="true"
        className="h-40 sm:h-48 md:h-56 mt-10 sm:mt-12"
      />

      {/* Caption for the DATA pulse - flanking dashes give it the look of a
          deliberate label, not a stray badge. The kicker itself toggles the
          bg (mirrors the footer toggle). */}
      <div className="flex items-center justify-center gap-4 mb-12 sm:mb-16 md:mb-20">
        <span
          aria-hidden="true"
          className="h-px w-10 sm:w-16 bg-[var(--line-strong)] opacity-25"
        />
        <BgKickerToggle />
        <span
          aria-hidden="true"
          className="h-px w-10 sm:w-16 bg-[var(--line-strong)] opacity-25"
        />
      </div>

      {/* Featured Demos */}
      <section className="mb-12 sm:mb-16 md:mb-20">
        <SectionHeader num="01" title="Featured Demos" href="/demos" />
        <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-500 mb-5 sm:mb-8">
          Tools that transform data into insights.
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {featuredDemos.map((project) => (
            <DemoPreview
              key={project.id}
              title={project.title}
              description={project.summary}
              href={getProjectPath(project)}
              tag={project.capabilities[0] ?? project.tags[0]}
            />
          ))}
        </div>
      </section>

      {/* Nerdy Stuff Preview */}
      <section className="mb-12 sm:mb-16 md:mb-20">
        <SectionHeader num="02" title="Under The Hood" href="/nerdy-stuff" />
        <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-500 mb-5 sm:mb-8">
          See how the data sausage is made.
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {featuredNerdy.map((project) => (
            <DemoPreview
              key={project.id}
              title={project.title}
              description={project.summary}
              href={getProjectPath(project)}
              tag={project.capabilities[0] ?? project.tags[0]}
            />
          ))}
        </div>
      </section>

      {/* Bulletin */}
      <section className="mb-12 sm:mb-16 md:mb-20">
        <SectionHeader num="03" title="Bulletin" href="/bulletin" />
        <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-500 mb-5 sm:mb-8">
          Software that lives outside the browser.
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {featuredBulletin.map((project) => (
            <DemoPreview
              key={project.id}
              title={project.title}
              description={project.summary}
              href={getProjectPath(project)}
              tag={project.capabilities[0] ?? project.tags[0]}
            />
          ))}
        </div>
      </section>

      {/* Latest Writings */}
      <section className="mb-4 sm:mb-8">
        <SectionHeader num="04" title="Latest Writings" href="/blogs" />
        <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-500 mb-5 sm:mb-8">
          Long-form notes on AI and the practice of programming.
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {latestWritings.map((post) => (
            <WritingPreview
              key={post.slug}
              title={post.title}
              description={post.description}
              href={`/blogs/${post.slug}`}
              date={formatDate(post.date, post.lang)}
              minutes={post.readingMinutes}
              lang={post.lang}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function WritingPreview({
  title,
  description,
  href,
  date,
  minutes,
  lang,
}: {
  title: string;
  description: string;
  href: string;
  date: string;
  minutes: number;
  lang: "en" | "tr";
}) {
  return (
    <Link href={href} className="term-card block group">
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="font-semibold text-base sm:text-lg group-hover:opacity-80 transition">
          {title}
        </h3>
        <span className="term-tag shrink-0">{lang.toUpperCase()}</span>
      </div>
      <p className="text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed">
        {description}
      </p>
      <div className="term-status mt-3">
        {date} · {minutes} {readUnit(lang)}
      </div>
    </Link>
  );
}

function SectionHeader({ num, title, href }: { num: string; title: string; href: string }) {
  return (
    <div className="sec-head">
      <Link
        href={href}
        className="inline-flex items-center gap-4 hover:opacity-80 transition-opacity"
      >
        <span className="sec-num">{`${num} //`}</span>
        <h2 className="sec-title underline underline-offset-[0.35em] decoration-1">
          {title}
        </h2>
      </Link>
      <span className="dashed-rule" />
    </div>
  );
}

function DemoPreview({ title, description, href, tag }: { title: string; description: string; href: string; tag?: string }) {
  return (
    <Link href={href} className="term-card block group">
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="font-semibold text-base sm:text-lg group-hover:opacity-80 transition">{title}</h3>
        {tag && <span className="term-tag shrink-0">{tag}</span>}
      </div>
      <p className="text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed">{description}</p>
      <div className="term-status mt-3">
        <span className="signal-blip" aria-hidden="true" />
        LIVE
      </div>
    </Link>
  );
}
