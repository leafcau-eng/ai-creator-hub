// app/api/image-studio/edit/route.ts
// Phase 6: Edit image — crop atau resize, simpan sebagai asset baru di Storage

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase-server";

const BUCKET = "assets";

// Sharp tidak perlu diinstall terpisah — sudah bundled di Next.js via Vercel
// Lazy import untuk hindari error di environment yang belum ada sharp
async function getSharp() {
  try {
    const sharp = (await import("sharp")).default;
    return sharp;
  } catch {
    throw new Error("sharp tidak tersedia. Jalankan: npm install sharp");
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Parse body
    const body = await req.json();
    const { assetId, operation, crop, resize } = body;

    if (!assetId || typeof assetId !== "string") {
      return NextResponse.json({ error: "assetId wajib diisi" }, { status: 400 });
    }
    if (operation !== "crop" && operation !== "resize") {
      return NextResponse.json({ error: "operation harus 'crop' atau 'resize'" }, { status: 400 });
    }

    // Validate crop params
    if (operation === "crop") {
      if (!crop || typeof crop.x !== "number" || typeof crop.y !== "number" ||
          typeof crop.width !== "number" || typeof crop.height !== "number") {
        return NextResponse.json({ error: "crop params tidak valid" }, { status: 400 });
      }
      if (crop.width < 1 || crop.height < 1) {
        return NextResponse.json({ error: "crop width/height minimal 1px" }, { status: 400 });
      }
    }

    // Validate resize params
    if (operation === "resize") {
      if (!resize || typeof resize.width !== "number" || typeof resize.height !== "number") {
        return NextResponse.json({ error: "resize params tidak valid" }, { status: 400 });
      }
      if (resize.width < 1 || resize.height < 1) {
        return NextResponse.json({ error: "resize width/height minimal 1px" }, { status: 400 });
      }
    }

    // 2. Auth
    const supabaseUser = await createClient();
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient();

    // 3. Fetch asset row — pastikan milik user ini
    const { data: asset, error: assetErr } = await supabase
      .from("assets")
      .select("id, file_path, mime_type, name")
      .eq("id", assetId)
      .eq("user_id", user.id)
      .eq("upload_status", "ready")
      .single();

    if (assetErr || !asset) {
      return NextResponse.json({ error: "Asset tidak ditemukan" }, { status: 404 });
    }

    // 4. Download file dari storage
    const { data: fileData, error: downloadErr } = await supabase.storage
      .from(BUCKET)
      .download(asset.file_path);

    if (downloadErr || !fileData) {
      console.error("Storage download failed:", downloadErr);
      return NextResponse.json({ error: "Gagal mengambil file gambar" }, { status: 500 });
    }

    // Convert Blob → Buffer
    const arrayBuffer = await fileData.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    // 5. Process dengan sharp
    const sharp = await getSharp();
    let pipeline = sharp(inputBuffer);

    if (operation === "crop") {
      pipeline = pipeline.extract({
        left:   Math.round(crop.x),
        top:    Math.round(crop.y),
        width:  Math.round(crop.width),
        height: Math.round(crop.height),
      });
    } else {
      // resize
      pipeline = pipeline.resize({
        width:  Math.round(resize.width),
        height: Math.round(resize.height),
        fit:    "fill", // exact dimensions, no letterbox
      });
    }

    const outputBuffer = await pipeline.png().toBuffer();
    const metadata      = await sharp(outputBuffer).metadata();
    const outWidth      = metadata.width;
    const outHeight     = metadata.height;

    // 6. Upload hasil ke storage sebagai file baru
    const suffix   = operation === "crop" ? "cropped" : "resized";
    const filename  = `${asset.name.replace(/\.[^.]+$/, "")}_${suffix}_${Date.now()}.png`;
    const filePath  = `images/${user.id}/edits/${filename}`;

    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, outputBuffer, {
        contentType:  "image/png",
        cacheControl: "3600",
        upsert:       false,
      });

    if (uploadErr) {
      console.error("Storage upload (edit) failed:", uploadErr);
      return NextResponse.json({ error: "Gagal menyimpan hasil edit" }, { status: 500 });
    }

    // 7. Insert assets row untuk hasil edit
    const { data: newAsset, error: newAssetErr } = await supabase
      .from("assets")
      .insert({
        user_id:           user.id,
        name:              filename,
        original_filename: filename,
        type:              "image",
        mime_type:         "image/png",
        file_path:         filePath,
        upload_status:     "ready",
        source:            "image_studio_edit",
        source_job_id:     assetId, // referensi ke asset asal
        source_job_type:   "asset",
        ...(outWidth  ? { width:  outWidth  } : {}),
        ...(outHeight ? { height: outHeight } : {}),
      })
      .select("id")
      .single();

    if (newAssetErr || !newAsset) {
      console.error("Insert asset (edit) failed:", newAssetErr);
      return NextResponse.json({ error: "Gagal menyimpan metadata gambar" }, { status: 500 });
    }

    // 8. Generate signed URL
    const { data: signedData } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(filePath, 3600);

    return NextResponse.json({
      assetId:   newAsset.id,
      signedUrl: signedData?.signedUrl ?? "",
      width:     outWidth,
      height:    outHeight,
    });
  } catch (err) {
    console.error("Unexpected error in /api/image-studio/edit:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
