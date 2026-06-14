import { createClient, createServiceClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(
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

    // 2. Ambil file_path dulu sebelum row dihapus
    const { data: asset, error: fetchError } = await supabase
      .from('assets')
      .select('file_path')
      .eq('id', assetId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !asset) {
      return NextResponse.json(
        { error: 'Asset tidak ditemukan' },
        { status: 404 }
      )
    }

    // 3. Hapus row dari tabel assets
    const { error: deleteError } = await supabase
      .from('assets')
      .delete()
      .eq('id', assetId)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('[assets/delete] Gagal hapus row:', deleteError)
      return NextResponse.json(
        { error: 'Gagal menghapus record asset' },
        { status: 500 }
      )
    }

    // 4. Bersihkan file fisik di storage (best-effort — kalau file belum
    //    sempat terupload, remove() tetap aman/no-op)
    if (asset.file_path) {
      const { error: removeError } = await supabase
        .storage
        .from('assets')
        .remove([asset.file_path])

      if (removeError) {
        console.error('[assets/delete] Gagal hapus file storage:', removeError)
        // Row sudah terhapus, file storage gagal dibersihkan — log saja,
        // tidak mengembalikan error ke client karena rollback DB sukses.
      }
    }

    return NextResponse.json({ success: true, assetId })

  } catch (err) {
    console.error('[assets/delete] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
