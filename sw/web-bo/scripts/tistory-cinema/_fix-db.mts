/**
 * 통독에서 걸린 review 를 DB에서 고친다. 블로그에서만 다듬으면 사이트는 그대로이므로
 * **원본을 고쳐 두 곳이 함께 좋아지게** 한다. 고칠 것과 고친 뒤 값을 코드에 적어 두어
 * 무엇을 왜 손댔는지 이력에 남긴다.
 */
import { createClient } from '@supabase/supabase-js'

const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL!, process.env.DB_SECRET_KEY!)
const DRY = !process.argv.includes('--yes')

/** slug + 작품 제목으로 찾아 review 를 바꾼다. 사유를 반드시 적는다. */
const FIXES = [
  {
    slug: 'park-chan-wook',
    title: '현기증',
    why: '주어가 없이 「1982년 …」으로 시작해 다른 감상과 형식이 어긋난다',
    from: '1982년 서강대학교 3학년 겨울방학,',
    to: '박찬욱은 1982년 서강대학교 3학년 겨울방학,',
  },
  {
    slug: 'james-watson',
    title: '시민 케인',
    why: '「왓슨이 … 영화다」라는 명사구로 시작해 다른 감상과 형식이 어긋난다',
    from: '왓슨이 자서전에서 언급한, 그에게 영감을 준 영화다.',
    to: '제임스 왓슨은 자서전에서 이 영화를 자신에게 영감을 준 작품으로 꼽았다.',
  },
]

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

for (const fx of FIXES) {
  const { data: c } = await db.from('celebs').select('id, nickname').eq('slug', fx.slug)
  if (!c?.length) { console.log(`인물 없음: ${fx.slug}`); continue }
  const { data: rows } = await db.from('celeb_contents').select('id, content_id, review').eq('celeb_id', c[0].id)
  const hit = (rows ?? []).filter((r) => koTitle.get(r.content_id) === fx.title && (r.review ?? '').includes(fx.from))
  if (!hit.length) { console.log(`대상 없음: ${c[0].nickname} 『${fx.title}』`); continue }
  for (const h of hit) {
    const next = h.review!.replace(fx.from, fx.to)
    console.log(`\n${c[0].nickname} 『${fx.title}』 — ${fx.why}`)
    console.log(`  전: ${h.review!.slice(0, 60)}`)
    console.log(`  후: ${next.slice(0, 60)}`)
    if (!DRY) {
      const { error } = await db.from('celeb_contents').update({ review: next }).eq('id', h.id)
      if (error) throw error
      console.log('  → 반영')
    }
  }
}
console.log(DRY ? '\n미리보기다. 실제로 고치려면 --yes 를 붙인다.' : '\n완료')
