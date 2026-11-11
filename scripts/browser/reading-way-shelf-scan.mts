// 독서 방식 본문의 《》·『』 제목 중 그 인물의 책장에서 찾지 못한 후보를 뽑는다. 읽기 전용.
// 초벌 후보다. 번역 제목 차이는 문자열로 가려지지 않으므로 판단은 LLM이 문맥·책장·원문으로 한다(celeb-05-02).
// 저장소 루트에서: node --env-file=sw/web-bo/.env --import tsx scripts/browser/reading-way-shelf-scan.mts <결과.json> [--only slug,slug]
import fs from 'node:fs'
import { createClient } from '../../packages/db/src/index.mjs'

const out = process.argv[2]
if (!out) throw new Error('Usage: reading-way-shelf-scan.mts <output.json> [--only slug,slug]')
const onlyAt = process.argv.indexOf('--only')
const only = onlyAt >= 0 ? new Set(process.argv[onlyAt + 1].split(',')) : null
const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL!, process.env.DB_SECRET_KEY!)

const norm = (s: unknown) => String(s ?? '').normalize('NFKC').toLowerCase().replace(/\([^)]*\)|（[^）]*）/g, '').replace(/[^\p{L}\p{N}]/gu, '')
const PAGE = 1000

// 전체 카탈로그: 정규화 제목 → 작품. 표기 차이와 원제 메타를 흡수한다.
const byTitle = new Map<string, Set<string>>(), typeOf = new Map<string, string>(), creators = new Map<string, string[]>()
const addTitle = (title: unknown, id: string) => {
  const key = norm(title)
  if (key.length >= 2) (byTitle.get(key) ?? byTitle.set(key, new Set()).get(key)!).add(id)
}
for (let from = 0; ; from += PAGE) {
  const { data, error } = await db.from('content_locales').select('content_id,title,creator,contents!inner(type,metadata)').order('content_id').order('locale').range(from, from + PAGE - 1)
  if (error) throw error
  for (const row of (data ?? []) as any[]) {
    addTitle(row.title, row.content_id)
    typeOf.set(row.content_id, row.contents.type)
    ;(creators.get(row.content_id) ?? creators.set(row.content_id, []).get(row.content_id)!).push(String(row.creator ?? ''))
    const figureBook = row.contents.metadata?.figureBook
    if (figureBook?.workTitle) addTitle(figureBook.workTitle, row.content_id)
    if (figureBook?.originalTitle) addTitle(figureBook.originalTitle, row.content_id)
  }
  if (!data || data.length < PAGE) break
}

const people: any[] = []
for (let from = 0; ; from += PAGE) {
  const { data, error } = await db.from('celebs').select('id,slug,nickname,nickname_en,reading_way').not('reading_way', 'is', null).order('id').range(from, from + PAGE - 1)
  if (error) throw error
  people.push(...(data ?? []))
  if (!data || data.length < PAGE) break
}

const NOT_READ = /(읽지 않|읽어 보지 않|읽은 적이 없|안 읽었|끝까지 읽지 못)/
const results: any[] = []
const counts: Record<string, number> = {}
let mentionTotal = 0
for (const person of people) {
  if (only && !only.has(person.slug)) continue
  const body = String(person.reading_way)
  const mentions = [...new Set([...body.matchAll(/[《『]([^》』]{2,80})[》』]/g)].map(m => m[1].trim()))]
  if (!mentions.length) continue
  mentionTotal += mentions.length
  const a = await db.from('celeb_contents').select('content_id').eq('celeb_id', person.id)
  const b = await db.from('figure_book_characters').select('content_id').eq('celeb_id', person.id)
  if (a.error || b.error) throw a.error ?? b.error
  const shelf = new Set([...(a.data ?? []), ...(b.data ?? [])].map((row: any) => row.content_id))
  const shelfTitles: string[] = []
  const ids = [...shelf]
  for (let i = 0; i < ids.length; i += 100) {
    const l = await db.from('content_locales').select('title').in('content_id', ids.slice(i, i + 100))
    for (const row of l.data ?? []) shelfTitles.push(norm((row as any).title))
  }
  const lastName = norm(String(person.nickname_en ?? '').split(/\s+/).pop()), name = norm(person.nickname)
  for (const title of mentions) {
    const key = norm(title)
    if (key.length < 2 || shelfTitles.some(t => t && (t === key || t.includes(key) || key.includes(t)))) continue
    const hits = [...(byTitle.get(key) ?? [])]
    const at = body.indexOf(title)
    const context = body.slice(Math.max(0, at - 90), at + title.length + 70).replace(/\s+/g, ' ')
    let kind = 'candidate'
    if (hits.some(id => shelf.has(id))) kind = 'on_shelf_same_work'
    else if (hits.length && hits.every(id => typeOf.get(id) !== 'BOOK')) kind = 'catalog_non_book'
    else if (hits.some(id => typeOf.get(id) === 'BOOK' && (creators.get(id) ?? []).some(c => (lastName && norm(c).includes(lastName)) || (name && norm(c).includes(name))))) kind = 'own_work'
    else if (NOT_READ.test(context)) kind = 'said_not_read'
    counts[kind] = (counts[kind] ?? 0) + 1
    results.push({ slug: person.slug, name: person.nickname, title, kind, catalogBookIds: hits.filter(id => typeOf.get(id) === 'BOOK').slice(0, 3), context })
  }
}
fs.writeFileSync(out, JSON.stringify(results, null, 1))
console.log(JSON.stringify({ people: people.length, mentions: mentionTotal, unmatched: results.length, ...counts }))
process.exit(0)
