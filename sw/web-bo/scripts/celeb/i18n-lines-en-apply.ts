/**
 * 생성된 영문 대사(7상황×3)와 대표작 영문을 DB에 반영한다.
 *
 * 입력: <dir>/<slug>.json — { title_en, english_lines: { 7상황: [3줄] } }
 *       (dump-i18n-gaps.ts가 뽑은 원본 JSON과 slug로 짝을 맞춘다)
 *
 * 규칙 SSoT: docs/project/celeb/celeb-i18n.md, docs/project/celeb/celeb-speech.md
 *   - lines_en은 기존 quote를 보존하고 7상황만 얹는다.
 *   - 감정 태그를 새로 만들지 않는다. 스키마를 바꾸지 않는다.
 *
 * 사용 예:
 *   pnpm exec tsx scripts/celeb/i18n-lines-en-apply.ts --src <원본.json> --in <생성물폴더>
 *   pnpm exec tsx scripts/celeb/i18n-lines-en-apply.ts --src <원본.json> --in <생성물폴더> --apply
 *   pnpm exec tsx scripts/celeb/i18n-lines-en-apply.ts --src <원본.json> --verify
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { SPEECH_LINES_PER_SITUATION, SPEECH_SITUATIONS } from '../lib/celeb-speech-research'

function loadEnv() {
  for (const filename of ['.env.local', '.env']) {
    const file = resolve(process.cwd(), filename)
    if (!existsSync(file)) continue
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].replace(/^["']|["']$/g, '')
      }
    }
  }
}
loadEnv()

const SITUATIONS = SPEECH_SITUATIONS

const arg = (flag: string, fallback = '') => {
  const i = process.argv.indexOf(flag)
  return i >= 0 ? (process.argv[i + 1] ?? fallback) : fallback
}
const APPLY = process.argv.includes('--apply')
const VERIFY_ONLY = process.argv.includes('--verify')
const SRC = arg('--src')
const IN_DIR = arg('--in')

if (!SRC) throw new Error('--src <원본 JSON 경로> 가 필요하다')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 필요')
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

type SrcRow = {
  slug: string
  name: string
  title: string | null
  title_en: string | null
  dialogue: { celeb_id: string; lines: Record<string, unknown>; lines_en: Record<string, unknown> | null } | null
}

/** 곱슬 따옴표·대시를 DB 통용 표기(직선 따옴표)로 정규화한다. */
function normalize(s: string): string {
  return s
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/—/g, ',')
    .replace(/\s+/g, ' ')
    .trim()
}

function validateLines(lines: Record<string, string[]>): string[] {
  const errs: string[] = []
  for (const k of SITUATIONS) {
    const v = lines[k]
    if (!Array.isArray(v) || v.length !== SPEECH_LINES_PER_SITUATION) {
      errs.push(`${k} 길이≠${SPEECH_LINES_PER_SITUATION}`)
      continue
    }
    v.forEach((s, i) => {
      if (typeof s !== 'string' || !s.trim()) errs.push(`${k}[${i}] 빈값`)
      else if (/[가-힣]/.test(s)) errs.push(`${k}[${i}] 한글`)
      else if (/^\s*\[/.test(s)) errs.push(`${k}[${i}] 대괄호 태그`)
    })
  }
  return errs
}

async function verify(slugs: string[]) {
  const rows: Array<{ slug: string; title_en: string | null; lines_en: Record<string, unknown> | null }> = []
  for (let i = 0; i < slugs.length; i += 100) {
    const { data, error } = await db
      .from('celebs')
      .select('slug, title, title_en, celeb_dialogues(lines, lines_en)')
      .in('slug', slugs.slice(i, i + 100))
    if (error) throw new Error(error.message)
    for (const c of data ?? []) {
      const d = Array.isArray(c.celeb_dialogues) ? c.celeb_dialogues[0] : c.celeb_dialogues
      rows.push({ slug: c.slug, title_en: c.title_en, lines_en: d?.lines_en ?? null })
    }
  }
  let full = 0
  const bad: string[] = []
  for (const r of rows) {
    const le = (r.lines_en ?? {}) as Record<string, unknown>
    const problems: string[] = []
    if (typeof le.quote !== 'string' || !le.quote.trim()) problems.push('quote')
    for (const k of SITUATIONS) {
      const v = le[k]
      if (
        !Array.isArray(v) ||
        v.length !== SPEECH_LINES_PER_SITUATION ||
        v.some((s) => typeof s !== 'string' || !s.trim())
      )
        problems.push(k)
    }
    if (!r.title_en || !r.title_en.trim()) problems.push('title_en')
    if (problems.length === 0) full++
    else bad.push(`${r.slug}: ${problems.join(',')}`)
  }
  console.log(`재조회 ${rows.length}명 / 8키+title_en 완비 ${full}명 / 결손 ${bad.length}명`)
  if (bad.length) console.log(bad.join('\n'))
  return { total: rows.length, full, bad }
}

async function main() {
  const src: SrcRow[] = JSON.parse(readFileSync(resolve(SRC), 'utf8'))

  if (VERIFY_ONLY) {
    await verify(src.map((r) => r.slug))
    return
  }

  if (!IN_DIR) throw new Error('--in <생성물 폴더> 가 필요하다')
  const dir = resolve(IN_DIR)
  const files = new Set(readdirSync(dir).filter((f) => f.endsWith('.json')))

  const dialoguePatches: Array<{ celeb_id: string; lines_en: Record<string, unknown> }> = []
  const titlePatches: Array<{ slug: string; title_en: string }> = []
  const skipped: string[] = []
  const failed: string[] = []

  for (const row of src) {
    const file = `${row.slug}.json`
    if (!files.has(file)) {
      skipped.push(`${row.slug}: 생성물 없음`)
      continue
    }
    if (!row.dialogue?.celeb_id) {
      failed.push(`${row.slug}: celeb_id 없음`)
      continue
    }
    const gen = JSON.parse(readFileSync(join(dir, file), 'utf8')) as {
      title_en?: string
      english_lines?: Record<string, string[]>
    }
    const lines: Record<string, string[]> = {}
    for (const k of SITUATIONS) {
      const v = gen.english_lines?.[k]
      if (Array.isArray(v)) lines[k] = v.map((s) => normalize(String(s)))
    }
    const errs = validateLines(lines)
    if (errs.length) {
      failed.push(`${row.slug}: ${errs.join('; ')}`)
      continue
    }

    // 기존 lines_en(특히 quote)을 보존하고 7상황만 얹는다.
    const merged: Record<string, unknown> = { ...(row.dialogue.lines_en ?? {}) }
    for (const k of SITUATIONS) merged[k] = lines[k]
    if (typeof merged.quote !== 'string' || !merged.quote.trim()) {
      failed.push(`${row.slug}: 기존 quote_en 없음 — 건너뜀`)
      continue
    }
    dialoguePatches.push({ celeb_id: row.dialogue.celeb_id, lines_en: merged })

    let titleEn = gen.title_en ? normalize(gen.title_en) : ''
    // 한국어 title이 겹낫표로 감싸여 있으면 영문도 같은 표기를 유지한다(DB 통용 규칙).
    const koWrapped = /^「.*」$/.test((row.title ?? '').trim())
    if (titleEn) {
      const bare = titleEn.replace(/^「|」$/g, '').trim()
      titleEn = koWrapped ? `「${bare}」` : bare
    }
    if (titleEn && !(row.title_en && row.title_en.trim())) {
      titlePatches.push({ slug: row.slug, title_en: titleEn })
    }
  }

  console.log(
    `대상 ${src.length}명 / lines_en 패치 ${dialoguePatches.length} / title_en 패치 ${titlePatches.length} / 건너뜀 ${skipped.length} / 실패 ${failed.length}`,
  )
  if (skipped.length) console.log('건너뜀:\n' + skipped.join('\n'))
  if (failed.length) console.log('실패:\n' + failed.join('\n'))

  if (!APPLY) {
    console.log('\ndry-run이다. 반영하려면 --apply 를 붙인다.')
    return
  }

  let okDia = 0
  for (const p of dialoguePatches) {
    const { error } = await db
      .from('celeb_dialogues')
      .update({ lines_en: p.lines_en, updated_at: new Date().toISOString() })
      .eq('celeb_id', p.celeb_id)
    if (error) {
      failed.push(`${p.celeb_id}: ${error.message}`)
      continue
    }
    okDia++
  }

  let okTitle = 0
  for (const p of titlePatches) {
    const { error } = await db.from('celebs').update({ title_en: p.title_en }).eq('slug', p.slug)
    if (error) {
      failed.push(`${p.slug} title: ${error.message}`)
      continue
    }
    okTitle++
  }

  console.log(`반영: lines_en ${okDia}건 / title_en ${okTitle}건 / 오류 ${failed.length}건`)
  if (failed.length) console.log(failed.join('\n'))

  console.log('\n왕복 검증')
  await verify(src.map((r) => r.slug))
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
