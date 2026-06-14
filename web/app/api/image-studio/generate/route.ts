// app/api/image-studio/generate/route.ts
// Phase 6: Generate image → upload ke Supabase Storage → insert image_jobs

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase-server";
import { generateImages } from "@/lib/image-providers";

const VALID_RATIOS  = ["1:1", "16:9", "9:16", "4:3"] as const;
const VALID_STYLES  = ["cinematic", "realistic", "illustration", "anime", "sketch", "3d", ""] as const;
const BUCKET        = "assets";

export async function POST(req: NextRequest) {
  try {
    // 1. Parse & validate body
    const body = await req.json();
    const {
      prompt,
      negativePrompt,
      style        = "",
      aspectRatio  = "1:1",
      numOutputs   = 1,
    } = body;

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json({ error: "prompt tidak boleh kosong" }, { status: 400 });
    }
    if (!VALID_RATIOS.includes(aspectRatio)) {
      return NextResponse.json({ error: "aspectRatio tidak valid" }, { status: 400 });
    }
    if (!VALID_STYLES.includes(style)) {
      return NextResponse.json({ error: "style tidak valid" }, { status: 400 });
    }
    const count = Math.max(1, Math.min(4, Number(numOutputs) || 1));

    // 2. Auth
    const supabaseUser = await createClient();
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient();

    // 3. Insert job — status processing
    const { data: job, error: insertError } = await supabase
      .from("image_jobs")
      .insert({
        user_id:      user.id,
        prompt:       prompt.trim(),
        style:        style || null,
        aspect_ratio: aspectRatio,
        num_outputs:  count,
        status:       "processing",
      })
      .select("id")
      .single();

    if (insertError || !job) {
      console.error("Insert image_jobs failed:", insertError);
      return NextResponse.json({ error: "Gagal membuat job" }, { status: 500 });
    }

    const jobId = job.id;

    // 4. Generate images
    let genResult;
    try {
      genResult = await generateImages({
        prompt:         prompt.trim(),
        negativePrompt: negativePrompt?.trim() || undefined,
        style:          style || undefined,
        aspectRatio,
        numOutputs:     count,
      });
    } catch (aiErr) {
      const msg = aiErr instanceof Error ? aiErr.message : String(aiErr);
      await supabase
        .from("image_jobs")
        .update({ status: "failed", error_message: msg })
        .eq("id", jobId);
      console.error("Image generation failed:", aiErr);
      return NextResponse.json({ error: "Gagal generate gambar. Coba lagi." }, { status: 500 });
    }

    // 5. Upload each image ke Supabase Storage + insert assets row
    const assetIds: string[] = [];
    const outputImages: { assetId: string; signedUrl: string; width?: number; height?: number }[] = [];

    for (let i = 0; i < genResult.images.length; i++) {
      const img      = genResult.images[i];
      const ext      = img.mimeType === "image/jpeg" ? "jpg" : "png";
      const filename = `image_${Date.now()}_${i}.${ext}`;
      const filePath = `images/${user.id}/${jobId}/${filename}`;

      // Decode base64 → Buffer → Uint8Array
      const buffer = Buffer.from(img.base64, "base64");

      // Upload ke storage
      const { error: uploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, buffer, {
          contentType:  img.mimeType,
          cacheControl: "3600",
          upsert:       false,
        });

      if (uploadErr) {
        console.error(`Storage upload failed for image ${i}:`, uploadErr);
        continue; // skip this image, don't fail entire request
      }

      // Insert assets row
      const { data: asset, error: assetErr } = await supabase
        .from("assets")
        .insert({
          user_id:           user.id,
          name:              filename,
          original_filename: filename,
          type:              "image",
          mime_type:         img.mimeType,
          file_path:         filePath,
          upload_status:     "ready",
          source:            "image_studio",
          source_job_id:     jobId,
          source_job_type:   "image_job",
          ...(img.width  ? { width:  img.width  } : {}),
          ...(img.height ? { height: img.height } : {}),
        })
        .select("id")
        .single();

      if (assetErr || !asset) {
        console.error(`Insert asset row failed for image ${i}:`, assetErr);
        continue;
      }

      assetIds.push(asset.id);

      // Generate signed URL (1 hour)
      const { data: signedData } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(filePath, 3600);

      outputImages.push({
        assetId:   asset.id,
        signedUrl: signedData?.signedUrl ?? "",
        width:     img.width,
        height:    img.height,
      });
    }

    if (outputImages.length === 0) {
      await supabase
        .from("image_jobs")
        .update({ status: "failed", error_message: "Semua gambar gagal diupload" })
        .eq("id", jobId);
      return NextResponse.json({ error: "Gagal menyimpan gambar. Coba lagi." }, { status: 500 });
    }

    // 6. Update job — completed
    await supabase
      .from("image_jobs")
      .update({
        status:            "completed",
        output_asset_ids:  assetIds,
        ai_provider_used:  genResult.providerName,
        ai_model_used:     genResult.modelName,
        completed_at:      new Date().toISOString(),
      })
      .eq("id", jobId);

    // 7. Return
    return NextResponse.json({
      job_id:      jobId,
      images:      outputImages,
      providerUsed: genResult.providerName,
    });
  } catch (err) {
    console.error("Unexpected error in /api/image-studio/generate:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
