import Link from "next/link";
import { getFeaturedProjects, getProjectPath } from "@/lib/projects";

export default function Home() {
  const featuredDemos = getFeaturedProjects("demos", 3);
  const featuredNerdy = getFeaturedProjects("nerdy-stuff", 3);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 sm:py-12 md:py-16">
      {/* Hero Section */}
      <section className="text-center mb-12 sm:mb-16 md:mb-20">
        <p className="text-xs sm:text-sm font-mono text-neutral-600 dark:text-neutral-500 mb-3 sm:mb-4 tracking-[0.18em]">
          DATA, DATA EVERYWHERE
        </p>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 leading-tight text-balance">
          Data is eating the world.
        </h1>
        <p className="text-base sm:text-lg md:text-xl text-neutral-600 dark:text-neutral-400 mb-5 sm:mb-6 max-w-2xl mx-auto text-pretty">
          I&apos;m Rusen, an AI &amp; Data Engineer building tools to make sense of it all.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
          <Link
            href="/demos"
            className="px-6 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg font-medium hover:opacity-90 transition w-full sm:w-auto"
          >
            Explore Demos
          </Link>
          <Link
            href="/nerdy-stuff"
            className="px-6 py-3 border border-neutral-300 dark:border-neutral-700 rounded-lg font-medium hover:border-neutral-500 transition w-full sm:w-auto"
          >
            Nerdy Stuff
          </Link>
        </div>
      </section>

      {/* Featured Demos */}
      <section className="mb-12 sm:mb-16 md:mb-20">
        <h2 className="text-xl sm:text-2xl font-bold mb-2">Featured Demos</h2>
        <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-500 mb-5 sm:mb-8">Tools that transform data into insights</p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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
      <section className="mb-4 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-bold mb-2">Under The Hood</h2>
        <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-500 mb-5 sm:mb-8">See how the data sausage is made</p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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
    </div>
  );
}

function DemoPreview({ title, description, href, tag }: { title: string; description: string; href: string; tag?: string }) {
  return (
    <Link
      href={href}
      className="ui-card block p-4 sm:p-6 border border-neutral-200 dark:border-neutral-800 rounded-lg hover:border-neutral-400 dark:hover:border-neutral-600 transition group"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="font-semibold text-base sm:text-lg group-hover:opacity-80 transition">{title}</h3>
        {tag && (
          <span className="text-[11px] px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded font-mono shrink-0">
            {tag}
          </span>
        )}
      </div>
      <p className="text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed">{description}</p>
    </Link>
  );
}
