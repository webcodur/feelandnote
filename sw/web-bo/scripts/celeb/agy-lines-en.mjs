/**
 * 상황 대사 21줄의 영문판을 agy(Gemini)로 만든다. 생성만 하고 DB는 건드리지 않는다.
 *
 * 대상은 dump-i18n-gaps.ts 가 뽑은 src.json 이며, 산출물은 i18n-lines-en-apply.ts 가 받는
 * { slug, english_lines } 형식이다. 한마디(quote_en)는 이미 있으므로 손대지 않는다.
 *
 * 번역이 아니라 같은 인물의 같은 상황을 영어로 다시 쓰는 일이다
 * (celeb-09-01-i18n.md 「공통 작성 원칙」 — 한국어 어순과 생략을 그대로 옮기지 않는다).
 *
 * 재실행 안전: 이미 만들어 둔 산출물은 건너뛴다.
 *
 * 실행 (sw/web-bo 에서):
 *   node scripts/celeb/agy-lines-en.mjs --list
 *   node scripts/celeb/agy-lines-en.mjs --conc 3 --group 3
 *   node scripts/celeb/agy-lines-en.mjs --slugs rurik,rollo
 */

import path from 'node:path'
import fs from 'node:fs'
import { agyCall } from '../../../../.claude/skills/agy-antigravity/scripts/agy-call.mjs'

const arg0 = (f, d) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : d }
// REAL/BOTH 는 lines-en, FICTION 은 lines-en-fiction 으로 나눠 담는다. 두 트랙의 대상 명단이 다르다.
const BASE = path.resolve(process.cwd(), `../../data/celeb/gap-fill/${arg0('--dir', 'lines-en')}`)
const SRC = path.join(BASE, 'src.json')
const OUT_DIR = path.join(BASE, 'out')
const SITUATIONS = ['greeting', 'roll_call', 'deploy', 'battle_win', 'battle_draw', 'battle_lose', 'clash_attack']

const arg = (f, d) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : d }
const CONC = Number(arg('--conc', 3))
const GROUP = Number(arg('--group', 3))
const ONLY = (arg('--slugs', '') || '').split(',').map((s) => s.trim()).filter(Boolean)
const LIST_ONLY = process.argv.includes('--list')

function buildPrompt(rows) {
  const people = rows.map((r, i) => {
    const lines = SITUATIONS.map((s) => {
      const v = r.dialogue?.lines?.[s] ?? []
      return `  "${s}": [\n${v.map((x) => `    ${JSON.stringify(x)}`).join(',\n')}\n  ]`
    }).join(',\n')
    return [
      `### ${i + 1}. ${r.name} - slug: ${r.slug}`,
      `English name: ${r.name_en ?? '(none)'}`,
      `Role: ${r.title_en ?? r.title ?? '(none)'}`,
      `Profession: ${r.profession ?? '(none)'} / Nationality: ${r.nationality ?? '(none)'} / Lived: ${r.birth ?? '?'} to ${r.death ?? '?'}`,
      r.dialogue?.lines_en?.quote
        ? `Their verified one-liner in English, for tone reference only, do not reuse it: ${JSON.stringify(r.dialogue.lines_en.quote)}`
        : null,
      'Korean situational lines:',
      '{',
      lines,
      '}',
    ].filter(Boolean).join('\n')
  }).join('\n\n')

  return `You write English game dialogue for a Korean history and mythology database. For each figure below, write the English version of their 21 situational lines (7 situations x 3 variants).

## What these lines are

Each line is a single reaction a character speaks on screen: a greeting, a response to a roll call, an order, a reaction to winning, drawing, or losing a battle, and a shout at the moment of attack. They are not biography. They are not narration.

## Rules

1. Write English, do not transliterate Korean. Match the meaning and the character's stance, but let the English read as something an English speaker would actually say. Never carry over Korean word order, Korean sentence-ending patterns, or the Korean habit of dropping the subject.
2. Keep every line short. clash_attack is the shortest, a shout or a single clause, never a sentence with a subordinate clause. deploy is a command. greeting, roll_call and the battle lines are one short sentence each.
3. Keep what makes this person this person. The Korean lines carry their specific events, choices and relationships. Those must survive into English. Do not flatten a line into something any general or any founder could say.
4. Use the established English form of names, places and titles. For a figure with a standard English Wikipedia spelling, use that spelling. Do not invent romanizations when a common one exists.
5. Do not add facts that are not in the Korean line. Do not add dates, do not add explanations, do not add epithets the Korean line does not have.
6. Vary the sentence forms. Do not end every line the same way.
7. Plain ASCII punctuation. Use straight quotes, no em dashes, and no bracketed emotion tags.
8. Produce exactly 3 lines per situation, in the same order as the Korean.

## Output format

Output only a JSON array, with no prose, no explanation, and no code fence.

[{"slug":"...","english_lines":{"greeting":["","",""],"roll_call":["","",""],"deploy":["","",""],"battle_win":["","",""],"battle_draw":["","",""],"battle_lose":["","",""],"clash_attack":["","",""]}}]

Include one element per figure, using the exact slug given.

## Figures

${people}`
}

function validate(text, rows) {
  const issues = []
  let parsed
  const body = String(text).replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  const start = body.indexOf('[')
  const end = body.lastIndexOf(']')
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
    const lines = {}
    let bad = false
    for (const s of SITUATIONS) {
      const v = it.english_lines?.[s]
      if (!Array.isArray(v) || v.length !== 3) { issues.push(`${it.slug}: ${s} 길이 이상`); bad = true; break }
      const cleaned = v.map((x) => String(x ?? '').trim())
      if (cleaned.some((x) => !x)) { issues.push(`${it.slug}: ${s} 빈 줄`); bad = true; break }
      if (cleaned.some((x) => /[가-힣]/.test(x))) { issues.push(`${it.slug}: ${s} 한글 잔존`); bad = true; break }
      if (cleaned.some((x) => /^\s*\[/.test(x))) { issues.push(`${it.slug}: ${s} 대괄호 태그`); bad = true; break }
      lines[s] = cleaned
    }
    if (bad) continue
    ok.push({ slug: it.slug, english_lines: lines })
  }
  const missing = [...wanted].filter((s) => !ok.some((o) => o.slug === s))
  if (missing.length) issues.push(`누락: ${missing.join(', ')}`)
  return { ok, issues }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const src = JSON.parse(fs.readFileSync(SRC, 'utf8'))
  const done = new Set(fs.readdirSync(OUT_DIR).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, '')))

  let todo = src.filter((r) => !done.has(r.slug))
  if (ONLY.length) todo = src.filter((r) => ONLY.includes(r.slug))

  const groups = []
  for (let i = 0; i < todo.length; i += GROUP) groups.push(todo.slice(i, i + GROUP))

  console.log(`대상 ${todo.length}명 / 완료 ${done.size}명 / 묶음 ${groups.length}개 (묶음당 ${GROUP}명, 동시 ${CONC})`)
  if (LIST_ONLY || !groups.length) return

  let made = 0
  let failed = 0
  for (let i = 0; i < groups.length; i += CONC) {
    await Promise.all(groups.slice(i, i + CONC).map(async (g) => {
      const label = g.map((r) => r.name).join('·')
      try {
        const text = await agyCall(buildPrompt(g), { timeoutMs: 600000 })
        const { ok, issues } = validate(text, g)
        for (const o of ok) {
          fs.writeFileSync(path.join(OUT_DIR, `${o.slug}.json`), JSON.stringify(o, null, 2) + '\n', 'utf8')
        }
        made += ok.length
        if (!ok.length) console.log(`FAIL ${label}\n     ${issues.join(' | ')}`)
        else console.log(`OK   ${label} → ${ok.length}/${g.length}명${issues.length ? `\n     ${issues.join(' | ')}` : ''}`)
        if (!ok.length) failed++
      } catch (e) {
        failed++
        console.log(`ERR  ${label} — ${String(e.message).slice(0, 200)}`)
      }
    }))
    console.log(`  ... ${Math.min(i + CONC, groups.length)}/${groups.length} 묶음`)
  }
  console.log(`\n생성 ${made}명 / 실패 묶음 ${failed}개`)
  console.log(`출력: ${OUT_DIR}`)
}

main()
