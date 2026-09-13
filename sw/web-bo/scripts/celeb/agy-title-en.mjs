/**
 * 수식어의 영문판(title_en)을 agy(Gemini)로 만든다.
 *
 * title 은 이름 앞에 붙는 짧은 수식어이며 화면에서 단독으로도 읽힌다
 * (celeb-01-02-profile-intro.md 「수식어(title) 작성 가이드」). 한국어를 늘려 설명하는 것이
 * 아니라, 영어권에서 그 인물에게 실제로 쓰는 호칭이 있으면 그것을 쓴다.
 *
 * 입력: data/celeb/gap-fill/title-en-src.json (slug·nickname·title·headline 을 담은 배열)
 * 출력: data/celeb/gap-fill/title-en.json
 *
 * 실행 (sw/web-bo 에서):
 *   node scripts/celeb/agy-title-en.mjs
 *   node scripts/celeb/agy-title-en.mjs --apply
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

const SRC = path.resolve(process.cwd(), '../../data/celeb/gap-fill/title-en-src.json')
const OUT = path.resolve(process.cwd(), '../../data/celeb/gap-fill/title-en.json')
const APPLY = process.argv.includes('--apply')

function buildPrompt(rows) {
  const people = rows.map((r, i) => [
    `### ${i + 1}. ${r.nickname} - slug: ${r.slug}`,
    `English name: ${r.nickname_en ?? '(none)'}`,
    `Korean title: ${r.title}`,
    r.headline_en ? `Their English one-line definition, for context: ${r.headline_en}` : null,
  ].filter(Boolean).join('\n')).join('\n\n')

  return `You write the short English epithet that sits in front of a figure's name in a database of historical and mythological people. Each figure has the Korean epithet already. Write the English one.

## What this value is

It is a label, not a sentence. It appears alone under a portrait and in front of the name: "Last Pharaoh", "Admiral", "Father of Philosophy". Two to five words is the normal range.

## Rules

1. If English already has a settled way of naming this figure's role, use it. Do not invent a phrase when a conventional one exists.
2. Capitalize it like a title (each significant word capitalized). No trailing period.
3. Name the role or standing, not an episode from their life. The one-line definition already carries the scene.
4. Do not copy the one-line definition. This is shorter and different in kind.
5. Do not use a genre or source label such as "Biblical Figure", "Greek Myth" or "Old Testament". Those fit many people at once. Name what this person was.
6. Two figures must not get the same epithet. Read the whole list before deciding.
7. Plain ASCII.

## Output format

Output only a JSON array, with no prose, no explanation, and no code fence.

[{"slug":"...","title_en":"..."}]

Include one element per figure, using the exact slug given.

## Figures

${people}`
}

function validate(text, rows) {
  const issues = []
  const body = String(text).replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
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
  const seen = new Map()
  const ok = []
  for (const it of parsed) {
    if (!wanted.has(it.slug)) { issues.push(`모르는 slug: ${it.slug}`); continue }
    const t = String(it.title_en ?? '').trim().replace(/\.$/, '')
    if (!t) { issues.push(`${it.slug}: 빈 값`); continue }
    if (/[가-힣]/.test(t)) { issues.push(`${it.slug}: 한글 잔존`); continue }
    if (t.split(/\s+/).length > 7) issues.push(`${it.slug}: 7단어 초과 — ${t}`)
    if (seen.has(t.toLowerCase())) issues.push(`중복: ${t} (${seen.get(t.toLowerCase())} / ${it.slug})`)
    seen.set(t.toLowerCase(), it.slug)
    ok.push({ slug: it.slug, title_en: t })
  }
  const missing = [...wanted].filter((s) => !ok.some((o) => o.slug === s))
  if (missing.length) issues.push(`누락: ${missing.join(', ')}`)
  return { ok, issues }
}

async function main() {
  const rows = JSON.parse(fs.readFileSync(SRC, 'utf8'))

  if (APPLY) {
    const made = JSON.parse(fs.readFileSync(OUT, 'utf8'))
    let done = 0
    for (const m of made) {
      const { error } = await db.from('celebs').update({ title_en: m.title_en }).eq('slug', m.slug)
      if (error) { console.log(`ERR ${m.slug} ${error.message}`); continue }
      console.log(`${m.slug}\t${m.title_en}`)
      done++
    }
    console.log(`\n반영 ${done}명`)
    return
  }

  // 중복 금지를 지키려면 한 번에 전원을 보여 줘야 한다. 27명은 한 프롬프트에 들어간다.
  const text = await agyCall(buildPrompt(rows), { timeoutMs: 600000 })
  const { ok, issues } = validate(text, rows)
  fs.writeFileSync(OUT, JSON.stringify(ok, null, 2) + '\n', 'utf8')
  for (const o of ok) console.log(`${o.slug}\t${o.title_en}`)
  if (issues.length) console.log(`\n주의:\n  ${issues.join('\n  ')}`)
  console.log(`\n생성 ${ok.length}/${rows.length}명 → ${OUT}`)
}

main()
