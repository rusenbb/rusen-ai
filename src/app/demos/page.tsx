import DemoCard from "../components/DemoCard";
import { getProjectPath, getProjectsByCollection } from "@/lib/projects";

export default function DemosPage() {
  const demoProjects = getProjectsByCollection("demos");

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 sm:py-12 md:py-16">
      <h1 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4">Demos</h1>
      <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 mb-8 sm:mb-12 max-w-2xl text-pretty">
        Interactive AI tools you can try right now.
      </p>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {demoProjects.map((project) => (
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
