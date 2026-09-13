/**
 * 영문 한마디(lines_en.quote)가 비어 있는 인물의 영문판을 agy(Gemini)로 만든다.
 * 생성만 하고 DB는 건드리지 않는다.
 *
 * 대상은 한국어 한마디가 있는데 영문이 없는 인물이다. 표준 자리 표시
 * (「확인된 어록이 없습니다」)는 quote-placeholder-fill.mjs 가 이미 짝을 맞추므로 여기서 뺀다.
 *
 * 사료에 남은 실제 발언은 한국어를 되돌려 번역하지 않고 원문이나 공인 번역을 복원해야 한다
 * (celeb-09-01-i18n.md 「공통 작성 원칙」). 그래서 이 배치는 원전 직접화법이 없는 FICTION 만
 * 다루고, 확인 가능한 원전 대사를 아는 인물은 그 원문을 쓰라고 프롬프트가 지시한다.
 *
 * 실행 (sw/web-bo 에서):
 *   node scripts/celeb/agy-quote-en.mjs --list
 *   node scripts/celeb/agy-quote-en.mjs --conc 3 --group 8
 *   node scripts/celeb/agy-quote-en.mjs --apply
 */

import path from 'node:path'
import fs from 'node:fs'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { agyCall } from '../../../../.claude/skills/agy-antigravity/scripts/agy-call.mjs'

config({ path: path.resolve(process.cwd(), '.env'), quiet: true })
const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL, process.env.DB_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const OUT = path.resolve(process.cwd(), '../../data/celeb/gap-fill/quote-en.json')
const NO_QUOTE_KO = '[확인된 어록이 없습니다]'

const arg = (f, d) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : d }
const CONC = Number(arg('--conc', 3))
const GROUP = Number(arg('--group', 8))
const LIST_ONLY = process.argv.includes('--list')
const APPLY = process.argv.includes('--apply')

async function all(table, cols) {
  const out = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from(table).select(cols).range(from, from + 999)
    if (error) throw new Error(error.message)
    out.push(...data)
    if (data.length < 1000) break
  }
  return out
}

function buildPrompt(rows) {
  const people = rows.map((r, i) => [
    `### ${i + 1}. ${r.nickname} - slug: ${r.slug}`,
    `English name: ${r.nickname_en ?? '(none)'} / Role: ${r.title_en ?? r.title ?? '(none)'}`,
    `Korean one-liner: ${JSON.stringify(r.quote)}`,
  ].join('\n')).join('\n\n')

  return `You write the English one-liner shown under each figure's portrait in a Korean mythology and literature database. Each figure already has a Korean one-liner. Write the English version.

## Rules

1. If this figure has a famous line in the original work and you are confident of the standard English rendering of that line, use that rendering. Do not translate the Korean back into English when a published English text of the line exists.
2. Otherwise write the English that says what the Korean says, in English an English speaker would actually write. Never carry over Korean word order or Korean sentence-ending patterns.
3. One sentence. Keep it under 90 characters where you can. It is a caption, not a paragraph.
4. Keep the speaker's stance and register. A defiant line stays defiant, a tender line stays tender.
5. Use the established English spelling of names, places and works. Do not invent romanizations when a common one exists.
6. Do not add facts the Korean line does not have.
7. Plain ASCII punctuation. Straight quotes, no em dashes.

## Output format

Output only a JSON array, with no prose, no explanation, and no code fence.

[{"slug":"...","quote_en":"..."}]

Include one element per figure, using the exact slug given.

## Figures

${people}`
}

function validate(text, rows) {
  const issues = []
  const body = String(text).replace(/^\`\`\`(?:json)?\s*/i, '').replace(/\`\`\`\s*$/, '').trim()
  const start = body.indexOf('[')
  const end = body.lastIndexOf(']')
  let parsed
  try {
    parsed = JSON.parse(start > -1 && end > start ? body.slice(start, end + 1) : body)
  } catch (e) {
    return { ok: [], issues: [`JSON 파싱 실패: ${e.message}`] }
  }
  if (!Array.isArray(parsed)) return { ok: [], issues: ['배열이 아니다'] }

  const wanted = new Set(rows.map((r) => r.slug))
  const ok = []
  for (const it of parsed) {
    if (!wanted.has(it.slug)) { issues.push(`모르는 slug: ${it.slug}`); continue }
    const q = String(it.quote_en ?? '').trim()
    if (!q) { issues.push(`${it.slug}: 빈 값`); continue }
    if (/[가-힣]/.test(q)) { issues.push(`${it.slug}: 한글 잔존`); continue }
    ok.push({ slug: it.slug, quote_en: q })
  }
  const missing = [...wanted].filter((s) => !ok.some((o) => o.slug === s))
  if (missing.length) issues.push(`누락: ${missing.join(', ')}`)
  return { ok, issues }
}

async function targets() {
  const dialogues = await all('celeb_dialogues', 'celeb_id,lines,lines_en')
  const celebs = await all('celebs', 'id,slug,nickname,nickname_en,title,title_en,celeb_reality')
  const byId = new Map(celebs.map((c) => [c.id, c]))
  const rows = []
  for (const d of dialogues) {
    const c = byId.get(d.celeb_id)
    if (!c) continue
    const ko = d.lines?.quote
    if (!ko || !String(ko).trim() || ko === NO_QUOTE_KO) continue
    if (String(d.lines_en?.quote ?? '').trim()) continue
    rows.push({ ...c, quote: ko, celeb_id: d.celeb_id, lines_en: d.lines_en ?? {} })
  }
  return rows
}

async function main() {
  const rows = await targets()

  if (APPLY) {
    const made = JSON.parse(fs.readFileSync(OUT, 'utf8'))
    const bySlug = new Map(rows.map((r) => [r.slug, r]))
    let done = 0, skipped = 0
    for (const m of made) {
      const r = bySlug.get(m.slug)
      if (!r) { skipped++; continue }
      const { error } = await db
        .from('celeb_dialogues')
        .update({ lines_en: { ...r.lines_en, quote: m.quote_en } })
        .eq('celeb_id', r.celeb_id)
      if (error) { console.log(`ERR ${m.slug} ${error.message}`); continue }
      done++
    }
    console.log(`반영 ${done}명 / 이미 채워져 건너뜀 ${skipped}명`)
    return
  }

  const made = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : []
  const doneSet = new Set(made.map((m) => m.slug))
  const todo = rows.filter((r) => !doneSet.has(r.slug))

  const groups = []
  for (let i = 0; i < todo.length; i += GROUP) groups.push(todo.slice(i, i + GROUP))
  console.log(`대상 ${todo.length}명 / 완료 ${doneSet.size}명 / 묶음 ${groups.length}개`)
  if (LIST_ONLY || !groups.length) return

  for (let i = 0; i < groups.length; i += CONC) {
    await Promise.all(groups.slice(i, i + CONC).map(async (g) => {
      const label = `${g[0].nickname} 외 ${g.length - 1}`
      try {
        const text = await agyCall(buildPrompt(g), { timeoutMs: 600000 })
        const { ok, issues } = validate(text, g)
        made.push(...ok)
        console.log(`${ok.length ? 'OK  ' : 'FAIL'} ${label} → ${ok.length}/${g.length}명${issues.length ? `\n     ${issues.join(' | ')}` : ''}`)
      } catch (e) {
        console.log(`ERR  ${label} — ${String(e.message).slice(0, 200)}`)
      }
    }))
    fs.writeFileSync(OUT, JSON.stringify(made, null, 2) + '\n', 'utf8')
    console.log(`  ... ${Math.min(i + CONC, groups.length)}/${groups.length} 묶음`)
  }
  console.log(`\n생성 누적 ${made.length}명 → ${OUT}`)
}

main()
