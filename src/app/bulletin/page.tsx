import type { Metadata } from "next";
import DemoCard from "../components/DemoCard";
import { getProjectPath, getProjectsByCollection } from "@/lib/projects";

export const metadata: Metadata = {
  title: "Bulletin | Rusen.ai",
  description: "Software I've built — desktop apps, CLI tools, and other things that live outside the browser.",
  alternates: { canonical: "/bulletin" },
};

export default function BulletinPage() {
  const projects = getProjectsByCollection("bulletin");

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 sm:py-12 md:py-16">
      <h1 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4">Bulletin</h1>
      <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 mb-8 sm:mb-12 max-w-2xl text-pretty">
        Software I&apos;ve built — desktop apps, CLI tools, and other things that live outside the browser.
      </p>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {projects.map((project) => (
          <DemoCard
            key={project.id}
            title={project.title}
            description={project.summary}
            href={getProjectPath(project)}
            tags={project.tags}
            status={project.status}
          />
        ))}
      </div>
    </div>
  );
}
