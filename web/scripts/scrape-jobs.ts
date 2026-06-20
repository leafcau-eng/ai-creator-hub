import Parser from 'rss-parser'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const parser = new Parser({ timeout: 10000 })

// RSS Sources
const RSS_FEEDS = [
  { url: 'https://www.ycombinator.com/jobs/rss', source: 'YC Jobs', source_type: 'yc', yc_company: true },
  { url: 'https://weworkremotely.com/remote-jobs.rss', source: 'We Work Remotely', source_type: 'rss', remote_worldwide: true },
  { url: 'https://remoteok.com/remote-jobs.rss', source: 'RemoteOK', source_type: 'rss', remote_worldwide: true },
]

// Greenhouse companies
const GREENHOUSE_COMPANIES = [
  // AI
  { slug: 'anthropic', name: 'Anthropic', yc: false, web3: false },
  { slug: 'cohere', name: 'Cohere', yc: false, web3: false },
  { slug: 'perplexity', name: 'Perplexity AI', yc: false, web3: false },
  { slug: 'scaleai', name: 'Scale AI', yc: false, web3: false },
  { slug: 'weightsandbiases', name: 'Weights & Biases', yc: true, web3: false },
  { slug: 'replicateai', name: 'Replicate', yc: true, web3: false },
  // SaaS
  { slug: 'vercel', name: 'Vercel', yc: false, web3: false },
  { slug: 'notion', name: 'Notion', yc: false, web3: false },
  { slug: 'retool', name: 'Retool', yc: true, web3: false },
  { slug: 'airtable', name: 'Airtable', yc: false, web3: false },
  { slug: 'zapier', name: 'Zapier', yc: false, web3: false },
  { slug: 'linear', name: 'Linear', yc: false, web3: false },
  // Web3
  { slug: 'coinbase', name: 'Coinbase', yc: false, web3: true },
