/** Collect TMDB introductions into a review plan. Never writes to the database.
 * node --env-file=.env --import tsx scripts/contents/collect-video-introductions.ts [--limit 20]
 * Omit --limit to inspect every empty existing VIDEO locale. Cached provider responses
 * survive interruption; each run re-reads the target rows and rebuilds the review plan.
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { setTimeout as delay } from 'node:timers/promises'
import { createClient } from '@supabase/supabase-js'
import { mediaIntroductionText, prepareMediaIntroduction } from './media-introduction-contract'

type Locale = 'ko' | 'en'
interface Target {
  content_id: string; locale: Locale; title: string | null; creator: string | null
  publisher: string | null; isbn: string | null; description: string | null
  sources: Record<string, unknown> | null
}
interface Content {
  id: string; type: 'VIDEO'; external_id: string; external_source: string
}
interface Candidate { content: Content; target: Target; kind: 'movie' | 'tv'; providerId: number; filledSibling?: Target }
interface Detail {
  id: number; title?: string; name?: string; original_title?: string; original_name?: string
  overview?: string; original_language?: string; release_date?: string; first_air_date?: string
}
interface Cached { fetchedAt: string; kind: string; providerId: number; locale: Locale; status: number; detail?: Detail }
interface Plan {
  content: Content; target: Target; description: string; sourceUrl: string; sourceLocale: Locale
  method: 'provider'; identityEvidence: { url: string; note: string }[]
}

const normalized = (value: string) => value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
function atomicJson(file: string, value: unknown) {
  const temporary = `${file}.${process.pid}.tmp`
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  for (let attempt = 0; ; attempt++) {
    try { renameSync(temporary, file); return }
    catch (error) {
      const code = (error as NodeJS.ErrnoException).code
      if (!['EPERM', 'EBUSY', 'EACCES'].includes(code ?? '') || attempt >= 19) throw error
      // Windows readers/indexers can briefly lock a checkpoint during replacement.
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50)
    }
  }
}

async function main() {
  const { values } = parseArgs({ options: {
    limit: { type: 'string' }, concurrency: { type: 'string', default: '4' },
    output: { type: 'string', default: '../../data/celeb/book-introductions/video-provider' },
    help: { type: 'boolean' },
  } })
  if (values.help) {
    console.log('collect-video-introductions [--limit N] [--concurrency 1..4] [--output DIR]; read-only DB, review plan and raw TMDB responses only.')
    return
  }
  const limit = values.limit === undefined ? Infinity : Number(values.limit)
  const concurrency = Number(values.concurrency)
  if (!(limit > 0) || !Number.isInteger(concurrency) || concurrency < 1 || concurrency > 4) throw new Error('Invalid limit or concurrency')
  const dbUrl = process.env.NEXT_PUBLIC_DB_API_URL
  if (!dbUrl || new URL(dbUrl).hostname !== 'db.feelandnote.com' || !process.env.DB_SECRET_KEY || !process.env.TMDB_API_KEY) throw new Error('Required project environment is missing')
  const db = createClient(dbUrl, process.env.DB_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const output = resolve(values.output)
  const rawDir = resolve(output, 'raw')
  mkdirSync(rawDir, { recursive: true })
  const candidates: Candidate[] = []
  const omitted: { contentId: string; locale?: string; reason: string }[] = []
  for (let from = 0; ; from += 500) {
    const { data, error } = await db.from('contents')
      .select('id,type,external_id,external_source,content_locales(content_id,locale,title,creator,publisher,isbn,description,sources)')
      .eq('type', 'VIDEO').order('id').range(from, from + 499)
    if (error) throw new Error(`DB read failed: ${error.code}`)
    for (const row of data ?? []) {
      const match = /^tmdb-(movie|tv)-(\d+)$/.exec(row.external_id ?? '')
      const locales = row.content_locales as unknown as Target[]
      const missing = locales.filter(l => (l.locale === 'ko' || l.locale === 'en') && !l.description?.trim())
      if (!missing.length) continue
      if (row.external_source !== 'tmdb' || !match || Number(match[2]) <= 0) {
        omitted.push({ contentId: row.id, reason: 'unverified-provider-id' })
        continue
      }
      for (const target of missing) candidates.push({
        content: { id: row.id, type: 'VIDEO', external_id: row.external_id, external_source: row.external_source },
        target, kind: match[1] as 'movie' | 'tv', providerId: Number(match[2]),
        filledSibling: locales.find(l => l.locale !== target.locale && (l.locale === 'ko' || l.locale === 'en') && l.description?.trim()),
      })
    }
    if (!data || data.length < 500) break
  }
  const selected = candidates.slice(0, limit)
  const approved: Plan[] = []
  const holds: Array<{ contentId: string; locale: Locale; title: string | null; reason: string; sourceUrl: string; providerTitle?: string; originalTitle?: string; sibling?: Record<string, string | null | undefined> }> = []
  const errors: object[] = []
  let cursor = 0, processed = 0, failures = 0, stopped = false, nextStart = 0, fetched = 0, cached = 0
  function checkpoint() {
    // A wrong external ID can already have contaminated the sibling locale's title.
    // If either locale disagrees with TMDB, do not publish the other locale's plan.
    const disputedIds = new Set(holds.filter(h => ['title-mismatch', 'provider-id-mismatch', 'filled-sibling-title-mismatch'].includes(h.reason)).map(h => h.contentId))
    const disputed = approved.filter(p => disputedIds.has(p.content.id))
    const publishable = approved.filter(p => !disputedIds.has(p.content.id))
    atomicJson(resolve(output, 'plan.json'), publishable.sort((a, b) => `${a.content.id}:${a.target.locale}`.localeCompare(`${b.content.id}:${b.target.locale}`)))
    atomicJson(resolve(output, 'holds.json'), [...holds, ...disputed.map(p => ({ contentId: p.content.id, locale: p.target.locale, title: p.target.title, sourceUrl: p.sourceUrl, reason: 'sibling-title-mismatch' }))])
    atomicJson(resolve(output, 'errors.json'), errors)
    atomicJson(resolve(output, 'status.json'), { at: new Date().toISOString(), totalEligible: candidates.length, selected: selected.length, processed, approved: publishable.length, held: holds.length + disputed.length, omitted, errors: errors.length, fetched, cached, stopped })
    return { approved: publishable.length, held: holds.length + disputed.length }
  }
  async function obtain(candidate: Candidate): Promise<Cached> {
    const { kind, providerId, target } = candidate
    const cachePath = resolve(rawDir, `${kind}-${providerId}-${target.locale}.json`)
    if (existsSync(cachePath)) {
      try {
        const previous = JSON.parse(readFileSync(cachePath, 'utf8')) as Cached
        if (previous.kind === kind && previous.providerId === providerId && previous.locale === target.locale && [200, 404].includes(previous.status)) {
          cached++
          return previous
        }
      } catch { /* An interrupted or corrupt local response is fetched again. */ }
    }
    const start = Math.max(Date.now(), nextStart)
    nextStart = start + 150
    await delay(Math.max(0, start - Date.now()))
    if (stopped) throw new Error('collection-stopped')
    const url = new URL(`https://api.themoviedb.org/3/${kind}/${providerId}`)
    url.searchParams.set('api_key', process.env.TMDB_API_KEY!)
    url.searchParams.set('language', target.locale === 'ko' ? 'ko-KR' : 'en-US')
    let response: Response
    try { response = await fetch(url, { signal: AbortSignal.timeout(20_000) }) }
    catch { throw new Error('TMDB network or timeout failure') }
    if (!response.ok && response.status !== 404) throw new Error(`TMDB HTTP ${response.status}`)
    const result: Cached = { fetchedAt: new Date().toISOString(), kind, providerId, locale: target.locale, status: response.status }
    if (response.ok) result.detail = await response.json() as Detail
    atomicJson(cachePath, result)
    fetched++
    failures = 0
    return result
  }
  console.log(JSON.stringify({ selected: selected.length, totalEligible: candidates.length, output, concurrency }))
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (!stopped) {
      const index = cursor++
      if (index >= selected.length) break
      const candidate = selected[index]
      const { content, target, kind, providerId } = candidate
      const identity = { contentId: content.id, locale: target.locale, title: target.title }
      try {
        const raw = await obtain(candidate)
        const sourceUrl = `https://www.themoviedb.org/${kind}/${providerId}`
        const detail = raw.detail
        const title = kind === 'movie' ? detail?.title : detail?.name
        const originalTitle = kind === 'movie' ? detail?.original_title : detail?.original_name
        const description = detail?.overview?.trim() ?? ''
        let reason = ''
        let siblingEvidence: Record<string, string | null | undefined> | undefined
        if (raw.status === 404) reason = 'provider-not-found'
        else if (!detail || detail.id !== providerId) reason = 'provider-id-mismatch'
        else if (!target.title || ![title, originalTitle].some(t => t && normalized(t) === normalized(target.title!))) reason = 'title-mismatch'
        else if (!description) reason = 'provider-introduction-empty'
        else if (!mediaIntroductionText(description, target.locale)) reason = 'language-or-incomplete-body'
        if (!reason && candidate.filledSibling) {
          // A filled sibling is not a write target, but its title remains identity evidence.
          const sibling = candidate.filledSibling
          const siblingRaw = await obtain({ ...candidate, target: sibling, filledSibling: undefined })
          const siblingTitle = kind === 'movie' ? siblingRaw.detail?.title : siblingRaw.detail?.name
          const siblingOriginal = kind === 'movie' ? siblingRaw.detail?.original_title : siblingRaw.detail?.original_name
          siblingEvidence = { locale: sibling.locale, storedTitle: sibling.title, providerTitle: siblingTitle, originalTitle: siblingOriginal }
          if (siblingRaw.detail?.id !== providerId || !sibling.title || ![siblingTitle, siblingOriginal].some(t => t && normalized(t) === normalized(sibling.title!))) reason = 'filled-sibling-title-mismatch'
        }
        if (reason) holds.push({ ...identity, reason, sourceUrl, providerTitle: title, originalTitle, sibling: siblingEvidence })
        else {
          const plan: Plan = { content, target, description, sourceUrl, sourceLocale: target.locale, method: 'provider', identityEvidence: [{ url: sourceUrl, note: `TMDB ${kind} ID ${providerId}; stored title ${JSON.stringify(target.title)} matches localized/original title ${JSON.stringify(title)} / ${JSON.stringify(originalTitle)}. Original locale ${detail?.original_language ?? 'unknown'}; release ${detail?.release_date ?? detail?.first_air_date ?? 'unknown'}.` }] }
          try { prepareMediaIntroduction(plan); approved.push(plan) }
          catch { holds.push({ ...identity, reason: 'media-contract-rejected', sourceUrl, providerTitle: title, originalTitle }) }
        }
      } catch (error) {
        const message = error instanceof Error && /^(TMDB |collection-stopped)/.test(error.message) ? error.message : 'provider response processing failed'
        errors.push({ ...identity, reason: message })
        if (message !== 'collection-stopped') failures++
        if (failures >= 3) stopped = true
      }
      processed++
      if (processed % 20 === 0) {
        const counts = checkpoint()
        console.log(JSON.stringify({ processed, ...counts, errors: errors.length, fetched, cached }))
      }
    }
  }))
  const counts = checkpoint()
  console.log(JSON.stringify({ finished: !stopped, processed, ...counts, errors: errors.length }))
  if (stopped) process.exitCode = 1
}
main().catch((error: unknown) => {
  const code = (error as NodeJS.ErrnoException)?.code ?? (error instanceof Error ? error.name : 'unknown')
  console.error(`Video introduction collection failed (${code}); no database changes were made.`)
  process.exitCode = 1
})
