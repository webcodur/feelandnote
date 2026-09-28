/** Build the en→ko redo queue: rows whose ko description is the unauthorized muse
 * translation (description == plan description, method='translation', source locale 'en').
 * node --env-file=.env --import tsx scripts/contents/build-enko-redo-queue.ts OUT
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const ART = resolve('../../data/celeb/book-introductions')
const plans = [
  ...JSON.parse(readFileSync(`${ART}/video-provider/video-muse-plans-valid.json`, 'utf8')),
  ...JSON.parse(readFileSync(`${ART}/game-provider/game-muse-reviewed-plans.json`, 'utf8')).filter((p: any) => p.target?.locale === 'ko'),
]

async function main() {
  const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL!, process.env.DB_SECRET_KEY!, { auth: { persistSession: false, autoRefreshToken: false } })
  const ids = [...new Set(plans.map((p: any) => p.content.id))]
  const rows: any[] = []
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await db.from('content_locales')
      .select('content_id,locale,title,creator,publisher,isbn,description,sources').in('content_id', ids.slice(i, i + 200))
    if (error) throw error
    rows.push(...data)
  }
  const byKey = new Map(rows.map(r => [`${r.content_id}:${r.locale}`, r]))
  const queue: any[] = []
  const skip: any[] = []
  for (const p of plans) {
    const row = byKey.get(`${p.content.id}:${p.target.locale}`)
    if (!row) { skip.push({ id: p.content.id, reason: 'missing-row' }); continue }
    const museText = String(p.description ?? '').trim()
    const isMuse = row.description?.trim() === museText
      && row.sources?.description_method === 'translation'
      && row.sources?.description_source_locale === 'en'
      && (row.sources?.description ?? null) === p.sourceUrl
    if (!isMuse) { skip.push({ id: p.content.id, title: row.title, reason: 'not-muse-or-changed' }); continue }
    queue.push({ content: p.content, target: row, sourceText: p.sourceText, sourceUrl: p.sourceUrl,
      sourceLocale: p.sourceLocale, identityEvidence: p.identityEvidence, museText })
  }
  writeFileSync(resolve(process.argv[2]), JSON.stringify(queue, null, 2) + '\n')
  console.log(JSON.stringify({ plans: plans.length, queue: queue.length, skip: skip.length, skipReasons: skip.reduce((m: Record<string, number>, s) => { m[s.reason] = (m[s.reason] || 0) + 1; return m }, {}) }))
}
main().catch(e => { console.error(e instanceof Error ? e.message : String(e)); process.exitCode = 1 })
