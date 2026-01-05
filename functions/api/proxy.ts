// Cloudflare Pages Function to proxy requests to external APIs
// This bypasses CORS restrictions since the request comes from the server

interface Env {
  // Add any environment variables here if needed
}

// Allowed domains for proxying (security measure)
const ALLOWED_DOMAINS = [
  // arXiv
  "export.arxiv.org",
  "arxiv.org",
  // Academic publishers
  "www.ncbi.nlm.nih.gov",
  "ncbi.nlm.nih.gov",
  "europepmc.org",
  "www.biorxiv.org",
  "biorxiv.org",
  "www.medrxiv.org",
  "medrxiv.org",
  // Semantic Scholar PDFs
  "pdfs.semanticscholar.org",
  // PMC (PubMed Central)
  "pmc.ncbi.nlm.nih.gov",
  // Open access repositories
  "zenodo.org",
  "www.researchgate.net",
  "researchgate.net",
  // Publisher sites (for open access PDFs)
  "link.springer.com",
  "www.nature.com",
  "nature.com",
  "journals.plos.org",
  "www.cell.com",
  "cell.com",
  "www.sciencedirect.com",
  "sciencedirect.com",
  "academic.oup.com",
  "onlinelibrary.wiley.com",
];

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const targetUrl = url.searchParams.get("url");

  if (!targetUrl) {
    return new Response(JSON.stringify({ error: "Missing 'url' parameter" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Validate the target URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(targetUrl);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid URL" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Security check: only allow specific domains
  const isAllowed = ALLOWED_DOMAINS.some(
    (domain) => parsedUrl.hostname === domain || parsedUrl.hostname.endsWith(`.${domain}`)
  );

  if (!isAllowed) {
    return new Response(
      JSON.stringify({
        error: "Domain not allowed",
        allowed: ALLOWED_DOMAINS,
      }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    // Forward the request to the target URL
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "PaperPilot/1.0 (https://rusen.ai; contact@rusen.ai)",
        Accept: context.request.headers.get("Accept") || "*/*",
      },
    });

    // Get the response body
    const body = await response.arrayBuffer();

    // Return the response with CORS headers
    return new Response(body, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "application/octet-stream",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Accept",
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Failed to fetch",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 502,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
};

// Handle OPTIONS requests for CORS preflight
export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Accept",
      "Access-Control-Max-Age": "86400",
    },
  });
};
