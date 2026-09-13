/**
 * BOOK locale 결함 센서스 — 읽기 전용.
 * node --env-file=.env scripts/figure-books/locale-census.mjs [--out <path>]
 */
import { writeFileSync } from 'node:fs'
import { allRows, argumentValue, bareIsbn, dbClient } from './lib/figure-work.mjs'

const noHangul = (s) => !/[가-힣]/.test(String(s ?? ''))
const isEngGroup = (isbn) => /^(9780|9781|9798)/.test(bareIsbn(isbn ?? '').slice(0, 4))

async function main() {
  const db = dbClient()
  const bookIds = (await allRows('contents', (f, t) => db.from('contents').select('id').eq('type', 'BOOK').range(f, t))).map((r) => r.id)
  const locales = []
  for (let i = 0; i < bookIds.length; i += 100) {
    let done = false
    for (let attempt = 0; attempt < 4 && !done; attempt += 1) {
      try {
        const { data, error } = await db.from('content_locales')
          .select('content_id,locale,title,creator,isbn,description,sources,created_at')
          .in('content_id', bookIds.slice(i, i + 100))
        if (error) throw new Error(error.message)
        locales.push(...data)
        done = true
      } catch (e) {
        if (attempt === 3) throw e
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)))
      }
    }
    if (i % 2000 === 0) console.error(`progress ${i}/${bookIds.length}`)
  }
  const ko = locales.filter((r) => r.locale === 'ko')
  const en = locales.filter((r) => r.locale === 'en')
  const koEnTitle = ko.filter((r) => noHangul(r.title))
  const koStoredDesc = ko.filter((r) => r.description && !['KAKAO', 'DAUM', 'OPEN'].includes(r.description) && noHangul(r.description))
  const enNonEng = en.filter((r) => r.isbn && !isEngGroup(r.isbn))
  const enNullIsbn = en.filter((r) => !r.isbn)
  const koNullIsbn = ko.filter((r) => !r.isbn && !['translated', 'romanized', 'original'].includes(String(r.sources?.title ?? ''))) // 표시용 제목 행은 정상. sources.title이 URL인 옛 행은 표식이 아니다
  const byBatch = (rows) => {
    const m = {}
    for (const r of rows) { const d = String(r.created_at ?? '').slice(0, 10); m[d] = (m[d] ?? 0) + 1 }
    return Object.entries(m).sort((a, b) => b[1] - a[1])
  }
  const report = {
    books: bookIds.length, ko: ko.length, en: en.length,
    koEnTitle: koEnTitle.length, koStoredDesc: koStoredDesc.length,
    enNonEng: enNonEng.length, enNullIsbn: enNullIsbn.length, koNullIsbn: koNullIsbn.length,
    koEnTitleByBatch: byBatch(koEnTitle), koStoredDescByBatch: byBatch(koStoredDesc),
    enNonEngByBatch: byBatch(enNonEng),
  }
  console.log(JSON.stringify(report, null, 2))
  const out = argumentValue('out', null)
  if (out) {
    writeFileSync(out, JSON.stringify({
      koEnTitle: koEnTitle.map((r) => ({ id: r.content_id, title: r.title, creator: r.creator, isbn: r.isbn, primary: r.sources?.primary, batch: String(r.created_at).slice(0, 10) })),
      koStoredDesc: koStoredDesc.map((r) => ({ id: r.content_id, title: r.title, creator: r.creator, isbn: r.isbn, batch: String(r.created_at).slice(0, 10) })),
      enNonEng: enNonEng.map((r) => ({ id: r.content_id, title: r.title, creator: r.creator, isbn: r.isbn, primary: r.sources?.primary, batch: String(r.created_at).slice(0, 10) })),
      koNullIsbn: koNullIsbn.map((r) => ({ id: r.content_id, title: r.title, creator: r.creator, batch: String(r.created_at).slice(0, 10) })),
    }, null, 2))
    console.log(`saved ${out}`)
  }
}

void main().catch((e) => { console.error(e.message); process.exitCode = 1 })
