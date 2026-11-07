import { projectsMarkdown } from "@/lib/agent-docs";

export const dynamic = "force-static";

export async function GET() {
  return new Response(projectsMarkdown(), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
