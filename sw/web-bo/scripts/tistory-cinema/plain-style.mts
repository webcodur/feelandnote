/**
 * 감상의 **문체를 평서체로 통일한다.**
 *
 *   node --env-file=.env --import tsx scripts/tistory-cinema/plain-style.mts        # 미리보기
 *   node --env-file=.env --import tsx scripts/tistory-cinema/plain-style.mts --yes  # 반영
 *
 * 작품 편은 네 사람의 감상을 나란히 싣는다. 그 안에서 셋은 「말했다」인데 하나만
 * 「말했습니다」이면 옮겨 온 글이 아니라 **손이 덜 간 글**로 읽힌다(26.09.05 『팬텀 스레드』의
 * 김연아·알모도바르·노윤서). 채널의 서술은 평서체이고, 인용부호 안의 발언만 화자의 말투를
 * 그대로 둔다.
 *
 * 어미만 바꾸므로 사실은 건드리지 않는다. 표에 없는 어미가 남으면 경고하고 넘어간다 —
 * 기계가 문장을 새로 쓰지 않게 하려는 것이다.
 */
import { createClient } from '@supabase/supabase-js'
import { usableReview } from './lib/quality.mts'

const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL!, process.env.DB_SECRET_KEY!)
const DRY = !process.argv.includes('--yes')

const page = async <T,>(t: string, s: string): Promise<T[]> => {
  const out: T[] = []
  for (let i = 0; ; i += 1000) {
    const { data, error } = await db.from(t).select(s).range(i, i + 999)
    if (error) throw error
    out.push(...(data as never[]))
    if (!data!.length || data!.length < 1000) break
  }
  return out
}

/** 문장 끝의 높임 어미 → 평서체. 긴 것부터 놓아야 짧은 것이 먼저 걸리지 않는다. */
const ENDINGS: [RegExp, string][] = [
  [/적어 두었습니다\./g, '적어 두었다.'],
  [/들었습니다\./g, '들었다.'],
  [/맺었습니다\./g, '맺었다.'],
  [/소개됐습니다\./g, '소개됐다.'],
  [/덧붙였습니다\./g, '덧붙였다.'],
  [/회상했습니다\./g, '회상했다.'],
  [/단언했습니다\./g, '단언했다.'],
  [/찾아봤습니다\./g, '찾아봤다.'],
  [/떠올렸습니다\./g, '떠올렸다.'],
  [/설명했습니다\./g, '설명했다.'],
  [/전했습니다\./g, '전했다.'],
  [/밝혔습니다\./g, '밝혔다.'],
  [/말했습니다\./g, '말했다.'],
  [/꼽았습니다\./g, '꼽았다.'],
  [/남겼습니다\./g, '남겼다.'],
  [/적었습니다\./g, '적었다.'],
  [/평했습니다\./g, '평했다.'],
  [/답했습니다\./g, '답했다.'],
  [/봤습니다\./g, '봤다.'],
  [/했습니다\./g, '했다.'],
  [/없었습니다\./g, '없었다.'],
  [/있습니다\./g, '있다.'],
  [/회상합니다\./g, '회상한다.'],
  [/꼽습니다\./g, '꼽는다.'],
  [/사례입니다\./g, '사례다.'],
  [/기록입니다\./g, '기록이다.'],
  [/밝혔지요\./g, '밝혔다.'],
  [/말했지요\./g, '말했다.'],
]
/** 아직 남은 높임 어미를 찾는 그물 */
const LEFT = /(습니다|합니다|입니다|됩니다|십니다)[.」』"']/

const contents = await page<{ id: string; external_id: string | null }>('contents', 'id, external_id')
const movie = new Set(contents.filter((c) => (c.external_id ?? '').startsWith('tmdb-movie-')).map((c) => c.id))
const locales = await page<{ content_id: string; title: string; locale: string }>('content_locales', 'content_id, title, locale')
const koTitle = new Map(locales.filter((l) => l.locale === 'ko').map((l) => [l.content_id, l.title]))
const celebs = await page<{ id: string; nickname: string }>('celebs', 'id, nickname')
const nick = new Map(celebs.map((c) => [c.id, c.nickname]))
const cc = await page<{ id: string; celeb_id: string; content_id: string; review: string | null }>(
  'celeb_contents', 'id, celeb_id, content_id, review')

const POLITE = /(습니다|합니다|입니다|됩니다|십니다|어요|아요|해요|예요|네요|지요)[.」』"']?\s*$/
const rows = cc.filter((r) => movie.has(r.content_id) && usableReview(r.review, r.id) && POLITE.test((r.review ?? '').trim()))

let done = 0
let left = 0
for (const r of rows) {
  const cur = r.review!.trim()
  let next = cur
  for (const [re, to] of ENDINGS) next = next.replace(re, to)
  const who = `${nick.get(r.celeb_id)} · 『${koTitle.get(r.content_id)}』`
  if (next === cur) { console.log(`\n바꿀 어미 없음 — ${who}`); left++; continue }
  if (LEFT.test(next)) { console.log(`\n🔴 높임이 남았다 — ${who}\n  ${next}`); left++; continue }
  console.log(`\n${who}\n  후: ${next.slice(0, 120)}`)
  if (!DRY) {
    const { error } = await db.from('celeb_contents').update({ review: next }).eq('id', r.id)
    if (error) throw error
  }
  done++
}
console.log(`\n대상 ${rows.length}건 · 고침 ${done}건 · 손 못 댄 것 ${left}건`)
console.log(DRY ? '미리보기다. 실제로 고치려면 --yes 를 붙인다.' : '완료')
