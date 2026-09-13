/**
 * 한마디(quote)가 비어 있는 인물에 표준 자리 표시 값을 박는다.
 *
 * 한마디는 조사해서 찾는 실제 발언이다. 끝내 못 찾으면 비워 두는 것이 아니라
 * 「확인된 어록이 없습니다」를 넣는다 — 화면이 빈 자리를 그리지 않게 하려는 규격이며
 * 이미 294명이 이 값을 쓰고 있다(scripts/lib/celeb-speech-research.ts 의 상수).
 * 옛 표기(「검증된 인용문 없음」)가 섞여 있으면 정본으로 통일한다.
 *
 * 실행 (sw/web-bo 에서): node scripts/celeb/quote-placeholder-fill.mjs [--dry]
 */

import path from 'node:path'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: path.resolve(process.cwd(), '.env'), quiet: true })
const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL, process.env.DB_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const KO = '[확인된 어록이 없습니다]'
const EN = '[No verified quote]'
const LEGACY_KO = ['[검증된 인용문 없음]']
const DRY = process.argv.includes('--dry')

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

const rows = await all('celeb_dialogues', 'celeb_id,lines,lines_en')
const celebs = await all('celebs', 'id,slug,nickname')
const byId = new Map(celebs.map((c) => [c.id, c]))

let filled = 0, normalized = 0, enOnly = 0
for (const r of rows) {
  const q = r.lines?.quote
  const isBlank = !q || !String(q).trim()
  const isLegacy = LEGACY_KO.includes(q)
  // 한국어가 이미 표준값인데 영문만 비어 있는 인물도 짝을 맞춘다.
  const enMissing = q === KO && !String(r.lines_en?.quote ?? '').trim()
  if (!isBlank && !isLegacy && !enMissing) continue

  const c = byId.get(r.celeb_id)
  const lines = { ...(r.lines ?? {}) }
  lines.quote = KO
  const patch = { lines }

  // 영문 자리 표시도 함께 맞춘다. 상황 대사는 영문 대사 배치가 나중에 얹는다.
  patch.lines_en = { ...(r.lines_en ?? {}), quote: EN }

  console.log(`${isLegacy ? 'NORM' : enMissing ? 'EN  ' : 'FILL'} ${c?.slug ?? r.celeb_id}\t${c?.nickname ?? ''}`)
  if (!DRY) {
    const { error } = await db.from('celeb_dialogues').update(patch).eq('celeb_id', r.celeb_id)
    if (error) { console.log(`  ERR ${error.message}`); continue }
  }
  if (isLegacy) normalized++
  else if (enMissing) enOnly++
  else filled++
}
console.log(`\n${DRY ? '(dry) ' : ''}자리 표시 삽입 ${filled}명 · 영문만 보충 ${enOnly}명 · 옛 표기 정본화 ${normalized}명`)
