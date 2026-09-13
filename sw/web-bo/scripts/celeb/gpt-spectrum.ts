/**
 * `celeb_persona` 가 없는 실존 축 인물(REAL·BOTH)의 스펙트럼 16축을 codex(GPT)로 채점한다.
 * 생성만 하고 DB는 건드리지 않는다. 반영은 scripts/celeb/fill.ts 가 하며 근거문 중복 게이트를 거친다.
 *
 * 프롬프트는 정본 상수에서 조립한다. 축 정의·기준점·무력 등급·성향 부호·채점 원칙을 문서에
 * 복제하지 않고 `packages/shared/src/constants/celeb-spectrum-scale.ts` 에서 직접 읽는다.
 *
 * FICTION 은 대상이 아니다(celeb-03-02-spectrum.md).
 * 재실행 안전: 이미 행이 있거나 이미 만들어 둔 인물은 건너뛴다.
 *
 * 실행 (sw/web-bo 에서):
 *   pnpm exec tsx scripts/celeb/gpt-spectrum.ts --list
 *   pnpm exec tsx scripts/celeb/gpt-spectrum.ts --chunk 3 --conc 2
 * 모델은 astra 다. 16축 채점과 기준점 상대 비교가 주력이라 추론 능력이 결과를 가른다.
 */

import path from 'node:path'
import fs from 'node:fs'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import {
  SPECTRUM_GROUPS,
  SPECTRUM_AXES,
  AXIS_LABELS,
  AXIS_DEFINITIONS,
  DISPOSITION_KEYS,
  DISPOSITION_POLES,
  DISPOSITION_SIGN_CHECK,
  SPECTRUM_ANCHORS,
  MARTIAL_GRADES,
  MARTIAL_FLOOR_RULE,
  FEMALE_MARTIAL_ADJUSTMENT_RULE,
  SCORING_PRINCIPLES,
  axisRange,
} from '@feelandnote/shared/constants/celeb-spectrum-scale'
import { codexCall, looksRateLimited } from '../../../../.agents/skills/codex-gpt/scripts/codex-call.mjs'

config({ path: path.resolve(process.cwd(), '.env'), quiet: true })
const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL!, process.env.DB_SECRET_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const OUT_DIR = path.resolve(process.cwd(), '../../data/celeb/gap-fill/spectrum')
const arg = (f: string, d?: string) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : d }
const CHUNK = Number(arg('--chunk', '3'))
const CONC = Number(arg('--conc', '2'))
const LIST_ONLY = process.argv.includes('--list')

const DISP = DISPOSITION_KEYS as readonly string[]

/** 축 규격 블록 — 정의·범위·기준점을 코드에서 뽑아 쓴다 */
function axisSpec(): string {
  const out: string[] = []
  for (const [group, axes] of Object.entries(SPECTRUM_GROUPS)) {
    out.push(`### ${group}`)
    for (const axis of axes as readonly string[]) {
      const { min, max } = axisRange(axis as any)
      const anchors = (SPECTRUM_ANCHORS as any)[axis] ?? []
      const anchorText = anchors.slice(0, 6).map((a: any) => `${a.score} ${a.nickname}${a.note ? `(${a.note})` : ''}`).join(' · ')
      const pole = DISP.includes(axis) ? ` / 양극: ${(DISPOSITION_POLES as any)[axis].minus} ↔ ${(DISPOSITION_POLES as any)[axis].plus}` : ''
      out.push(`- **${axis}** ${(AXIS_LABELS as any)[axis]} (${min}~${max})${pole}`)
      out.push(`  정의: ${(AXIS_DEFINITIONS as any)[axis]}`)
      if (anchorText) out.push(`  기준점: ${anchorText}`)
    }
  }
  return out.join('\n')
}

function martialSpec(): string {
  const grades = MARTIAL_GRADES.map((g) => `${g.min}~${g.max} ${g.name} — ${g.criterion}`).join('\n  ')
  return `무력(martial)만 등급제를 쓴다.\n  ${grades}\n\n${MARTIAL_FLOOR_RULE}\n\n${FEMALE_MARTIAL_ADJUSTMENT_RULE}`
}

function buildPrompt(rows: any[]): string {
  const people = rows.map((r, i) => [
    `### ${i + 1}. ${r.nickname} (${r.slug})`,
    `실존 축: ${r.celeb_reality} / 직군: ${r.profession} / 성별: ${r.gender === true ? '남' : r.gender === false ? '여' : '미상'} / 국적: ${r.nationality ?? '없음'} / 생몰: ${r.birth_date ?? '?'}${r.death_date ? `~${r.death_date}` : ''}`,
    `수식어: ${r.title}`,
    `한 줄 정의: ${r.headline}`,
    `소개: ${r.bio}`,
  ].join('\n')).join('\n\n')

  return [
    `너는 인물 스펙트럼 채점자다. 아래 ${rows.length}명을 16축으로 채점하고 축마다 근거를 쓴다.`,
    '',
    '점수는 행적에서 나온다. 명성이나 흥행력은 통솔이 아니고 유명세는 지력이 아니다. 그 축이 재는 능력으로 환산할 수 있는 행적만 쓴다.',
    '',
    '## 16축 규격',
    '',
    axisSpec(),
    '',
    '## 무력 등급',
    '',
    martialSpec(),
    '',
    '## 성향 부호',
    '',
    DISPOSITION_SIGN_CHECK,
    '',
    '## 채점 원칙',
    '',
    SCORING_PRINCIPLES.map((p) => `- ${p}`).join('\n'),
    '',
    '## 근거 문장',
    '',
    '- reason_ko 는 점수를 설명하는 구체적 행적 한 문장이다. 40자 이내로 쓴다.',
    '- 고점이든 저점이든 근거를 쓴다. 「용감한 인물」, 「높은 지력」처럼 점수를 되풀이하는 말은 근거가 아니다.',
    '- **같은 문장을 다른 축이나 다른 인물에 재사용하지 않는다.** 같은 문장이 다른 점수에 붙으면 어느 점수도 설명하지 못한다. 반영 단계에서 중복 근거문은 기계 검사에 걸려 폐기된다.',
    '- 확인하지 못한 사실을 만들지 않는다. 근거가 없는 축은 무엇이 확인되지 않았는지 적는다.',
    '- **「확인되지 않는다·기록이 없다·남아 있지 않다」류로 쓴 축은 점수를 반드시 48~52 사이에 둔다.** 근거가 없다는 것은 깎을 이유도 올릴 이유도 없다는 뜻이다. 특히 fairness·benevolence·temperance·reflection·humility 다섯 축이 이 검사에 걸린다. 47이나 53도 실패다.',
    '- reason_en 은 한국어를 직역하지 않고 같은 근거를 영어로 다시 쓴다.',
    '- 큰따옴표를 쓰지 않는다.',
    '',
    '## 종합 해설',
    '',
    '**persona 객체의 최상위에 rationale_ko 와 rationale_en 을 반드시 넣는다.** 네 그룹 옆에 나란히 두는 필드이며, 이것이 빠진 인물은 폐기된다.',
    'rationale_ko 는 그 인물의 16축이 전체로 무엇을 말하는지 2~3문장으로 쓴다. rationale_en 은 그 영어판이다.',
    '',
    '## 출력 형식',
    '',
    '설명·머리말·코드펜스 없이 JSON 배열만 출력한다.',
    '',
    '[{"slug":"...","persona":{"abilities":{"command":{"score":55,"reason_ko":"...","reason_en":"..."},"martial":{...},"intellect":{...},"charm":{...}},"inner_virtues":{"temperance":{...},"diligence":{...},"reflection":{...},"courage":{...}},"outer_virtues":{"loyalty":{...},"benevolence":{...},"fairness":{...},"humility":{...}},"dispositions":{"pessimism_optimism":{...},"conservative_progressive":{...},"individual_social":{...},"cautious_bold":{...}},"rationale_ko":"...","rationale_en":"..."}}]',
    '',
    `16축 전부에 score·reason_ko·reason_en 을 넣고, persona 최상위에 rationale_ko·rationale_en 을 넣는다. ${rows.length}명 전원에 대해 원소를 하나씩 낸다.`,
    '',
    '## 대상 인물',
    '',
    people,
  ].join('\n')
}

function validate(text: string, rows: any[]) {
  const issues: string[] = []
  let parsed: any
  const body = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  try { parsed = JSON.parse(body) } catch (e: any) { return { ok: [], issues: [`JSON 파싱 실패: ${e.message}`] } }
  if (!Array.isArray(parsed)) return { ok: [], issues: ['배열이 아니다'] }

  const wanted = new Map(rows.map((r) => [r.slug, r]))
  const ok: any[] = []
  for (const it of parsed) {
    if (!wanted.has(it.slug)) { issues.push(`모르는 slug: ${it.slug}`); continue }
    const p = it.persona
    if (!p || typeof p !== 'object') { issues.push(`${it.slug}: persona 없음`); continue }
    const bad: string[] = []
    const seen = new Set<string>()
    for (const [group, axes] of Object.entries(SPECTRUM_GROUPS)) {
      const g = p[group]
      if (!g) { bad.push(`${group} 없음`); continue }
      for (const axis of axes as readonly string[]) {
        const cell = g[axis]
        if (!cell) { bad.push(`${axis} 없음`); continue }
        const { min, max } = axisRange(axis as any)
        if (!Number.isInteger(cell.score) || cell.score < min || cell.score > max) bad.push(`${axis}=${cell.score}`)
        if (!cell.reason_ko?.trim()) bad.push(`${axis} 근거 없음`)
        if (!cell.reason_en?.trim()) bad.push(`${axis} 영문 근거 없음`)
        if (cell.reason_ko) {
          const key = cell.reason_ko.trim()
          if (seen.has(key)) bad.push(`${axis} 근거가 같은 인물 안에서 중복`)
          seen.add(key)
          for (const k of ['reason_ko', 'reason_en']) cell[k] = String(cell[k]).replace(/[‘’]/g, "'").replace(/[“”"]/g, "'").trim()
        }
      }
    }
    if (!p.rationale_ko?.trim()) bad.push('rationale_ko 없음')
    if (!p.rationale_en?.trim()) bad.push('rationale_en 없음')
    if (bad.length) { issues.push(`${it.slug}: ${bad.slice(0, 6).join(', ')}`); continue }
    ok.push({ slug: it.slug, spectrum: p })
  }
  const missing = rows.filter((r) => !ok.some((o) => o.slug === r.slug)).map((r) => r.slug)
  if (missing.length) issues.push(`누락: ${missing.join(', ')}`)
  return { ok, issues }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })

  const all: any[] = []
  for (let f = 0; ; f += 1000) {
    const { data, error } = await db.from('celebs')
      .select('id,slug,nickname,celeb_reality,profession,gender,title,headline,bio,nationality,birth_date,death_date')
      .neq('celeb_reality', 'FICTION').order('slug').range(f, f + 999)
    if (error) throw new Error(error.message)
    all.push(...(data ?? []))
    if ((data ?? []).length < 1000) break
  }

  const has = new Set<string>()
  for (let f = 0; ; f += 1000) {
    const { data } = await db.from('celeb_persona').select('celeb_id').range(f, f + 999)
    for (const r of data ?? []) has.add((r as any).celeb_id)
    if ((data ?? []).length < 1000) break
  }

  const generated = new Set<string>()
  for (const f of fs.readdirSync(OUT_DIR)) {
    if (!f.endsWith('.json')) continue
    try { for (const it of JSON.parse(fs.readFileSync(path.join(OUT_DIR, f), 'utf8'))) generated.add(it.slug) } catch { /* 무시 */ }
  }

  const todo = all.filter((c) => !has.has(c.id) && !generated.has(c.slug))
  console.log(`스펙트럼 결손 ${todo.length}명 (묶음 ${CHUNK}, 동시 ${CONC}) · 축 ${SPECTRUM_AXES.length}개`)
  if (LIST_ONLY || !todo.length) return

  const jobs: any[] = []
  for (let i = 0; i < todo.length; i += CHUNK) {
    const slice = todo.slice(i, i + CHUNK)
    jobs.push({ rows: slice, file: path.join(OUT_DIR, `${slice[0].slug}.json`) })
  }

  let done = 0, failed = 0, rate = 0
  for (let i = 0; i < jobs.length; i += CONC) {
    await Promise.all(jobs.slice(i, i + CONC).map(async (job: any) => {
      const label = job.rows.map((r: any) => r.nickname).join('·')
      try {
        const text = await codexCall(buildPrompt(job.rows), { model: 'gpt-6-astra', effort: 'xhigh', timeoutMs: 600000 })
        const { ok, issues } = validate(text, job.rows)
        if (!ok.length) { failed++; console.log(`FAIL ${label}\n     ${issues.join(' | ')}`); return }
        fs.writeFileSync(job.file, JSON.stringify(ok, null, 2) + '\n', 'utf8')
        done += ok.length
        console.log(`OK   ${label} → ${ok.length}명${issues.length ? ` (걸림: ${issues.join(' | ')})` : ''}`)
      } catch (e: any) {
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
