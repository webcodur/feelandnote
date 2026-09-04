/**
 * 인물 편 재료. 「타란티노가 꼽은 영화 44편 중 여섯」 같은 글이다.
 *
 *   pnpm tsx scripts/tistory-cinema/build-person.mts --slug quentin-tarantino --pick 6
 *
 * 작품 편과 축만 반대다. 작품 편은 한 영화를 여러 사람이, 인물 편은 한 사람이 여러 영화를 말한다.
 */
import { createClient } from '@supabase/supabase-js'
import { usableReview } from './lib/quality.mts'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '../../../..')
const OUT_DIR = path.join(ROOT, 'data/tistory-cinema')
const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL!, process.env.DB_SECRET_KEY!)
const TMDB = process.env.TMDB_API_KEY!
const args = process.argv.slice(2)
const argOf = (k: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined }
const slug = argOf('--slug')
const PICK = Number(argOf('--pick') ?? 6)
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

const { data: cRows } = await db.from('celebs').select('*').eq('slug', slug).eq('publication_status', 'active')
const celeb = cRows?.[0]
if (!celeb) throw new Error(`인물을 찾지 못했다: ${slug}`)

const contents = await page<{ id: string; type: string; external_id: string | null; metadata: any; release_date: string | null }>(
  'contents', 'id, type, external_id, metadata, release_date', (q) => q.eq('type', 'VIDEO'))
const vmap = new Map(contents.map((c) => [c.id, c]))
const locales = await page<{ content_id: string; title: string; locale: string; creator: string | null; thumbnail_url: string | null }>(
  'content_locales', 'content_id, title, locale, creator, thumbnail_url')
const ko = new Map(locales.filter((l) => l.locale === 'ko').map((l) => [l.content_id, l]))
const { data: mine } = await db.from('celeb_contents').select('content_id, review, source_url').eq('celeb_id', celeb.id)

const rows = (mine ?? [])
  .filter((r) => vmap.has(r.content_id) && usableReview(r.review))
  .map((r) => {
    const w = vmap.get(r.content_id)!
    const l = ko.get(r.content_id)
    return { id: r.content_id, title: l?.title ?? '', poster: l?.thumbnail_url ?? null, creator: l?.creator ?? null,
             release: w.release_date, vote: w.metadata?.voteAverage ?? null, external: w.external_id, review: r.review ?? '' }
  })
  /**
   * 🔴 **영화만 남긴다.** `contents.type` 은 드라마·시리즈까지 VIDEO 로 묶으므로 그대로 쓰면
   *    영화 블로그에 「퀸스 갬빗」·「옐로우스톤」이 올라간다(26.09.05). TMDB 식별자가
   *    `tmdb-movie-` 인 것만 고른다.
   */
  .filter((r) => r.title && /tmdb-movie-/.test(r.external ?? ''))
/**
 * 정렬은 평점이 아니라 **감상문 길이**다. 그 사람이 길게 말한 작품이 그가 아끼는 작품이고,
 * 평점 순으로 세우면 그 인물과 상관없이 명작 목록이 된다.
 */
rows.sort((a, b) => b.review.length - a.review.length)
const totalOnSite = (mine ?? []).filter((r) => vmap.has(r.content_id) && /tmdb-movie-/.test(vmap.get(r.content_id)!.external_id ?? '')).length

/**
 * 후보 20편만 TMDB 로 보강한 뒤 **인지도(투표 수)** 로 다시 세운다.
 *
 * 감상문 길이만으로 고르면 「1955년 9월 30일」·「밀고자」처럼 한국 관객이 모르는 작품이 앞에
 * 온다(26.09.05 타란티노). 길게 말했으면서 아는 영화여야 검색이 붙는다. 전량이 아니라 20편만
 * 부르는 것은 호출을 아끼면서 재정렬에는 충분하기 때문이다.
 */
const shortlist = rows.slice(0, 20)
for (const r of shortlist) {
  const id = (r.external ?? '').match(/tmdb-movie-(\d+)/)?.[1]
  if (!id) continue
  const d: any = await (await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${TMDB}&language=ko-KR`)).json()
  ;(r as any).overview = d.overview ?? ''
  ;(r as any).runtime = d.runtime
  ;(r as any).genres = (d.genres ?? []).map((g: any) => g.name)
  ;(r as any).voteCount = d.vote_count ?? 0
}
shortlist.sort((a, b) => ((b as any).voteCount ?? 0) - ((a as any).voteCount ?? 0))
const picked = shortlist.slice(0, PICK)

const out = { celeb: { slug: celeb.slug, name: celeb.nickname, profession: celeb.profession, title: celeb.title, headline: celeb.headline, bio: celeb.bio, avatar: celeb.avatar_url }, total: totalOnSite, usable: rows.length, picked }
fs.mkdirSync(OUT_DIR, { recursive: true })
const file = path.join(OUT_DIR, `인물-${celeb.nickname}.json`)
fs.writeFileSync(file, JSON.stringify(out, null, 2))
console.log(`${celeb.nickname}: 영상 ${totalOnSite}편(쓸 만한 것 ${rows.length}편) 중 ${picked.length}편`)
console.log('고른 작품:', picked.map((p) => p.title).join(' · '))
console.log('저장:', file)
