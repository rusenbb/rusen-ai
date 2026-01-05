import type { PaperMetadata, ContentSourceInfo } from "../types";

// ============================================================================
// CONFIGURATION
// ============================================================================

const API_CONFIG = {
  email: "contact@rusen.ai",
  userAgent: "PaperPilot/1.0 (https://rusen.ai)",
} as const;

// ============================================================================
// PDF.JS INITIALIZATION (done once at module level)
// ============================================================================

let pdfJsInitialized = false;
let pdfJsLib: typeof import("pdfjs-dist") | null = null;

async function initPdfJs(): Promise<typeof import("pdfjs-dist")> {
  if (pdfJsLib && pdfJsInitialized) {
    return pdfJsLib;
  }

  pdfJsLib = await import("pdfjs-dist");
  pdfJsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfJsLib.version}/pdf.worker.min.js`;
  pdfJsInitialized = true;

  return pdfJsLib;
}

// ============================================================================
// IDENTIFIER PARSING
// ============================================================================

export function parseDOI(input: string): string | null {
  const trimmed = input.trim();

  // Direct DOI format: 10.xxxx/xxxxx
  const doiPattern = /^10\.\d{4,}\/[^\s]+$/;
  if (doiPattern.test(trimmed)) {
    return trimmed;
  }

  // DOI URL format: https://doi.org/10.xxxx/xxxxx
  const doiUrlPattern = /(?:https?:\/\/)?(?:dx\.)?doi\.org\/(10\.\d{4,}\/[^\s]+)/i;
  const urlMatch = trimmed.match(doiUrlPattern);
  if (urlMatch) {
    return urlMatch[1];
  }

  // Extract DOI from any URL or string containing it
  const extractPattern = /(10\.\d{4,}\/[^\s\]>)"']+)/;
  const extractMatch = trimmed.match(extractPattern);
  if (extractMatch) {
    return extractMatch[1];
  }

  return null;
}

export function parseArxivId(input: string): string | null {
  const trimmed = input.trim();

  // New format: 2301.12345 or 2301.12345v1
  const newPattern = /^(\d{4}\.\d{4,5}(?:v\d+)?)$/;
  const newMatch = trimmed.match(newPattern);
  if (newMatch) {
    return newMatch[1];
  }

  // Old format: hep-th/9901001
  const oldPattern = /^([a-z-]+\/\d{7})$/i;
  const oldMatch = trimmed.match(oldPattern);
  if (oldMatch) {
    return oldMatch[1];
  }

  // URL format: https://arxiv.org/abs/2301.12345
  const urlPattern = /arxiv\.org\/(?:abs|pdf)\/(\d{4}\.\d{4,5}(?:v\d+)?|[a-z-]+\/\d{7})/i;
  const urlMatch = trimmed.match(urlPattern);
  if (urlMatch) {
    return urlMatch[1];
  }

  // Extract from any string
  const extractNew = /(\d{4}\.\d{4,5}(?:v\d+)?)/;
  const extractMatch = trimmed.match(extractNew);
  if (extractMatch && trimmed.toLowerCase().includes("arxiv")) {
    return extractMatch[1];
  }

  return null;
}

export function detectInputType(input: string): "doi" | "arxiv" | "unknown" {
  if (parseDOI(input)) return "doi";
  if (parseArxivId(input)) return "arxiv";
  return "unknown";
}

// ============================================================================
// CROSSREF API
// ============================================================================

interface CrossRefAuthor {
  given?: string;
  family?: string;
  name?: string;
}

interface CrossRefWork {
  DOI: string;
  title?: string[];
  author?: CrossRefAuthor[];
  abstract?: string;
  "container-title"?: string[];
  published?: { "date-parts"?: number[][] };
  URL?: string;
  subject?: string[];
}

function formatAuthors(authors: CrossRefAuthor[] | undefined): string[] {
  if (!authors || authors.length === 0) return ["Unknown Author"];
  return authors.map((author) => {
    if (author.name) return author.name;
    const parts = [];
    if (author.given) parts.push(author.given);
    if (author.family) parts.push(author.family);
    return parts.join(" ") || "Unknown";
  });
}

function formatDate(published: { "date-parts"?: number[][] } | undefined): string | null {
  if (!published?.["date-parts"]?.[0]) return null;
  const [year, month, day] = published["date-parts"][0];
  if (!year) return null;
  const parts = [year.toString()];
  if (month) {
    parts.push(month.toString().padStart(2, "0"));
    if (day) parts.push(day.toString().padStart(2, "0"));
  }
  return parts.join("-");
}

function cleanAbstract(abstract: string | undefined): string | null {
  if (!abstract) return null;
  return abstract
    .replace(/<\/?jats:[^>]+>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim() || null;
}

export async function fetchFromCrossRef(doi: string): Promise<Partial<PaperMetadata> | null> {
  try {
    const response = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": `${API_CONFIG.userAgent}; mailto:${API_CONFIG.email}`,
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    const work: CrossRefWork = data.message;

    return {
      doi: work.DOI,
      title: work.title?.[0] || "Untitled",
      authors: formatAuthors(work.author),
      abstract: cleanAbstract(work.abstract),
      journal: work["container-title"]?.[0] || null,
      publishedDate: formatDate(work.published),
      url: work.URL || `https://doi.org/${work.DOI}`,
      subjects: work.subject || [],
    };
  } catch (error) {
    console.error("[CrossRef] Error:", error);
    return null;
  }
}

// ============================================================================
// UNPAYWALL API
// ============================================================================

interface UnpaywallResponse {
  doi: string;
  is_oa: boolean;
  best_oa_location?: {
    url?: string;
    url_for_pdf?: string;
    license?: string;
    version?: string;
  };
}

export async function fetchFromUnpaywall(doi: string): Promise<ContentSourceInfo | null> {
  try {
    const response = await fetch(
      `https://api.unpaywall.org/v2/${encodeURIComponent(doi)}?email=${API_CONFIG.email}`,
      { headers: { Accept: "application/json" } }
    );

    if (!response.ok) return null;

    const data: UnpaywallResponse = await response.json();

    if (!data.is_oa) return null;

    const bestLocation = data.best_oa_location;
    if (!bestLocation) return null;

    const pdfUrl = bestLocation.url_for_pdf || bestLocation.url;

    return {
      source: "unpaywall",
      hasFullText: !!pdfUrl,
      pdfUrl: pdfUrl || undefined,
      license: bestLocation.license || undefined,
    };
  } catch (error) {
    console.error("[Unpaywall] Error:", error);
    return null;
  }
}

// ============================================================================
// OPENALEX API (better abstract coverage than CrossRef)
// ============================================================================

interface OpenAlexWork {
  id: string;
  title: string;
  abstract_inverted_index?: Record<string, number[]>;
  authorships?: Array<{ author: { display_name: string } }>;
  publication_year?: number;
  primary_location?: { source?: { display_name: string } };
  open_access?: { oa_url?: string };
  concepts?: Array<{ display_name: string }>;
}

// OpenAlex returns abstracts as inverted index - convert to text
function reconstructAbstract(invertedIndex: Record<string, number[]> | undefined): string | null {
  if (!invertedIndex) return null;

  const words: [string, number][] = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const pos of positions) {
      words.push([word, pos]);
    }
  }

  words.sort((a, b) => a[1] - b[1]);
  const abstract = words.map(([word]) => word).join(" ");
  return abstract || null;
}

export async function fetchFromOpenAlex(doi: string): Promise<Partial<PaperMetadata> | null> {
  try {
    const response = await fetch(
      `https://api.openalex.org/works/doi:${encodeURIComponent(doi)}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": API_CONFIG.userAgent,
        },
      }
    );

    if (!response.ok) return null;

    const work: OpenAlexWork = await response.json();

    return {
      title: work.title,
      authors: work.authorships?.map((a) => a.author.display_name) || [],
      abstract: reconstructAbstract(work.abstract_inverted_index),
      journal: work.primary_location?.source?.display_name || null,
      publishedDate: work.publication_year ? `${work.publication_year}` : null,
      subjects: work.concepts?.slice(0, 5).map((c) => c.display_name) || [],
    };
  } catch (error) {
    console.error("[OpenAlex] Error:", error);
    return null;
  }
}

// ============================================================================
// SEMANTIC SCHOLAR API
// ============================================================================

interface SemanticScholarPaper {
  paperId: string;
  title: string;
  abstract?: string;
  authors?: Array<{ name: string }>;
  year?: number;
  venue?: string;
  openAccessPdf?: { url: string };
  externalIds?: {
    DOI?: string;
    ArXiv?: string;
  };
  fieldsOfStudy?: string[];
}

export async function fetchFromSemanticScholar(
  identifier: string,
  type: "doi" | "arxiv"
): Promise<{ metadata: Partial<PaperMetadata>; sourceInfo: ContentSourceInfo } | null> {
  try {
    const idPrefix = type === "doi" ? "DOI:" : "ARXIV:";
    const fields = "paperId,title,abstract,authors,year,venue,openAccessPdf,externalIds,fieldsOfStudy";

    const response = await fetch(
      `https://api.semanticscholar.org/graph/v1/paper/${idPrefix}${encodeURIComponent(identifier)}?fields=${fields}`,
      { headers: { Accept: "application/json" } }
    );

    if (!response.ok) return null;

    const paper: SemanticScholarPaper = await response.json();

    const metadata: Partial<PaperMetadata> = {
      semanticScholarId: paper.paperId,
      title: paper.title,
      authors: paper.authors?.map((a) => a.name) || [],
      abstract: paper.abstract || null,
      journal: paper.venue || null,
      publishedDate: paper.year ? `${paper.year}` : null,
      subjects: paper.fieldsOfStudy || [],
    };

    if (paper.externalIds?.DOI) {
      metadata.doi = paper.externalIds.DOI;
    }
    if (paper.externalIds?.ArXiv) {
      metadata.arxivId = paper.externalIds.ArXiv;
    }

    const sourceInfo: ContentSourceInfo = {
      source: "semanticscholar",
      hasFullText: !!paper.openAccessPdf?.url,
      pdfUrl: paper.openAccessPdf?.url,
    };

    return { metadata, sourceInfo };
  } catch (error) {
    console.error("[Semantic Scholar] Error:", error);
    return null;
  }
}

// ============================================================================
// ARXIV API
// ============================================================================

interface ArxivEntry {
  id: string;
  title: string;
  summary: string;
  authors: string[];
  published: string;
  categories: string[];
  pdfUrl: string;
  doi?: string;
}

// Atom namespace used by arXiv API
const ATOM_NS = "http://www.w3.org/2005/Atom";

// Helper to get element text content from namespaced XML
function getElementText(parent: Element, tagName: string, ns: string = ATOM_NS): string {
  const el = parent.getElementsByTagNameNS(ns, tagName)[0];
  return el?.textContent?.replace(/\s+/g, " ").trim() || "";
}

function parseArxivXML(xml: string): ArxivEntry | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, "text/xml");

    // Check for parse errors
    const parseError = doc.querySelector("parsererror");
    if (parseError) {
      console.error("[arXiv] XML parse error:", parseError.textContent);
      return null;
    }

    // Use namespace-aware method for Atom feed
    const entries = doc.getElementsByTagNameNS(ATOM_NS, "entry");
    if (entries.length === 0) return null;
    const entry = entries[0];

    const id = getElementText(entry, "id");
    const arxivId = id.replace("http://arxiv.org/abs/", "").replace(/v\d+$/, "");

    const title = getElementText(entry, "title");
    const summary = getElementText(entry, "summary");

    const authors: string[] = [];
    const authorElements = entry.getElementsByTagNameNS(ATOM_NS, "author");
    for (let i = 0; i < authorElements.length; i++) {
      const name = getElementText(authorElements[i], "name");
      if (name) authors.push(name);
    }

    const published = getElementText(entry, "published");

    const categories: string[] = [];
    const categoryElements = entry.getElementsByTagNameNS(ATOM_NS, "category");
    for (let i = 0; i < categoryElements.length; i++) {
      const term = categoryElements[i].getAttribute("term");
      if (term) categories.push(term);
    }

    // Look for DOI link
    let doi: string | undefined;
    const linkElements = entry.getElementsByTagNameNS(ATOM_NS, "link");
    for (let i = 0; i < linkElements.length; i++) {
      if (linkElements[i].getAttribute("title") === "doi") {
        doi = linkElements[i].getAttribute("href")?.replace("http://dx.doi.org/", "");
        break;
      }
    }

    return {
      id: arxivId,
      title,
      summary,
      authors,
      published: published.split("T")[0],
      categories,
      pdfUrl: `https://arxiv.org/pdf/${arxivId}.pdf`,
      doi,
    };
  } catch (error) {
    console.error("[arXiv] XML parse error:", error);
    return null;
  }
}

export async function fetchFromArxiv(arxivId: string): Promise<{
  metadata: Partial<PaperMetadata>;
  sourceInfo: ContentSourceInfo;
} | null> {
  try {
    const response = await fetch(
      `https://export.arxiv.org/api/query?id_list=${encodeURIComponent(arxivId)}`,
      { headers: { Accept: "application/xml" } }
    );

    if (!response.ok) return null;

    const xml = await response.text();
    const entry = parseArxivXML(xml);

    if (!entry) return null;

    const metadata: Partial<PaperMetadata> = {
      arxivId: entry.id,
      doi: entry.doi || null,
      title: entry.title,
      authors: entry.authors,
      abstract: entry.summary,
      journal: "arXiv preprint",
      publishedDate: entry.published,
      url: `https://arxiv.org/abs/${entry.id}`,
      subjects: entry.categories,
    };

    const sourceInfo: ContentSourceInfo = {
      source: "arxiv",
      hasFullText: true,
      pdfUrl: entry.pdfUrl,
    };

    return { metadata, sourceInfo };
  } catch (error) {
    console.error("[arXiv] Error:", error);
    return null;
  }
}

// ============================================================================
// PDF TEXT EXTRACTION
// ============================================================================

// Type for PDF text content items (covers both TextItem and TextMarkedContent from pdfjs-dist)
interface PDFTextItem {
  str?: string;
}

export async function extractTextFromPDF(pdfUrl: string): Promise<string | null> {
  // PDFDocumentProxy type - we use 'any' here because pdfjs-dist types are complex
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pdf: any = null;

  try {
    const pdfjsLib = await initPdfJs();

    // For arXiv PDFs, we can fetch directly
    // For other sources, we might need a CORS proxy
    let url = pdfUrl;
    if (!pdfUrl.includes("arxiv.org")) {
      url = `https://corsproxy.io/?${encodeURIComponent(pdfUrl)}`;
    }

    const loadingTask = pdfjsLib.getDocument({
      url,
      disableAutoFetch: true,
      disableStream: true,
    });

    pdf = await loadingTask.promise;
    const textParts: string[] = [];
    const maxPages = Math.min(pdf.numPages, 50); // Limit to 50 pages

    for (let i = 1; i <= maxPages; i++) {
      try {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: PDFTextItem) => item.str || "")
          .join(" ");
        textParts.push(pageText);
      } catch (pageError) {
        // Log but continue with other pages
        console.warn(`[PDF Extract] Failed to extract page ${i}:`, pageError);
        continue;
      }
    }

    const fullText = textParts.join("\n\n").trim();

    // Clean up the text
    const cleanedText = fullText
      .replace(/\s+/g, " ")
      .replace(/- /g, "") // Remove hyphenation
      .trim();

    return cleanedText || null;
  } catch (error) {
    console.error("[PDF Extract] Error:", error);
    return null;
  } finally {
    // Fix: Always destroy the PDF document to prevent memory leaks
    if (pdf) {
      try {
        await pdf.destroy();
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}

// ============================================================================
// MAIN FETCH FUNCTION
// ============================================================================

export async function fetchPaper(
  input: string,
  onProgress?: (step: string) => void
): Promise<PaperMetadata> {
  const sources: ContentSourceInfo[] = [];
  let metadata: Partial<PaperMetadata> = {
    doi: null,
    arxivId: null,
    semanticScholarId: null,
    title: "Unknown",
    authors: [],
    abstract: null,
    journal: null,
    publishedDate: null,
    url: "",
    subjects: [],
    fullText: null,
    fullTextSource: null,
    sources: [],
    wordCount: 0,
    hasFullText: false,
  };

  const inputType = detectInputType(input);

  if (inputType === "unknown") {
    throw new Error(
      "Could not detect input type. Please enter a valid DOI (10.xxxx/xxxxx) or arXiv ID (2301.12345)"
    );
  }

  // Step 1: Fetch from primary source based on input type
  if (inputType === "arxiv") {
    const arxivId = parseArxivId(input);
    if (!arxivId) {
      throw new Error("Failed to parse arXiv ID");
    }

    onProgress?.("Fetching from arXiv...");

    const arxivResult = await fetchFromArxiv(arxivId);
    if (arxivResult) {
      metadata = { ...metadata, ...arxivResult.metadata };
      sources.push(arxivResult.sourceInfo);

      if (arxivResult.metadata.doi) {
        metadata.doi = arxivResult.metadata.doi;
      }
    } else {
      throw new Error(`Could not find arXiv paper: ${arxivId}`);
    }
  } else {
    // DOI input
    const doi = parseDOI(input);
    if (!doi) {
      throw new Error("Failed to parse DOI");
    }
    metadata.doi = doi;

    onProgress?.("Fetching from CrossRef...");
    const crossRefData = await fetchFromCrossRef(doi);
    if (crossRefData) {
      metadata = { ...metadata, ...crossRefData };
      sources.push({ source: "crossref", hasFullText: false });
    }
  }

  // Step 2: Fetch from additional sources in parallel
  const identifier = metadata.doi || metadata.arxivId;
  const idType = metadata.doi ? "doi" : "arxiv";

  if (identifier) {
    onProgress?.("Checking additional sources...");

    // Fetch from multiple sources in parallel for better coverage
    const parallelResults = await Promise.all([
      fetchFromSemanticScholar(identifier, idType as "doi" | "arxiv"),
      metadata.doi ? fetchFromUnpaywall(metadata.doi) : Promise.resolve(null),
      metadata.doi ? fetchFromOpenAlex(metadata.doi) : Promise.resolve(null),
    ]);

    const [ssResult, unpaywallInfo, openAlexData] = parallelResults;

    // Merge Semantic Scholar data
    if (ssResult) {
      if (!metadata.abstract && ssResult.metadata.abstract) {
        metadata.abstract = ssResult.metadata.abstract;
      }
      if (!metadata.semanticScholarId) {
        metadata.semanticScholarId = ssResult.metadata.semanticScholarId || null;
      }
      if (!metadata.arxivId && ssResult.metadata.arxivId) {
        metadata.arxivId = ssResult.metadata.arxivId;
      }
      sources.push(ssResult.sourceInfo);
    }

    // Merge OpenAlex data (has better abstract coverage)
    if (openAlexData) {
      if (!metadata.abstract && openAlexData.abstract) {
        metadata.abstract = openAlexData.abstract;
      }
      // Use OpenAlex subjects if we don't have any
      if ((!metadata.subjects || metadata.subjects.length === 0) && openAlexData.subjects) {
        metadata.subjects = openAlexData.subjects;
      }
    }

    if (unpaywallInfo) {
      sources.push(unpaywallInfo);
    }
  }

  // Step 3: Try to extract full text from best available PDF
  const pdfSource = sources.find((s) => s.pdfUrl && s.hasFullText);
  if (pdfSource?.pdfUrl) {
    onProgress?.("Extracting text from PDF...");
    try {
      const fullText = await extractTextFromPDF(pdfSource.pdfUrl);
      if (fullText && fullText.length > 500) {
        metadata.fullText = fullText;
        metadata.fullTextSource = pdfSource.source;
        metadata.hasFullText = true;
      }
    } catch (error) {
      console.error("[PDF Extract] Failed:", error);
      // Continue without full text
    }
  }

  // Calculate word count
  const content = metadata.fullText || metadata.abstract || "";
  metadata.wordCount = content.split(/\s+/).filter(Boolean).length;
  metadata.sources = sources;
  metadata.hasFullText = !!metadata.fullText;

  // Set URL if not already set
  if (!metadata.url) {
    if (metadata.doi) {
      metadata.url = `https://doi.org/${metadata.doi}`;
    } else if (metadata.arxivId) {
      metadata.url = `https://arxiv.org/abs/${metadata.arxivId}`;
    }
  }

  // Validate we have minimum required data
  if (!metadata.title || metadata.title === "Unknown") {
    throw new Error("Could not retrieve paper metadata. Please check the identifier.");
  }

  return metadata as PaperMetadata;
}
