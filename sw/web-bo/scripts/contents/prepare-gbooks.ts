/** Collect Google Books descriptions for empty BOOK locale rows.
 * ISBN pass: q=isbn:<isbn13>. Identity requires ISBN + title + author match.
 * Single key, daily cap (Books API free tier is ~1,000 requests/day — key
 * rotation to bypass that quota is the pattern this source was banned for).
 * Read-only for the database; caches responses under gbooks/cache.
 * node --env-file=.env --import tsx scripts/contents/prepare-gbooks.ts [start end]
 */
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { toIsbn13 } from '@feelandnote/content-search/kakao-books'
import { forLocale } from '@feelandnote/content-search/book-introduction'
import { createKeyPool, keyPoolStateFile } from './gbooks-keypool'

const dir = path.resolve('../../data/celeb/book-introductions/gbooks')
const cacheDir = path.join(dir, 'cache')
fs.mkdirSync(cacheDir, { recursive: true })
const targetsFile = path.join(dir, 'gbooks-targets.json')
const outFile = path.join(dir, 'prepared-gbooks.json')
const stateFile = keyPoolStateFile(dir)

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
const pool = createKeyPool(stateFile, [path.resolve('../web/.env')])

async function queryIsbn(isbn: string): Promise<any[] | null> {
  const file = path.join(cacheDir, `isbn-${isbn}.json`)
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'))
  for (let attempt = 0; attempt < 30; attempt++) {
    const slot = pool.next()
    if (!slot) return null
    await new Promise(r => setTimeout(r, Math.max(0, nextAt - Date.now())))
    nextAt = Date.now() + 300
    const r = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&maxResults=10&key=${slot.key}`,
      { signal: AbortSignal.timeout(20000) })
    pool.spend(slot.id)
    if (r.status === 400) { pool.dead(slot.id); continue }
    if (r.status === 429 || r.status === 403) {
      const text = await r.text().catch(() => '')
      if (/key expired|key not found|keyInvalid/i.test(text)) { pool.dead(slot.id); continue }
      pool.exhausted(slot.id)
      continue
    }
    if (r.status >= 500) { await new Promise(s => setTimeout(s, 2000 + attempt * 3000)); continue }
    if (!r.ok) throw new Error('HTTP ' + r.status)
    const data = await r.json()
    const items = data.items ?? []
    fs.writeFileSync(file, JSON.stringify(items))
    return items
  }
  return null
}

async function main() {
  if (!fs.existsSync(targetsFile)) {
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
    const targets = []
    for (const c of rows) {
      for (const l of c.content_locales) {
        if (l.locale !== 'en' && l.locale !== 'ko') continue
        if (l.description?.trim()) continue
        const isbn = toIsbn13(l.isbn ?? '')
        if (!isbn) continue
        targets.push({ book: { id: c.id, external_source: c.external_source, external_id: c.external_id },
          row: { content_id: l.content_id, locale: l.locale, title: l.title, creator: l.creator, publisher: l.publisher, isbn: l.isbn },
          isbn })
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
      const items = await queryIsbn(t.isbn)
      if (!items) { console.log(JSON.stringify({ stop: 'pool-exhausted', index })); break }
      if (!items.length) { r.ready = false; r.holdReasons = ['GB has no volume for this ISBN']; results.push(r); continue }
      // Prefer the item whose industry identifiers contain the queried ISBN.
      const scored = items.map(item => {
        const v = item.volumeInfo ?? {}
        const ids = (v.industryIdentifiers ?? []).map((i: any) => toIsbn13(String(i.identifier ?? ''))).filter(Boolean)
        const isbnMatch = ids.includes(t.isbn)
        const titles = [v.title, v.subtitle ? `${v.title}: ${v.subtitle}` : ''].map(norm).filter(Boolean)
        const want = norm(t.row.title)
        const titleMatch = titles.includes(want)
          || titles.some(x => x.length > 8 && want.length > 8 && (x.includes(want) || want.includes(x)))
        const creator = norm(t.row.creator)
        const authorMatch = !creator || (v.authors ?? []).some((a: string) => {
          const n = norm(a); return !!n && (n === creator || (n.length > 5 && (n.includes(creator) || creator.includes(n))))
        })
        const description = stripHtml(String(v.description ?? ''))
        const localeOk = !!description && !!forLocale(description, t.row.locale)
        const audio = /audio|audible|mp3|cd\b/i.test(String(v.printType ?? '') + ' ' + String(v.title ?? ''))
        return { item, v, isbnMatch, titleMatch, authorMatch, description, localeOk, audio }
      })
      const pick = scored.find(x => x.isbnMatch && x.titleMatch && x.authorMatch && x.description && x.localeOk && !x.audio)
        ?? scored.find(x => x.isbnMatch && x.titleMatch && x.description && x.localeOk && !x.audio)
      if (!pick) {
        const best = scored.find(x => x.isbnMatch) ?? scored[0]
        const reasons: string[] = []
        if (!best?.isbnMatch) reasons.push('ISBN volume mismatch')
        if (best && !best.titleMatch) reasons.push('Title identity mismatch')
        if (best && !best.authorMatch) reasons.push('Author identity mismatch')
        if (best?.audio) reasons.push('Audio edition')
        if (best && !best.description) reasons.push('No GB description body')
        else if (best && !best.localeOk) reasons.push('Description fails locale check')
        r = { ...r, candidates: scored.length,
          volume: best ? { id: best.item.id, title: best.v.title, authors: best.v.authors, language: best.v.language } : null,
          ready: false, holdReasons: reasons.length ? reasons : ['No matching volume'] }
      } else {
        r = { ...r, volumeId: pick.item.id,
          sourceUrl: `https://books.google.com/books?id=${pick.item.id}`,
          volume: { id: pick.item.id, title: pick.v.title, subtitle: pick.v.subtitle, authors: pick.v.authors,
            publisher: pick.v.publisher, publishedDate: pick.v.publishedDate, language: pick.v.language,
            industryIdentifiers: pick.v.industryIdentifiers },
          identity: { isbnMatch: pick.isbnMatch, titleMatch: pick.titleMatch, authorMatch: pick.authorMatch },
          description: pick.description, ready: true }
      }
    } catch (e) {
      const message = String(e instanceof Error ? e.message : e)
      if (message.startsWith('QUOTA:')) { console.log(JSON.stringify({ stop: 'quota', index })); break }
      r.error = message; r.ready = false
      results.push(r)
      fs.writeFileSync(outFile, JSON.stringify(results, null, 2))
      console.log(JSON.stringify({ index, ready: false, title: t.row.title, error: r.error }))
      if (/HTTP 5\d\d/.test(r.error)) throw new Error('Provider unavailable; stop without marking subsequent books unavailable')
      continue
    }
    results.push(r)
    fs.writeFileSync(outFile, JSON.stringify(results, null, 2))
    console.log(JSON.stringify({ index, locale: t.row.locale, ready: r.ready, title: t.row.title, reasons: r.holdReasons }))
  }
  console.log(JSON.stringify({ done: true, total: results.length, ready: results.filter((r: any) => r.ready).length,
    quota: pool.stats() }))
}
main().catch(e => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1 })
