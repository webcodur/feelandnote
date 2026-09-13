/**
 * 목록 편이 **몇 편에 감상이 붙어 있는지** 센다.
 *
 *   node --env-file=.env --import tsx scripts/tistory-cinema/list-coverage.mts
 *
 * 목록 편의 「필앤노트 리뷰」는 이 수를 문장에 그대로 쓴다 — 「100편 가운데 71편에 셀럽의
 * 감상 기록이 붙습니다」. 재고 기준이 바뀌면 이 수가 움직이므로 리뷰를 고치기 전에 여기서
 * 다시 잰다. 상위 작품 몇 편도 함께 보여 준다. 리뷰가 그 이름을 근거로 삼기 때문이다.
 */
import { createClient } from '@supabase/supabase-js'
import { usableReview } from './lib/quality.mts'

const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL!, process.env.DB_SECRET_KEY!)
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

const locales = await page<{ content_id: string; title: string; locale: string }>('content_locales', 'content_id, title, locale')
const koTitle = new Map(locales.filter((l) => l.locale === 'ko').map((l) => [l.content_id, l.title]))
const cc = await page<{ id: string; celeb_id: string; content_id: string; review: string | null }>(
  'celeb_contents', 'id, celeb_id, content_id, review')
const voices = new Map<string, number>()
cc.forEach((r) => { if (usableReview(r.review, r.id)) voices.set(r.content_id, (voices.get(r.content_id) ?? 0) + 1) })

const lists = await page<{ id: string; slug: string; title: string }>('curated_lists', 'id, slug, title')
const items = await page<{ list_id: string; content_id: string; hidden: boolean | null }>(
  'curated_list_items', 'list_id, content_id, hidden')

for (const l of lists) {
  const mine = items.filter((i) => i.list_id === l.id && !i.hidden)
  if (mine.length < 20) continue
  const withVoice = mine.filter((i) => voices.has(i.content_id))
  const top = withVoice
    .map((i) => ({ t: koTitle.get(i.content_id) ?? '?', n: voices.get(i.content_id)! }))
    .sort((a, b) => b.n - a.n).slice(0, 6)
  console.log(`\n${l.title}`)
  console.log(`  ${mine.length}편 중 ${withVoice.length}편에 기록  (${Math.round(withVoice.length / mine.length * 100)}%)`)
  console.log(`  상위: ${top.map((x) => `${x.t} ${x.n}명`).join(' · ')}`)
}
