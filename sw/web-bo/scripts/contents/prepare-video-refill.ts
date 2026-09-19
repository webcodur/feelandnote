/** Refill empty VIDEO locale rows from TMDB overviews on the stored external_id.
 * Earlier collection missed overviews that exist now (or failed transiently).
 * Emits ReviewedMediaIntroduction[] for apply-media-introductions.ts --plan.
 * Rows whose TMDB title disagrees with the stored title are held, not filled.
 * node --env-file=.env --import tsx scripts/contents/prepare-video-refill.ts
 */
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const dir = path.resolve('../../data/celeb/book-introductions/video-provider')
const planFile = path.join(dir, 'tmdb-refill-plan.json')
const holdFile = path.join(dir, 'tmdb-refill-holds.json')

const norm = (s: unknown) => String(s || '').normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')

async function main() {
  const key = process.env.TMDB_API_KEY
  if (!key) throw new Error('TMDB_API_KEY missing')
  const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL!, process.env.DB_SECRET_KEY!, { auth: { persistSession: false } })
  const rows: any[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('contents')
      .select('id,external_source,external_id,content_locales!inner(content_id,locale,title,creator,publisher,isbn,description,sources)')
      .eq('type', 'VIDEO').range(from, from + 999)
    if (error) throw error
    rows.push(...data)
    if (data.length < 1000) break
  }
  const plan: any[] = []
  const holds: any[] = []
  for (const c of rows) {
    const m = /^tmdb-(movie|tv)-(\d+)$/.exec(c.external_id ?? '')
    if (!m) continue
    const emptyLocales = (c.content_locales as any[]).filter(l =>
      (l.locale === 'ko' || l.locale === 'en') && !l.description?.trim())
    if (!emptyLocales.length) continue
    const [enRes, koRes] = await Promise.all([
      fetch(`https://api.themoviedb.org/3/${m[1]}/${m[2]}?language=en&api_key=${key}`).then(r => r.json()).catch(() => null),
      fetch(`https://api.themoviedb.org/3/${m[1]}/${m[2]}?language=ko&api_key=${key}`).then(r => r.json()).catch(() => null),
    ])
    if (!enRes || enRes.success === false) { holds.push({ id: c.id, eid: c.external_id, reason: 'tmdb-fetch-failed' }); continue }
    // Identity: the TMDB title must match a stored locale title, else the id points at the wrong work.
    const tmdbTitles = [enRes.title, enRes.name, enRes.original_title, enRes.original_name, koRes?.title, koRes?.name]
      .map(norm).filter(Boolean)
    const storedTitles = emptyLocales.map(l => norm(l.title)).filter(Boolean)
    const titleMatch = !storedTitles.length || storedTitles.some(s => tmdbTitles.some(t => t === s || (t.length > 6 && s.length > 6 && (t.includes(s) || s.includes(t)))))
    if (!titleMatch) {
      holds.push({ id: c.id, eid: c.external_id, reason: 'tmdb-title-mismatch',
        tmdbTitle: enRes.title ?? enRes.name, stored: emptyLocales.map(l => l.title) })
      continue
    }
    for (const l of emptyLocales) {
      const res = l.locale === 'ko' ? koRes : enRes
      const overview = String(res?.overview ?? '').trim()
      if (!overview || overview.length < 30) { holds.push({ id: c.id, eid: c.external_id, locale: l.locale, reason: 'no-tmdb-overview' }); continue }
      plan.push({
        content: { id: c.id, type: 'VIDEO', external_id: c.external_id, external_source: c.external_source ?? 'tmdb' },
        target: { content_id: l.content_id, locale: l.locale, title: l.title, creator: l.creator, publisher: l.publisher, isbn: l.isbn, description: l.description, sources: l.sources },
        description: overview,
        sourceUrl: `https://www.themoviedb.org/${m[1]}/${m[2]}`,
        sourceLocale: l.locale,
        method: 'provider',
        identityEvidence: [{ url: `https://api.themoviedb.org/3/${m[1]}/${m[2]}`, note: `TMDB ${m[1]} ${m[2]} title '${enRes.title ?? enRes.name}' matches stored title; ${l.locale} overview refetched` }],
      })
    }
    await new Promise(r => setTimeout(r, 120))
  }
  fs.writeFileSync(planFile, JSON.stringify(plan, null, 2))
  fs.writeFileSync(holdFile, JSON.stringify(holds, null, 2))
  console.log(JSON.stringify({ plan: plan.length, holds: holds.length }))
}
main().catch(e => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1 })
