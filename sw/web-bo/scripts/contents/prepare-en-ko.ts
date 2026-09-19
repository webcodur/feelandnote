/** For ko-empty BOOK rows whose en row already holds text, prove the stored English text
 * against OpenLibrary by the row's ISBN. A normalized match makes the OL URL the recorded
 * source for an en→ko translation; unmatched or non-introduction text is held.
 * Read-only for the database; shares the OL response cache with prepare-en-markers.
 * node --env-file=.env --import tsx scripts/contents/prepare-en-ko.ts
 */
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { toIsbn13 } from '@feelandnote/content-search/kakao-books'
import { forLocale } from '@feelandnote/content-search/book-introduction'
import { normalizeIntroductionCopy } from './book-description-sources-contract'

const dir = path.resolve('../../data/celeb/book-introductions/en-ko')
const cacheDir = path.resolve('../../data/celeb/book-introductions/en-markers/cache')
fs.mkdirSync(dir, { recursive: true })
const outFile = path.join(dir, 'en-ko-waiting.json')
const holdFile = path.join(dir, 'en-ko-holds.json')
const MARKERS = new Set(['KAKAO', 'DAUM', 'OPEN'])

let nextAt = 0
async function get(key: string): Promise<any> {
  const file = path.join(cacheDir, key.replaceAll('/', '_') + '.json')
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'))
  await new Promise(r => setTimeout(r, Math.max(0, nextAt - Date.now())))
  nextAt = Date.now() + 1050
  const r = await fetch('https://openlibrary.org' + key + '.json', {
    headers: { 'User-Agent': 'FeelandNote introduction verification (contact@feelandnote.com)' },
    signal: AbortSignal.timeout(18000),
  })
  if (r.status === 404) return null
  if (!r.ok) throw new Error('HTTP ' + r.status)
  const data = await r.json()
  fs.writeFileSync(file, JSON.stringify(data))
  return data
}

const readDescription = (v: unknown) => typeof v === 'string' ? v : ((v as { value?: string })?.value ?? '')

async function main() {
  const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL!, process.env.DB_SECRET_KEY!, { auth: { persistSession: false } })
  const rows: any[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('contents')
      .select('id,external_source,external_id,content_locales(content_id,locale,title,creator,publisher,isbn,description,sources)')
      .eq('type', 'BOOK').range(from, from + 999)
    if (error) throw error
    rows.push(...data)
    if (data.length < 1000) break
  }
  const targets = rows.filter(c => {
    const ko = c.content_locales.find((l: any) => l.locale === 'ko')
    const en = c.content_locales.find((l: any) => l.locale === 'en')
    const ed = en?.description?.trim()
    return en && ed && !MARKERS.has(ed) && (!ko || !ko.description?.trim())
  }).filter((c: any) => c.content_locales.some((l: any) => l.locale === 'ko')).map(c => ({
    content: { id: c.id, external_source: c.external_source, external_id: c.external_id },
    target: c.content_locales.find((l: any) => l.locale === 'ko'),
    source: c.content_locales.find((l: any) => l.locale === 'en'),
  }))
  console.log('targets:', targets.length)
  const waiting: any[] = []
  const holds: any[] = []
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i]
    const stored = t.source.description.trim()
    if (!forLocale(stored, 'en')) { holds.push({ id: t.content.id, title: t.source.title, reason: 'stored-text-not-an-english-introduction' }); continue }
    const recorded = typeof t.source.sources?.description === 'string' ? t.source.sources.description : null
    // Fast path: the stored text already cites a canonical OL URL.
    if (recorded && /^https:\/\/openlibrary\.org\/(?:books\/OL\d+M|works\/OL\d+W)\/?$/.test(recorded)) {
      waiting.push({ ...t, sourceUrl: recorded, sourceText: stored, identityEvidence: [{ url: recorded, note: 'Stored en introduction already records this OpenLibrary source.' }] })
      continue
    }
    const isbn = toIsbn13(t.source.isbn ?? '')
    if (!isbn) { holds.push({ id: t.content.id, title: t.source.title, reason: 'no-en-isbn-no-recorded-ol-source' }); continue }
    try {
      const edition = await get('/isbn/' + isbn)
      if (!edition) { holds.push({ id: t.content.id, title: t.source.title, reason: 'no-ol-edition-for-en-isbn' }); continue }
      const workKey = edition.works?.[0]?.key
      const work = workKey ? await get(workKey) : null
      let olText = readDescription(edition.description).trim()
      let key = `/books/${edition.key?.replace('/books/', '') ?? ''}`
      if (!olText && work) { olText = readDescription(work.description).trim(); key = work.key }
      const storedN = normalizeIntroductionCopy(stored), olN = normalizeIntroductionCopy(olText)
      if (!olN || !(storedN === olN || (storedN.length >= 80 && olN.startsWith(storedN)) || (olN.length >= 80 && storedN.startsWith(olN)))) {
        holds.push({ id: t.content.id, title: t.source.title, reason: 'stored-en-text-not-on-ol' }); continue
      }
      waiting.push({ ...t, sourceUrl: 'https://openlibrary.org' + key, sourceText: stored,
        identityEvidence: [{ url: 'https://openlibrary.org' + key, note: 'Stored en text verified identical to the OpenLibrary body for the row ISBN.' }] })
    } catch (e) {
      holds.push({ id: t.content.id, title: t.source.title, reason: 'ol-error: ' + (e as Error).message })
      if (/HTTP (429|5\d\d)/.test((e as Error).message)) throw new Error('Provider unavailable; stop')
    }
    if ((i + 1) % 100 === 0) console.log(JSON.stringify({ i: i + 1, waiting: waiting.length, holds: holds.length }))
  }
  fs.writeFileSync(outFile, JSON.stringify(waiting, null, 2))
  fs.writeFileSync(holdFile, JSON.stringify(holds, null, 2))
  console.log(JSON.stringify({ waiting: waiting.length, holds: holds.length }))
}
main().catch(e => { console.error(e); process.exitCode = 1 })
