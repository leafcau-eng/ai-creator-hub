import { createClient, createServiceClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assetId } = await params

    if (!assetId) {
      return NextResponse.json(
        { error: 'Asset id is required' },
        { status: 400 }
      )
    }

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

    // 2. UPDATE upload_status = 'ready' WHERE id = assetId AND user_id = user.id
    const { data, error: updateError } = await supabase
      .from('assets')
      .update({ upload_status: 'ready' })
      .eq('id', assetId)
      .eq('user_id', user.id)
      .select('id')
      .single()

    if (updateError || !data) {
      console.error('[assets/confirm] Gagal update upload_status:', updateError)
      return NextResponse.json(
        { error: 'Gagal konfirmasi upload — asset tidak ditemukan' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, assetId })

  } catch (err) {
    console.error('[assets/confirm] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
