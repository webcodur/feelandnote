/**
 * 셀럽 결손 필드를 codex(GPT)로 채운다. 생성만 하고 DB는 건드리지 않는다.
 * 건국신화 배치 전용인 `founding-myth/gpt-fill.mjs` 와 달리 등록 시기를 가리지 않는다.
 *
 * 모드
 *   --field bio_en      한국어 bio 를 영어로 다시 쓴다(직역 아님)
 *   --field birth_date  생몰 대표 연도를 정한다. 실존 인물은 문헌 연대, 허구는 작품 배경 연도
 *
 * 재실행 안전: 이미 값이 있거나 이미 만들어 둔 인물은 건너뛴다.
 *
 * 실행 (sw/web-bo 에서):
 *   node scripts/celeb/gpt-gap-fill.mjs --field bio_en --list
 *   node scripts/celeb/gpt-gap-fill.mjs --field bio_en --chunk 8 --conc 3
 * bio_en 은 영문 산문이라 sol 로 부른다. birth_date 도 같은 스크립트를 쓰지만 분량이 짧아 그대로 둔다.
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

const arg = (f, d) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : d }
const FIELD = arg('--field', null)
const CHUNK = Number(arg('--chunk', 8))
const CONC = Number(arg('--conc', 3))
const LIST_ONLY = process.argv.includes('--list')
if (!['bio_en', 'birth_date'].includes(FIELD)) throw new Error('--field 는 bio_en 또는 birth_date')

const OUT_DIR = path.resolve(process.cwd(), `../../data/celeb/gap-fill/${FIELD}`)

function promptBioEn(rows) {
  const people = rows.map((r, i) => `### ${i + 1}. ${r.nickname} (${r.slug})\n영문 이름: ${r.nickname_en}\n실존 축: ${r.celeb_reality}\n한 줄 정의: ${r.headline ?? '(없음)'}\n소개(한국어): ${r.bio}`).join('\n\n')
  return `너는 인물 데이터베이스의 영문 편집자다. 아래 ${rows.length}명의 한국어 소개(bio)를 영어 소개(bio_en)로 쓴다.

## 규격

- **직역하지 않는다.** 같은 사실을 영어에서 자연스럽게 다시 쓴다. 한국어 문장 구조를 그대로 옮기지 않는다.
- 한국어 bio 에 있는 사실만 쓴다. 새 사실을 지어내지 않는다.
- 고유명사(문헌·지명·인명)는 통용되는 로마자 표기로 옮긴다. 한국 고전 소설 인물이면 국어의 로마자 표기법을 따른다.
- 한국어 bio 가 「A 는 이렇게 적고 B 는 저렇게 적어 갈린다」처럼 전승이 갈리는 것을 밝혔으면 영어에도 그 갈림을 남긴다.
- 분량은 한국어 bio 에 상응하게 맞춘다. 짧은 bio 를 늘리지 않는다.
- 허구 인물이면 실존인 것처럼 쓰지 않는다. 작품 안의 사건으로 서술한다.

## 출력 형식

설명·머리말·코드펜스 없이 JSON 배열만 출력한다.

[{"slug":"<주어진 slug 그대로>","bio_en":"..."}]

${rows.length}명 전원에 대해 원소를 하나씩 낸다.

## 대상

${people}`
}

function promptBirthDate(rows) {
  const people = rows.map((r, i) => `### ${i + 1}. ${r.nickname} (${r.slug})\n실존 축: ${r.celeb_reality} / 국적: ${r.nationality ?? '없음'} / 직군: ${r.profession ?? '없음'}\n한 줄 정의: ${r.headline ?? '(없음)'}\n소개: ${r.bio ?? '(없음)'}`).join('\n\n')
  return `너는 인물 데이터베이스의 연대 담당자다. 아래 ${rows.length}명에게 birth_date 를 매기고, 근거가 있으면 death_date 도 매긴다.

## 이 값이 무엇인가

이 서비스는 인물 정렬·동시대 인물·연대기 화면에서 생몰을 쓴다. 그래서 **실존 여부와 무관하게 모든 인물에게 대표 연도를 정한다.** 「허구라서 알 수 없다」는 이유로 비우지 않는다.

## 정하는 방법

1. **실존 인물은 문헌·사료가 적은 연대를 그대로 쓴다.** 중국 고대 인물이면 사기·좌전·삼국지가 적은 재위·생몰 연도를, 성서 인물이면 학계가 보는 시대 배치를 따른다.
2. **허구 인물은 실제 생일이 아니라 작품 배경 연도다.** 그 작품이 놓인 시대에서 인물의 나이와 세대 관계를 잡아 정한다. 조선 후기 소설이면 작중 배경이 되는 왕대를 기준으로 삼는다.
3. **같은 작품·같은 무리의 인물은 서로 어긋나지 않게 배치한다.** 부모가 자녀보다 늦게 나거나 형제 연도가 크게 갈리면 안 된다. 아래 명단을 함께 보고 맞춘다.
4. **연도만 쓴다.** 월·일을 지어내지 않는다. 기원전은 음수로 쓴다(예: "-685").
5. **death_date 는 근거가 있을 때만 넣는다.** 문헌이 재위 기간이나 사망을 적었거나 작중에서 죽는 인물이다. 근거 없이 생년에 수명을 더해 만들지 않는다.

## 출력 형식

설명·머리말·코드펜스 없이 JSON 배열만 출력한다.

[{"slug":"...","birth_date":"-685","death_date":"-643","basis":"연도를 정한 근거 한 문장"}]

basis 는 반드시 넣는다. death_date 는 해당할 때만 넣는다. ${rows.length}명 전원에 대해 원소를 하나씩 낸다.

## 대상

${people}`
}

function validate(text, rows) {
  const issues = []
  let parsed
  const body = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  try { parsed = JSON.parse(body) } catch (e) { return { ok: [], issues: [`JSON 파싱 실패: ${e.message}`] } }
  if (!Array.isArray(parsed)) return { ok: [], issues: ['배열이 아니다'] }

  const wanted = new Map(rows.map((r) => [r.slug, r]))
  const year = (v) => /^-?\d{1,6}$/.test(String(v)) ? Number(v) : null
  const ok = []
  for (const it of parsed) {
    if (!wanted.has(it.slug)) { issues.push(`모르는 slug: ${it.slug}`); continue }
    if (FIELD === 'bio_en') {
      if (!it.bio_en || typeof it.bio_en !== 'string' || it.bio_en.trim().length < 40) { issues.push(`${it.slug}: bio_en 이 짧거나 없다`); continue }
      ok.push({ slug: it.slug, celeb: { bio_en: it.bio_en.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').trim() } })
    } else {
      const b = year(it.birth_date)
      if (b === null) { issues.push(`${it.slug}: birth_date 가 연도가 아니다 (${it.birth_date})`); continue }
      const out = { slug: it.slug, celeb: { birth_date: String(b) }, basis: it.basis ?? '' }
      if (it.death_date !== undefined && it.death_date !== null && it.death_date !== '') {
        const d = year(it.death_date)
        if (d === null) issues.push(`${it.slug}: death_date 형식이 아니라 버린다`)
        else if (d < b) issues.push(`${it.slug}: 몰년(${d})이 생년(${b})보다 앞서 버린다`)
        else out.celeb.death_date = String(d)
      }
      ok.push(out)
    }
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
      .select('slug,nickname,nickname_en,celeb_reality,publication_status,headline,bio,bio_en,birth_date,nationality,profession')
      .order('slug').range(f, f + 999)
    if (error) throw new Error(error.message)
    all.push(...data)
    if (data.length < 1000) break
  }

  const generated = new Set()
  for (const f of fs.readdirSync(OUT_DIR)) {
    if (!f.endsWith('.json')) continue
    try { for (const it of JSON.parse(fs.readFileSync(path.join(OUT_DIR, f), 'utf8'))) generated.add(it.slug) } catch { /* 무시 */ }
  }

  // bio_en 은 한국어 bio 가 있어야 옮길 수 있다
  const todo = all.filter((c) => !c[FIELD] && !generated.has(c.slug) && (FIELD !== 'bio_en' || c.bio))
  console.log(`${FIELD} 결손 ${todo.length}명 (묶음 ${CHUNK}명, 동시 ${CONC})`)
  if (LIST_ONLY) { console.log('  ' + todo.map((c) => c.nickname).join(' · ')); return }
  if (!todo.length) return

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
        const prompt = FIELD === 'bio_en' ? promptBioEn(job.rows) : promptBirthDate(job.rows)
        const text = await codexCall(prompt, { model: 'gpt-5.6-sol', effort: 'xhigh', timeoutMs: 420000 })
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
