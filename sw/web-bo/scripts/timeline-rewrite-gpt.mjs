/**
 * 인물 행적 서술 재작문기 — GPT(codex) 발주
 *
 * [무엇을 하는가]
 *   celeb_timeline_events 의 한국어 서술(description)만 GPT로 다시 쓴다.
 *   제목·연도·좌표·근거는 건드리지 않는다.
 *
 * [왜 GPT인가]
 *   `sw/web-bo/docs/todo/korean-writing-quality.md` 실측 — 한국어 작문은 GPT가 낫다.
 *   가상 독백(`fill-virtual-monologue-gpt.ts`)도 같은 이유로 GPT에 발주한다.
 *
 * [발주서를 짧게 유지하는 이유]
 *   26.07.26 작업에서 규칙을 한 번에 하나씩 덧대며 네 라운드를 돌렸는데, 규칙을
 *   막을 때마다 다른 곳이 어색해졌다(추상어를 막으니 목적어로 옮기고, 현재형을
 *   시키니 "~이다"로 끝날 문장까지 "~이 된다"로 만들었다). 규칙이 길어질수록
 *   규칙 지키기에 매달려 문장이 굳는다. **원칙 몇 개만 주고 맡기는 편이 낫다.**
 *
 * [인물 단위로 발주하는 이유]
 *   한 인물의 사건을 한꺼번에 줘야 호흡을 고르고 같은 표현이 겹치는 것을 피한다.
 *
 * [재실행 안전]
 *   결과를 `docs/celeb-data/timeline/_rewrite/<slug>.json` 에 남기고 이미 있는
 *   인물은 건너뛴다. rate limit 에 막혀도 같은 명령으로 이어붙이면 된다.
 *
 * [실행]  sw/web-bo 에서
 *   node --env-file=.env scripts/timeline-rewrite-gpt.mjs --slugs=a,b   # 시범
 *   node --env-file=.env scripts/timeline-rewrite-gpt.mjs               # 남은 전원
 *   node --env-file=.env scripts/timeline-rewrite-gpt.mjs --apply       # DB 반영
 */

import { createClient } from '@supabase/supabase-js'
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'fs'
import { resolve, join } from 'path'
import { codexCall } from '../../../.claude/skills/codex-gpt/scripts/codex-call.mjs'

const APPLY = process.argv.includes('--apply')
/** 영문 모드 — 한국어 최종본을 재료로 영문 서술을 다시 쓴다(번역이 아니라 재작문) */
const EN = process.argv.includes('--en')
const slugArg = process.argv.find((a) => a.startsWith('--slugs='))
const ONLY = slugArg ? slugArg.slice('--slugs='.length).split(',').map((s) => s.trim()) : null
// 동시 6 — 3으로는 205건이 세 줄로만 흘러 너무 느렸다. 실패는 재시도로 흡수된다
const CONCURRENCY = 6

const OUT_DIR = resolve(
  process.cwd(),
  EN ? '../../docs/celeb-data/timeline/_rewrite-en' : '../../docs/celeb-data/timeline/_rewrite',
)
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

/* 영문 발주서 — 한국어를 옮기는 게 아니라 같은 사실을 영어로 다시 쓴다.
   이 저장소의 번역 원칙(문장 1:1 매핑 금지, 중심축만 보존)을 그대로 따른다. */
function buildPromptEn(nickname, nicknameEn, rows) {
  const items = rows
    .map(
      (r, i) =>
        `${i + 1}. [${r.year}] ${r.title_en ?? r.title}\n   Korean text: ${r.description ?? '(none)'}\n   Current English: ${r.description_en ?? '(none)'}`,
    )
    .join('\n')

  return `You write clear, unfussy English prose. Below is the life timeline of ${nicknameEn || nickname}. Rewrite the description for each entry.

${items}

The Korean text carries the facts; the current English is an older draft. Take the facts from both and write fresh English. Do not translate the Korean sentence by sentence — the sentence count, the order of clauses, and where you break are yours to choose. Do not invent dates, names, places or numbers that appear in neither source.

Four things:

1. It is a timeline. Let each entry read as something happening, not as a summary of something that happened.
2. Write plain, concrete English. Avoid abstract nouns doing the work of verbs, and avoid the encyclopedia register.
3. Vary length and rhythm between entries. Fifteen entries stacked in a column must not sound alike, and they must not all open the same way.
4. No flourishes. No closing moral. Say what happened.

One sentence or four, whatever the event is worth.

## Output

Output only a JSON array. No preamble, no code fence.

[{"n": 1, "description": "rewritten text"}, {"n": 2, "description": "..."}]

Numbers must match the list above, and every entry must be present.`
}

function buildPrompt(nickname, rows) {
  const items = rows
    .map((r, i) => `${i + 1}. [${r.year}] ${r.title}\n   재료: ${r.description ?? '(없음)'}`)
    .join('\n')

  return `당신은 한국어 산문을 잘 쓰는 사람이다. 아래는 ${nickname}의 생애 행적 연표이고, 각 항목의 서술문을 다시 쓰는 일을 맡았다.

${items}

각 항목의 "재료"는 다듬을 문장이 아니라 사실을 담아 둔 메모다. 거기서 사실만 가져오고 표현은 새로 고른다. ${nickname}에 대해 이미 알고 있는 것을 함께 써도 좋다. 다만 재료에 없는 연도·이름·지명·숫자를 지어내지는 마라.

네 가지만 지키면 된다.

1. 연표다. 사건이 눈앞에서 벌어지는 것처럼 읽혀야 한다. 시제는 읽어서 자연스러운 쪽으로 고르되 억지로 한 형태에 맞추지 마라.
2. 좋은 한국어로 써라. 번역투와 한자어 추상명사를 피하고 사람과 나라가 주어로 서게 한다.
3. 항목마다 길이와 리듬을 달리하라. 열대여섯 줄이 세로로 늘어섰을 때 같은 가락이 반복되면 안 된다. 문장 첫머리도 마찬가지다 — 누가 한 일인지 뻔하면 이름을 굳이 세우지 않아도 된다.
4. 미사여구를 넣지 마라. 교훈으로 맺지 마라. 무슨 일이 있었는지만 적는다.

항목당 한 문장이든 네 문장이든 사건 무게에 맞추면 된다.

한자를 노출하지 마라. 책 이름·관직·지명도 한글로 적는다(태극도설, 통서, 사리참군). 로마자 약자는 그대로 둔다.

## 출력 형식

JSON 배열만 출력한다. 설명·머리말·코드펜스를 붙이지 마라.

[{"n": 1, "description": "다시 쓴 서술"}, {"n": 2, "description": "..."}]

번호는 위 목록의 번호와 같아야 하고, 모든 항목을 빠짐없이 포함해야 한다.`
}

/** 코드펜스·머리말이 섞여 와도 JSON 배열만 건져낸다 */
function parseArray(text) {
  const start = text.indexOf('[')
  const end = text.lastIndexOf(']')
  if (start < 0 || end < 0) throw new Error('JSON 배열을 찾지 못했다')
  return JSON.parse(text.slice(start, end + 1))
}

async function rewriteOne(person) {
  const { slug, nickname, nicknameEn, rows } = person
  const prompt = EN ? buildPromptEn(nickname, nicknameEn, rows) : buildPrompt(nickname, rows)
  // 문장 다듬기에 최고 강도는 시간만 잡아먹는다 — medium 으로 충분하다
  const raw = await codexCall(prompt, { model: 'gpt-5.6-sol', effort: 'medium' })
  const arr = parseArray(raw)

  const byN = new Map(arr.map((x) => [Number(x.n), String(x.description ?? '').trim()]))
  const out = []
  for (let i = 0; i < rows.length; i++) {
    const text = byN.get(i + 1)
    if (!text) throw new Error(`${i + 1}번 항목이 빠졌다`)
    if (/[一-鿿]/.test(text)) throw new Error(`${i + 1}번에 한자가 섞였다`)
    if (EN && /[가-힣]/.test(text)) throw new Error(`${i + 1}번 영문에 한글이 남았다`)
    if (text.length < 15) throw new Error(`${i + 1}번이 너무 짧다`)
    out.push({ id: rows[i].id, year: rows[i].year, title: rows[i].title, before: rows[i].description, after: text })
  }
  writeFileSync(join(OUT_DIR, `${slug}.json`), JSON.stringify({ slug, nickname, events: out }, null, 2) + '\n', 'utf-8')
  return out.length
}

/* ── 적재 ──
   🔴 **id 로 갱신하지 않는다.** 조사분을 다시 적재하면(`timeline-import.mjs --apply`)
   그 인물의 행을 지우고 새로 넣어 id 가 바뀐다. 그 전에 만든 재작문 파일은 사라진
   id 를 들고 있고, PostgREST 는 0행 갱신을 에러로 보지 않아 **조용히 실패했다**
   (실측: 3,507건 중 2,382건이 반영 안 된 채 "성공"으로 보고됐다).
   그래서 인물·연도·제목으로 찾고, 못 찾으면 실패로 알린다. */
if (APPLY) {
  const files = readdirSync(OUT_DIR).filter((f) => f.endsWith('.json'))
  let ok = 0
  const misses = []

  for (const f of files) {
    const { slug, events } = JSON.parse(readFileSync(join(OUT_DIR, f), 'utf-8'))

    const { data: prof, error: pErr } = await supabase
      .from('profiles').select('id').eq('slug', slug).single()
    if (pErr || !prof) {
      misses.push(`${slug}: 인물을 찾지 못했다`)
      process.exitCode = 1
      continue
    }

    let n = 0
    for (const e of events) {
      const { data, error } = await supabase
        .from('celeb_timeline_events')
        .update(EN ? { description_en: e.after } : { description: e.after })
        .eq('celeb_id', prof.id)
        .eq('year', e.year)
        .eq('title', e.title)
        .select('id')
      if (error) {
        misses.push(`${slug} ${e.year} ${e.title}: ${error.message}`)
        process.exitCode = 1
      } else if (!data || data.length === 0) {
        misses.push(`${slug} ${e.year} ${e.title}: 해당 행이 없다`)
        process.exitCode = 1
      } else {
        n += data.length
        ok += data.length
      }
    }
    console.log(`  반영 ${slug}: ${n}/${events.length}건`)
  }

  console.log(`\n총 ${ok}건 반영.`)
  if (misses.length) {
    console.error(`\n🔴 반영하지 못한 것 ${misses.length}건`)
    misses.slice(0, 20).forEach((m) => console.error('  ' + m))
  }
  process.exit(process.exitCode ?? 0)
}

/* ── 생성 ──
   🔴 PostgREST 는 한 번에 1,000행까지만 준다. 에러도 경고도 없이 잘린다.
   전량이 1,000건을 넘으므로(실측 1,231) 반드시 나눠 받는다 — 그냥 select 하면
   뒤쪽 인물의 사건이 통째로 빠진 채 "성공"으로 보인다(실제로 겪었다). */
const PAGE = 500
const rows = []
for (let from = 0; ; from += PAGE) {
  const { data, error } = await supabase
    .from('celeb_timeline_events')
    .select('id, celeb_id, year, title, title_en, description, description_en, sort_order, profiles!inner(slug, nickname, nickname_en)')
    .order('id')
    .range(from, from + PAGE - 1)
  if (error) throw new Error(`조회 실패: ${error.message}`)
  rows.push(...data)
  if (data.length < PAGE) break
}
rows.sort((a, b) => a.year - b.year || a.sort_order - b.sort_order)
console.log(`행적 ${rows.length}건 조회`)

const people = new Map()
for (const r of rows) {
  const slug = r.profiles.slug
  if (ONLY && !ONLY.includes(slug)) continue
  if (!people.has(slug)) people.set(slug, { slug, nickname: r.profiles.nickname, nicknameEn: r.profiles.nickname_en, rows: [] })
  people.get(slug).rows.push({ id: r.id, year: r.year, title: r.title, title_en: r.title_en, description: r.description, description_en: r.description_en })
}

const targets = [...people.values()].filter((p) => !existsSync(join(OUT_DIR, `${p.slug}.json`)))
console.log(`대상 ${targets.length}명 (전체 ${people.size}, 이미 처리 ${people.size - targets.length})`)

let ok = 0
const failed = []
for (let i = 0; i < targets.length; i += CONCURRENCY) {
  const chunk = targets.slice(i, i + CONCURRENCY)
  await Promise.all(
    chunk.map(async (p) => {
      try {
        const n = await rewriteOne(p)
        ok++
        console.log(`✓ ${p.slug} ${n}건 (${ok}/${targets.length})`)
      } catch (e) {
        const msg = String(e?.message ?? e).slice(0, 300)
        failed.push(`${p.slug}: ${msg}`)
        console.log(`✗ ${p.slug} — ${msg}`)
      }
    }),
  )
}

console.log(`\n완료 ${ok} / 실패 ${failed.length}`)
if (failed.length) {
  failed.forEach((f) => console.log('  ' + f))
  console.log('\n같은 명령을 다시 돌리면 실패분만 재시도한다.')
}
