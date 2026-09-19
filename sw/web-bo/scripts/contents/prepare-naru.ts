/** Collect 정보나루(data4library) descriptions for empty BOOK ko locale rows.
 * ISBN pass: srchDtlList?isbn13=<isbn13>. Identity requires title + author match.
 * 정보나루 인증키는 마이페이지 승인 후 활성화된다 — 활성화 전에는 vitalizationErr.
 * 일 500건(서버 IP 등록 시 30,000건) 한도. Read-only; caches under naru/cache.
 * node --env-file=../web/.env --import tsx scripts/contents/prepare-naru.ts [start end]
 * Apply with: apply-gbooks.ts --apply --file prepared-naru.json
 */
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { toIsbn13 } from '@feelandnote/content-search/kakao-books'
import { forLocale } from '@feelandnote/content-search/book-introduction'

const dir = path.resolve('../../data/celeb/book-introductions/naru')
const cacheDir = path.join(dir, 'cache')
fs.mkdirSync(cacheDir, { recursive: true })
const targetsFile = path.join(dir, 'naru-targets.json')
const gbooksTargets = path.resolve('../../data/celeb/book-introductions/gbooks/gbooks-targets.json')
const outFile = path.join(dir, 'prepared-naru.json')

const KEY = process.env.DATA4LIBRARY_API_KEY
if (!KEY) throw new Error('DATA4LIBRARY_API_KEY missing (sw/web/.env)')

const norm = (s: unknown) => String(s || '').normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')

function stripHtml(value: string): string {
  return value
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\/\s*(p|div|li|h[1-6])\s*>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&mdash;/g, '—').replace(/&ndash;/g, '–')
    .replace(/\n{3,}/g, '\n\n').trim()
}

let nextAt = 0

async function queryIsbn(isbn: string): Promise<any[] | null> {
  const file = path.join(cacheDir, `isbn-${isbn}.json`)
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'))
  for (let attempt = 0; attempt < 5; attempt++) {
    await new Promise(r => setTimeout(r, Math.max(0, nextAt - Date.now())))
    nextAt = Date.now() + 300
    const r = await fetch(`https://data4library.kr/api/srchDtlList?authKey=${KEY}&isbn13=${isbn}&format=json`,
      { signal: AbortSignal.timeout(20000) }).catch(() => null)
    if (!r) { await new Promise(s => setTimeout(s, 2000 + attempt * 3000)); continue }
    if (r.status === 429 || r.status >= 500) { await new Promise(s => setTimeout(s, 2000 + attempt * 3000)); continue }
    if (!r.ok) throw new Error('HTTP ' + r.status)
    const j = await r.json().catch(() => null)
    const err = j?.response?.error || j?.response?.errCode
    if (err) {
      if (/vitalization/i.test(String(err) + String(j?.response?.errCode ?? ''))) throw new Error('ACTIVATION: API key not activated yet')
      throw new Error('API: ' + String(err))
    }
    const books = (j?.response?.detail ?? []).map((d: any) => d.book).filter(Boolean)
    fs.writeFileSync(file, JSON.stringify(books))
    return books
  }
  return null
}

async function main() {
  if (!fs.existsSync(targetsFile)) {
    let targets: any[] = []
    if (fs.existsSync(gbooksTargets)) {
      // GB 목표 목록 재사용 — ko 공란+ISBN 행은 같은 집합이다
      targets = (JSON.parse(fs.readFileSync(gbooksTargets, 'utf8')) as any[]).filter(t => t.row?.locale === 'ko')
    } else {
      const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL!, process.env.DB_SECRET_KEY!, { auth: { persistSession: false } })
      const rows: any[] = []
      for (let from = 0; ; from += 1000) {
        const { data, error } = await db.from('contents')
          .select('id,external_source,external_id,content_locales!inner(content_id,locale,title,creator,publisher,isbn,description,sources)')
          .eq('type', 'BOOK').range(from, from + 999)
        if (error) throw error
        rows.push(...data)
        if (data.length < 1000) break
      }
      for (const c of rows) {
        for (const l of c.content_locales) {
          if (l.locale !== 'ko' || l.description?.trim()) continue
          const isbn = toIsbn13(l.isbn ?? '')
          if (!isbn) continue
          targets.push({ book: { id: c.id, external_source: c.external_source, external_id: c.external_id },
            row: { content_id: l.content_id, locale: l.locale, title: l.title, creator: l.creator, publisher: l.publisher, isbn: l.isbn },
            isbn })
        }
      }
    }
    fs.writeFileSync(targetsFile, JSON.stringify(targets, null, 2))
    console.log('targets saved:', targets.length)
  }
  const targets = JSON.parse(fs.readFileSync(targetsFile, 'utf8'))
  const start = Number(process.argv[2] || 0), end = Number(process.argv[3] || targets.length)
  const results: any[] = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, 'utf8')) : []
  for (let index = start; index < end && index < targets.length; index++) {
    if (results.some((r: any) => r.index === index)) continue
    const t = targets[index]
    let r: any = { index, contentId: t.book.id, locale: t.row.locale, title: t.row.title, isbn: t.isbn }
    try {
      const books = await queryIsbn(t.isbn)
      if (!books) { console.log(JSON.stringify({ stop: 'provider-unavailable', index })); break }
      if (!books.length) { r.ready = false; r.holdReasons = ['NARU has no book for this ISBN']; results.push(r); continue }
      const scored = books.map(b => {
        const want = norm(t.row.title)
        const got = norm(b.bookname)
        const titleMatch = got === want || (got.length > 8 && want.length > 8 && (got.includes(want) || want.includes(got)))
        const creator = norm(t.row.creator)
        const authorMatch = !creator || norm(b.authors).includes(creator) || creator.includes(norm(b.authors).slice(0, 4))
        const description = stripHtml(String(b.description ?? ''))
        const localeOk = !!description && !!forLocale(description, 'ko')
        return { b, titleMatch, authorMatch, description, localeOk }
      })
      const pick = scored.find(x => x.titleMatch && x.authorMatch && x.description && x.localeOk)
        ?? scored.find(x => x.titleMatch && x.description && x.localeOk)
      if (!pick) {
        const best = scored[0]
        const reasons: string[] = []
        if (best && !best.titleMatch) reasons.push('Title identity mismatch')
        if (best && !best.authorMatch) reasons.push('Author identity mismatch')
        if (best && !best.description) reasons.push('No NARU description body')
        else if (best && !best.localeOk) reasons.push('Description fails locale check')
        r = { ...r, candidates: scored.length,
          volume: best ? { title: best.b.bookname, authors: best.b.authors, publisher: best.b.publisher } : null,
          ready: false, holdReasons: reasons.length ? reasons : ['No matching book'] }
      } else {
        r = { ...r,
          sourceUrl: `https://www.data4library.kr/api/srchDtlList?isbn13=${t.isbn}`,
          volume: { title: pick.b.bookname, authors: pick.b.authors, publisher: pick.b.publisher,
            publication_year: pick.b.publication_year, class_no: pick.b.class_no },
          identity: { isbnMatch: true, titleMatch: pick.titleMatch, authorMatch: pick.authorMatch },
          description: pick.description, ready: true }
      }
    } catch (e) {
      const message = String(e instanceof Error ? e.message : e)
      if (message.startsWith('ACTIVATION:') || message.startsWith('API:')) { console.log(JSON.stringify({ stop: 'auth', index, error: message })); break }
      r.error = message; r.ready = false
      results.push(r)
      fs.writeFileSync(outFile, JSON.stringify(results, null, 2))
      console.log(JSON.stringify({ index, ready: false, title: t.row.title, error: r.error }))
      continue
    }
    results.push(r)
    fs.writeFileSync(outFile, JSON.stringify(results, null, 2))
    console.log(JSON.stringify({ index, ready: r.ready, title: t.row.title, reasons: r.holdReasons }))
  }
  console.log(JSON.stringify({ done: true, total: results.length, ready: results.filter((r: any) => r.ready).length }))
}
main().catch(e => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1 })
