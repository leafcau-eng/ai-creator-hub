import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

async function sendTelegram(message: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    })
  } catch (e) {
    console.error('[telegram] Gagal kirim notif:', e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get('x-webhook-secret')
    if (secret !== process.env.WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { project_id, status, current_step, clips, error_message } = body

    if (!project_id) {
      return NextResponse.json({ error: 'project_id required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Ambil info project buat notif
    const { data: project } = await supabase
      .from('projects')
      .select('title, source_url')
      .eq('id', project_id)
      .single()

    const projectTitle = project?.title || 'Untitled'

    const updateData: any = {
      status,
      error_message: error_message || null,
      completed_at: status === 'completed' ? new Date().toISOString() : null,
    }

    if (current_step) {
      updateData.current_step = current_step
    }

    await supabase
      .from('projects')
      .update(updateData)
      .eq('id', project_id)

    if (clips && clips.length > 0) {
      const clipsToInsert = clips.map((clip: any, i: number) => ({
        project_id,
        clip_index: i + 1,
        title: clip.title || `Clip ${i + 1}`,
        duration: clip.duration || 0,
        file_url: clip.file_url || null,
        thumbnail_url: clip.thumbnail_url || null,
        start_time: clip.start || 0,
        end_time: clip.end || 0,
      }))
      await supabase.from('clips').insert(clipsToInsert)
    }

    // Kirim notif Telegram
    if (status === 'failed') {
      await sendTelegram(
        `❌ <b>Project Gagal!</b>\n\n` +
        `📁 <b>${projectTitle}</b>\n` +
        `🔗 ${project?.source_url || '-'}\n\n` +
        `⚠️ <b>Error:</b> ${error_message || 'Terjadi kesalahan tidak diketahui'}\n\n` +
        `🆔 Project ID: <code>${project_id}</code>`
      )
    }

    if (status === 'completed') {
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
