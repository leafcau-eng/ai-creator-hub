import { createClient } from '@supabase/supabase-js'
async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { count } = await sb.from('ai_news').select('*', { count: 'exact', head: true })
  console.log('Total ai_news:', count)
}
main()
