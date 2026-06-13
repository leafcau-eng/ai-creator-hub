import { createClient, createServiceClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // 1. Validasi session user
    const supabaseAuth = await createClient()
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Silakan login terlebih dahulu.' },
        { status: 401 }
      )
    }

    const supabase = createServiceClient()

    // 2. Ambil assets milik user dengan upload_status = 'ready'
    const { data: assets, error: fetchError } = await supabase
      .from('assets')
      .select('*')
      .eq('user_id', user.id)
      .eq('upload_status', 'ready')
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error('[assets] Gagal fetch assets:', fetchError)
      return NextResponse.json(
        { error: 'Gagal mengambil data assets' },
        { status: 500 }
      )
    }

    if (!assets || assets.length === 0) {
      return NextResponse.json({ success: true, assets: [] })
    }

    // 3. Batch signed URL untuk semua file_path
    const paths = assets
      .map((a) => a.file_path)
      .filter((p): p is string => !!p)

    let signedMap: Record<string, string> = {}

    if (paths.length > 0) {
      const { data: signedUrls, error: signedError } = await supabase
        .storage
        .from('assets')
        .createSignedUrls(paths, 3600)

      if (signedError) {
        console.error('[assets] Gagal generate signed URLs:', signedError)
      } else if (signedUrls) {
        signedMap = signedUrls.reduce((acc, item) => {
          if (item.path && item.signedUrl) {
            acc[item.path] = item.signedUrl
          }
          return acc
        }, {} as Record<string, string>)
      }
    }

    // 4. Merge signed URL ke field file_url masing-masing asset
    const merged = assets.map((asset) => ({
      ...asset,
      file_url: asset.file_path ? signedMap[asset.file_path] || null : null,
    }))

    return NextResponse.json({ success: true, assets: merged })

  } catch (err) {
    console.error('[assets] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
