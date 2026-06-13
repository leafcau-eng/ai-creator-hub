// app/api/ai-writer/route.ts
// Phase 5A: synchronous generate → insert job → call Gemini → update job

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase-server";
import { generateText } from "@/lib/ai-providers";

// writer_output_type ENUM values from schema
const VALID_OUTPUT_TYPES = [
  "caption",
  "script",
  "hook",
  "thread",
  "blog",
  "email",
  "ad_copy",
  "other",
] as const;

type WriterOutputType = (typeof VALID_OUTPUT_TYPES)[number];

// Whitelist — never rely on DB ENUM to validate user input
const VALID_LANGUAGES = ["id", "en"] as const;
const VALID_TONES = ["", "casual", "formal", "hype", "educational", "persuasive"] as const;

function buildSystemPrompt(
  outputType: WriterOutputType,
  tone: string | undefined,
  language: string
): string {
  const langLabel = language === "id" ? "Indonesian (Bahasa Indonesia)" : "English";
  const toneLabel = tone ? `Tone: ${tone}.` : "";

  const typeInstructions: Record<WriterOutputType, string> = {
    caption:
      "Write a social media caption. Keep it concise and engaging. Include relevant hashtags at the end.",
    script:
      "Write a video script with a clear hook, main content, and call to action. Use natural spoken language.",
    hook: "Write a single powerful hook sentence designed to stop scrolling and grab attention immediately.",
    thread:
      "Write a Twitter/X thread. Start with a strong hook tweet, then 4-6 follow-up tweets. Separate tweets with '---'.",
    blog: "Write a blog post with a compelling title, introduction, main sections with subheadings, and conclusion.",
    email:
      "Write an email with subject line, greeting, body, and sign-off. Make it clear and action-oriented.",
    ad_copy:
      "Write ad copy with a headline, body copy, and call to action. Focus on benefits and urgency.",
    other: "Generate the requested content as specified in the prompt.",
  };

  return [
    `You are an expert content creator. ${typeInstructions[outputType]}`,
    `Write in ${langLabel}.`,
    toneLabel,
    "Output only the final content — no meta-commentary, no explanations, no markdown code blocks.",
  ]
    .filter(Boolean)
    .join(" ");
}

export async function POST(req: NextRequest) {
  try {
    // 1. Parse & validate body
    const body = await req.json();
    const { output_type, prompt, tone, language = "id", context } = body;

    if (!output_type || !VALID_OUTPUT_TYPES.includes(output_type)) {
      return NextResponse.json(
        { error: "output_type tidak valid" },
        { status: 400 }
      );
    }
    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "prompt tidak boleh kosong" },
        { status: 400 }
      );
    }

    // W3: whitelist language and tone — do not rely on DB ENUM
    const normalizedLanguage = (language ?? "id") as string;
    if (!(VALID_LANGUAGES as readonly string[]).includes(normalizedLanguage)) {
      return NextResponse.json({ error: "language tidak valid" }, { status: 400 });
    }

    const normalizedTone = (tone ?? "") as string;
    if (!(VALID_TONES as readonly string[]).includes(normalizedTone)) {
      return NextResponse.json({ error: "tone tidak valid" }, { status: 400 });
    }

    // 2. Get user from session
    const supabaseUser = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 3. Insert job with status = 'processing'
    const supabase = createServiceClient();

    const { data: job, error: insertError } = await supabase
      .from("ai_writer_jobs")
      .insert({
        user_id: user.id,
        output_type,
        prompt: prompt.trim(),
        context: context?.trim() || null,
        tone: normalizedTone || null,
        language: normalizedLanguage,
        status: "processing",
      })
      .select("id")
      .single();

    if (insertError || !job) {
      console.error("Insert ai_writer_jobs failed:", insertError);
      return NextResponse.json(
        { error: "Gagal membuat job" },
        { status: 500 }
      );
    }

    const jobId = job.id;

    // 4. Build prompt and call Gemini
    const systemPrompt = buildSystemPrompt(output_type, normalizedTone || undefined, normalizedLanguage);
    const fullPrompt = context
      ? `Context:\n${context.trim()}\n\nRequest:\n${prompt.trim()}`
      : prompt.trim();

    let result;
    try {
      result = await generateText("gemini", {
        prompt: fullPrompt,
        systemPrompt,
        maxTokens: 1024,
      });
    } catch (aiError) {
      // 5a. Gemini failed (API error, timeout, network) — update job to failed
      const errMsg =
        aiError instanceof Error ? aiError.message : "Unknown AI error";
      await supabase
        .from("ai_writer_jobs")
        .update({
          status: "failed",
          error_message: errMsg,
        })
        .eq("id", jobId);

      console.error("Gemini error:", aiError);
      return NextResponse.json(
        { error: "Gagal generate konten. Coba lagi." },
        { status: 500 }
      );
    }

    // W1: guard against empty output (safety-blocked, malformed, or empty completion)
    if (!result.text?.trim()) {
      await supabase
        .from("ai_writer_jobs")
        .update({
          status: "failed",
          error_message: "Gemini returned empty content",
        })
        .eq("id", jobId);
      return NextResponse.json(
        { error: "Konten tidak dapat di-generate. Coba ubah prompt." },
        { status: 500 }
      );
    }

    // 5b. Success — update job to completed
    await supabase
      .from("ai_writer_jobs")
      .update({
        status: "completed",
        output_text: result.text,
        ai_provider_used: result.providerName,
        ai_model_used: result.modelName,
        tokens_used: result.tokensUsed,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    // 6. Return result
    return NextResponse.json({
      job_id: jobId,
      output_text: result.text,
      tokens_used: result.tokensUsed,
    });
  } catch (err) {
    console.error("Unexpected error in /api/ai-writer:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}