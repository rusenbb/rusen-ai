import projectData from "../content/projects.json" with { type: "json" };

export type ProjectCollection = "demos" | "nerdy-stuff" | "bulletin";
export type ProjectStatus = "live" | "coming-soon";

export type ProjectMeta = {
  id: string;
  title: string;
  slug: string;
  collection: ProjectCollection;
  status: ProjectStatus;
  summary: string;
  description: string;
  tags: string[];
  domains: string[];
  capabilities: string[];
  tech: string[];
  order: number;
  featuredHome?: boolean;
  repoUrl?: string;
  homepageUrl?: string;
  releaseUrl?: string;
  installCmd?: string;
  platform?: string[];
};

const COLLECTIONS = new Set<ProjectCollection>([
  "demos",
  "nerdy-stuff",
  "bulletin",
]);
const STATUSES = new Set<ProjectStatus>(["live", "coming-soon"]);
const OPTIONAL_STRING_FIELDS = [
  "repoUrl",
  "homepageUrl",
  "releaseUrl",
  "installCmd",
] as const;
const KNOWN_FIELDS = new Set([
  "id",
  "title",
  "slug",
  "collection",
  "status",
  "summary",
  "description",
  "tags",
  "domains",
  "capabilities",
  "tech",
  "order",
  "featuredHome",
  ...OPTIONAL_STRING_FIELDS,
  "platform",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(
  record: Record<string, unknown>,
  field: string,
  context: string,
): string {
  const value = record[field];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${context}.${field} must be a non-empty string`);
  }
  return value;
}

function stringList(
  record: Record<string, unknown>,
  field: string,
  context: string,
): string[] {
  const value = record[field];
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.some((entry) => typeof entry !== "string" || !entry.trim())
  ) {
    throw new Error(`${context}.${field} must be a non-empty string array`);
  }
  return [...value] as string[];
}

function optionalString(
  record: Record<string, unknown>,
  field: (typeof OPTIONAL_STRING_FIELDS)[number],
  context: string,
): string | undefined {
  const value = record[field];
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${context}.${field} must be a non-empty string when set`);
  }
  return value;
}

function parseProjects(value: unknown): ProjectMeta[] {
  if (!Array.isArray(value)) throw new Error("projects.json must contain an array");

  const ids = new Set<string>();
  const slugs = new Set<string>();
  const collectionOrders = new Set<string>();

  return value.map((entry, index) => {
    const context = `projects[${index}]`;
    if (!isRecord(entry)) throw new Error(`${context} must be an object`);

    for (const field of Object.keys(entry)) {
      if (!KNOWN_FIELDS.has(field)) {
        throw new Error(`${context} has unknown field ${field}`);
      }
    }

    const id = requiredString(entry, "id", context);
    const slug = requiredString(entry, "slug", context);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
      throw new Error(`${context}.id must be a lowercase URL-safe identifier`);
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw new Error(`${context}.slug must be URL-safe`);
    }
    if (ids.has(id)) throw new Error(`Duplicate project id: ${id}`);
    if (slugs.has(slug)) throw new Error(`Duplicate project slug: ${slug}`);
    ids.add(id);
    slugs.add(slug);

    const collectionValue = requiredString(entry, "collection", context);
    if (!COLLECTIONS.has(collectionValue as ProjectCollection)) {
      throw new Error(`${context}.collection is invalid`);
    }
    const collection = collectionValue as ProjectCollection;

    const statusValue = requiredString(entry, "status", context);
    if (!STATUSES.has(statusValue as ProjectStatus)) {
      throw new Error(`${context}.status is invalid`);
    }
    const status = statusValue as ProjectStatus;

    if (!Number.isInteger(entry.order) || (entry.order as number) < 0) {
      throw new Error(`${context}.order must be a non-negative integer`);
    }
    const order = entry.order as number;
    const orderKey = `${collection}:${order}`;
    if (collectionOrders.has(orderKey)) {
      throw new Error(`Duplicate order ${order} in ${collection}`);
    }
    collectionOrders.add(orderKey);

    if (
      entry.featuredHome !== undefined &&
      typeof entry.featuredHome !== "boolean"
    ) {
      throw new Error(`${context}.featuredHome must be boolean when set`);
    }
    if (entry.featuredHome && status !== "live") {
      throw new Error(`${context} cannot be featured before it is live`);
    }

    const platform =
      entry.platform === undefined
        ? undefined
        : stringList(entry, "platform", context);

    return {
      id,
      title: requiredString(entry, "title", context),
      slug,
      collection,
      status,
      summary: requiredString(entry, "summary", context),
      description: requiredString(entry, "description", context),
      tags: stringList(entry, "tags", context),
      domains: stringList(entry, "domains", context),
      capabilities: stringList(entry, "capabilities", context),
      tech: stringList(entry, "tech", context),
      order,
      featuredHome: entry.featuredHome as boolean | undefined,
      repoUrl: optionalString(entry, "repoUrl", context),
      homepageUrl: optionalString(entry, "homepageUrl", context),
      releaseUrl: optionalString(entry, "releaseUrl", context),
      installCmd: optionalString(entry, "installCmd", context),
      platform,
    };
  });
}

export const PROJECTS: ProjectMeta[] = parseProjects(projectData);

export function getProjectPath(project: ProjectMeta): string {
  if (project.collection === "bulletin") {
    return `/bulletin/${project.slug}`;
  }
  return `/${project.slug}`;
}

export function getProjectsByCollection(
  collection: ProjectCollection,
): ProjectMeta[] {
  return PROJECTS.filter((project) => project.collection === collection).sort(
    (a, b) => a.order - b.order,
  );
}

export function getFeaturedProjects(
  collection: ProjectCollection,
  limit: number,
): ProjectMeta[] {
  return getProjectsByCollection(collection)
    .filter((project) => project.featuredHome)
    .slice(0, limit);
}

export function findProjectByKey(key: string): ProjectMeta | undefined {
  return PROJECTS.find((project) => project.id === key || project.slug === key);
}
