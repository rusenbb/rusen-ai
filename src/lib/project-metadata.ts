import type { Metadata } from "next";

import { findProjectByKey, getProjectPath } from "@/lib/projects";

const SITE_NAME = "Rusen.ai";
const SITE_ORIGIN = "https://rusen.ai";

export function buildProjectMetadata(projectKey: string): Metadata {
  const project = findProjectByKey(projectKey);
  if (!project) {
    throw new Error(`Unknown project metadata key: ${projectKey}`);
  }

  const path = getProjectPath(project);
  const url = new URL(path, SITE_ORIGIN).toString();
  const imagePath = `/social/projects/${project.slug}.png`;
  const title = `${project.title} | ${SITE_NAME}`;
  const description = project.summary;

  return {
    title,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: "en_US",
      type: "website",
      images: [
        {
          url: imagePath,
          width: 1200,
          height: 630,
          alt: `${project.title} preview card`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imagePath],
    },
  };
}
