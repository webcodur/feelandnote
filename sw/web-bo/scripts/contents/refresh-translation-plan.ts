/** Refresh a ReviewedIntroductionTranslation[] draft against current DB rows; emit contract-valid plans.
 * node --env-file=.env --import tsx scripts/contents/refresh-translation-plan.ts FILE <enko|koen> OUT
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { isBookIntroductionSource } from '@feelandnote/content-search/book-introduction-contract'
import { planIntroductionTranslation, planIntroductionTranslationKoEn } from './book-introduction-translation-contract'

async function main() {
  const plans = JSON.parse(readFileSync(resolve(process.argv[2]), 'utf8'))
  const direction = process.argv[3]
  const fn = direction === 'koen' ? planIntroductionTranslationKoEn : planIntroductionTranslation
  const [targetLocale, sourceLocale] = direction === 'koen' ? ['en', 'ko'] : ['ko', 'en']
  const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL!, process.env.DB_SECRET_KEY!, { auth: { persistSession: false, autoRefreshToken: false } })
  const ids = [...new Set(plans.map((p: any) => p.target.content_id))]
  const rows: any[] = []
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await db.from('content_locales')
      .select('content_id,locale,title,creator,publisher,isbn,description,sources').in('content_id', ids.slice(i, i + 200))
    if (error) throw error
    rows.push(...data)
  }
  const byKey = new Map(rows.map(r => [`${r.content_id}:${r.locale}`, r]))
  const valid: any[] = []
  const bad: any[] = []
  for (const p of plans) {
    const id = p.target.content_id
    const target = byKey.get(`${id}:${targetLocale}`)
    const source = byKey.get(`${id}:${sourceLocale}`)
    if (!target || !source) { bad.push({ id, reason: 'missing-row' }); continue }
    const next = { ...p, target, source }
    // Marker rows store a provider token, not the translated body; the queue carries the fetched body.
    const stored = source.description ?? ''
    const drift = isBookIntroductionSource(stored)
      ? stored === (p.source.description ?? '')
      : stored !== (p.source.description ?? '')
    if (drift) { bad.push({ id, reason: 'source-text-drift' }); continue }
    if (next.sourceUrl !== null && (source.sources?.description ?? null) !== next.sourceUrl) {
      bad.push({ id, reason: 'source-url-drift', recorded: source.sources?.description, planned: p.sourceUrl }); continue
    }
    try {
      const change = fn(next)
      if (change) valid.push(next)
    } catch (e) {
      bad.push({ id, title: target.title, reason: String(e instanceof Error ? e.message : e) })
    }
  }
  writeFileSync(resolve(process.argv[4]), JSON.stringify(valid, null, 2) + '\n')
  console.log(JSON.stringify({ plans: plans.length, valid: valid.length, bad: bad.length, reasons: bad.reduce((m: Record<string, number>, b) => { m[b.reason] = (m[b.reason] || 0) + 1; return m }, {}) }))
}
main().catch(e => { console.error(e instanceof Error ? e.message : String(e)); process.exitCode = 1 })
