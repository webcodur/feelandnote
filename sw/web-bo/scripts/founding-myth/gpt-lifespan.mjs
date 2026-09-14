/**
 * 건국신화 배치 인물의 birth_date / death_date 를 codex(GPT)로 정한다. 생성만 하고 DB는 건드리지 않는다.
 *
 * 생몰은 다른 필드와 달리 인물 하나만 보고 정할 수 없다. 부모가 자녀보다 늦게 태어나거나
 * 형제 연도가 갈리면 안 되므로, 한 전승의 인물 전원을 한 번에 주고 세대 관계를 맞춰 정하게 한다.
 * (`docs/project/celeb/celeb-01-01-profile-facts.md` 「생년 결손 조사와 추정」 4·5항)
 *
 * fiction 은 실제 생일이 아니라 창작 배경 연도다. 비우지 않는다.
 *
 * 재실행 안전: 이미 birth_date 가 있거나 이미 생성해 둔 인물은 건너뛴다.
 *
 * 실행 (sw/web-bo 에서):
 *   node scripts/founding-myth/gpt-lifespan.mjs --list
 *   node scripts/founding-myth/gpt-lifespan.mjs --tradition "한국 신화"
 *   node scripts/founding-myth/gpt-lifespan.mjs --conc 2
 * 모델은 astra 다. 세대 관계를 맞춰 연대를 배치하는 추론이 주력이다.
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

const BATCH_FROM = '2026-09-04T22:00:00'
const OUT_DIR = path.resolve(process.cwd(), '../../data/celeb/founding-myth/gpt-lifespan')

const arg = (f, d) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : d }
const CONC = Number(arg('--conc', 2))
const ONLY = arg('--tradition', null)
const LIST_ONLY = process.argv.includes('--list')

function buildPrompt(rows, tradition) {
  const people = rows.map((r, i) => [
    `### ${i + 1}. ${r.nickname} (${r.slug})`,
    `실존 축: ${r.celeb_reality}`,
    `한 줄 정의: ${r.headline}`,
    `소개: ${r.bio}`,
    r.birth_date ? `※ 생년 이미 확정: ${r.birth_date}${r.death_date ? ` / 몰년 ${r.death_date}` : ''} — 고치지 말고 다른 인물의 기준으로만 쓴다` : null,
  ].filter(Boolean).join('\n')).join('\n\n')

  return `너는 세계 건국신화 인물 데이터베이스의 연대 담당자다. 전승 「${tradition}」의 인물 ${rows.length}명에게 birth_date 와 death_date 를 매긴다.

## 이 값이 무엇인가

이 서비스는 인물 정렬·동시대 인물·연대기 화면에서 생몰을 쓴다. 그래서 **실존 여부와 무관하게 모든 인물에게 대표 연도를 정한다.** 전승 인물의 생몰은 실제 생일이 아니라 **그 전승이 놓인 배경 연도**다. 「신화라서 알 수 없다」는 이유로 비우지 않는다.

## 정하는 방법

1. **전승 안에 연대가 박힌 기준점을 먼저 잡는다.** 문헌이 적은 재위 연도, 왕조의 시작 연도, 고고학·학계가 보는 시기가 그것이다. 그 기준점에서 세대를 세어 나머지를 배치한다.
2. **세대 간격은 25~30년으로 잡는다.** 부모와 자녀, 조부와 손자의 연도가 이 간격으로 벌어져야 한다.
3. **관계와 충돌하면 안 된다.** 부모가 자녀보다 늦게 태어나거나, 형제·쌍둥이의 연도가 크게 갈리거나, 신하가 섬긴 왕보다 먼저 죽은 것으로 나오면 틀린 값이다. 아래 명단 전체를 함께 보고 서로 어긋나지 않게 배치한다.
4. **문헌이 실제 연도를 적은 인물은 그것을 그대로 쓴다.** 삼국사기·사기·연대기가 적은 재위·생몰 연도가 있으면 추정보다 우선한다.
5. **연도만 쓴다.** 월·일을 지어내지 않는다. 기원전은 음수로 쓴다(예: 기원전 69년 → "-69").
6. **몰년은 근거가 있을 때만 넣는다.** 문헌이 재위 기간이나 수명을 적었거나, 후계자의 즉위 연도로 역산되는 경우다. 근거 없이 생년에 수명을 더해 만들지 않는다. 몰년을 모르면 death_date 키를 넣지 않는다.
7. **원초적 창조신·초시간적 존재는 예외다.** 세상이 생기기 전에 있었다고 전하는 존재는 연도를 매길 기준이 없다. 그런 인물은 birth_date 키도 넣지 않고, 대신 skip 에 사유를 적는다.

「※ 생년 이미 확정」이 붙은 인물은 그 값을 고치지 않는다. 다른 인물의 연도를 세는 기준으로만 쓰고, 출력에 포함하지 않는다.

## 출력 형식

설명·머리말·코드펜스 없이 **JSON 배열만** 출력한다.

[{"slug":"...","birth_date":"-69","death_date":"4","basis":"삼국사기가 적은 재위 기간"},{"slug":"...","birth_date":"-2333","basis":"단군 즉위 기준에서 한 세대 위"},{"slug":"...","skip":"세상이 생기기 전의 창조신이라 기준점이 없다"}]

- basis 는 그 연도를 어떻게 정했는지 한국어 한 문장이다. 반드시 넣는다.
- 연도를 매긴 인물은 birth_date 를 반드시 넣는다. death_date 와 skip 은 해당할 때만 넣는다.
- 「※ 생년 이미 확정」인 인물을 뺀 나머지 전원에 대해 원소를 하나씩 낸다.

## 대상 인물

${people}`
}

function validate(text, rows) {
  const issues = []
  let parsed
  const body = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  try { parsed = JSON.parse(body) } catch (e) { return { ok: [], issues: [`JSON 파싱 실패: ${e.message}`] } }
  if (!Array.isArray(parsed)) return { ok: [], issues: ['배열이 아니다'] }

  const wanted = new Map(rows.filter((r) => !r.birth_date).map((r) => [r.slug, r]))
  const year = (v) => /^-?\d{1,5}$/.test(String(v)) ? Number(v) : null
  const ok = []
  for (const it of parsed) {
    if (!wanted.has(it.slug)) { issues.push(`모르는 slug: ${it.slug}`); continue }
    if (it.skip) { issues.push(`SKIP ${it.slug}: ${it.skip}`); continue }
    const b = year(it.birth_date)
    if (b === null) { issues.push(`${it.slug}: birth_date 가 연도가 아니다 (${it.birth_date})`); continue }
    const out = { slug: it.slug, celeb: { birth_date: String(b) }, basis: it.basis ?? '' }
    if (it.death_date !== undefined && it.death_date !== null && it.death_date !== '') {
      const d = year(it.death_date)
      if (d === null) issues.push(`${it.slug}: death_date 가 연도가 아니라 버린다 (${it.death_date})`)
      else if (d < b) issues.push(`${it.slug}: 몰년(${d})이 생년(${b})보다 앞서 버린다`)
      else out.celeb.death_date = String(d)
    }
    if (!out.basis) issues.push(`${it.slug}: basis 없음`)
    ok.push(out)
  }
  const missing = [...wanted.keys()].filter((s) => !ok.some((o) => o.slug === s) && !parsed.some((p) => p.slug === s && p.skip))
  if (missing.length) issues.push(`누락: ${missing.join(', ')}`)
  return { ok, issues }
}

async function main() {

  fs.mkdirSync(OUT_DIR, { recursive: true })

  const { data, error } = await db
    .from('celebs')
    .select('id,slug,nickname,celeb_reality,headline,bio,birth_date,death_date')
    .gte('created_at', BATCH_FROM)
    .order('nickname')
    .limit(600)
  if (error) throw new Error(error.message)

  const ids = data.map((c) => c.id)
  const assigns = []
  for (let i = 0; i < ids.length; i += 100) {
    const { data: a } = await db.from('celeb_tag_assignments').select('celeb_id,tag_id').in('celeb_id', ids.slice(i, i + 100))
    assigns.push(...(a ?? []))
  }
  const { data: tags } = await db.from('celeb_tags').select('id,name')
  const tagName = new Map(tags.map((t) => [t.id, t.name]))
  const tradOf = new Map(assigns.map((a) => [a.celeb_id, tagName.get(a.tag_id) ?? '(배정없음)']))

  const generated = new Set()
  for (const f of fs.readdirSync(OUT_DIR)) {
    if (!f.endsWith('.json')) continue
    try { for (const it of JSON.parse(fs.readFileSync(path.join(OUT_DIR, f), 'utf8'))) generated.add(it.slug) } catch { /* 무시 */ }
  }

  const byTrad = new Map()
  for (const c of data) {
    const t = tradOf.get(c.id) ?? '(배정없음)'
    if (ONLY && t !== ONLY) continue
    if (!byTrad.has(t)) byTrad.set(t, [])
    byTrad.get(t).push({ ...c, tradition: t })
  }

  const jobs = []
  let todoCount = 0
  for (const [trad, rows] of byTrad) {
    const todo = rows.filter((r) => !r.birth_date && !generated.has(r.slug))
    if (!todo.length) continue
    todoCount += todo.length
    // 이미 연도가 있는 인물도 함께 보여 세대 기준으로 쓰게 한다
    const context = rows.filter((r) => r.birth_date)
    const file = path.join(OUT_DIR, `${trad.replace(/[\\/:*?"<>|·()]/g, '-')}.json`)
    jobs.push({ trad, rows: [...todo, ...context], todo: todo.length, file })
  }

  console.log(`생몰 결손 ${todoCount}명 / 전승 ${jobs.length}개`)
  for (const j of jobs) console.log(`  ${String(j.todo).padStart(3)}  ${j.trad}${j.rows.length > j.todo ? ` (기준 인물 ${j.rows.length - j.todo}명 동봉)` : ''}`)
  if (LIST_ONLY || !jobs.length) return

  let done = 0, failed = 0, rate = 0
  for (let i = 0; i < jobs.length; i += CONC) {
    await Promise.all(jobs.slice(i, i + CONC).map(async (job) => {
      try {
        const text = await codexCall(buildPrompt(job.rows, job.trad), { model: 'gpt-6-astra', effort: 'xhigh', timeoutMs: 420000 })
        const { ok, issues } = validate(text, job.rows)
        if (!ok.length) { failed++; console.log(`FAIL ${job.trad}\n     ${issues.join(' | ')}`); return }
        fs.writeFileSync(job.file, JSON.stringify(ok, null, 2) + '\n', 'utf8')
        done += ok.length
        console.log(`OK   ${job.trad} → ${ok.length}/${job.todo}명${issues.length ? `\n     ${issues.join(' | ')}` : ''}`)
      } catch (e) {
        failed++
        if (looksRateLimited(e.message)) { rate++; console.log(`RATE ${job.trad} — ${e.message.slice(0, 200)}`) }
        else console.log(`ERR  ${job.trad} — ${e.message.slice(0, 300)}`)
      }
    }))
  }
  console.log(`\n생성 ${done}명 / 실패 ${failed}개${rate ? ` (rate limit 의심 ${rate})` : ''}`)
  console.log(`출력: ${OUT_DIR}`)
}

main()
