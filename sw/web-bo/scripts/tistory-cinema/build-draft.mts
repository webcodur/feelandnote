/**
 * 티스토리 「필앤노트 시네마」 작품 편 원고를 만든다.
 *
 *   pnpm tsx scripts/tistory-cinema/build-draft.mts --title 대부
 *   pnpm tsx scripts/tistory-cinema/build-draft.mts --id 5ea098b8 --pick 15
 *
 * 재료는 둘뿐이다.
 *   - DB `celeb_contents.review` — 누가 이 영화를 꼽았나. **우리만 가진 것이다.**
 *   - TMDB — 줄거리·평점·러닝타임·주연·예고편·스틸컷. 「대부 줄거리」 같은 정보 검색어를 받는다.
 *
 * 원고 전체를 LLM 에게 쓰게 하지 않는다. 네이버에서 176만 토큰을 태운 뒤 얻은 규칙이다
 * (`docs/continuous/naver-blog.md` 「원고 생산」). 여기서도 조립이 먼저다.
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
const wantTitle = argOf('--title')
const wantId = argOf('--id')
/**
 * 인물은 **최대 4명**이다. 10명을 실으면 100자 넘는 감상이 10명 이상인 영화가 9편뿐이라
 * 글감이 말라 버리고(3명 기준이면 141편), 대부처럼 27명이 있는 작품에서도 남는 인원이
 * 중앙값 6명뿐이라 「나머지는 사이트에서」가 무색해진다. 3명을 못 채우면 글로 쓰지 않는다.
 */
const PICK = Number(argOf('--pick') ?? 4)
const MIN_PICK = 3
if (!wantTitle && !wantId) throw new Error('--title 또는 --id 가 필요하다')

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

// ── 작품 고르기 ─────────────────────────────────────────────
type Row = { id: string; type: string; external_id: string | null; metadata: any; release_date: string | null }
const contents = await page<Row>('contents', 'id, type, external_id, metadata, release_date', (q) => q.eq('type', 'VIDEO'))
const locales = await page<{ content_id: string; title: string; locale: string; creator: string | null; thumbnail_url: string | null }>(
  'content_locales', 'content_id, title, locale, creator, thumbnail_url')
const ko = new Map(locales.filter((l) => l.locale === 'ko').map((l) => [l.content_id, l]))
const cc = await page<{ celeb_id: string; content_id: string; review: string | null; source_url: string | null }>(
  'celeb_contents', 'celeb_id, content_id, review, source_url')
const cnt = new Map<string, number>()
cc.forEach((r) => cnt.set(r.content_id, (cnt.get(r.content_id) ?? 0) + 1))

// 같은 제목이 여러 건이면 **감상이 가장 많이 붙은 것**을 고른다. 영상 2,573건에 제목
// 중복이 34종 있고, 감상 1건짜리 껍데기를 잡으면 원고가 통째로 빈다(26.09.05에 겪었다).
const cands = contents.filter((c) => {
  if (wantId) return c.id.startsWith(wantId)
  const t = ko.get(c.id)?.title?.trim()
  return t === wantTitle
})
if (!cands.length) throw new Error(`작품을 찾지 못했다: ${wantTitle ?? wantId}`)
cands.sort((a, b) => (cnt.get(b.id) ?? 0) - (cnt.get(a.id) ?? 0))
const work = cands[0]
const info = ko.get(work.id)!
if (cands.length > 1) console.log(`같은 제목 ${cands.length}건 중 감상 ${cnt.get(work.id)}건짜리를 골랐다`)

// ── TMDB 보강 ───────────────────────────────────────────────
const tmdbId = (work.external_id ?? '').match(/tmdb-movie-(\d+)/)?.[1]
const tmdb: any = { }
if (tmdbId) {
  const base = `https://api.themoviedb.org/3/movie/${tmdbId}`
  const [detail, credits, vidsKo, vidsEn] = await Promise.all([
    fetch(`${base}?api_key=${TMDB}&language=ko-KR`).then((r) => r.json()),
    fetch(`${base}/credits?api_key=${TMDB}&language=ko-KR`).then((r) => r.json()),
    fetch(`${base}/videos?api_key=${TMDB}&language=ko-KR`).then((r) => r.json()),
    fetch(`${base}/videos?api_key=${TMDB}`).then((r) => r.json()),
  ])
  tmdb.runtime = detail.runtime
  tmdb.vote = detail.vote_average
  tmdb.voteCount = detail.vote_count
  tmdb.genres = (detail.genres ?? []).map((g: any) => g.name)
  tmdb.overview = detail.overview || work.metadata?.overview || ''
  tmdb.original = detail.original_title
  tmdb.cast = (credits.cast ?? []).slice(0, 5).map((c: any) => ({ name: c.name, role: c.character }))
  tmdb.director = (credits.crew ?? []).filter((c: any) => c.job === 'Director').map((c: any) => c.name)
  const seen = new Set<string>()
  const vids = [...(vidsEn.results ?? []), ...(vidsKo.results ?? [])]
    .filter((v: any) => v.site === 'YouTube' && /Trailer|Teaser/i.test(v.type))
    .filter((v: any) => !seen.has(v.key) && seen.add(v.key))
  /**
   * 🔴 **원어 공식 예고편을 앞세운다.** 국내 배급사가 올린 예고편은 임베드가 막혀 있는 일이
   *    잦아 글에 「이 동영상은 볼 수 없습니다」가 박힌다(26.09.05 『대부』 한국 예고편).
   *    후보를 전부 남겨 두고, 첫 후보가 막혀 있으면 미리보기에서 보고 --trailer 로 바꾼다.
   */
  tmdb.trailers = vids.map((v: any) => ({ key: v.key, name: v.name, type: v.type }))
  tmdb.trailer = tmdb.trailers[0] ?? null
}

// ── 감상 모으기 ─────────────────────────────────────────────
const celebs = await page<{ id: string; slug: string; nickname: string; profession: string | null; title: string | null; headline: string | null; bio: string | null; avatar_url: string | null }>(
  'celebs', 'id, slug, nickname, profession, title, headline, bio, avatar_url', (q) => q.eq('publication_status', 'active'))
const cmap = new Map(celebs.map((c) => [c.id, c]))
// 제목에 쓰는 수는 **사이트에 실제로 보이는 수**여야 한다. 100자 필터를 통과한 수를 쓰면
// 「27명」이라 적어 놓고 도착 페이지에는 48명이 있어 숫자가 어긋난다.
const totalOnSite = cc.filter((r) => r.content_id === work.id).length
const all = cc.filter((r) => r.content_id === work.id)
  .map((r) => { const c = cmap.get(r.celeb_id); return c ? { ...c, review: r.review ?? '', source: r.source_url } : null })
  /**
   * 🔴 60자로는 「누가 누구와 함께 봤다」 같은 목격담이 들어온다(26.09.05 재러드 쿠슈너 82자).
   *    본인이 말한 근거가 담기려면 100자는 있어야 한다. 그 아래는 원고에 쓰지 않는다.
   */
  .filter((r): r is NonNullable<typeof r> => !!r && usableReview(r.review))

// 직군을 고루 섞는다. 한 직군만 나오면 「감독들이 좋아하는 영화」가 되어 각이 좁아진다.
const byProf = new Map<string, typeof all>()
all.forEach((r) => { const k = r.profession ?? '?'; if (!byProf.has(k)) byProf.set(k, []); byProf.get(k)!.push(r) })
byProf.forEach((v) => v.sort((a, b) => b.review.length - a.review.length))
const picked: typeof all = []
for (let round = 0; picked.length < PICK && round < 20; round++) {
  for (const [, v] of byProf) { if (v[round] && picked.length < PICK) picked.push(v[round]) }
}

/**
 * 「필앤노트 리뷰」에 쓸 재료. **이 영화를 꼽은 사람들이 또 무엇을 꼽았는가** — 감상 기록을
 * 가진 쪽만 셀 수 있는 값이라 이 글을 다른 영화 소개 글과 가르는 지점이다.
 * 직군 분포도 함께 담는다(영화인만 꼽은 영화인지, 밖에서도 꼽는 영화인지).
 */
const byId = new Map(contents.map((c) => [c.id, c]))
const fans = new Set(all.map((r) => r.id))
const together = new Map<string, number>()
cc.forEach((r) => {
  if (r.content_id === work.id || !fans.has(r.celeb_id)) return
  const c = byId.get(r.content_id)
  if (!/tmdb-movie-/.test(c?.external_id ?? '')) return
  together.set(r.content_id, (together.get(r.content_id) ?? 0) + 1)
})
const alsoLiked = [...together.entries()]
  .sort((a, b) => b[1] - a[1]).slice(0, 3)
  .map(([id, n]) => ({ id, title: ko.get(id)?.title ?? '', n }))
  .filter((x) => x.title)

const profCount: Record<string, number> = {}
all.forEach((r) => { const k = r.profession ?? 'other'; profCount[k] = (profCount[k] ?? 0) + 1 })

if (picked.length < MIN_PICK) throw new Error(`쓸 만한 감상이 ${picked.length}명뿐이다(최소 ${MIN_PICK}명). 이 작품은 쓰지 않는다`)

const out = { work: { id: work.id, title: info.title, poster: info.thumbnail_url, creator: info.creator, release: work.release_date }, tmdb, total: totalOnSite, usable: all.length, picked, alsoLiked, profCount }
fs.mkdirSync(OUT_DIR, { recursive: true })
const file = path.join(OUT_DIR, `${info.title.replace(/[\/:*?"<>|]/g, '')}.json`)
fs.writeFileSync(file, JSON.stringify(out, null, 2))
console.log(`『${info.title}』 감상 ${totalOnSite}건(쓸 만한 것 ${all.length}건) 중 ${picked.length}명 · 예고편 ${tmdb.trailer ? '있음' : '없음'}`)
console.log('직군:', [...new Set(picked.map((p) => p.profession))].join(' '))
console.log('저장:', file)
