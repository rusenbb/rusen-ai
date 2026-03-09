import type { PaperMetadata, SummaryType } from "../types";

// Context limit - Gemini has 128k+ context
const MAX_CONTENT_TOKENS = 100000;
const WORDS_PER_TOKEN = 0.75;

// Truncate text to approximate word limit
function truncateToWords(text: string, maxWords: number): string {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;

  const truncated = words.slice(0, maxWords).join(" ");
  return truncated + "... [truncated]";
}

// Build the paper context string with priority on full text
export function buildPaperContext(paper: PaperMetadata): string {
  const maxContentWords = Math.floor(MAX_CONTENT_TOKENS * WORDS_PER_TOKEN);

  const metadataParts = [
    `Title: ${paper.title}`,
    `Authors: ${paper.authors.join(", ")}`,
  ];

  if (paper.journal) {
    metadataParts.push(`Journal: ${paper.journal}`);
  }

  if (paper.publishedDate) {
    metadataParts.push(`Published: ${paper.publishedDate}`);
  }

  if (paper.subjects.length > 0) {
    metadataParts.push(`Subjects: ${paper.subjects.slice(0, 5).join(", ")}`);
  }

  const metadata = metadataParts.join("\n");

  // Determine content to use
  let content: string;
  let contentLabel: string;

  if (paper.fullText && paper.fullText.length > 500) {
    // Use full text, truncated if necessary
    const truncatedFullText = truncateToWords(paper.fullText, maxContentWords);
    content = truncatedFullText;
    contentLabel = "Full Paper Content";
  } else if (paper.abstract) {
    content = paper.abstract;
    contentLabel = "Abstract";
  } else {
    content = "(No abstract or full text available)";
    contentLabel = "Content";
  }

  return `${metadata}\n\n${contentLabel}:\n${content}`;
}

// System prompts for different summary types
const SYSTEM_PROMPTS: Record<SummaryType, string> = {
  tldr: `You are an expert at summarizing academic papers. Your task is to provide a TL;DR (Too Long; Didn't Read) summary.
Rules:
- Keep it to 2-3 sentences maximum
- Focus on the main finding or contribution
- Use clear, accessible language
- Do not use bullet points
- Be direct and concise`,

  technical: `You are an expert scientific reviewer. Your task is to provide a technical summary of academic papers.
Rules:
- Summarize the methodology, key techniques, and approach
- Explain the experimental setup or theoretical framework
- Mention any datasets, tools, or technologies used
- Highlight technical contributions and innovations
- Use appropriate technical terminology
- Keep it to one paragraph (4-6 sentences)`,

  eli5: `You are an expert at explaining complex topics in simple terms. Your task is to explain this academic paper as if to a 5-year-old.
Rules:
- Use simple everyday words
- Use analogies and comparisons to familiar things
- Avoid all jargon and technical terms
- Make it fun and engaging
- Keep it to 3-4 sentences`,

  keyFindings: `You are an expert at analyzing academic papers. Your task is to extract and present the key findings.
Rules:
- List the main results and conclusions
- Include important numbers or statistics if available
- Mention implications or significance
- Use bullet points (3-5 points)
- Be specific about what was discovered`,
};

// Build prompt for summary generation
export function buildSummaryPrompt(
  paper: PaperMetadata,
  summaryType: SummaryType
): {
  systemPrompt: string;
  userPrompt: string;
} {
  const systemPrompt = SYSTEM_PROMPTS[summaryType];
  const paperContext = buildPaperContext(paper);

  const contentNote = paper.hasFullText
    ? "You have access to the full paper content."
    : "Note: Only the abstract is available. Base your summary on the available information.";

  const typeLabel = {
    tldr: "TL;DR summary",
    technical: "technical summary",
    eli5: "simple explanation",
    keyFindings: "list of key findings",
  }[summaryType];

  const userPrompt = `${contentNote}

Please provide a ${typeLabel} for this academic paper:

${paperContext}`;

  return { systemPrompt, userPrompt };
}

// Build prompt for Q&A
export function buildQAPrompt(
  paper: PaperMetadata,
  question: string
): {
  systemPrompt: string;
  userPrompt: string;
} {
  const hasFullText = paper.hasFullText;

  const systemPrompt = `You are an expert research assistant helping users understand academic papers. Answer questions based on the paper's content.
Rules:
- Only answer based on information available in the paper
- If the information is not in the paper, say so
- Be concise but thorough
- Use technical terms when appropriate but explain them
- If asked about something not covered, suggest what might be relevant
${hasFullText ? "- You have access to the full paper text, so you can answer detailed questions about methodology, results, and specific sections." : "- Note: You only have access to the abstract, so some detailed questions may not be answerable."}`;

  const paperContext = buildPaperContext(paper);

  const userPrompt = `Paper information:
${paperContext}

Question: ${question}

Please answer this question based on the paper above.`;

  return { systemPrompt, userPrompt };
}
