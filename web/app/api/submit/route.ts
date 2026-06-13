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

    // 2. Ambil user dari session — user_id wajib diisi di tabel projects
    const supabaseAuth = await createClient()
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Silakan login terlebih dahulu.' },
        { status: 401 }
      )
    }

    // 3. Insert project — pakai serviceClient agar bisa bypass RLS dari route handler
    //    user_id diisi manual dari session, bukan dari auth.uid() di DB
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

    // 4. Validasi env vars GitHub
    const githubOwner = process.env.GITHUB_OWNER
    const githubRepo  = process.env.GITHUB_REPO
    const githubPat   = process.env.GITHUB_PAT

    if (!githubOwner || !githubRepo || !githubPat) {
      console.error('[submit] GitHub env vars tidak lengkap')
      await supabase
        .from('projects')
        .update({ status: 'failed', error_message: 'Server config error: GitHub credentials missing' })
        .eq('id', project_id)

      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // 5. Trigger GitHub Actions workflow_dispatch
    const githubRes = await fetch(
      `https://api.github.com/repos/${githubOwner}/${githubRepo}/actions/workflows/main.yml/dispatches`,
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
            url: youtube_url,
            project_id: project_id,
          },
        }),
      }
    )

    if (!githubRes.ok) {
      const errText = await githubRes.text()
      console.error('[submit] GitHub API error:', githubRes.status, errText)

      await supabase
        .from('projects')
        .update({
          status: 'failed',
          error_message: `Gagal trigger pipeline: HTTP ${githubRes.status}`,
        })
        .eq('id', project_id)

      return NextResponse.json(
        { error: 'Gagal trigger GitHub Actions' },
        { status: 502 }
      )
    }

    // 6. Update status jadi queued setelah berhasil trigger
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

