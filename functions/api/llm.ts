// Cloudflare Pages Function to proxy LLM API calls
// API keys are stored as secrets, never exposed to client
// Uses OpenRouter's free model router for automatic model selection

interface Env {
  OPENROUTER_API_KEY_01?: string;
  OPENROUTER_API_KEY_02?: string;
  OPENROUTER_API_KEY_03?: string;
  OPENROUTER_API_KEY_04?: string;
  OPENROUTER_API_KEY_05?: string;
  OPENROUTER_API_KEY_06?: string;
  OPENROUTER_API_KEY_07?: string;
  OPENROUTER_API_KEY_08?: string;
  OPENROUTER_API_KEY_09?: string;
  OPENROUTER_API_KEY_10?: string;
}

// OpenRouter's free model router - automatically selects the best available free model
const FREE_MODEL = "openrouter/free";

// Simple in-memory rate limiting (resets on cold start)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT = 30; // requests per window per user
const RATE_WINDOW = 60 * 1000; // 1 minute in ms

// Counter for round-robin key rotation
let keyRotationCounter = 0;

function getApiKeys(env: Env): string[] {
  const keys: string[] = [];
  if (env.OPENROUTER_API_KEY_01) keys.push(env.OPENROUTER_API_KEY_01);
  if (env.OPENROUTER_API_KEY_02) keys.push(env.OPENROUTER_API_KEY_02);
  if (env.OPENROUTER_API_KEY_03) keys.push(env.OPENROUTER_API_KEY_03);
  if (env.OPENROUTER_API_KEY_04) keys.push(env.OPENROUTER_API_KEY_04);
  if (env.OPENROUTER_API_KEY_05) keys.push(env.OPENROUTER_API_KEY_05);
  if (env.OPENROUTER_API_KEY_06) keys.push(env.OPENROUTER_API_KEY_06);
  if (env.OPENROUTER_API_KEY_07) keys.push(env.OPENROUTER_API_KEY_07);
  if (env.OPENROUTER_API_KEY_08) keys.push(env.OPENROUTER_API_KEY_08);
  if (env.OPENROUTER_API_KEY_09) keys.push(env.OPENROUTER_API_KEY_09);
  if (env.OPENROUTER_API_KEY_10) keys.push(env.OPENROUTER_API_KEY_10);
  return keys;
}

function getNextApiKey(env: Env): string | null {
  const keys = getApiKeys(env);
  if (keys.length === 0) return null;

  // Round-robin rotation
  const key = keys[keyRotationCounter % keys.length];
  keyRotationCounter++;
  return key;
}

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

  // Get API key (rotates between available keys)
  const apiKey = getNextApiKey(context.env);
  if (!apiKey) {
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
      max_tokens?: number;
      temperature?: number;
      stream?: boolean;
      response_format?: { type: string };
      use_case?: string;
    };

    // Build request body using OpenRouter's free model router
    const requestBody: Record<string, unknown> = {
      model: FREE_MODEL,
      messages: body.messages,
      max_tokens: body.max_tokens || 16384,
      temperature: body.temperature ?? 0.5,
      stream: body.stream ?? false,
    };

    // Add JSON mode if requested
    if (body.response_format?.type === "json_object") {
      requestBody.response_format = { type: "json_object" };
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://rusen.ai",
        "X-Title": "Rusen AI Demos",
      },
      body: JSON.stringify(requestBody),
    });

    // Extract actual model used from response headers (OpenRouter provides this)
    const modelUsed = response.headers.get("x-model") || FREE_MODEL;

    // Handle streaming response
    if (body.stream && response.body) {
      return new Response(response.body, {
        status: response.status,
        headers: {
          "Content-Type": "text/event-stream",
          "Access-Control-Allow-Origin": "*",
          "X-RateLimit-Remaining": String(remaining),
          "X-Model-Used": modelUsed,
          "Cache-Control": "no-cache",
        },
      });
    }

    // Handle non-streaming response
    const data = await response.json() as Record<string, unknown>;

    // Normalize error responses from OpenRouter
    if (!response.ok && data.error && typeof data.error === "object") {
      const errObj = data.error as { message?: string; type?: string; code?: string };
      return new Response(
        JSON.stringify({
          error: errObj.message || errObj.type || "API error",
          code: errObj.code,
        }),
        {
          status: response.status,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "X-RateLimit-Remaining": String(remaining),
            "X-Model-Used": modelUsed,
          },
        }
      );
    }

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "X-RateLimit-Remaining": String(remaining),
        "X-Model-Used": modelUsed,
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
