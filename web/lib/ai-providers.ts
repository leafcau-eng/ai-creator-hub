// lib/ai-providers.ts
// Phase 5A: Gemini only.
// Structure is ready to extend — add callGroq(), callDeepseek(), etc. later
// without changing route handlers or DB schema.

export type AIProviderName = "gemini"; // extend: | 'groq' | 'deepseek'

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

// ---------------------------------------------------------------------------
// Gemini
// ---------------------------------------------------------------------------

const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_API_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";

export async function callGemini(
  params: GenerateTextParams
): Promise<GenerateTextResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const contents: { role: string; parts: { text: string }[] }[] = [];

  if (params.systemPrompt) {
    contents.push({
      role: "user",
      parts: [{ text: params.systemPrompt }],
    });
    contents.push({
      role: "model",
      parts: [{ text: "Understood. I'll follow those instructions." }],
    });
  }

  contents.push({
    role: "user",
    parts: [{ text: params.prompt }],
  });

  const res = await fetch(
    `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: {
          maxOutputTokens: params.maxTokens ?? 1024,
        },
      }),
    }
  );

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errBody}`);
  }

  const data = await res.json();

  const text: string =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  const tokensUsed: number | null =
    data?.usageMetadata?.totalTokenCount ?? null;

  return {
    text,
    tokensUsed,
    providerName: "gemini",
    modelName: GEMINI_MODEL,
  };
}

// ---------------------------------------------------------------------------
// Dispatcher — call this from route handlers.
// When adding a new provider: add its name to AIProviderName and add a case.
// ---------------------------------------------------------------------------

export async function generateText(
  provider: AIProviderName,
  params: GenerateTextParams
): Promise<GenerateTextResult> {
  switch (provider) {
    case "gemini":
      return callGemini(params);
    default:
      throw new Error(`Unknown AI provider: ${provider}`);
  }
}