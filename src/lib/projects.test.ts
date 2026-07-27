import { describe, expect, it } from "vitest";
import {
  PROJECTS,
  findProjectByKey,
  getProjectPath,
  getProjectsByCollection,
} from "./projects";

describe("project content registry", () => {
  it("keeps identifiers, slugs, and collection order unique", () => {
    expect(new Set(PROJECTS.map((project) => project.id)).size).toBe(
      PROJECTS.length,
    );
    expect(new Set(PROJECTS.map((project) => project.slug)).size).toBe(
      PROJECTS.length,
    );

    for (const collection of ["demos", "nerdy-stuff", "bulletin"] as const) {
      const projects = getProjectsByCollection(collection);
      expect(projects.map((project) => project.order)).toEqual(
        [...projects.map((project) => project.order)].sort((a, b) => a - b),
      );
    }
  });

  it("resolves every project through both public keys", () => {
    for (const project of PROJECTS) {
      expect(findProjectByKey(project.id)).toBe(project);
      expect(findProjectByKey(project.slug)).toBe(project);
      expect(getProjectPath(project)).toMatch(/^\/(?:bulletin\/)?[a-z0-9-]+$/);
    }
  });
});
