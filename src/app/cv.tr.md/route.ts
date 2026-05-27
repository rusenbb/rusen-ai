import { getCvData, getCvLabels } from "@/lib/cv";
import { renderCvMarkdown } from "@/lib/cv-markdown";

export const dynamic = "force-static";

export async function GET() {
  const md = renderCvMarkdown(getCvData("tr"), getCvLabels("tr"), "tr");
  return new Response(md, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
