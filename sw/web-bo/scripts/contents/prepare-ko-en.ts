/** Build the ko→en translation waiting list.
 * - en-empty + ko real text with a recorded https source URL -> translate the stored text.
 * - en-empty + ko marker (KAKAO/DAUM) -> fetch the current provider body, then translate it.
 * - ko real text whose recorded source is an OpenLibrary URL -> emits an OL marker plan for the en row instead of back-translating.
 * Read-only for the database. node --env-file=.env --import tsx prepare-ko-en.ts
 */
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { fetchBookIntroduction } from '@feelandnote/content-search/book-introduction'
import { isBookIntroductionSource } from '@feelandnote/content-search/book-introduction-contract'

const dir = path.resolve('../../data/celeb/book-introductions/ko-en')
const OL = /^https:\/\/openlibrary\.org\/(?:books\/OL\d+M|works\/OL\d+W|isbn\/[\dX]+)\.?(?:json)?$/

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
  const waiting: any[] = []
  const holds: any[] = []
  const olMarkers: any[] = []
  let fetched = 0
  for (const c of rows) {
    const ko = c.content_locales.find((l: any) => l.locale === 'ko')
    const en = c.content_locales.find((l: any) => l.locale === 'en')
    if (!ko?.description?.trim() || !en || en.description?.trim()) continue
    const marker = isBookIntroductionSource(ko.description)
    const recordedUrl = typeof ko.sources?.description === 'string' ? ko.sources.description : null
    if (!marker && recordedUrl && OL.test(recordedUrl.replace(/\.json$/, ''))) {
      // The stored ko text already cites an OL work: fetch the original English instead of back-translating.
      olMarkers.push({ book: { id: c.id }, ko, en, sourceUrl: recordedUrl })
      continue
    }
    let sourceText: string | null = null
    let sourceUrl = recordedUrl
    if (marker) {
      try {
        const result = await fetchBookIntroduction({ isbn: ko.isbn, locale: 'ko', source: ko.description, sourceUrl: recordedUrl })
        sourceText = result.description
        sourceUrl = recordedUrl
        fetched++
        if (fetched % 200 === 0) console.log(JSON.stringify({ fetched, waiting: waiting.length, holds: holds.length }))
      } catch (e) {
        holds.push({ bookId: c.id, title: ko.title, reason: 'provider-fetch-failed: ' + (e as Error).message })
        continue
      }
      if (!sourceText) { holds.push({ bookId: c.id, title: ko.title, reason: 'marker-source-has-no-current-body' }); continue }
    } else {
      sourceText = ko.description
    }
    if (!sourceUrl || !/^https:\/\//.test(sourceUrl)) { holds.push({ bookId: c.id, title: ko.title, reason: 'no-recorded-source-url' }); continue }
    waiting.push({
      content: { id: c.id, external_source: c.external_source, external_id: c.external_id },
      target: en, source: { ...ko, description: sourceText }, sourceUrl, sourceText,
      identityEvidence: [
        { url: sourceUrl, note: marker ? `Stored ko row carries the ${ko.description} marker; this URL is the recorded provider source and returned the current Korean body.` : 'Stored ko introduction and its recorded source URL identify the same work as the en row (shared content_id, one book per row pair).' },
      ],
    })
  }
  fs.writeFileSync(path.join(dir, 'ko-en-waiting.json'), JSON.stringify(waiting, null, 2))
  fs.writeFileSync(path.join(dir, 'ko-en-holds.json'), JSON.stringify(holds, null, 2))
  fs.writeFileSync(path.join(dir, 'ko-en-ol-markers.json'), JSON.stringify(olMarkers, null, 2))
  console.log(JSON.stringify({ waiting: waiting.length, holds: holds.length, olMarkers: olMarkers.length, fetched }))
}
main().catch(e => { console.error(e); process.exitCode = 1 })
