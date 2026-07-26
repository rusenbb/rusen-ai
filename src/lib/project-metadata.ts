import type { Metadata } from "next";

import { findProjectByKey, getProjectPath } from "@/lib/projects";
import { buildSocialMetadata, SITE_NAME } from "@/lib/social-metadata";

export function buildProjectMetadata(projectKey: string): Metadata {
  const project = findProjectByKey(projectKey);
  if (!project) {
    throw new Error(`Unknown project metadata key: ${projectKey}`);
  }

  const path = getProjectPath(project);
  const imagePath = `/social/projects/${project.slug}.png`;
  const title = `${project.title} | ${SITE_NAME}`;
  const description = project.summary;

  return buildSocialMetadata({
    title,
    description,
    path,
    image: imagePath,
    imageAlt: `${project.title} — interactive project preview`,
  });
}
