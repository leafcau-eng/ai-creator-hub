import { createClient, createServiceClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

const ALLOWED_TYPES = ['image', 'video', 'audio', 'document', 'other']

export async function POST(req: NextRequest) {
  try {
    // 1. Parse & validasi body
    const body = await req.json()
    const { filename, contentType, fileSize, assetType } = body

    if (!filename || typeof filename !== 'string') {
      return NextResponse.json(
        { error: 'filename is required' },
        { status: 400 }
      )
    }

    if (!assetType || !ALLOWED_TYPES.includes(assetType)) {
      return NextResponse.json(
        { error: `assetType harus salah satu dari: ${ALLOWED_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    // 2. Ambil user dari session — user_id wajib diisi di tabel assets
    const supabaseAuth = await createClient()
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Silakan login terlebih dahulu.' },
        { status: 401 }
      )
    }

    // 3. Generate assetId via uuid + storage path
    const assetId = uuidv4()
    const ext = filename.includes('.') ? filename.split('.').pop() : ''
    const storagePath = ext ? `${user.id}/${assetId}.${ext}` : `${user.id}/${assetId}`

    // 4. Generate signed upload URL via service role
    const supabase = createServiceClient()

    const { data: signedData, error: signedError } = await supabase
      .storage
      .from('assets')
      .createSignedUploadUrl(storagePath)

    if (signedError || !signedData) {
      console.error('[assets/upload] Gagal generate signed upload URL:', signedError)
      return NextResponse.json(
        { error: 'Gagal generate signed upload URL' },
        { status: 500 }
      )
    }

    // 5. Insert row ke tabel assets dengan upload_status='pending'
    const { error: insertError } = await supabase
      .from('assets')
      .insert({
        id: assetId,
        user_id: user.id,
        name: filename,
        original_filename: filename,
        type: assetType,
        mime_type: contentType || null,
        file_path: storagePath,
        file_size_bytes: fileSize || null,
        upload_status: 'pending',
      })

    if (insertError) {
      console.error('[assets/upload] Gagal insert row assets:', insertError)
      return NextResponse.json(
        { error: 'Gagal membuat record asset di database' },
        { status: 500 }
      )
    }

    // 6. Return signed URL + assetId + path ke browser
    return NextResponse.json({
      success: true,
      assetId,
      path: storagePath,
      signedUrl: signedData.signedUrl,
      token: signedData.token,
    })

  } catch (err) {
    console.error('[assets/upload] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
