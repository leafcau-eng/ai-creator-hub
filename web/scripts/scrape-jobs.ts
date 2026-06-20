import Parser from 'rss-parser'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const parser = new Parser({ timeout: 10000 })

const RSS_FEEDS = [
  { url: 'https://www.ycombinator.com/jobs/rss', source: 'YC Jobs', source_type: 'yc', yc_company: true, remote_worldwide: false },
  { url: 'https://weworkremotely.com/remote-jobs.rss', source: 'We Work Remotely', source_type: 'rss', yc_company: false, remote_worldwide: true },
  { url: 'https://remoteok.com/remote-jobs.rss', source: 'RemoteOK', source_type: 'rss', yc_company: false, remote_worldwide: true },
]

const GREENHOUSE_COMPANIES = [
  { slug: 'anthropic', name: 'Anthropic', yc: false, web3: false },
  { slug: 'cohere', name: 'Cohere', yc: false, web3: false },
  { slug: 'perplexity', name: 'Perplexity AI', yc: false, web3: false },
  { slug: 'scaleai', name: 'Scale AI', yc: false, web3: false },
  { slug: 'weightsandbiases', name: 'Weights & Biases', yc: true, web3: false },
  { slug: 'replicateai', name: 'Replicate', yc: true, web3: false },
  { slug: 'vercel', name: 'Vercel', yc: false, web3: false },
  { slug: 'notion', name: 'Notion', yc: false, web3: false },
  { slug: 'retool', name: 'Retool', yc: true, web3: false },
  { slug: 'airtable', name: 'Airtable', yc: false, web3: false },
  { slug: 'zapier', name: 'Zapier', yc: false, web3: false },
  { slug: 'linear', name: 'Linear', yc: false, web3: false },
  { slug: 'coinbase', name: 'Coinbase', yc: false, web3: true },
  { slug: 'consensys', name: 'Consensys', yc: false, web3: true },
]

function calcHiddenScore(params: {
  yc: boolean
  web3: boolean
  source_type: string
  remote: boolean
}): number {
  let score = 0
  if (params.yc) score += 30
  if (params.web3) score += 20
  if (params.source_type === 'greenhouse' || params.source_type === 'lever') score += 30
  if (params.remote) score += 20
  return Math.min(score, 100)
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

const newJobs: string[] = []
let totalInserted = 0

async function upsertJob(job: Record<string, unknown>) {
  const { error } = await supabase.from('jobs').upsert(job, {
    onConflict: 'source_url',
    ignoreDuplicates: true,
  })
  if (error) {
    console.error(`  ❌ ${job.source_url}:`, error.message)
  } else {
    totalInserted++
    newJobs.push(`• [${job.company_name}] ${String(job.title).slice(0, 50)}`)
    console.log(`  ✅ ${String(job.title).slice(0, 60)}`)
  }
}

async function scrapeRSS() {
  for (const feed of RSS_FEEDS) {
    console.log(`\n📡 RSS: ${feed.source}`)
    try {
      const parsed = await parser.parseURL(feed.url)
      for (const item of parsed.items) {
        const source_url = item.link?.trim()
        if (!source_url) continue
        await upsertJob({
          title: item.title?.trim() ?? '(no title)',
          company_name: item.creator ?? feed.source,
          source_name: feed.source,
          source_url,
          source_type: feed.source_type,
          location_type: feed.remote_worldwide ? 'remote' : 'onsite',
          remote_worldwide: feed.remote_worldwide,
          yc_company: feed.yc_company,
          web3_company: false,
          visa_sponsorship: null,
          posted_at: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
          status: 'active',
          hidden_opportunity_score: calcHiddenScore({
            yc: feed.yc_company,
            web3: false,
            source_type: feed.source_type,
            remote: feed.remote_worldwide,
          }),
          tags: [],
        })
      }
    } catch (err) {
      console.error(`  ⚠️ Failed: ${(err as Error).message}`)
    }
  }
}

async function scrapeGreenhouse() {
  for (const company of GREENHOUSE_COMPANIES) {
    console.log(`\n🏢 Greenhouse: ${company.name}`)
    try {
      const res = await fetch(
        `https://boards-api.greenhouse.io/v1/boards/${company.slug}/jobs?content=true`,
        { signal: AbortSignal.timeout(10000) }
      )
      if (!res.ok) { console.error(`  ⚠️ ${res.status}`); continue }
      const data = await res.json() as { jobs: Array<Record<string, unknown>> }
      for (const job of data.jobs) {
        const source_url = `https://boards.greenhouse.io/${company.slug}/jobs/${job.id}`
        const location = (job.location as { name?: string })?.name ?? ''
        const isRemote = /remote/i.test(location)
        await upsertJob({
          title: job.title,
          company_name: company.name,
          source_name: `${company.name} Careers`,
          source_url,
          source_type: 'greenhouse',
          location_type: isRemote ? 'remote' : 'onsite',
          location_region: location,
          remote_worldwide: isRemote,
          yc_company: company.yc,
          web3_company: company.web3,
          visa_sponsorship: null,
          posted_at: new Date().toISOString(),
          status: 'active',
          hidden_opportunity_score: calcHiddenScore({
            yc: company.yc,
            web3: company.web3,
            source_type: 'greenhouse',
            remote: isRemote,
          }),
          tags: [],
        })
      }
    } catch (err) {
      console.error(`  ⚠️ Failed: ${(err as Error).message}`)
    }
  }
}

async function main() {
  await scrapeRSS()
  await scrapeGreenhouse()

  console.log(`\n🏁 Done — inserted: ${totalInserted}`)

  if (newJobs.length > 0) {
    const msg = `💼 <b>SCH Job Radar Update</b>\n\n${totalInserted} lowongan baru:\n\n${newJobs.slice(0, 10).join('\n')}${newJobs.length > 10 ? `\n\n...dan ${newJobs.length - 10} lainnya` : ''}`
    await sendTelegram(msg)
    console.log('📬 Telegram notifikasi terkirim')
  } else {
    console.log('📭 Tidak ada job baru, notifikasi tidak dikirim')
  }
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
