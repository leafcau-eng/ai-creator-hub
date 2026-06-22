import { createClient, createServiceClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    // 1. Parse & validasi body
    const body = await req.json()
    const { youtube_url } = body

    if (!youtube_url || typeof youtube_url !== 'string') {
      return NextResponse.json(
        { error: 'youtube_url is required' },
        { status: 400 }
      )
    }

    const isYouTubeUrl = /^https?:\/\/(www\.)?(youtube\.com\/watch\?|youtu\.be\/)/.test(youtube_url)
    if (!isYouTubeUrl) {
      return NextResponse.json(
        { error: 'URL tidak valid. Harus berupa URL YouTube.' },
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

    // 3. Insert project
    const supabase = createServiceClient()

    const { data: project, error: insertError } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        title: `Auto Clip — ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`,
        source_url: youtube_url,
        status: 'pending',
        current_step: null,
        error_message: null,
        completed_at: null,
      })
      .select('id')
      .single()

    if (insertError || !project) {
      console.error('[submit] Gagal insert project:', insertError)
      return NextResponse.json(
        { error: 'Gagal membuat project di database' },
        { status: 500 }
      )
    }

    const project_id = project.id

    // 4. Validasi env vars VPS
    const vpsUrl = process.env.VPS_URL
    const vpsSecret = process.env.VPS_API_SECRET

    if (!vpsUrl || !vpsSecret) {
      console.error('[submit] VPS env vars missing')
      await supabase
        .from('projects')
        .update({ status: 'failed', error_message: 'Server config error: VPS credentials missing' })
        .eq('id', project_id)

      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // 5. Trigger VPS FastAPI
    const vpsRes = await fetch(
      `${vpsUrl}/run/auto-clip`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-secret': vpsSecret,
        },
        body: JSON.stringify({
          url: youtube_url,
          project_id,
        }),
      }
    )

    if (!vpsRes.ok) {
      const errText = await vpsRes.text()
      console.error('[submit] VPS error:', vpsRes.status, errText)

      await supabase
        .from('projects')
        .update({
          status: 'failed',
          error_message: `Gagal trigger pipeline: HTTP ${vpsRes.status}`,
        })
        .eq('id', project_id)

      return NextResponse.json(
        { error: 'Gagal trigger VPS pipeline' },
        { status: 502 }
      )
    }

    // 6. Update status jadi queued
    await supabase
      .from('projects')
      .update({ status: 'queued' })
      .eq('id', project_id)

    return NextResponse.json({ success: true, project_id })

  } catch (err) {
    console.error('[submit] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
