// lib/image-providers.ts
// Phase 6: Image generation — HuggingFace FLUX.1 → Gemini Flash Image (fallback)

export type ImageProviderName = "huggingface-flux" | "gemini-flash-image";

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

function buildPrompt(params: GenerateImageParams): string {
  const stylePart = params.style ? `${params.style} style, ` : "";
  return `${stylePart}${params.prompt}`.trim();
}

// Map aspect ratio → width/height
function ratioToSize(ratio: string | undefined): { width: number; height: number } {
  const map: Record<string, { width: number; height: number }> = {
    "1:1":  { width: 1024, height: 1024 },
    "16:9": { width: 1344, height: 768  },
    "9:16": { width: 768,  height: 1344 },
    "4:3":  { width: 1024, height: 768  },
  };
  return map[ratio ?? "1:1"] ?? { width: 1024, height: 1024 };
}

// ── HuggingFace FLUX.1-schnell ───────────────────────────────────────────────
// Docs: https://huggingface.co/black-forest-labs/FLUX.1-schnell
// Inference Providers API — gratis dengan rate limit

const HF_MODEL    = "black-forest-labs/FLUX.1-schnell";
const HF_API_BASE = "https://router.huggingface.co/hf-inference/models";

export async function callHuggingFaceFlux(
  params: GenerateImageParams
): Promise<GenerateImageResult> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) throw new Error("HUGGINGFACE_API_KEY is not set");

  const count = Math.min(params.numOutputs ?? 1, 4);
  const { width, height } = ratioToSize(params.aspectRatio);
  const allImages: GeneratedImage[] = [];

  // HF Inference: 1 image per request — loop untuk numOutputs > 1
  for (let i = 0; i < count; i++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60000);

    let res: Response;
    try {
      res = await fetch(`${HF_API_BASE}/${HF_MODEL}`, {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          inputs: buildPrompt(params),
          parameters: {
            width,
            height,
            num_inference_steps: 4, // FLUX schnell optimal di 4 steps
            ...(params.negativePrompt ? { negative_prompt: params.negativePrompt } : {}),
          },
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      const errBody = await res.text();
      console.error("HF FLUX STATUS:", res.status);
      console.error("HF FLUX ERROR:", errBody);
      throw new Error(`HuggingFace FLUX error ${res.status}: ${errBody}`);
    }

    // Response: binary image (blob)
    const blob       = await res.blob();
    const arrayBuf   = await blob.arrayBuffer();
    const base64     = Buffer.from(arrayBuf).toString("base64");
    const mimeType   = blob.type || "image/jpeg";

    allImages.push({ base64, mimeType, width, height });
  }

  if (allImages.length === 0) {
    throw new Error("HuggingFace FLUX returned no images");
  }

  return { images: allImages, providerName: "huggingface-flux", modelName: HF_MODEL };
}

// ── Gemini Flash Image (fallback) ─────────────────────────────────────────────

const GEMINI_IMAGE_MODEL    = "gemini-2.5-flash-image";
const GEMINI_IMAGE_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export async function callGeminiFlashImage(
  params: GenerateImageParams
): Promise<GenerateImageResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const count = Math.min(params.numOutputs ?? 1, 4);
  const allImages: GeneratedImage[] = [];

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
            contents: [{ parts: [{ text: buildPrompt(params) }] }],
            generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
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

    const data  = await res.json();
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

// ── Fallback chain — HF FLUX → Gemini Flash Image ────────────────────────────

export async function generateImages(
  params: GenerateImageParams
): Promise<GenerateImageResult> {
  const chain: { name: ImageProviderName; fn: () => Promise<GenerateImageResult> }[] = [
    { name: "huggingface-flux",  fn: () => callHuggingFaceFlux(params) },
    { name: "gemini-flash-image", fn: () => callGeminiFlashImage(params) },
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
