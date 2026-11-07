import type { MetadataRoute } from "next";

import { SITE_ORIGIN } from "@/lib/social-metadata";

export const dynamic = "force-static";

// Crawlers that gather training data for AI models. Search and
// user-requested fetchers (OAI-SearchBot, ChatGPT-User, Claude-SearchBot,
// Claude-User, PerplexityBot) stay allowed under the default rule.
const TRAINING_CRAWLERS = [
  "GPTBot",
  "ClaudeBot",
  "anthropic-ai",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
  "Bytespider",
  "meta-externalagent",
  "cohere-training-data-crawler",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      { userAgent: TRAINING_CRAWLERS, disallow: "/" },
    ],
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
    host: SITE_ORIGIN,
  };
}
