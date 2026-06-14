// PATCH untuk app/api/webhook/route.ts
// Phase 7A.1 — Tambah routing job_type='video_trim'
//
// Cara apply:
//   1. Buka app/api/webhook/route.ts yang sudah ada
//   2. Tambahkan import createServiceClient di bagian atas (sudah ada, skip)
//   3. Sisipkan fungsi handleVideoTrimWebhook SEBELUM "export async function POST"
//   4. Ganti seluruh isi "export async function POST" dengan versi baru di bawah
//
// Schema yang dipakai:
//   video_jobs: id, user_id, job_type, input_asset_ids, params,
//               status (job_status enum: queued/processing/completed/failed/cancelled),
//               output_asset_id, error_message, completed_at
//   assets: id, user_id, name, original_filename, type, mime_type,
//           file_path, upload_status, duration_seconds, source, source_job_id, source_job_type

// ─── FUNGSI BARU — sisipkan sebelum "export async function POST" ───────────

async function handleVideoTrimWebhook(
  supabase: ReturnType<typeof createServiceClient>,
  body: any
) {
  const { job_id, status, output_path, error_message } = body

  if (!job_id) {
    return { error: 'job_id required', httpStatus: 400 }
  }

  // Validasi status sesuai job_status enum
  // (queued/processing/completed/failed/cancelled — tidak ada 'done')
  const validStatuses = ['queued', 'processing', 'completed', 'failed', 'cancelled']
  if (!validStatuses.includes(status)) {
    return { error: `status tidak valid: ${status}`, httpStatus: 400 }
  }

  // 1. Fetch job untuk ambil user_id dan params
  const { data: job, error: fetchError } = await supabase
    .from('video_jobs')
    .select('id, user_id, input_asset_ids, params')
    .eq('id', job_id)
    .single()

  if (fetchError || !job) {
    console.error('[webhook/video_trim] job tidak ditemukan:', job_id, fetchError)
    return { error: 'job tidak ditemukan', httpStatus: 404 }
  }

  // 2. Update video_jobs status
  const updateData: Record<string, any> = {
    status,
    error_message: error_message || null,
  }
  if (status === 'completed') {
    updateData.completed_at = new Date().toISOString()
  }

  const { error: updateError } = await supabase
    .from('video_jobs')
    .update(updateData)
    .eq('id', job_id)

  if (updateError) {
    console.error('[webhook/video_trim] update video_jobs error:', updateError)
  } else {
    console.log('[webhook/video_trim] video_jobs updated:', status)
  }

  // 3. Kalau completed — insert asset baru sebagai hasil trim
  if (status === 'completed' && output_path && job) {
    const params = job.params as { start?: number; end?: number } | null
    const duration =
      params?.end != null && params?.start != null
        ? params.end - params.start
        : null

    const { data: newAsset, error: assetError } = await supabase
      .from('assets')
      .insert({
        user_id: job.user_id,
        name: `Trim — ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`,
        original_filename: 'output.mp4',
        type: 'video',
        mime_type: 'video/mp4',
        file_path: output_path,
        file_url: null,              // Signed URL di-generate on-demand saat GET /api/assets
        upload_status: 'ready',      // Kolom dari Phase 4B patch
        duration_seconds: duration,
        source: 'video_studio',
        source_job_id: job_id,
        source_job_type: 'video_job',
      })
      .select('id')
      .single()

    if (assetError) {
      console.error('[webhook/video_trim] insert asset error:', assetError)
    } else {
      console.log('[webhook/video_trim] asset inserted:', newAsset?.id)

      // 4. Backfill output_asset_id di video_jobs
      await supabase
        .from('video_jobs')
        .update({ output_asset_id: newAsset?.id })
        .eq('id', job_id)
    }
  }

  return { ok: true }
}

// ─── GANTI SELURUH "export async function POST" DENGAN INI ────────────────

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get('x-webhook-secret')
    if (secret !== process.env.WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    // ── ROUTING: job_type='video_trim' → handler khusus ──
    if (body.job_type === 'video_trim') {
      const supabase = createServiceClient()
      const result = await handleVideoTrimWebhook(supabase, body)
      if ('error' in result) {
        return NextResponse.json({ error: result.error }, { status: result.httpStatus })
      }
      return NextResponse.json({ success: true })
    }

    // ── HANDLER LAMA (Auto Clipper) — tidak ada yang diubah ──
    const { project_id, status, current_step, clips, error_message } = body

    if (!project_id) {
      return NextResponse.json({ error: 'project_id required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { data: project } = await supabase
      .from('projects')
      .select('title, source_url, user_id')
      .eq('id', project_id)
      .single()

    const projectTitle = project?.title || 'Untitled'

    const updateData: any = {
      status,
      error_message: error_message || null,
      completed_at: status === 'done' ? new Date().toISOString() : null,
    }

    if (current_step) {
      updateData.current_step = current_step
    }

    const { error: updateError } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', project_id)

    if (updateError) console.error('[webhook] update error:', JSON.stringify(updateError))
    else console.log('[webhook] update ok:', status)

    if (clips && clips.length > 0) {
      const clipsToInsert = clips.map((clip: any, i: number) => ({
        project_id,
        user_id: project?.user_id,
        clip_index: i + 1,
        title: clip.title || `Clip ${i + 1}`,
        duration: clip.duration || 0,
        file_url: clip.file_url || null,
        thumbnail_url: clip.thumbnail_url || null,
        start_time: clip.start || 0,
        end_time: clip.end || 0,
        score: clip.score || null,
        hook: clip.hook || null,
        reason: clip.reason || null,
      }))
      const { error: clipsError } = await supabase.from('clip_results').insert(clipsToInsert)
      if (clipsError) console.error('[webhook] clips insert error:', JSON.stringify(clipsError))
    }

    if (status === 'failed') {
      await sendTelegram(
        `❌ <b>Project Gagal!</b>\n\n` +
        `📁 <b>${projectTitle}</b>\n` +
        `🔗 ${project?.source_url || '-'}\n\n` +
        `⚠️ <b>Error:</b> ${error_message || 'Terjadi kesalahan tidak diketahui'}\n\n` +
        `🆔 Project ID: <code>${project_id}</code>`
      )
    }

    if (status === 'done') {
      await sendTelegram(
        `✅ <b>Project Selesai!</b>\n\n` +
        `📁 <b>${projectTitle}</b>\n` +
        `🎬 <b>${clips?.length || 0} clips</b> berhasil dibuat\n\n` +
        `🔗 https://sch-web-cliper.vercel.app/project/${project_id}`
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

