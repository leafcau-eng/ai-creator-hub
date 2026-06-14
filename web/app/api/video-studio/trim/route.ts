// app/api/video-studio/trim/route.ts
// Phase 7A.1 — Insert video_jobs (job_type='trim') + dispatch GitHub Actions video-trim.yml
//
// Schema aktual video_jobs (dari schema_new_tables.sql):
//   id, user_id (NOT NULL), job_type (video_job_type NOT NULL),
//   title, input_asset_ids (uuid[] NOT NULL DEFAULT '{}'),
//   input_project_id, params (jsonb DEFAULT '{}'),
//   status (job_status NOT NULL DEFAULT 'queued'),   ← tidak ada 'pending'
//   output_asset_id, gh_run_id, gh_run_url,
//   error_message, progress_step,
//   created_at, updated_at, completed_at
//
// Untuk job_type='trim', params berisi: { "start": number, "end": number }
// input_asset_ids berisi: [asset_id] (satu video source)

import { createClient, createServiceClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    // 1. Parse & validasi body
    const body = await req.json()
    const { asset_id, start_time, end_time, title } = body

    if (!asset_id || typeof asset_id !== 'string') {
      return NextResponse.json({ error: 'asset_id is required' }, { status: 400 })
    }
    if (typeof start_time !== 'number' || typeof end_time !== 'number') {
      return NextResponse.json(
        { error: 'start_time dan end_time harus berupa angka (detik)' },
        { status: 400 }
      )
    }
    if (start_time < 0 || end_time <= start_time) {
      return NextResponse.json(
        { error: 'end_time harus lebih besar dari start_time dan start_time >= 0' },
        { status: 400 }
      )
    }

    // 2. Ambil user dari session
    const supabaseAuth = await createClient()
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Silakan login terlebih dahulu.' },
        { status: 401 }
      )
    }

    const supabase = createServiceClient()

    // 3. Fetch source asset — validasi kepemilikan + type + status
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select('id, file_path, name, type, user_id, upload_status')
      .eq('id', asset_id)
      .single()

    if (assetError || !asset) {
      return NextResponse.json({ error: 'Asset tidak ditemukan' }, { status: 404 })
    }
    if (asset.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (asset.type !== 'video') {
      return NextResponse.json({ error: 'Asset harus bertipe video' }, { status: 400 })
    }
    if (asset.upload_status !== 'ready') {
      return NextResponse.json({ error: 'Asset belum siap (upload_status bukan ready)' }, { status: 400 })
    }

    // 4. Insert video_jobs
    //    - job_type: 'trim' (video_job_type enum)
    //    - status default 'queued' dari DB (tidak ada 'pending' di enum)
    //    - input_asset_ids: array berisi satu uuid source asset
    //    - params: { start, end } sesuai komentar schema
    const jobTitle = title || `Trim — ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`

    const { data: job, error: insertError } = await supabase
      .from('video_jobs')
      .insert({
        user_id: user.id,
        job_type: 'trim',
        title: jobTitle,
        input_asset_ids: [asset.id],
        params: { start: start_time, end: end_time },
        // status default 'queued' dari DB schema — tidak perlu dikirim eksplisit
        error_message: null,
        output_asset_id: null,
      })
      .select('id')
      .single()

    if (insertError || !job) {
      console.error('[video-studio/trim] Gagal insert video_jobs:', insertError)
      return NextResponse.json({ error: 'Gagal membuat job di database' }, { status: 500 })
    }

    const job_id = job.id

    // 5. Validasi env vars GitHub
    const githubOwner = process.env.GITHUB_OWNER
    const githubRepo  = process.env.GITHUB_REPO
    const githubPat   = process.env.GITHUB_PAT

    if (!githubOwner || !githubRepo || !githubPat) {
      console.error('[video-studio/trim] GitHub env vars missing')
      await supabase
        .from('video_jobs')
        .update({
          status: 'failed',
          error_message: 'Server config error: GitHub credentials missing',
        })
        .eq('id', job_id)
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // 6. Dispatch GitHub Actions — video-trim.yml
    //    Kirim: job_id, asset_path (file_path dari storage), start_time, end_time
    const githubRes = await fetch(
      `https://api.github.com/repos/${githubOwner}/${githubRepo}/actions/workflows/video-trim.yml/dispatches`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${githubPat}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ref: 'main',
          inputs: {
            job_id,
            asset_path: asset.file_path,
            start_time: String(start_time),
            end_time: String(end_time),
          },
        }),
      }
    )

    if (!githubRes.ok) {
      const errText = await githubRes.text()
      console.error('[video-studio/trim] GitHub API error:', githubRes.status, errText)
      await supabase
        .from('video_jobs')
        .update({
          status: 'failed',
          error_message: `Gagal trigger pipeline: HTTP ${githubRes.status}`,
        })
        .eq('id', job_id)
      return NextResponse.json({ error: 'Gagal trigger GitHub Actions' }, { status: 502 })
    }

    // 7. Catat gh_run_id tidak bisa dari response dispatch (GitHub tidak return run_id langsung).
    //    Akan diisi oleh webhook callback saat pipeline jalan.
    //    Status sudah 'queued' dari default DB — tidak perlu update lagi.
    console.log('[video-studio/trim] Job dispatched:', job_id)

    return NextResponse.json({ success: true, job_id })

  } catch (err) {
    console.error('[video-studio/trim] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
