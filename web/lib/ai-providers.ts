// lib/ai-providers.ts
// Phase 5A+: Fallback chain — Gemini → Groq → DeepSeek → OpenRouter

export type AIProviderName = "gemini" | "groq" | "deepseek" | "openrouter";

export interface GenerateTextParams {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
}

export interface GenerateTextResult {
  text: string;
  tokensUsed: number | null;
  providerName: AIProviderName;
  modelName: string;
}

function isFallbackable(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message;
    if (/429|503|quota|rate.?limit|unavailable|timeout|ECONNRESET|fetch/i.test(msg)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Gemini
// ---------------------------------------------------------------------------
const GEMINI_MODEL    = "gemini-2.0-flash";
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export async function callGemini(params: GenerateTextParams): Promise<GenerateTextResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const contents: { role: string; parts: { text: string }[] }[] = [];
  if (params.systemPrompt) {
    contents.push({ role: "user",  parts: [{ text: params.systemPrompt }] });
    contents.push({ role: "model", parts: [{ text: "Understood. I'll follow those instructions." }] });
  }
  contents.push({ role: "user", parts: [{ text: params.prompt }] });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  let res: Response;
  try {
    res = await fetch(
      `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents, generationConfig: { maxOutputTokens: params.maxTokens ?? 1024 } }),
        signal: controller.signal,
      }
    );
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const errBody = await res.text();
    console.error("GEMINI STATUS:", res.status);
    console.error("GEMINI ERROR BODY:", errBody);
    throw new Error(`Gemini API error ${res.status}: ${errBody}`);
  }

  const data = await res.json();
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const tokensUsed: number | null = data?.usageMetadata?.totalTokenCount ?? null;
  return { text, tokensUsed, providerName: "gemini", modelName: GEMINI_MODEL };
}

// ---------------------------------------------------------------------------
// Groq
// ---------------------------------------------------------------------------
const GROQ_MODEL    = "llama-3.3-70b-versatile";
const GROQ_API_BASE = "https://api.groq.com/openai/v1/chat/completions";

export async function callGroq(params: GenerateTextParams): Promise<GenerateTextResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not set");

  const messages: { role: string; content: string }[] = [];
  if (params.systemPrompt) messages.push({ role: "system", content: params.systemPrompt });
  messages.push({ role: "user", content: params.prompt });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  let res: Response;
  try {
    res = await fetch(GROQ_API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: GROQ_MODEL, messages, max_tokens: params.maxTokens ?? 1024 }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const errBody = await res.text();
    console.error("GROQ STATUS:", res.status);
    console.error("GROQ ERROR BODY:", errBody);
    throw new Error(`Groq API error ${res.status}: ${errBody}`);
  }

  const data = await res.json();
  const text: string = data?.choices?.[0]?.message?.content ?? "";
  const tokensUsed: number | null = data?.usage?.total_tokens ?? null;
  return { text, tokensUsed, providerName: "groq", modelName: GROQ_MODEL };
}

// ---------------------------------------------------------------------------
// DeepSeek
// ---------------------------------------------------------------------------
const DEEPSEEK_MODEL    = "deepseek-chat";
const DEEPSEEK_API_BASE = "https://api.deepseek.com/chat/completions";

export async function callDeepSeek(params: GenerateTextParams): Promise<GenerateTextResult> {
  const apiKey = process.env.DEEPSEK_API_KEY ?? process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY is not set");

  const messages: { role: string; content: string }[] = [];
  if (params.systemPrompt) messages.push({ role: "system", content: params.systemPrompt });
  messages.push({ role: "user", content: params.prompt });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  let res: Response;
  try {
    res = await fetch(DEEPSEEK_API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: DEEPSEEK_MODEL, messages, max_tokens: params.maxTokens ?? 1024 }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const errBody = await res.text();
    console.error("DEEPSEEK STATUS:", res.status);
    console.error("DEEPSEEK ERROR BODY:", errBody);
    throw new Error(`DeepSeek API error ${res.status}: ${errBody}`);
  }

  const data = await res.json();
  const text: string = data?.choices?.[0]?.message?.content ?? "";
  const tokensUsed: number | null = data?.usage?.total_tokens ?? null;
  return { text, tokensUsed, providerName: "deepseek", modelName: DEEPSEEK_MODEL };
}

// ---------------------------------------------------------------------------
// OpenRouter
// ---------------------------------------------------------------------------
const OPENROUTER_MODEL    = "mistralai/mistral-7b-instruct";
const OPENROUTER_API_BASE = "https://openrouter.ai/api/v1/chat/completions";

export async function callOpenRouter(params: GenerateTextParams): Promise<GenerateTextResult> {
  const apiKey = process.env.OPENCLOT_API_KEY ?? process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

  const messages: { role: string; content: string }[] = [];
  if (params.systemPrompt) messages.push({ role: "system", content: params.systemPrompt });
  messages.push({ role: "user", content: params.prompt });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  let res: Response;
  try {
    res = await fetch(OPENROUTER_API_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://ai-creator-hub-zeta.vercel.app",
      },
      body: JSON.stringify({ model: OPENROUTER_MODEL, messages, max_tokens: params.maxTokens ?? 1024 }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const errBody = await res.text();
    console.error("OPENROUTER STATUS:", res.status);
    console.error("OPENROUTER ERROR BODY:", errBody);
    throw new Error(`OpenRouter API error ${res.status}: ${errBody}`);
  }

  const data = await res.json();
  const text: string = data?.choices?.[0]?.message?.content ?? "";
  const tokensUsed: number | null = data?.usage?.total_tokens ?? null;
  return { text, tokensUsed, providerName: "openrouter", modelName: OPENROUTER_MODEL };
}

// ---------------------------------------------------------------------------
// Fallback chain — Gemini → Groq → DeepSeek → OpenRouter
// ---------------------------------------------------------------------------
export async function generateText(
  _provider: AIProviderName,
  params: GenerateTextParams
): Promise<GenerateTextResult> {
  const chain: { name: AIProviderName; fn: () => Promise<GenerateTextResult> }[] = [
    { name: "gemini",     fn: () => callGemini(params) },
    { name: "groq",       fn: () => callGroq(params) },
    { name: "deepseek",   fn: () => callDeepSeek(params) },
    { name: "openrouter", fn: () => callOpenRouter(params) },
  ];

  const errors: string[] = [];

  for (const provider of chain) {
    try {
      console.log(`[ai-providers] trying ${provider.name}...`);
      const result = await provider.fn();
      if (result.text?.trim()) {
        console.log(`[ai-providers] success with ${provider.name}`);
        return result;
      }
      throw new Error(`${provider.name} returned empty text`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[ai-providers] ${provider.name} failed:`, msg);
      errors.push(`${provider.name}: ${msg}`);
    }
  }

  throw new Error(`All providers failed:\n${errors.join("\n")}`);
}
