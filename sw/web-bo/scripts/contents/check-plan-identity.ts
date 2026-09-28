/** Compare plan content identity fields against current contents rows; list mismatches. */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

async function main() {
  const plans = JSON.parse(readFileSync(resolve(process.argv[2]), 'utf8'))
  const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL!, process.env.DB_SECRET_KEY!, { auth: { persistSession: false, autoRefreshToken: false } })
  const ids = [...new Set(plans.map((p: any) => p.content.id))]
  const rows: any[] = []
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await db.from('contents').select('id,type,external_id,external_source').in('id', ids.slice(i, i + 200))
    if (error) throw error
    rows.push(...data)
  }
  const byId = new Map(rows.map(r => [r.id, r]))
  const bad = plans.filter((p: any) => {
    const r = byId.get(p.content.id)
    return !r || r.type !== p.content.type || r.external_id !== p.content.external_id || r.external_source !== p.content.external_source
  }).map((p: any) => ({ plan: p.content, db: byId.get(p.content.id) ?? null }))
  console.log(JSON.stringify({ plans: plans.length, contents: ids.length, mismatch: bad.length, bad: bad.slice(0, 20) }, null, 1))
}
main().catch(e => { console.error(e instanceof Error ? e.message : String(e)); process.exitCode = 1 })
