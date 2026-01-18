// Cloudflare Pages Function to proxy LLM API calls
// API keys are stored as secrets, never exposed to client
// Rotates between multiple keys and falls back to alternative models

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

// Model configurations by use case
// Order matters: first is primary, rest are fallbacks
// Note: DeepSeek R1 uses "reasoning tokens" which can cause truncation, so we prioritize
// models with direct output for summarization tasks
const MODELS = {
  // Paper Pilot: Long context for full papers, good summarization
  // Prioritize models that don't use reasoning tokens (Gemini, Llama, Gemma)
  "paper-pilot": [
    "google/gemini-2.0-flash-exp:free",       // 1M context - best for papers, no reasoning overhead
    "meta-llama/llama-3.3-70b-instruct:free", // 131K context, reliable, direct output
    "google/gemma-3-27b-it:free",             // 131K context, multimodal
    "deepseek/deepseek-r1-0528:free",         // Reasoning tokens can truncate
    "qwen/qwen3-coder:free",                  // May have payment issues, last resort
  ],
  // Data Forge: JSON generation, structured output
  "data-forge": [
    "google/gemini-2.0-flash-exp:free",       // Fast, good JSON
    "meta-llama/llama-3.3-70b-instruct:free", // Reliable JSON
    "google/gemma-3-27b-it:free",             // Good fallback
    "deepseek/deepseek-r1-0528:free",         // Strong reasoning for complex schemas
    "qwen/qwen3-coder:free",                  // May have payment issues, last resort
  ],
  // Default fallback chain
  "default": [
    "google/gemini-2.0-flash-exp:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "deepseek/deepseek-r1-0528:free",
  ],
};

type UseCase = keyof typeof MODELS;

// Simple in-memory rate limiting (resets on cold start)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT = 30; // requests per window per user
const RATE_WINDOW = 60 * 1000; // 1 minute in ms

// Counter for round-robin key rotation
let keyRotationCounter = 0;

function getApiKeys(env: Env): string[] {
  const keys: string[] = [];
  // Debug: log which env vars are present (not their values)
  console.log("[LLM] Checking env vars:", {
    hasKey01: !!env.OPENROUTER_API_KEY_01,
    hasKey02: !!env.OPENROUTER_API_KEY_02,
    envKeys: Object.keys(env),
  });
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
  console.log("[LLM] Found", keys.length, "API keys");
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

function getModelsForUseCase(useCase?: string): string[] {
  if (useCase && useCase in MODELS) {
    return MODELS[useCase as UseCase];
  }
  return MODELS.default;
}

// Try request with fallback models
async function tryWithFallback(
  apiKey: string,
  requestBody: Record<string, unknown>,
  models: string[],
  stream: boolean
): Promise<{ response: Response; model: string }> {
  let lastError: Error | null = null;

  for (const model of models) {
    try {
      const body = { ...requestBody, model };

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": "https://rusen.ai",
          "X-Title": "Rusen AI Demos",
        },
        body: JSON.stringify(body),
      });

      // If successful or client error (not rate limit/payment), return
      if (response.ok || (response.status >= 400 && response.status < 402)) {
        return { response, model };
      }

      // If payment required (402), rate limited (429), or server error (5xx), try next model
      if (response.status === 402 || response.status === 429 || response.status >= 500) {
        console.log(`Model ${model} unavailable (${response.status}), trying next...`);
        continue;
      }

      // Other errors, return as-is
      return { response, model };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.log(`Model ${model} failed: ${lastError.message}, trying next...`);
      continue;
    }
  }

  // All models failed, throw last error
  throw lastError || new Error("All models failed");
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
      model?: string;
      max_tokens?: number;
      temperature?: number;
      stream?: boolean;
      response_format?: { type: string };
      use_case?: string; // "paper-pilot" | "data-forge"
    };

    // Get models: if specific model requested, put it first then add fallbacks
    // This way if the selected model fails (429), we still have options
    const fallbackModels = getModelsForUseCase(body.use_case);
    const models = body.model
      ? [body.model, ...fallbackModels.filter(m => m !== body.model)]
      : fallbackModels;

    // Build request body
    const requestBody: Record<string, unknown> = {
      messages: body.messages,
      max_tokens: body.max_tokens || 16384,
      temperature: body.temperature ?? 0.5,
      stream: body.stream ?? false,
    };

    // Add JSON mode if requested
    if (body.response_format?.type === "json_object") {
      requestBody.response_format = { type: "json_object" };
    }

    // Try with fallback models
    const { response, model } = await tryWithFallback(
      apiKey,
      requestBody,
      models,
      body.stream ?? false
    );

    // Handle streaming response
    if (body.stream && response.body) {
      return new Response(response.body, {
        status: response.status,
        headers: {
          "Content-Type": "text/event-stream",
          "Access-Control-Allow-Origin": "*",
          "X-RateLimit-Remaining": String(remaining),
          "X-Model-Used": model,
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
        "X-Model-Used": model,
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
