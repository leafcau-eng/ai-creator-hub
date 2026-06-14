// lib/image-providers.ts
// Phase 6: Image generation — Gemini Imagen 3 → OpenRouter (FLUX fallback)

export type ImageProviderName = "gemini-imagen" | "openrouter-flux";

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

/** Map "16:9" → Gemini aspectRatio string */
function toGeminiRatio(ratio: string | undefined): string {
  const map: Record<string, string> = {
    "1:1":  "1:1",
    "16:9": "16:9",
    "9:16": "9:16",
    "4:3":  "4:3",
  };
  return map[ratio ?? "1:1"] ?? "1:1";
}

/** Build an enriched prompt from style + prompt */
function buildPrompt(params: GenerateImageParams): string {
  const stylePart = params.style ? `${params.style} style, ` : "";
  return `${stylePart}${params.prompt}`.trim();
}

// ── Gemini Imagen 3 ──────────────────────────────────────────────────────────
// Docs: https://ai.google.dev/api/generate-images

const GEMINI_IMAGE_MODEL    = "imagen-3.0-generate-002";
const GEMINI_IMAGE_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export async function callGeminiImagen(
  params: GenerateImageParams
): Promise<GenerateImageResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);

  let res: Response;
  try {
    res = await fetch(
      `${GEMINI_IMAGE_API_BASE}/${GEMINI_IMAGE_MODEL}:predict?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [
            {
              prompt: buildPrompt(params),
              ...(params.negativePrompt
                ? { negativePrompt: params.negativePrompt }
                : {}),
            },
          ],
          parameters: {
            sampleCount: Math.min(params.numOutputs ?? 1, 4),
            aspectRatio: toGeminiRatio(params.aspectRatio),
            // safetySetting: "block_only_high",
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
    console.error("GEMINI IMAGEN STATUS:", res.status);
    console.error("GEMINI IMAGEN ERROR:", errBody);
    throw new Error(`Gemini Imagen error ${res.status}: ${errBody}`);
  }

  const data = await res.json();

  // Response shape: { predictions: [{ bytesBase64Encoded, mimeType }] }
  const predictions: Array<{ bytesBase64Encoded: string; mimeType: string }> =
    data?.predictions ?? [];

  if (!predictions.length) {
    throw new Error("Gemini Imagen returned no images");
  }

  const images: GeneratedImage[] = predictions.map((p) => ({
    base64:   p.bytesBase64Encoded,
    mimeType: p.mimeType ?? "image/png",
  }));

  return { images, providerName: "gemini-imagen", modelName: GEMINI_IMAGE_MODEL };
}

// ── OpenRouter — FLUX.1 Schnell (fallback) ───────────────────────────────────
// Via OpenRouter image generation endpoint

const OPENROUTER_IMAGE_MODEL    = "black-forest-labs/FLUX.1-schnell";
const OPENROUTER_IMAGE_API_BASE = "https://openrouter.ai/api/v1/images/generations";

export async function callOpenRouterFlux(
  params: GenerateImageParams
): Promise<GenerateImageResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

  // Map aspect ratio to width/height for OpenRouter
  const sizeMap: Record<string, string> = {
    "1:1":  "1024x1024",
    "16:9": "1344x768",
    "9:16": "768x1344",
    "4:3":  "1024x768",
  };
  const size = sizeMap[params.aspectRatio ?? "1:1"] ?? "1024x1024";
  const n    = Math.min(params.numOutputs ?? 1, 4);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000); // FLUX can be slow

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

  // Response shape: { data: [{ b64_json }] }
  const items: Array<{ b64_json: string }> = data?.data ?? [];
  if (!items.length) throw new Error("OpenRouter FLUX returned no images");

  const images: GeneratedImage[] = items.map((item) => ({
    base64:   item.b64_json,
    mimeType: "image/png",
  }));

  return { images, providerName: "openrouter-flux", modelName: OPENROUTER_IMAGE_MODEL };
}

// ── Fallback chain — Gemini Imagen → OpenRouter FLUX ─────────────────────────

export async function generateImages(
  params: GenerateImageParams
): Promise<GenerateImageResult> {
  const chain: { name: ImageProviderName; fn: () => Promise<GenerateImageResult> }[] = [
    { name: "gemini-imagen",   fn: () => callGeminiImagen(params) },
    { name: "openrouter-flux", fn: () => callOpenRouterFlux(params) },
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
