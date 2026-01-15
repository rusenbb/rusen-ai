// Cloudflare Pages Function to proxy LLM API calls
// API key is stored as a secret, never exposed to client
// Rate limited using in-memory store (resets on cold start, good enough for demo)

interface Env {
  OPENROUTER_API_KEY: string;
}

// Simple in-memory rate limiting (resets on cold start)
// For production, use KV or Durable Objects
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT = 20; // requests per window
const RATE_WINDOW = 60 * 1000; // 1 minute in ms

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return { allowed: true, remaining: RATE_LIMIT - 1 };
  }

  if (record.count >= RATE_LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: RATE_LIMIT - record.count };
}

// Handle POST requests for chat completions
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const ip = context.request.headers.get("cf-connecting-ip") || "unknown";

  // Check rate limit
  const { allowed, remaining } = checkRateLimit(ip);
  if (!allowed) {
    return new Response(
      JSON.stringify({ error: "Rate limit exceeded. Try again in a minute." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "X-RateLimit-Remaining": "0",
          "Retry-After": "60",
        },
      }
    );
  }

  // Check API key is configured
  if (!context.env.OPENROUTER_API_KEY) {
    return new Response(
      JSON.stringify({ error: "API not configured" }),
      {
        status: 503,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }

  try {
    const body = await context.request.json() as {
      messages: Array<{ role: string; content: string }>;
      model?: string;
      max_tokens?: number;
      temperature?: number;
      stream?: boolean;
    };

    // Use a free model from OpenRouter
    const model = body.model || "google/gemini-2.0-flash-exp:free";

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${context.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://rusen.ai",
        "X-Title": "Paper Pilot",
      },
      body: JSON.stringify({
        model,
        messages: body.messages,
        max_tokens: body.max_tokens || 4096,
        temperature: body.temperature ?? 0.5,
        stream: body.stream ?? false,
      }),
    });

    // Handle streaming response
    if (body.stream && response.body) {
      return new Response(response.body, {
        status: response.status,
        headers: {
          "Content-Type": "text/event-stream",
          "Access-Control-Allow-Origin": "*",
          "X-RateLimit-Remaining": String(remaining),
          "Cache-Control": "no-cache",
        },
      });
    }

    // Handle non-streaming response
    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "X-RateLimit-Remaining": String(remaining),
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Failed to process request",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
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
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
};
