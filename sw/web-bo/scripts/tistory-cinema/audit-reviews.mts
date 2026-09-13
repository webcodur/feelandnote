/**
 * 재고 기준이 바뀐 뒤 **손으로 쓴 「필앤노트 리뷰」가 낡았는지** 본다.
 *
 *   node --env-file=.env --import tsx scripts/tistory-cinema/audit-reviews.mts
 *
 * 리뷰에는 「48명이 꼽았습니다」·「100편 중 71편」처럼 데이터에서 온 숫자가 들어간다.
 * 필터를 손대거나 DB 감상을 고치면 그 숫자가 어긋나는데, 원고는 자동으로 다시 만들어져도
 * 리뷰는 사람이 쓴 글이라 그대로 남는다. **틀린 숫자가 실린 채 발행되는 것**이 이 도구가
 * 막으려는 사고다.
 *
 * 세 가지를 본다.
 *   1. 제목의 숫자가 `_titles-before.json` 과 달라졌는가 (있으면 그 편은 통독 대상)
 *   2. 리뷰 본문의 숫자 가운데 현재 원고에 없는 것이 있는가
 *   3. 🔴 **리뷰가 거명한 사람이 원고에서 사라졌는가**
 *
 * 세 번째가 가장 잘 잡힌다. 재고 기준이 바뀌면 작품 편에 실리는 4인이 갈리는데, 리뷰는
 * 그 4인의 발언을 근거로 쓴 글이라 한 명만 빠져도 **원고에 없는 사람의 말을 인용하는 글**
 * 이 된다(26.09.05 『샤이닝』의 베네딕트 컴버배치, 『시민 케인』의 오즈 야스지로).
 *
 * 🔴 대조 상대는 **원고 전체가 아니라 감상문이 실린 명단**이다. 빠진 사람도 페이지 끝의
 *    인물 버튼에는 이름이 남으므로, 본문에 이름이 있는지만 보면 전부 통과해 버린다.
 *
 * 🔴 그리고 **그 작품에 감상 기록이 있는 사람만** 본다. 리뷰에는 배우와 감독 이름이 당연히
 *    나오는데(『택시 드라이버』의 로버트 드 니로), 그들은 실릴 후보가 아니라 작품의 일부다.
 *
 * 🔴 여기 걸린다고 다 잘못은 아니다. 리뷰는 실린 4인이 아니라 **기록 전체**를 읽고 쓰는 글이라
 *    「48명 가운데 …」처럼 화면 밖 근거를 대는 것이 정상이다. 확인할 것은 **그 근거가 아직
 *    DB에 살아 있는가** 하나다 — 꼬리를 도려내다 인용한 문장까지 사라졌으면 그때가 사고다.
 *
 * 두 번째는 어림짐작이다. 「1972년」 같은 연도나 「두 번」 같은 말도 잡히므로, 결과는
 * 「읽어 볼 후보」이지 판정이 아니다.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { ASSETS } from '../blog-assets.mjs'

const DIR = path.join(ASSETS, 'tistory-cinema')
const before: Record<string, string> = JSON.parse(fs.readFileSync(path.join(DIR, '_titles-before.json'), 'utf8'))
const fn: Record<string, string> = JSON.parse(fs.readFileSync(path.join(DIR, 'fn-reviews.json'), 'utf8'))

const nums = (s: string) => (s.match(/\d+/g) ?? []).map(Number)
const titleNow = (name: string) => {
  const p = path.join(DIR, `_meta-${name}.json`)
  return fs.existsSync(p) ? (JSON.parse(fs.readFileSync(p, 'utf8')).title as string) : null
}

// 셀럽 이름 사전. 리뷰에 나온 사람 이름을 알아보려면 실제 명단이 있어야 한다.
const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL!, process.env.DB_SECRET_KEY!)
const page = async <T,>(t: string, sel: string): Promise<T[]> => {
  const out: T[] = []
  for (let i = 0; ; i += 1000) {
    const { data, error } = await db.from(t).select(sel).range(i, i + 999)
    if (error) throw error
    out.push(...(data as never[]))
    if (!data!.length || data!.length < 1000) break
  }
  return out
}
const celebRows = await page<{ id: string; nickname: string }>('celebs', 'id, nickname')
const nickOf = new Map(celebRows.map((c) => [c.id, c.nickname]))
const locales = await page<{ content_id: string; title: string; locale: string }>('content_locales', 'content_id, title, locale')
const koTitle = new Map(locales.filter((l) => l.locale === 'ko').map((l) => [l.content_id, l.title]))
const links = await page<{ celeb_id: string; content_id: string }>('celeb_contents', 'celeb_id, content_id')
/** 작품 제목 → 그 작품에 감상을 남긴 사람들. 실릴 후보가 그들뿐이다. */
const talkers = new Map<string, Set<string>>()
links.forEach((r) => {
  const t = koTitle.get(r.content_id); const n = nickOf.get(r.celeb_id)
  if (!t || !n) return
  if (!talkers.has(t)) talkers.set(t, new Set())
  talkers.get(t)!.add(n)
})
/** 두 글자 이름은 보통 명사와 겹쳐 오탐이 많다. 세 글자부터 본다. */
const people = [...new Set(celebRows.map((c) => c.nickname))].filter((n) => n.length >= 3)

const changed: { name: string; from: string; to: string }[] = []
const missing: { name: string; who: string[] }[] = []
const stale: { name: string; miss: number[] }[] = []
let gone = 0

for (const name of Object.keys(fn)) {
  if (name.startsWith('_')) continue
  const now = titleNow(name)
  if (!now) { console.log(`원고 사라짐 — ${name}`); gone++; continue }
  const was = before[name]
  if (was && was !== now) changed.push({ name, from: was, to: now })

  // 리뷰가 인용한 수가 지금 원고 어디에도 없으면 낡았을 수 있다
  const body = fs.readFileSync(path.join(DIR, `_body-${name}.html`), 'utf8')
  const inBody = new Set(nums(body.replace(/<[^>]+>/g, ' ')))
  const miss = [...new Set(nums(fn[name]))].filter((n) => n >= 3 && n <= 400 && !inBody.has(n))
  if (miss.length) stale.push({ name, miss })

  // 리뷰가 거명했는데 감상문이 실리지 않은 사람
  const raw = JSON.parse(fs.readFileSync(path.join(DIR, `${name}.json`), 'utf8'))
  const shown: string[] = name.startsWith('목록-')
    ? (raw.picked ?? []).flatMap((w: { people?: { nickname: string }[] }) => (w.people ?? []).map((p) => p.nickname))
    : name.startsWith('인물-')
      ? []                                       // 인물 편은 사람이 하나뿐이라 대조할 것이 없다
      : (raw.picked ?? []).map((p: { nickname: string }) => p.nickname)
  if (shown.length) {
    const work = name.replace(/^목록-/, '')
    const cand = name.startsWith('목록-')
      ? new Set([...talkers.values()].flatMap((v) => [...v]))   // 목록 편은 작품이 여럿이라 전체를 본다
      : (talkers.get(work) ?? new Set<string>())
    const away = people.filter((p) => cand.has(p) && fn[name].includes(p) && !shown.includes(p))
    if (away.length) missing.push({ name, who: away })
  }
}

console.log(`\n■ 제목의 숫자가 달라진 글 ${changed.length}편 — 리뷰를 다시 읽는다`)
changed.forEach((c) => { console.log(`  ${c.name}`); console.log(`    전: ${c.from}`); console.log(`    후: ${c.to}`) })

console.log(`\n■ 리뷰가 든 수가 원고에 없는 글 ${stale.length}편 — 확인 대상`)
stale.forEach((s) => console.log(`  ${s.name} — ${s.miss.join(', ')}`))

console.log(`\n■ 리뷰가 거명했는데 감상문이 실리지 않은 사람 ${missing.length}편 — 읽어 볼 것`)
missing.forEach((m) => console.log(`  ${m.name} — ${m.who.join(', ')}`))

console.log(`원고 없어진 리뷰 ${gone}편`)
fs.writeFileSync(path.join(DIR, '_audit.json'), JSON.stringify({ changed, stale, missing }, null, 1), 'utf8')
console.log(`저장: ${path.join(DIR, '_audit.json')}`)
