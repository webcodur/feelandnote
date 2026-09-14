/**
 * 건국신화 배치 인물의 프로필 결손을 codex(GPT)로 채운다. 생성만 하고 DB는 건드리지 않는다.
 *
 * 결손 인물을 전승 단위로 묶어 GPT에 보내고, 검증을 통과한 것만 패치 JSON으로 떨군다.
 * 반영은 사람이 확인한 뒤 scripts/celeb/fill.ts 가 한다.
 *
 * 재실행 안전: 이미 title 이 찬 인물과 이미 만들어 둔 출력 파일은 건너뛴다.
 * rate limit 에 막혀도 같은 명령으로 이어붙이면 남은 것만 돈다.
 *
 * 실행 (sw/web-bo 에서):
 *   node scripts/founding-myth/gpt-fill.mjs                    전승 전체
 *   node scripts/founding-myth/gpt-fill.mjs --tradition 초원   한 전승만
 *   node scripts/founding-myth/gpt-fill.mjs --chunk 5 --conc 3 묶음 크기·동시 실행 수
 *   node scripts/founding-myth/gpt-fill.mjs --list             남은 대상만 세고 끝낸다
 * 모델은 sol 이다. title·headline_en·bio_en 집필이 주력이다.
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
const OUT_DIR = path.resolve(process.cwd(), '../../data/celeb/founding-myth/gpt-out')

const arg = (f, d) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : d }
const CHUNK = Number(arg('--chunk', 5))
const CONC = Number(arg('--conc', 3))
const ONLY = arg('--tradition', null)
const LIST_ONLY = process.argv.includes('--list')

const PROFESSIONS = 'leader, politician, commander, entrepreneur, investor, scientist, humanities_scholar, social_scientist, director, musician, visual_artist, author, actor, influencer, athlete, other'
const TONES = 'loyal, composed, bold, humble, gentle, free'

/** GPT 에 보낼 규격. 217명에 이미 적용한 판정 기준과 같다. */
function buildPrompt(rows, tradition, existingTitles) {
  const people = rows.map((r, i) => [
    `### ${i + 1}. ${r.nickname}`,
    `slug: ${r.slug}`,
    `영문 이름: ${r.nickname_en}`,
    `실존 축: ${r.celeb_reality}`,
    `한 줄 정의(headline, 한국어·이미 있음): ${r.headline}`,
    `소개(bio, 한국어·이미 있음): ${r.bio}`,
  ].join('\n')).join('\n\n')

  return `너는 세계 건국신화·건국영웅 인물 데이터베이스의 편집자다. 아래 ${rows.length}명(전승: ${tradition})의 비어 있는 프로필 필드를 채운다.

각 인물의 한국어 headline 과 bio 는 **이미 확정된 값이며 고치지 않는다.** 그 둘에 담긴 사실만을 근거로 나머지 필드를 만든다. bio 에 없는 사실을 새로 지어내지 않는다. 네가 아는 추가 사실이 있어도 bio 와 어긋나면 bio 를 따른다.

## 채울 필드와 규격

**title** — 인물 이름 앞에 붙는 짧은 한국어 수식어. 화면에서 단독으로도 읽힌다.
- 길이 2~12자. 13자 이상은 무효다.
- 우선순위: (1) 역사·원전에서 실제로 통용되는 호칭이나 추존명 (2) 그 인물만의 대표 역할·정체성.
  추존명이 bio 에 있으면 그것을 최우선으로 쓴다(예: 「세조로 추존됐다」 → title 「고려 세조」).
- **headline 을 그대로 옮기거나 앞부분을 자르지 않는다.** headline 은 한 줄 정의이고 title 은 호칭이다. 서로 다른 말이어야 한다.
- 「고대 신화」「그리스 신화」처럼 여러 인물에게 붙는 출전 분류를 쓰지 않는다.
- 한국어에서 쓰이지 않는 조어를 만들지 않는다. 「탐색자」「창조자」「연신」 같은 말은 금지.
- 아래 이미 쓰이고 있는 title 과 겹치면 안 된다:
${existingTitles}

**title_en** — title 의 영어 대응. 직역이 아니라 영어에서 자연스러운 호칭으로 쓴다.

**headline_en** — 한국어 headline 에 대응하는 영어 한 줄. 90자 이내.
- **한국어를 직역하지 않는다.** 같은 사실을 영어 캐치프레이즈로 다시 쓴다.
- 인물 이름과 구분 부호(—)를 값에 넣지 않는다.
- 연도·수치로 시작하지 않는다.
- 같은 전승 안에서 서로 비슷한 문장이 나오지 않게 각 인물 고유의 사실로 차이를 만든다.

**bio_en** — 한국어 bio 와 같은 사실을 담은 영어 산문. 3~4문장.
- **직역하지 않는다.** 영어로 자연스럽게 다시 쓴다.
- bio 에 있는 고유명사(문헌 이름·지명·인명)는 통용되는 로마자 표기로 옮긴다.
- bio 가 「A 는 이렇게 적고 B 는 저렇게 적어 갈린다」처럼 전승이 갈리는 것을 밝힌 경우 그 갈림을 영어에서도 반드시 남긴다.

**profession** — 다음 중 하나: ${PROFESSIONS}
- 신·여신·명시적 신격, 또는 종족·인류 계보를 시작하는 시조 → leader
- 왕·황제·왕가 혈통·왕실 배우자·촌장 등 정치 권력자 → politician
- 신격과 왕족이 겹치면 leader 를 쓴다
- 비왕족인데 군사 지휘·전투가 대표 서사면 commander
- 목축·생산·교역을 스스로 운영한 것이 대표 서사면 entrepreneur
- 음유시인·구전 예인이면 musician
- 위 어디에도 안 맞을 때만 other

**gender** — 남성이면 true, 여성이면 false. 동물·집단·비인격 존재처럼 판정할 수 없으면 이 키를 아예 넣지 않는다(null 을 쓰지 마라).

**nationality** — ISO 3166-1 alpha-2 두 글자 대문자. 신화·전승 인물은 그 전승의 문화적 배경 지역을 현재 국가 코드로 옮긴다. 지리적 배경을 특정할 수 없으면 이 키를 넣지 않는다.

**speech_tone** — 다음 중 하나: ${TONES}
- loyal 충의 / composed 침착 / bold 당돌 / humble 겸양 / gentle 온화 / free 호방
- bio 에 드러난 성격과 행동으로 고른다.
- **모든 인물에 반드시 넣는다.** 판단이 어려우면 composed 를 쓴다. 이 키가 빠진 인물은 폐기된다.

title · title_en · headline_en · bio_en · profession · speech_tone 여섯은 **인물마다 빠짐없이** 넣는다. gender · nationality · birth_date · death_date 넷만 근거가 없을 때 생략할 수 있다.

**birth_date / death_date** — 문자열. 기원전은 음수(예: "-69"). 연도만 알면 연도만.
- **문헌이 실제로 연대를 적은 인물만 넣는다.** 대부분의 신화 인물은 해당 없으므로 두 키를 넣지 마라.
- 추정하거나 계산해서 만들지 않는다.

## 출력 형식

설명·머리말·코드펜스 없이 **JSON 배열만** 출력한다. 각 원소는 아래 모양이다.

[{"slug":"<주어진 slug 그대로>","celeb":{"title":"...","title_en":"...","headline_en":"...","bio_en":"...","profession":"...","gender":true,"nationality":"XX","speech_tone":"..."}}]

값을 정할 수 없는 필드는 키를 넣지 않는다. 빈 문자열이나 null 을 넣지 마라.
${rows.length}명 전원에 대해 원소를 하나씩, 주어진 순서대로 낸다.

## 대상 인물

${people}`
}

const VALID_PROF = new Set(PROFESSIONS.split(', '))
const VALID_TONE = new Set(TONES.split(', '))

/** GPT 출력 검증. 통과한 원소만 돌려주고 문제는 사유와 함께 모은다. */
function validate(text, rows) {
  const issues = []
  let parsed
  const body = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  try { parsed = JSON.parse(body) } catch (e) { return { ok: [], issues: [`JSON 파싱 실패: ${e.message}`] } }
  if (!Array.isArray(parsed)) return { ok: [], issues: ['배열이 아니다'] }

  const wanted = new Map(rows.map((r) => [r.slug, r]))
  const ok = []
  for (const item of parsed) {
    const slug = item?.slug
    const c = item?.celeb
    if (!wanted.has(slug)) { issues.push(`모르는 slug: ${slug}`); continue }
    if (!c || typeof c !== 'object') { issues.push(`${slug}: celeb 없음`); continue }

    const bad = []
    for (const f of ['title', 'title_en', 'headline_en', 'bio_en', 'profession', 'speech_tone']) {
      if (!c[f] || typeof c[f] !== 'string' || !c[f].trim()) bad.push(`${f} 없음`)
    }
    if (c.title && [...c.title].length > 12) bad.push(`title ${[...c.title].length}자`)
    if (c.headline_en && c.headline_en.length > 90) bad.push(`headline_en ${c.headline_en.length}자`)
    if (c.profession && !VALID_PROF.has(c.profession)) bad.push(`profession=${c.profession}`)
    if (c.speech_tone && !VALID_TONE.has(c.speech_tone)) bad.push(`speech_tone=${c.speech_tone}`)
    if ('gender' in c && typeof c.gender !== 'boolean') bad.push('gender 가 boolean 이 아니다')
    if (c.nationality && !/^[A-Z]{2}$/.test(c.nationality)) bad.push(`nationality=${c.nationality}`)
    if (c.title && c.title === wanted.get(slug).headline) bad.push('title 이 headline 과 같다')
    for (const k of Object.keys(c)) if (c[k] === null || c[k] === '') delete c[k]

    if (bad.length) { issues.push(`${slug}: ${bad.join(', ')}`); continue }
    ok.push({ slug, celeb: c })
  }
  const missing = rows.filter((r) => !ok.some((o) => o.slug === r.slug)).map((r) => r.slug)
  if (missing.length) issues.push(`누락: ${missing.join(', ')}`)
  return { ok, issues }
}

async function main() {

  fs.mkdirSync(OUT_DIR, { recursive: true })

  const { data, error } = await db
    .from('celebs')
    .select('id,slug,nickname,nickname_en,celeb_reality,headline,bio,title')
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

  // 이미 쓰이는 title 을 모아 GPT 에 금지 목록으로 준다
  const used = new Set()
  for (let from = 0; ; from += 1000) {
    const { data: t } = await db.from('celebs').select('title').order('slug').range(from, from + 999)
    for (const r of t ?? []) if (r.title) used.add(r.title)
    if ((t ?? []).length < 1000) break
  }

  // 이미 만들어 둔 출력에 든 slug 는 다시 돌리지 않는다.
  // 묶음 단위가 아니라 인물 단위로 세어야 부분 성공한 묶음의 나머지가 다음 회차에 살아남는다.
  const generated = new Set()
  for (const f of fs.existsSync(OUT_DIR) ? fs.readdirSync(OUT_DIR) : []) {
    if (!f.endsWith('.json')) continue
    try {
      for (const item of JSON.parse(fs.readFileSync(path.join(OUT_DIR, f), 'utf8'))) generated.add(item.slug)
    } catch { /* 깨진 파일은 무시하고 대상에 남긴다 */ }
  }

  const todo = data.filter((c) => !c.title && !generated.has(c.slug))
  const byTrad = new Map()
  for (const c of todo) {
    const t = tradOf.get(c.id) ?? '(배정없음)'
    if (ONLY && t !== ONLY) continue
    if (!byTrad.has(t)) byTrad.set(t, [])
    byTrad.get(t).push({ ...c, tradition: t })
  }

  const jobs = []
  for (const [trad, rows] of byTrad) {
    for (let i = 0; i < rows.length; i += CHUNK) {
      const slice = rows.slice(i, i + CHUNK)
      const stem = `${trad.replace(/[\\/:*?"<>|·()]/g, '-')}-${slice[0].slug}`
      jobs.push({ trad, rows: slice, file: path.join(OUT_DIR, `${stem}.json`) })
    }
  }

  console.log(`결손 ${todo.length}명 / 남은 묶음 ${jobs.length}개 (묶음당 ${CHUNK}명, 동시 ${CONC})`)
  for (const [t, r] of byTrad) console.log(`  ${String(r.length).padStart(3)}  ${t}`)
  if (LIST_ONLY || !jobs.length) return

  // 금지 목록이 너무 길면 프롬프트가 부풀어 오르므로 짧은 것 위주로 400개만 준다
  const titleList = [...used].filter((t) => [...t].length <= 12).sort().slice(0, 400).join(' · ')

  let done = 0, failed = 0, rate = 0
  for (let i = 0; i < jobs.length; i += CONC) {
    const batch = jobs.slice(i, i + CONC)
    await Promise.all(batch.map(async (job) => {
      const label = `${job.trad} ${job.rows.map((r) => r.nickname).join('·')}`
      try {
        const text = await codexCall(buildPrompt(job.rows, job.trad, titleList), { model: 'gpt-5.6-sol', effort: 'xhigh', timeoutMs: 300000 })
        const { ok, issues } = validate(text, job.rows)
        if (!ok.length) { failed++; console.log(`FAIL ${label}\n     ${issues.join(' | ')}`); return }
        fs.writeFileSync(job.file, JSON.stringify(ok, null, 2) + '\n', 'utf8')
        done += ok.length
        console.log(`OK   ${label} → ${ok.length}명${issues.length ? ` (걸림: ${issues.join(' | ')})` : ''}`)
      } catch (e) {
        failed++
        if (looksRateLimited(e.message)) { rate++; console.log(`RATE ${label} — ${e.message.slice(0, 200)}`) }
        else console.log(`ERR  ${label} — ${e.message.slice(0, 300)}`)
      }
    }))
  }

  console.log(`\n생성 ${done}명 / 실패 묶음 ${failed}개${rate ? ` (rate limit 의심 ${rate})` : ''}`)
  console.log(`출력: ${OUT_DIR}`)
}

main()
