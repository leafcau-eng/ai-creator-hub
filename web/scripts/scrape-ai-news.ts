import Parser from 'rss-parser'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const parser = new Parser({ timeout: 10000 })

const FEEDS = [
  { url: 'https://techcrunch.com/category/artificial-intelligence/feed/', source: 'TechCrunch' },
  { url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', source: 'The Verge' },
  { url: 'https://venturebeat.com/category/ai/feed/', source: 'VentureBeat' },
  { url: 'https://openai.com/news/rss.xml', source: 'OpenAI' },
  { url: 'https://deepmind.google/blog/rss.xml', source: 'Google DeepMind' },
  { url: 'https://www.anthropic.com/rss.xml', source: 'Anthropic' },
  { url: 'https://huggingface.co/blog/feed.xml', source: 'Hugging Face' },
]

function detectCategory(title: string, summary: string): string {
  const text = (title + ' ' + summary).toLowerCase()
  if (/funding|investment|raised|series [a-z]|valuation/.test(text)) return 'funding'
  if (/research|paper|benchmark|arxiv|study|dataset/.test(text)) return 'research'
  if (/opinion|analysis|editorial|why|how to|lessons/.test(text)) return 'opinion'
  return 'product'
}

async function sendTelegram(message: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' }),
    })
  } catch (err) {
    console.error('Telegram error:', (err as Error).message)
  }
}

async function scrape() {
  let totalInserted = 0
  let totalSkipped = 0
  const newArticles: string[] = []

  for (const feed of FEEDS) {
    console.log(`\n📡 Fetching: ${feed.source}`)
    try {
      const parsed = await parser.parseURL(feed.url)
      for (const item of parsed.items) {
        const source_url = item.link?.trim()
        if (!source_url) continue

        const title = item.title?.trim() ?? '(no title)'
        const summary = item.contentSnippet?.trim() ?? item.summary?.trim() ?? ''
        const published_at = item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString()
        const category = detectCategory(title, summary)

        const { error } = await supabase.from('ai_news').upsert(
          {
            title,
            summary,
            source_name: feed.source,
            source_url,
            published_at,
            category,
            tags: [],
            raw_payload: item,
            ingested_at: new Date().toISOString(),
          },
          { onConflict: 'source_url', ignoreDuplicates: true }
        )

        if (error) {
          console.error(`  ❌ ${source_url}:`, error.message)
        } else {
          totalInserted++
          newArticles.push(`• [${feed.source}] ${title.slice(0, 60)}`)
          console.log(`  ✅ ${title.slice(0, 60)}`)
        }
      }
    } catch (err) {
      console.error(`  ⚠️ Failed: ${(err as Error).message}`)
      totalSkipped++
    }
  }

  console.log(`\n🏁 Done — inserted: ${totalInserted}, feeds failed: ${totalSkipped}`)

  if (newArticles.length > 0) {
    const msg = `🤖 <b>SCH AI Radar Update</b>\n\n${totalInserted} artikel baru masuk:\n\n${newArticles.slice(0, 10).join('\n')}${newArticles.length > 10 ? `\n\n...dan ${newArticles.length - 10} lainnya` : ''}`
    await sendTelegram(msg)
    console.log('📬 Telegram notifikasi terkirim')
  } else {
    console.log('📭 Tidak ada artikel baru, notifikasi tidak dikirim')
  }
}

scrape().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
