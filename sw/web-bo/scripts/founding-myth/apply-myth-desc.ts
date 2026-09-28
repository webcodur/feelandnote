/**
 * 신화 개요 규격 통일본(data/celeb/myth-desc/out/*.json)을
 * faction_lv2.description / description_en 에 반영한다. 기본은 dry-run.
 *
 * apply-tradition-desc.ts와 달리 기존 개요를 덮어쓴다 — 이 작업의 목적이
 * 길이 제각각인 개요의 규격 통일이기 때문이다. 원본은 myth-desc/current-full.json에 있다.
 * 반영 뒤 같은 조건으로 재조회해 왕복 검증한다.
 *
 * 실행 (sw/web-bo 에서):
 *   pnpm exec tsx scripts/founding-myth/apply-myth-desc.ts
 *   pnpm exec tsx scripts/founding-myth/apply-myth-desc.ts --apply
 */
import path from 'node:path'
import fs from 'node:fs'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: path.resolve(process.cwd(), '.env'), quiet: true })
const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL!, process.env.DB_SECRET_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const argDir = process.argv.indexOf('--dir')
const IN_DIR = path.resolve(process.cwd(), argDir > -1
  ? `../../data/celeb/myth-desc/${process.argv[argDir + 1]}`
  : '../../data/celeb/myth-desc/out')
const APPLY = process.argv.includes('--apply')

async function main() {
  const files = fs.existsSync(IN_DIR) ? fs.readdirSync(IN_DIR).filter((f) => f.endsWith('.json')).sort() : []
  if (!files.length) throw new Error('개요 출력이 없다')

  const { data: tags, error } = await db.from('faction_lv2').select('id,slug,name,description,description_en').eq('is_myth', true)
  if (error) throw new Error(error.message)
  const byslug = new Map((tags ?? []).map((t: any) => [t.slug, t]))

  let ok = 0, skipped = 0, failed = 0
  for (const f of files) {
    const o = JSON.parse(fs.readFileSync(path.join(IN_DIR, f), 'utf8'))
    const myth: any = byslug.get(o.slug)
    if (!myth) { console.log(`FAIL ${o.slug} — DB에 없다`); failed++; continue }

    const patch: Record<string, string> = {}
    if (o.description && o.description !== myth.description) patch.description = o.description
    if (o.description_en && o.description_en !== myth.description_en) patch.description_en = o.description_en
    if (!Object.keys(patch).length) { console.log(`SKIP ${myth.name} — 동일`); skipped++; continue }

    if (!APPLY) {
      console.log(`DRY  ${myth.name} ← ${Object.keys(patch).join(',')} (${(myth.description ?? '').length}자 → ${o.description.length}자)`)
      ok++; continue
    }

    const { error: e } = await db.from('faction_lv2').update(patch).eq('id', myth.id)
    if (e) { console.log(`FAIL ${myth.name} — ${e.message}`); failed++; continue }

    const { data: after } = await db.from('faction_lv2').select('description,description_en').eq('id', myth.id).single()
    const good = (!patch.description || after?.description === patch.description)
      && (!patch.description_en || after?.description_en === patch.description_en)
    if (!good) { console.log(`FAIL ${myth.name} — 왕복 검증 불일치`); failed++; continue }
    console.log(`OK   ${myth.name} ← ${Object.keys(patch).join(',')} (${o.description.length}자)`)
    ok++
  }
  console.log(`\n## ${APPLY ? 'APPLY' : 'DRY-RUN'}\n- ${APPLY ? 'UPDATED' : 'WOULD UPDATE'}: ${ok}건\n- SKIPPED: ${skipped}건\n- FAILED: ${failed}건`)
}

main()
