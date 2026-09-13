/**
 * `celeb_influence` 가 없는 실존 축 인물(REAL·BOTH)의 영향력 일곱 축을 codex(GPT)로 평가한다.
 * 생성만 하고 DB는 건드리지 않는다. 반영은 scripts/celeb/fill.ts 가 한다.
 *
 * 규격 정본
 *   - 축·상한·랭크: packages/influence-constants/src/core.ts
 *   - 점수 기준·인과 단계: packages/ai-services/src/prompts/influence-rulebook.ts
 *   - 판정 규칙: docs/project/celeb/celeb-03-01-influence.md
 *
 * FICTION 은 대상이 아니다(룰북이 celeb_influence 행을 만들지 말라고 정한다).
 * 재실행 안전: 이미 행이 있거나 이미 만들어 둔 인물은 건너뛴다.
 *
 * 실행 (sw/web-bo 에서):
 *   node scripts/celeb/gpt-influence.mjs --list
 *   node scripts/celeb/gpt-influence.mjs --chunk 5 --conc 3
 * 모델은 astra 다. 일곱 축 채점과 인과 판정이 주력이라 추론 능력이 결과를 가른다.
 */

import path from 'node:path'
import fs from 'node:fs'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { codexCall, looksRateLimited } from '../../../../.agents/skills/codex-gpt/scripts/codex-call.mjs'

config({ path: path.resolve(process.cwd(), '.env'), quiet: true })
const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL, process.env.DB_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const OUT_DIR = path.resolve(process.cwd(), '../../data/celeb/gap-fill/influence')
const arg = (f, d) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : d }
const CHUNK = Number(arg('--chunk', 5))
const CONC = Number(arg('--conc', 3))
const LIST_ONLY = process.argv.includes('--list')

const AXES = ['political', 'strategic', 'tech', 'social', 'economic', 'cultural']
const ALL = [...AXES, 'transhistoricity']

function buildPrompt(rows) {
  const people = rows.map((r, i) => [
    `### ${i + 1}. ${r.nickname} (${r.slug})`,
    `실존 축: ${r.celeb_reality} / 국적: ${r.nationality ?? '없음'} / 생몰: ${r.birth_date ?? '?'}${r.death_date ? `~${r.death_date}` : ''}`,
    `수식어: ${r.title}`,
    `한 줄 정의: ${r.headline}`,
    `소개: ${r.bio}`,
  ].join('\n')).join('\n\n')

  return `너는 인물 영향력 평가자다. 아래 ${rows.length}명의 영향력을 일곱 축으로 채점하고 근거를 쓴다.

평가하는 것은 **명성이 아니라 그 사람이 직접 만들었거나 구조적으로 가능하게 한 변화**다. 동시대에 유명했다는 사실, 후대에 이름이 알려졌다는 사실만으로 점수를 올리지 않는다.

## 인과 기여의 단계

- **직접 기여**: 본인이 직접 창안·실행·구축했다. 최고 점수가 가능하다.
- **구조적 기여**: 그 분야가 발전할 필수 조건·토대를 제공했다. 중상위 점수다.
- **촉매적 기여**: 발전을 촉진하는 환경·동기·자원을 만들었다. 중간 점수다.

## 여섯 축 (각 0~10점)

political 정치·외교 / strategic 전략·군사 / tech 기술·과학 / social 사회·제도 / economic 경제 / cultural 문화·예술

| 점수 | 기준 |
|---|---|
| 9-10 | 글로벌 규모에서 직접 또는 구조적으로 패러다임을 바꿨다 |
| 7-8 | 글로벌·주요 권역에서 핵심 체계를 세웠거나 필수 토대를 놓았다 |
| 5-6 | 국가·지역·분야 단위로 실질적 영향을 냈거나 촉매로 주요 변화를 일으켰다 |
| 3-4 | 부분적으로 기여했거나 간접적 촉매였다 |
| 1-2 | 영향이 미미하다 |
| 0 | 관련이 없다 |

## 시대초월성 transhistoricity (0~40점)

이미 제도·원리·문화 체계로 정착해 장기 지속하는 영향만 인정한다. 아직 검증되지 않은 미래 가능성은 근거가 아니다.

| 점수 | 기준 | 예시 |
|---|---|---|
| 35-40 | 인류 문명의 근본 토대 | 예수, 붓다, 공자 |
| 28-34 | 문명 패러다임 전환이 구조적 토대로 정착 | 뉴턴, 다윈 |
| 20-27 | 특정 분야의 근본 토대로 장기 지속 | 칸트, 마르크스 |
| 10-19 | 근현대에 큰 영향, 일부 구조적 기여 | 처칠, 간디 |
| 5-9 | 영향력은 있으나 장기 지속성이 불확실 | 스티브 잡스 |
| 0-4 | 동시대에만 영향 | 대부분의 현대 유명인 |

## BOTH 인물을 채점하는 법

celeb_reality가 BOTH인 인물은 사료가 뒷받침하는 층과 전승층을 갈라서 센다.

- **political·strategic·tech·social·economic 다섯 축은 사료가 뒷받침하는 행적에서만 센다.** 확인되지 않은 치적을 그 사람의 기여로 세지 않는다.
- **cultural 과 transhistoricity 는 전승 자체가 후대에 남긴 자취를 셀 수 있다.** 다만 그것이 인물이 한 일이 아니라 그를 둘러싼 서사가 퍼진 결과임을 근거 문장에 밝힌다.
- **사료층이 얇으면 앞의 다섯 축을 낮게 두고 그 얇음을 근거에 적는다.** 전승의 크기로 앞 축을 채우지 않는다.

건국 시조·전승 인물은 대개 이 경우다. 나라를 세웠다는 전승만으로 political 을 높게 주지 않는다. 그 나라가 실재했고 그 사람의 행적이 사료로 확인되는 만큼만 센다.

## 근거 문장

- **한국어 30자 이내 한 문장.** 길게 쓰지 않는다.
- 각 축에 그 점수를 준 이유가 드러나야 한다. 0점이어도 왜 관련이 없는지 한 문장으로 적는다.
- **다른 인물의 문장을 재활용하지 않는다.** 같은 사건을 여러 축에 쓰더라도 축마다 인과를 따로 적는다.
- 영어는 한국어를 직역하지 않고 같은 근거를 영어로 간결하게 다시 쓴다.
- 큰따옴표를 쓰지 않는다.

## 출력 형식

설명·머리말·코드펜스 없이 JSON 배열만 출력한다.

[{"slug":"...","influence":{"political":4,"political_exp":"...","political_exp_en":"...","strategic":2,"strategic_exp":"...","strategic_exp_en":"...","tech":0,"tech_exp":"...","tech_exp_en":"...","social":3,"social_exp":"...","social_exp_en":"...","economic":1,"economic_exp":"...","economic_exp_en":"...","cultural":5,"cultural_exp":"...","cultural_exp_en":"...","transhistoricity":8,"transhistoricity_exp":"...","transhistoricity_exp_en":"..."}}]

일곱 축 전부에 점수와 한국어·영어 근거를 넣는다. ${rows.length}명 전원에 대해 원소를 하나씩 낸다.

## 대상 인물

${people}`
}

function validate(text, rows) {
  const issues = []
  let parsed
  const body = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  try { parsed = JSON.parse(body) } catch (e) { return { ok: [], issues: [`JSON 파싱 실패: ${e.message}`] } }
  if (!Array.isArray(parsed)) return { ok: [], issues: ['배열이 아니다'] }

  const wanted = new Map(rows.map((r) => [r.slug, r]))
  const ok = []
  for (const it of parsed) {
    if (!wanted.has(it.slug)) { issues.push(`모르는 slug: ${it.slug}`); continue }
    const inf = it.influence
    if (!inf || typeof inf !== 'object') { issues.push(`${it.slug}: influence 없음`); continue }
    const bad = []
    for (const a of ALL) {
      const max = a === 'transhistoricity' ? 40 : 10
      const v = inf[a]
      if (!Number.isInteger(v) || v < 0 || v > max) bad.push(`${a}=${v}`)
      if (!inf[`${a}_exp`] || !String(inf[`${a}_exp`]).trim()) bad.push(`${a}_exp 없음`)
      if (!inf[`${a}_exp_en`] || !String(inf[`${a}_exp_en`]).trim()) bad.push(`${a}_exp_en 없음`)
    }
    if (bad.length) { issues.push(`${it.slug}: ${bad.join(', ')}`); continue }
    for (const k of Object.keys(inf)) if (typeof inf[k] === 'string') inf[k] = inf[k].replace(/[‘’]/g, "'").replace(/[“”"]/g, "'").trim()
    const long = ALL.filter((a) => [...inf[`${a}_exp`]].length > 40)
    if (long.length) issues.push(`${it.slug}: 근거 40자 초과 ${long.join(',')}`)
    ok.push({ slug: it.slug, influence: inf })
  }
  const missing = rows.filter((r) => !ok.some((o) => o.slug === r.slug)).map((r) => r.slug)
  if (missing.length) issues.push(`누락: ${missing.join(', ')}`)
  return { ok, issues }
}

async function main() {

  fs.mkdirSync(OUT_DIR, { recursive: true })

  const all = []
  for (let f = 0; ; f += 1000) {
    const { data, error } = await db.from('celebs')
      .select('id,slug,nickname,celeb_reality,celeb_tier,title,headline,bio,nationality,birth_date,death_date')
      .neq('celeb_reality', 'FICTION').order('slug').range(f, f + 999)
    if (error) throw new Error(error.message)
    all.push(...data)
    if (data.length < 1000) break
  }

  const has = new Set()
  for (let f = 0; ; f += 1000) {
    const { data } = await db.from('celeb_influence').select('celeb_id').range(f, f + 999)
    for (const r of data ?? []) has.add(r.celeb_id)
    if ((data ?? []).length < 1000) break
  }

  const generated = new Set()
  for (const f of fs.readdirSync(OUT_DIR)) {
    if (!f.endsWith('.json')) continue
    try { for (const it of JSON.parse(fs.readFileSync(path.join(OUT_DIR, f), 'utf8'))) generated.add(it.slug) } catch { /* 무시 */ }
  }

  const todo = all.filter((c) => !has.has(c.id) && !generated.has(c.slug))
  console.log(`영향력 결손 ${todo.length}명 (묶음 ${CHUNK}, 동시 ${CONC})`)
  const byR = new Map()
  for (const c of todo) byR.set(c.celeb_reality, (byR.get(c.celeb_reality) ?? 0) + 1)
  console.log('  ' + [...byR].map(([k, v]) => `${k} ${v}`).join(', '))
  if (LIST_ONLY || !todo.length) return

  const jobs = []
  for (let i = 0; i < todo.length; i += CHUNK) {
    const slice = todo.slice(i, i + CHUNK)
    jobs.push({ rows: slice, file: path.join(OUT_DIR, `${slice[0].slug}.json`) })
  }

  let done = 0, failed = 0, rate = 0
  for (let i = 0; i < jobs.length; i += CONC) {
    await Promise.all(jobs.slice(i, i + CONC).map(async (job) => {
      const label = job.rows.map((r) => r.nickname).join('·')
      try {
        const text = await codexCall(buildPrompt(job.rows), { model: 'gpt-6-astra', effort: 'xhigh', timeoutMs: 480000 })
        const { ok, issues } = validate(text, job.rows)
        if (!ok.length) { failed++; console.log(`FAIL ${label}\n     ${issues.join(' | ')}`); return }
        fs.writeFileSync(job.file, JSON.stringify(ok, null, 2) + '\n', 'utf8')
        done += ok.length
        console.log(`OK   ${label} → ${ok.length}명${issues.length ? ` (걸림: ${issues.join(' | ')})` : ''}`)
      } catch (e) {
        failed++
        if (looksRateLimited(e.message)) { rate++; console.log(`RATE ${label} — ${e.message.slice(0, 200)}`) }
        else console.log(`ERR  ${label} — ${e.message.slice(0, 250)}`)
      }
    }))
  }
  console.log(`\n생성 ${done}명 / 실패 묶음 ${failed}${rate ? ` (rate limit 의심 ${rate})` : ''}`)
  console.log(`출력: ${OUT_DIR}`)
}

main()
