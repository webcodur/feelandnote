/**
 * 좌표를 못 붙인 장소명을 그록에게 물어 해결한다.
 * 규칙 SSoT: docs/project/celeb/celeb-timeline.md
 *
 * 문자열 규칙으로는 닫히지 않는 영역이다. 「하비(현 장쑤성 피저우시 일대)」 같은 고대 지명,
 * 동음이의어, 옛 행정구역은 의미를 알아야 풀린다. 정규식을 사례마다 늘리는 대신 모델에 맡긴다.
 * 기계가 할 수 있는 정규화는 backfill-celeb-timeline-coords.ts가 먼저 끝낸 뒤 남은 것만 온다.
 *
 * 실행:
 *   pnpm exec tsx scripts/celeb/timeline/resolve-places-grok.ts ask [--batch 50] [--lanes 6] [--max N]
 *   pnpm exec tsx scripts/celeb/timeline/resolve-places-grok.ts apply [--dry]
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { REPO_ROOT } from '../../lib/paths'
import { grokJson } from '../../../../../.claude/skills/grok-cli/scripts/grok-call.mjs'

function loadEnv() {
  const file = resolve(process.cwd(), '.env')
  if (!existsSync(file)) return
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
loadEnv()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

const OUT = resolve(process.cwd(), '.tmp-place-resolve.json')
const OUT_INFER = resolve(process.cwd(), '.tmp-place-infer.json')

type Answer = { place: string; city: string | null; lat: number | null; lng: number | null; confidence: string; note: string }

const SCHEMA = {
  type: 'object',
  properties: {
    places: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          place: { type: 'string' },
          city: { type: ['string', 'null'] },
          lat: { type: ['number', 'null'] },
          lng: { type: ['number', 'null'] },
          confidence: { type: 'string', enum: ['high', 'medium', 'low', 'none'] },
          note: { type: 'string' },
        },
        required: ['place', 'city', 'lat', 'lng', 'confidence', 'note'],
      },
    },
  },
  required: ['places'],
}

/** 호출 규약은 grok-cli 스킬의 헬퍼가 쥔다. 여기서 spawn을 다시 짜지 않는다. */
async function runGrok(prompt: string): Promise<{ structuredOutput: { places?: Answer[] } | null }> {
  const { data } = await grokJson(prompt, SCHEMA, { effort: 'high', repoRoot: REPO_ROOT })
  return { structuredOutput: data as { places?: Answer[] } | null }
}

function prompt(names: { place: string; sample: string }[]): string {
  return [
    `아래는 인물 연표에 적힌 장소명이다. 각각이 지도에 찍을 수 있는 실제 지점인지 판정하고,`,
    `맞다면 그 지점의 위도·경도를 알려 달라. 활동 반경 지도에 쓰는 값이다.`,
    ``,
    `판정 규칙`,
    `- 국가·대륙·주·도는 지점이 아니다. city를 null, confidence를 none으로 한다.`,
    `  「미국」에 워싱턴 좌표를, 「캘리포니아」에 주 중심 좌표를 넣지 마라. 국토 중심점은 뜻이 없다.`,
    `- 옛 지명은 현대의 대응 도시를 찾아 그 도시 좌표를 준다. 「강릉(현 후베이성 징저우시)」은`,
    `  강원도 강릉이 아니라 후베이성 징저우다. 괄호나 「현/오늘날」 뒤의 현대 지명이 옛 이름보다 우선이다.`,
    `- 동음이의어를 조심하라. 「하비」는 미국 일리노이 하비가 아니라 장쑤성 피저우일 수 있다.`,
    `  같이 준 사용 예시 문장으로 어느 쪽인지 판단하라.`,
    `- 학교·극장·궁궐·형무소처럼 건물이면 그 건물이 있는 도시의 좌표를 준다. city에는 도시명을 쓴다.`,
    `- 어디인지 확신할 수 없으면 억지로 답하지 말고 confidence를 low나 none으로 두어라.`,
    `  틀린 좌표 하나가 그 인물의 이동 경로 전체를 왜곡한다.`,
    ``,
    `note에는 왜 그렇게 판정했는지 한 줄로 적어라.`,
    ``,
    `장소 목록 (place / 실제 사용 예):`,
    ...names.map((n, i) => `${i + 1}. ${n.place}  —  예: ${n.sample.slice(0, 60)}`),
    ``,
    `출력은 JSON 스키마를 따르는 places 배열 하나만. 입력한 place 문자열을 그대로 돌려줘야 한다.`,
  ].join('\n')
}

const argOf = (n: string) => {
  const i = process.argv.indexOf(`--${n}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}

async function page<T>(build: (q: any) => any): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(supabase.from('celeb_timeline_events')).order('id').range(from, from + 999)
    if (error) throw new Error(error.message)
    out.push(...((data ?? []) as T[]))
    if (!data || data.length < 1000) return out
  }
}

async function ask() {
  const batch = Number.parseInt(argOf('batch') ?? '50', 10)
  const lanes = Number.parseInt(argOf('lanes') ?? '6', 10)
  const max = argOf('max') ? Number.parseInt(argOf('max')!, 10) : Infinity

  const fiction = new Set<string>()
  for (let from = 0; ; from += 1000) {
    const { data } = await supabase.from('celebs').select('id').eq('celeb_tier', 'fiction').order('id').range(from, from + 999)
    for (const c of data ?? []) fiction.add(c.id)
    if (!data || data.length < 1000) break
  }
  const rows = await page<{ place_name: string | null; title: string; celeb_id: string }>(
    (q) => q.select('place_name,title,celeb_id').is('lat', null))

  const seen = new Map<string, string>()
  for (const r of rows) {
    const p = (r.place_name ?? '').trim()
    if (!p || fiction.has(r.celeb_id) || seen.has(p)) continue
    seen.set(p, r.title)
  }
  const all = [...seen.entries()].map(([place, sample]) => ({ place, sample })).slice(0, max)
  const groups: typeof all[] = []
  for (let i = 0; i < all.length; i += batch) groups.push(all.slice(i, i + batch))
  console.log(`장소 ${all.length}개를 ${groups.length}묶음으로 묻는다 (동시 ${lanes})`)

  const answers: Answer[] = []
  let done = 0
  const queue = [...groups]
  await Promise.all(Array.from({ length: Math.min(lanes, queue.length) }, async () => {
    for (;;) {
      const g = queue.shift()
      if (!g) return
      try {
        const res = await runGrok(prompt(g))
        answers.push(...((res.structuredOutput?.places ?? []) as Answer[]))
      } catch (e) { console.log(`  묶음 실패: ${(e as Error).message.slice(0, 80)}`) }
      console.log(`  ${++done}/${groups.length} 묶음 완료 (누적 응답 ${answers.length})`)
    }
  }))
  writeFileSync(OUT, JSON.stringify(answers, null, 1), 'utf8')
  const usable = answers.filter((a) => a.lat !== null && (a.confidence === 'high' || a.confidence === 'medium'))
  console.log(`\n응답 ${answers.length} / 쓸 수 있음 ${usable.length} → ${OUT}`)
}

/** 국가·주 중심점은 소수점이 떨어진다. 모델이 실수해도 여기서 막는다. */
const isCentroid = (lat: number, lng: number) => lat % 1 === 0 && lng % 1 === 0

/**
 * 장소명이 아예 없는 사건에서 본문으로 장소를 유추한다.
 *
 * 대부분은 장소가 없는 게 맞다. 영화 출연·작곡·집필에는 찍을 지점이 없고, 억지로 촬영지를
 * 붙이면 그 인물의 이동 경로가 오히려 왜곡된다. 그래서 「없음」을 정답으로 인정하고,
 * 본문에 지명이 분명히 드러난 사건만 건진다.
 */
function inferPrompt(items: { id: string; title: string; desc: string }[]): string {
  return [
    `아래는 인물 연표 사건이다. 각 사건이 **특정 지점에서 일어났는지** 판정하고,`,
    `그렇다면 그 지점의 도시명과 좌표를 알려 달라. 활동 반경 지도에 쓰는 값이다.`,
    ``,
    `**대부분은 장소가 없는 것이 정답이다.** 다음은 지점이 없는 사건이니 city를 null,`,
    `confidence를 none으로 답하라.`,
    `- 영화·드라마 출연, 작곡, 집필, 음반 발표처럼 결과물이 만들어진 일`,
    `- 「~로 물러났다」, 「~을 정리했다」처럼 시점만 있고 장소가 없는 일`,
    `- 본문에 지명이 안 나오고 추측만 가능한 일`,
    ``,
    `반대로 본문에 지명이 분명히 드러난 사건은 그 도시의 좌표를 준다.`,
    `「세 번째로 왈라키아를 되찾다」처럼 지역이 본문에 있으면 그 중심 도시를 쓴다.`,
    `국가·주·대륙은 지점이 아니다. 촬영지·본사 주소를 상상해서 붙이지 마라.`,
    `확신이 없으면 none으로 두어라. 틀린 좌표 하나가 이동 경로 전체를 왜곡한다.`,
    ``,
    `사건 목록:`,
    ...items.map((it, i) => `${i + 1}. [${it.id}] ${it.title} — ${it.desc.slice(0, 90)}`),
    ``,
    `place 필드에는 대괄호 안의 id를 그대로 돌려줘라. note에 판단 근거를 한 줄로 적어라.`,
    `출력은 JSON 스키마를 따르는 places 배열 하나만.`,
  ].join('\n')
}

async function infer() {
  const batch = Number.parseInt(argOf('batch') ?? '15', 10)
  const lanes = Number.parseInt(argOf('lanes') ?? '6', 10)
  const max = argOf('max') ? Number.parseInt(argOf('max')!, 10) : Infinity

  const fiction = new Set<string>()
  for (let from = 0; ; from += 1000) {
    const { data } = await supabase.from('celebs').select('id').eq('celeb_tier', 'fiction').order('id').range(from, from + 999)
    for (const c of data ?? []) fiction.add(c.id)
    if (!data || data.length < 1000) break
  }
  const rows = await page<{ id: string; title: string; description: string | null; place_name: string | null; celeb_id: string }>(
    (q) => q.select('id,title,description,place_name,celeb_id').is('lat', null))
  const targets = rows
    .filter((r) => !fiction.has(r.celeb_id) && !(r.place_name ?? '').trim())
    .map((r) => ({ id: r.id, title: r.title, desc: r.description ?? '' }))
    .slice(0, max)

  const groups: typeof targets[] = []
  for (let i = 0; i < targets.length; i += batch) groups.push(targets.slice(i, i + batch))
  console.log(`장소명 없는 사건 ${targets.length}건을 ${groups.length}묶음으로 유추한다 (동시 ${lanes})`)

  const answers: Answer[] = []
  let done = 0
  const queue = [...groups]
  await Promise.all(Array.from({ length: Math.min(lanes, queue.length) }, async () => {
    for (;;) {
      const g = queue.shift()
      if (!g) return
      try {
        const res = await runGrok(inferPrompt(g))
        answers.push(...((res.structuredOutput?.places ?? []) as Answer[]))
      } catch (e) { console.log(`  묶음 실패: ${(e as Error).message.slice(0, 70)}`) }
      console.log(`  ${++done}/${groups.length} 묶음 완료 (누적 ${answers.length})`)
    }
  }))
  writeFileSync(OUT_INFER, JSON.stringify(answers, null, 1), 'utf8')
  const hit = answers.filter((a) => a.lat !== null && a.confidence === 'high')
  console.log(`\n응답 ${answers.length} / 장소 있음(high) ${hit.length} / 장소 없음 ${answers.filter((a) => a.lat === null).length}`)
  console.log(`→ ${OUT_INFER}`)
}

/** 유추 결과는 사건 id로 찍으므로 이름 단위 반영과 경로를 나눈다. */
async function applyInfer() {
  const dry = process.argv.includes('--dry')
  const answers = JSON.parse(readFileSync(OUT_INFER, 'utf8')) as Answer[]
  const use = answers.filter((a) =>
    a.lat !== null && a.lng !== null && a.confidence === 'high' &&
    Math.abs(a.lat) <= 90 && Math.abs(a.lng) <= 180 && !isCentroid(a.lat, a.lng))
  console.log(`${dry ? '[DRY] ' : ''}반영 대상 ${use.length}건 (응답 ${answers.length})`)
  for (const a of use.slice(0, 10)) console.log(`  ${a.city} ${a.lat},${a.lng} — ${a.note.slice(0, 60)}`)
  if (dry) return
  let n = 0
  for (const a of use) {
    const { error } = await supabase.from('celeb_timeline_events')
      .update({ lat: a.lat, lng: a.lng, place_name: a.city }).is('lat', null).eq('id', a.place)
    if (!error) n++
  }
  console.log(`좌표 반영 ${n}건`)
}

async function apply() {
  const dry = process.argv.includes('--dry')
  const answers = JSON.parse(readFileSync(OUT, 'utf8')) as Answer[]
  // high만 쓴다. medium에서 실제로 틀린 값이 나왔다 — 「퐁타벤」에 브르타뉴(47.86,-3.75)가
  // 아니라 파리 남쪽 좌표가 붙었다. 틀린 좌표 하나가 그 인물의 이동 경로 전체를 왜곡한다.
  const use = answers.filter((a) =>
    a.lat !== null && a.lng !== null &&
    a.confidence === 'high' &&
    Math.abs(a.lat) <= 90 && Math.abs(a.lng) <= 180 &&
    !isCentroid(a.lat, a.lng))
  console.log(`${dry ? '[DRY] ' : ''}반영 대상 ${use.length}개 (전체 응답 ${answers.length})`)
  for (const a of use.slice(0, 10)) console.log(`  ${a.place} → ${a.city} ${a.lat},${a.lng} [${a.confidence}] ${a.note.slice(0, 50)}`)
  if (dry) return

  let n = 0
  for (const a of use) {
    const { error, count } = await supabase.from('celeb_timeline_events')
      .update({ lat: a.lat, lng: a.lng }, { count: 'exact' })
      .is('lat', null).eq('place_name', a.place)
    if (error) { console.log(`실패 ${a.place}: ${error.message}`); continue }
    n += count ?? 0
  }
  console.log(`좌표 반영 ${n}건`)
}

const cmd = process.argv[2]
const run = cmd === 'ask' ? ask : cmd === 'apply' ? apply : cmd === 'infer' ? infer : cmd === 'apply-infer' ? applyInfer : null
if (!run) { console.error('사용법: ask|infer [--batch N] [--lanes N] [--max N] | apply|apply-infer [--dry]'); process.exit(1) }
run().catch((e) => { console.error(e); process.exit(1) })
