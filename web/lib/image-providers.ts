// lib/image-providers.ts
// Phase 6: Image generation — Gemini Flash Image (generateContent) → fallback

export type ImageProviderName = "gemini-flash-image" | "openrouter-flux";

export interface GenerateImageParams {
  prompt: string;
  negativePrompt?: string;
  style?: string;
  aspectRatio?: string; // "1:1" | "16:9" | "9:16" | "4:3"
  numOutputs?: number;  // 1–4
}

export interface GeneratedImage {
  base64: string;       // raw base64 PNG/JPEG (no data-URI prefix)
  mimeType: string;     // "image/png" | "image/jpeg"
  width?: number;
  height?: number;
}

export interface GenerateImageResult {
  images: GeneratedImage[];
  providerName: ImageProviderName;
  modelName: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Build enriched prompt dari style + prompt + aspect ratio hint */
function buildPrompt(params: GenerateImageParams): string {
  const stylePart = params.style ? `${params.style} style, ` : "";
  const negPart   = params.negativePrompt ? ` Avoid: ${params.negativePrompt}.` : "";
  const ratioPart = params.aspectRatio && params.aspectRatio !== "1:1"
    ? ` Aspect ratio ${params.aspectRatio}.`
    : "";
  return `${stylePart}${params.prompt}${negPart}${ratioPart}`.trim();
}

// ── Gemini Flash Image — generateContent endpoint ────────────────────────────
// Model: gemini-2.5-flash-image (gratis, tidak perlu paid plan)
// Docs: https://ai.google.dev/gemini-api/docs/image-generation

const GEMINI_IMAGE_MODEL    = "gemini-2.5-flash-image";
const GEMINI_IMAGE_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export async function callGeminiFlashImage(
  params: GenerateImageParams
): Promise<GenerateImageResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const count = Math.min(params.numOutputs ?? 1, 4);
  const allImages: GeneratedImage[] = [];

  // generateContent hanya bisa 1 gambar per request — loop untuk numOutputs > 1
  for (let i = 0; i < count; i++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);

    let res: Response;
    try {
      res = await fetch(
        `${GEMINI_IMAGE_API_BASE}/${GEMINI_IMAGE_MODEL}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: buildPrompt(params) }],
              },
            ],
            generationConfig: {
              responseModalities: ["IMAGE", "TEXT"],
            },
          }),
          signal: controller.signal,
        }
      );
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      const errBody = await res.text();
      console.error("GEMINI FLASH IMAGE STATUS:", res.status);
      console.error("GEMINI FLASH IMAGE ERROR:", errBody);
      throw new Error(`Gemini Flash Image error ${res.status}: ${errBody}`);
    }

    const data = await res.json();

    // Response: candidates[0].content.parts[] — cari part dengan inlineData
    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        allImages.push({
          base64:   part.inlineData.data,
          mimeType: part.inlineData.mimeType ?? "image/png",
        });
      }
    }
  }

  if (allImages.length === 0) {
    throw new Error("Gemini Flash Image returned no images");
  }

  return { images: allImages, providerName: "gemini-flash-image", modelName: GEMINI_IMAGE_MODEL };
}

// ── OpenRouter — FLUX.1 Schnell (fallback) ───────────────────────────────────

const OPENROUTER_IMAGE_MODEL    = "black-forest-labs/FLUX.1-schnell";
const OPENROUTER_IMAGE_API_BASE = "https://openrouter.ai/api/v1/images/generations";

export async function callOpenRouterFlux(
  params: GenerateImageParams
): Promise<GenerateImageResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

  const sizeMap: Record<string, string> = {
    "1:1":  "1024x1024",
    "16:9": "1344x768",
    "9:16": "768x1344",
    "4:3":  "1024x768",
  };
  const size = sizeMap[params.aspectRatio ?? "1:1"] ?? "1024x1024";
  const n    = Math.min(params.numOutputs ?? 1, 4);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);

  let res: Response;
  try {
    res = await fetch(OPENROUTER_IMAGE_API_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://ai-creator-hub-zeta.vercel.app",
      },
      body: JSON.stringify({
        model:           OPENROUTER_IMAGE_MODEL,
        prompt:          buildPrompt(params),
        n,
        size,
        response_format: "b64_json",
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const errBody = await res.text();
    console.error("OPENROUTER FLUX STATUS:", res.status);
    console.error("OPENROUTER FLUX ERROR:", errBody);
    throw new Error(`OpenRouter FLUX error ${res.status}: ${errBody}`);
  }

  const data = await res.json();
  const items: Array<{ b64_json: string }> = data?.data ?? [];
  if (!items.length) throw new Error("OpenRouter FLUX returned no images");

  const images: GeneratedImage[] = items.map((item) => ({
    base64:   item.b64_json,
    mimeType: "image/png",
  }));

  return { images, providerName: "openrouter-flux", modelName: OPENROUTER_IMAGE_MODEL };
}

// ── Fallback chain ────────────────────────────────────────────────────────────

export async function generateImages(
  params: GenerateImageParams
): Promise<GenerateImageResult> {
  const chain: { name: ImageProviderName; fn: () => Promise<GenerateImageResult> }[] = [
    { name: "gemini-flash-image", fn: () => callGeminiFlashImage(params) },
    { name: "openrouter-flux",    fn: () => callOpenRouterFlux(params) },
  ];

  const errors: string[] = [];

  for (const provider of chain) {
    try {
      console.log(`[image-providers] trying ${provider.name}...`);
      const result = await provider.fn();
      if (result.images.length > 0) {
        console.log(`[image-providers] success with ${provider.name}`);
        return result;
      }
      throw new Error(`${provider.name} returned 0 images`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[image-providers] ${provider.name} failed:`, msg);
      errors.push(`${provider.name}: ${msg}`);
    }
  }

  throw new Error(`All image providers failed:\n${errors.join("\n")}`);
}
