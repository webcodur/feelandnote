/**
 * 재조사한 한마디를 DB에 반영한다.
 *
 * FICTION 124명의 한마디가 원전 직접화법이 아니라 창작 격언으로 들어가 있었다. 규격은 이것을
 * 명시적으로 불허하며(celeb-04-01-speech.md 「한마디」),
 * 조사해서 찾거나 못 찾으면 표준 자리 표시를 넣는 두 갈래뿐이다.
 *
 * 입력: data/celeb/gap-fill/quote-fix/out/<slug>.json
 *   found: true  → quote_ko / quote_en 을 넣는다
 *   found: false → 표준 자리 표시를 넣는다(실제로 연 출처 3곳·호스트 2곳을 확인한 뒤)
 *
 * 상황 대사(lines 의 7상황)는 건드리지 않는다. quote 키 하나만 바꾼다.
 *
 * 실행 (sw/web-bo 에서): node scripts/celeb/quote-fix-apply.mjs [--apply]
 */

import path from 'node:path'
import fs from 'node:fs'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: path.resolve(process.cwd(), '.env'), quiet: true })
const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL, process.env.DB_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const DIR = path.resolve(process.cwd(), '../../data/celeb/gap-fill/quote-fix/out')
const KO = '[확인된 어록이 없습니다]'
const EN = '[No verified quote]'
const APPLY = process.argv.includes('--apply')

const host = (u) => { try { return new URL(u).host } catch { return '' } }

function validate(o) {
  const errs = []
  if (!o.slug) errs.push('slug 없음')
  if (!Array.isArray(o.inspected)) errs.push('inspected 없음')
  if (o.found) {
    // 찾았다면 한영 한마디와 출처 URL 하나가 있어야 한다.
    const ko = String(o.quote_ko ?? '').trim()
    if (!ko) errs.push('quote_ko 없음')
    else if ([...ko].length > 50) errs.push(`quote_ko ${[...ko].length}자 — 50자 초과`)
    if (!String(o.quote_en ?? '').trim()) errs.push('quote_en 없음')
    if (!host(o.quote_src)) errs.push(`quote_src 가 URL 이 아니다: ${String(o.quote_src ?? '').slice(0, 60)}`)
    if ((o.inspected?.length ?? 0) < 2) errs.push('inspected 2건 미만')
  } else {
    // 없다고 판정하려면 출처 3곳·호스트 2곳을 실제로 열어야 한다.
    if (!String(o.unavailable_reason ?? '').trim()) errs.push('unavailable_reason 없음')
    if ((o.inspected?.length ?? 0) < 3) errs.push('inspected 3건 미만')
    else if (new Set(o.inspected.map(([u]) => host(u))).size < 2) errs.push('호스트 2곳 미만')
  }
  return errs
}

async function main() {
  const files = fs.existsSync(DIR) ? fs.readdirSync(DIR).filter((f) => f.endsWith('.json')) : []
  const slugs = files.map((f) => f.replace(/\.json$/, ''))
  const { data: celebs, error } = await db.from('celebs').select('id,slug,nickname').in('slug', slugs)
  if (error) throw new Error(error.message)
  const idOf = new Map(celebs.map((c) => [c.slug, c.id]))
  const nameOf = new Map(celebs.map((c) => [c.slug, c.nickname]))

  const ids = [...idOf.values()]
  const dialogues = []
  for (let i = 0; i < ids.length; i += 100) {
    const { data } = await db.from('celeb_dialogues').select('celeb_id,lines,lines_en').in('celeb_id', ids.slice(i, i + 100))
    dialogues.push(...(data ?? []))
  }
  const diaOf = new Map(dialogues.map((d) => [d.celeb_id, d]))

  let found = 0, unavailable = 0, failed = 0
  for (const f of files) {
    const o = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'))
    const errs = validate(o)
    if (errs.length) { failed++; console.log(`FAIL ${o.slug ?? f} — ${errs.join(' | ')}`); continue }

    const id = idOf.get(o.slug)
    const dia = id && diaOf.get(id)
    if (!dia) { failed++; console.log(`FAIL ${o.slug} — 대사 행 없음`); continue }

    const ko = o.found ? o.quote_ko.trim() : KO
    const en = o.found ? o.quote_en.trim() : EN
    console.log(`${o.found ? 'QUOTE' : 'NONE '} ${o.slug}\t${nameOf.get(o.slug) ?? ''}\t${ko}`)

    if (APPLY) {
      const { error: e } = await db.from('celeb_dialogues').update({
        lines: { ...dia.lines, quote: ko },
        lines_en: { ...(dia.lines_en ?? {}), quote: en },
      }).eq('celeb_id', id)
      if (e) { failed++; console.log(`  ERR ${e.message}`); continue }
    }
    if (o.found) found++; else unavailable++
  }
  console.log(`\n${APPLY ? '' : '(dry) '}원전 대사 ${found}명 · 자리 표시 ${unavailable}명 · 실패 ${failed}건 / 산출물 ${files.length}건`)
}

main()
