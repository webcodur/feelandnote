/**
 * 목록 편 재료. 「AFI 100대 영화 전체 목록 + 그 영화를 꼽은 사람들」이다.
 *
 *   pnpm tsx scripts/tistory-cinema/build-list.mts --slug afi-100-years-100-movies --pick 10
 *
 * 이 글이 다른 목록 소개 글과 갈리는 지점은 **전체 목록을 다 싣는 것**과 **누가 꼽았는지**
 * 둘이다. 앞은 「AFI 100대 영화 목록」 검색을 받고, 뒤는 우리만 쓸 수 있다.
 */
import { createClient } from '@supabase/supabase-js'
import { usableReview } from './lib/quality.mts'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '../../../..')
const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL!, process.env.DB_SECRET_KEY!)
const TMDB = process.env.TMDB_API_KEY!
const args = process.argv.slice(2)
const argOf = (k: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined }
const slug = argOf('--slug')
const PICK = Number(argOf('--pick') ?? 10)
if (!slug) throw new Error('--slug 가 필요하다')

const page = async <T,>(t: string, s: string, f?: (q: any) => any): Promise<T[]> => {
  const out: T[] = []
  for (let i = 0; ; i += 1000) {
    let q = db.from(t).select(s).range(i, i + 999)
    if (f) q = f(q)
    const { data, error } = await q
    if (error) throw error
    out.push(...(data as never[]))
    if (!data!.length || data!.length < 1000) break
  }
  return out
}

const { data: lRows } = await db.from('curated_lists').select('*').eq('slug', slug)
const list = lRows?.[0]
if (!list) throw new Error(`목록을 찾지 못했다: ${slug}`)
const { data: curRows } = await db.from('curators').select('*').eq('id', list.curator_id)
const curator = curRows?.[0]

const items = await page<any>('curated_list_items', '*', (q) => q.eq('list_id', list.id).eq('hidden', false))
items.sort((a, b) => (a.rank ?? 9999) - (b.rank ?? 9999) || (a.sort_order ?? 0) - (b.sort_order ?? 0))

const ids = items.map((i) => i.content_id).filter(Boolean)
const locales = await page<{ content_id: string; title: string; locale: string; creator: string | null; thumbnail_url: string | null }>(
  'content_locales', 'content_id, title, locale, creator, thumbnail_url')
const ko = new Map(locales.filter((l) => l.locale === 'ko').map((l) => [l.content_id, l]))
const contents = await page<{ id: string; external_id: string | null; metadata: any; release_date: string | null }>(
  'contents', 'id, external_id, metadata, release_date')
const cmapC = new Map(contents.map((c) => [c.id, c]))
const celebs = await page<{ id: string; slug: string; nickname: string; profession: string | null; title: string | null; avatar_url: string | null }>(
  'celebs', 'id, slug, nickname, profession, title, avatar_url', (q) => q.eq('publication_status', 'active'))
const people = new Map(celebs.map((c) => [c.id, c]))
const cc = await page<{ celeb_id: string; content_id: string; review: string | null }>('celeb_contents', 'celeb_id, content_id, review')
const byContent = new Map<string, { name: string; slug: string; profession: string | null; title: string | null; review: string }[]>()
cc.forEach((r) => {
  if (!ids.includes(r.content_id) || !usableReview(r.review)) return
  const c = people.get(r.celeb_id); if (!c) return
  if (!byContent.has(r.content_id)) byContent.set(r.content_id, [])
  byContent.get(r.content_id)!.push({ name: c.nickname, slug: c.slug, profession: c.profession, title: c.title, review: r.review!, avatar_url: c.avatar_url })
})
byContent.forEach((v) => v.sort((a, b) => b.review.length - a.review.length))

// 전체 목록(표에 쓴다) + 감상이 붙은 상위 몇 편(자세히 쓴다)
const all = items.map((i) => {
  const l = i.content_id ? ko.get(i.content_id) : null
  return { rank: i.rank, year: i.year, note: i.note, contentId: i.content_id,
           title: l?.title ?? i.raw_title, creator: l?.creator ?? i.raw_creator,
           voices: i.content_id ? (byContent.get(i.content_id) ?? []) : [] }
})
const withVoice = all.filter((r) => r.voices.length)
/**
 * 🔴 순위가 있는 목록은 **그 목록의 순위**를 따른다. 감상 수로만 세우면 AFI 100과
 *    사이트 앤 사운드 100의 상위 10편이 똑같이 나와 두 글이 같은 글로 보인다(26.09.05).
 *    순위가 없는 목록(수상작 등)만 감상 수로 세운다.
 */
if (list.is_ranked) withVoice.sort((a, b) => (a.rank ?? 9999) - (b.rank ?? 9999))
else withVoice.sort((a, b) => b.voices.length - a.voices.length)
const picked = withVoice.slice(0, PICK)

for (const r of picked) {
  const c = r.contentId ? cmapC.get(r.contentId) : null
  const id = (c?.external_id ?? '').match(/tmdb-movie-(\d+)/)?.[1]
  ;(r as any).poster = r.contentId ? ko.get(r.contentId)?.thumbnail_url ?? null : null
  ;(r as any).vote = c?.metadata?.voteAverage ?? null
  ;(r as any).release = c?.release_date ?? null
  if (!id) continue
  const d: any = await (await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${TMDB}&language=ko-KR`)).json()
  ;(r as any).overview = d.overview ?? ''
  ;(r as any).runtime = d.runtime
  ;(r as any).genres = (d.genres ?? []).map((g: any) => g.name)
}

/**
 * 마무리에 걸 인용 한 줄. **본문 상위 10편에 안 나온 작품**에서 고른다 — 이미 읽은 말을
 * 끝에서 다시 보여 줄 이유가 없다. 짧고 따옴표가 든 발언을 앞세운다(인용문이 실린 것).
 * 기관 명언을 지어내지 않는 이유: 출처를 확인할 수 없는 문장은 한 줄로도 신뢰를 깎는다.
 */
const usedIds = new Set(picked.map((r) => r.contentId))
const closingPool = withVoice
  .filter((r) => !usedIds.has(r.contentId))
  .flatMap((r) => r.voices.map((v) => ({ ...v, work: r.title, year: r.year })))
  .filter((v) => /["'“”「『]/.test(v.review) && v.review.length <= 260)
closingPool.sort((a, b) => a.review.length - b.review.length)
const closing = closingPool[0] ?? null

const out = { list: { slug: list.slug, title: list.title, description: list.description, method: list.method,
                      publishedYear: list.published_year, sourceUrl: list.source_url, isRanked: list.is_ranked, isAnnual: list.is_annual },
              curator: curator ? { slug: curator.slug, name: curator.name, kind: curator.kind, homepage: curator.homepage_url } : null,
              totalItems: all.length, withVoice: withVoice.length, all, picked, closing }
fs.mkdirSync(path.join(ROOT, 'data/tistory-cinema'), { recursive: true })
const file = path.join(ROOT, `data/tistory-cinema/목록-${list.title.replace(/[\/:*?"<>|]/g, '')}.json`)
fs.writeFileSync(file, JSON.stringify(out, null, 2))
console.log(`${list.title}: ${all.length}편 중 감상 붙은 ${withVoice.length}편 · 자세히 쓸 ${picked.length}편`)
console.log('상위:', picked.slice(0, 5).map((p) => `${p.title}(${p.voices.length}명)`).join(' · '))
console.log('저장:', file)
