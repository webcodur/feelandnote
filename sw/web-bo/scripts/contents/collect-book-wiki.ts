/** Collect Wikipedia introductions for empty BOOK ko/en locale rows.
 * ko blanks → ko.wikipedia, en blanks → en.wikipedia. Book suffix candidates
 * (novel/책/소설) + author name in extract head are required for identity.
 * Resumable via results.json. 429/5xx → retry with backoff.
 * node --env-file=../web/.env --import tsx scripts/contents/collect-book-wiki.ts [start end]
 */
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const dir = path.resolve('../../data/celeb/book-introductions/book-wiki')
fs.mkdirSync(dir, { recursive: true })
const targetsFile = path.join(dir, 'targets.json')
const outFile = path.join(dir, 'results.json')

const UA = { 'User-Agent': 'feelandnote-content-research/1.0 (contact: admin@feelandnote.com)' }
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
const norm = (s: unknown) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/\s*\(.*?\)\s*/g, ' ').replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim()

async function wikiApi(locale: string, params: string, retry = 2): Promise<any> {
  for (let i = 0; i <= retry; i++) {
    const r = await fetch(`https://${locale}.wikipedia.org/w/api.php?${params}&format=json&origin=*`, { headers: UA }).catch(() => null)
    if (!r) { await sleep(2000 * (i + 1)); continue }
    if (r.status === 429 || r.status >= 500) { await sleep(3000 * (i + 1)); continue }
    return r.json().catch(() => null)
  }
  return null
}

async function wikiFind(locale: string, title: string, author: string) {
  const suffixes = locale === 'ko' ? ['책', '소설'] : ['novel', 'book']
  const cands = [`${title} (${suffixes[0]})`, `${title} (${suffixes[1]})`, title]
  const search = await wikiApi(locale, `action=opensearch&search=${encodeURIComponent(title + ' ' + author)}&limit=5`)
  const titles = new Set<string>(cands)
  if (Array.isArray(search?.[1])) for (const t of search[1]) titles.add(t)
  for (const t of titles) {
    const j = await wikiApi(locale, `action=query&prop=extracts|pageprops&explaintext&exintro&titles=${encodeURIComponent(t)}&redirects=1`)
    const p = j && Object.values(j.query.pages)[0] as any
    if (!p || p.missing !== undefined || p.pageprops?.disambiguation !== undefined || !p.extract || p.extract.length < 100) continue
    if (/다음과 같은 뜻이 있다|may refer to/i.test(p.extract)) continue
    const head = norm(p.extract.slice(0, 600))
    const tOk = head.includes(norm(title).slice(0, 10)) || norm(p.title).includes(norm(title).slice(0, 10))
    const aFirst = norm(author).split(' ')[0]
    const aOk = !aFirst || head.includes(aFirst)
    if (tOk && aOk) {
      const cut = p.extract.length <= 1500 ? p.extract : (p.extract.slice(0, 1500).match(/[\s\S]*[.!?…](?=\s|$)/)?.[0] ?? p.extract.slice(0, 1500))
      return { url: `https://${locale}.wikipedia.org/wiki/${encodeURIComponent(p.title.replace(/ /g, '_'))}`, extract: cut, title: p.title }
    }
  }
  return null
}

async function main() {
  if (!fs.existsSync(targetsFile)) {
    const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL!, process.env.DB_SECRET_KEY!, { auth: { persistSession: false } })
    const rows: any[] = []
    for (let from = 0; ; from += 1000) {
      const { data, error } = await db.from('contents')
        .select('id,external_source,external_id,content_locales!inner(content_id,locale,title,creator,description)')
        .eq('type', 'BOOK').range(from, from + 999)
      if (error) throw error
      rows.push(...data)
      if (data.length < 1000) break
    }
    const targets: any[] = []
    for (const c of rows) for (const l of c.content_locales) {
      if ((l.locale !== 'ko' && l.locale !== 'en') || l.description?.trim()) continue
      targets.push({ contentId: c.id, locale: l.locale, title: l.title, creator: l.creator || '' })
    }
    fs.writeFileSync(targetsFile, JSON.stringify(targets, null, 2))
    console.log('targets saved:', targets.length)
  }
  const targets = JSON.parse(fs.readFileSync(targetsFile, 'utf8'))
  const start = Number(process.argv[2] || 0), end = Number(process.argv[3] || targets.length)
  const results: Record<string, any> = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, 'utf8')) : {}
  let done = Object.keys(results).length, found = 0
  for (let index = start; index < end && index < targets.length; index++) {
    const t = targets[index]
    const key = `${t.contentId}:${t.locale}`
    if (results[key]) continue
    try {
      const hit = await wikiFind(t.locale, t.title, t.creator)
      results[key] = { index, ...t, hit }
      if (hit) found++
    } catch (e) {
      results[key] = { index, ...t, hit: null, error: String(e instanceof Error ? e.message : e) }
    }
    done++
    if (done % 100 === 0) {
      fs.writeFileSync(outFile, JSON.stringify(results, null, 1))
      console.log(JSON.stringify({ done, total: end, found }))
    }
    await sleep(250)
  }
  fs.writeFileSync(outFile, JSON.stringify(results, null, 1))
  console.log(JSON.stringify({ done: true, total: Object.keys(results).length, found: Object.values(results).filter((r: any) => r.hit).length }))
}
main().catch(e => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1 })
