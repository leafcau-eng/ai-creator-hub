// app/api/video-studio/subtitle/route.ts
// Migrated: GitHub Actions → VPS FastAPI

import { createClient, createServiceClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { asset_id, style = 'hormozi', language = '', title } = body

    if (!asset_id || typeof asset_id !== 'string') {
      return NextResponse.json({ error: 'asset_id is required' }, { status: 400 })
    }

    const validStyles = ['hormozi', 'clean_white']
    if (!validStyles.includes(style)) {
      return NextResponse.json(
        { error: `style tidak valid. Pilihan: ${validStyles.join(', ')}` },
        { status: 400 }
      )
    }

    const supabaseAuth = await createClient()
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Silakan login terlebih dahulu.' },
        { status: 401 }
      )
    }

    const supabase = createServiceClient()

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
      return NextResponse.json(
        { error: 'Asset belum siap (upload_status bukan ready)' },
        { status: 400 }
      )
    }

    const jobTitle =
      title ||
      `Subtitles — ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`

    const outputName = `subtitle_${Date.now()}.mp4`

    const { data: job, error: insertError } = await supabase
      .from('video_jobs')
      .insert({
        user_id: user.id,
        job_type: 'add_subtitles',
        title: jobTitle,
        input_asset_ids: [asset.id],
        params: { style, language: language || null },
        error_message: null,
        output_asset_id: null,
      })
      .select('id')
      .single()

    if (insertError || !job) {
      console.error('[video-studio/subtitle] Gagal insert video_jobs:', insertError)
      return NextResponse.json({ error: 'Gagal membuat job di database' }, { status: 500 })
    }

    const job_id = job.id

    // Validasi env vars VPS
    const vpsUrl = process.env.VPS_URL
    const vpsSecret = process.env.VPS_API_SECRET

    if (!vpsUrl || !vpsSecret) {
      console.error('[video-studio/subtitle] VPS env vars missing')
      await supabase
        .from('video_jobs')
        .update({
          status: 'failed',
          error_message: 'Server config error: VPS credentials missing',
        })
        .eq('id', job_id)
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // Trigger VPS FastAPI
    const vpsRes = await fetch(
      `${vpsUrl}/run/subtitle-job`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-secret': vpsSecret,
        },
        body: JSON.stringify({
          job_id,
          asset_path: asset.file_path,
          output_name: outputName,
          language: language || 'id',
        }),
      }
    )

    if (!vpsRes.ok) {
      const errText = await vpsRes.text()
      console.error('[video-studio/subtitle] VPS error:', vpsRes.status, errText)
      await supabase
        .from('video_jobs')
        .update({
          status: 'failed',
          error_message: `Gagal trigger pipeline: HTTP ${vpsRes.status}`,
        })
        .eq('id', job_id)
      return NextResponse.json({ error: 'Gagal trigger VPS pipeline' }, { status: 502 })
    }

    console.log('[video-studio/subtitle] Job dispatched ke VPS:', job_id)
    return NextResponse.json({ success: true, job_id })

  } catch (err) {
    console.error('[video-studio/subtitle] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
