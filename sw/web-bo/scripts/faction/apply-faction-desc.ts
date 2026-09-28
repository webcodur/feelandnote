/**
 * 비신화 세력 개요 재작성본(data/celeb/faction-desc-v3/out/*.json)을
 * faction_lv2.description / description_en 에 반영한다. 기본은 dry-run.
 * 신화 v3 산출물도 같은 방식으로 반영할 수 있게 --dir을 받는다.
 *
 * 실행 (sw/web-bo 에서):
 *   pnpm exec tsx scripts/faction/apply-faction-desc.ts
 *   pnpm exec tsx scripts/faction/apply-faction-desc.ts --apply
 *   pnpm exec tsx scripts/faction/apply-faction-desc.ts --dir ../../data/celeb/myth-desc-v3/out-v3
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
  ? process.argv[argDir + 1]
  : '../../data/celeb/faction-desc-v3/out')
const APPLY = process.argv.includes('--apply')

async function main() {
  const files = fs.existsSync(IN_DIR) ? fs.readdirSync(IN_DIR).filter((f) => f.endsWith('.json')).sort() : []
  if (!files.length) throw new Error('개요 출력이 없다')

  const byslug = new Map<string, any>()
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await db.from('faction_lv2')
      .select('id,slug,name,description,description_en').order('slug').range(offset, offset + 499)
    if (error) throw new Error(error.message)
    for (const t of data ?? []) byslug.set(t.slug, t)
    if (!data || data.length < 500) break
  }

  let ok = 0, skipped = 0, failed = 0
  for (const f of files) {
    const o = JSON.parse(fs.readFileSync(path.join(IN_DIR, f), 'utf8'))
    const fac: any = byslug.get(o.slug)
    if (!fac) { console.log(`FAIL ${o.slug} — DB에 없다`); failed++; continue }

    const patch: Record<string, string> = {}
    if (o.description && o.description !== fac.description) patch.description = o.description
    if (o.description_en && o.description_en !== fac.description_en) patch.description_en = o.description_en
    if (!Object.keys(patch).length) { console.log(`SKIP ${fac.name} — 동일`); skipped++; continue }

    if (!APPLY) {
      console.log(`DRY  ${fac.name} ← ${Object.keys(patch).join(',')} (${(fac.description ?? '').length}자 → ${o.description.length}자)`)
      ok++; continue
    }

    const { error: e } = await db.from('faction_lv2').update(patch).eq('id', fac.id)
    if (e) { console.log(`FAIL ${fac.name} — ${e.message}`); failed++; continue }

    const { data: after } = await db.from('faction_lv2').select('description,description_en').eq('id', fac.id).single()
    const good = (!patch.description || after?.description === patch.description)
      && (!patch.description_en || after?.description_en === patch.description_en)
    if (!good) { console.log(`FAIL ${fac.name} — 왕복 검증 불일치`); failed++; continue }
    console.log(`OK   ${fac.name} ← ${Object.keys(patch).join(',')} (${o.description.length}자)`)
    ok++
  }
  console.log(`\n## ${APPLY ? 'APPLY' : 'DRY-RUN'}\n- ${APPLY ? 'UPDATED' : 'WOULD UPDATE'}: ${ok}건\n- SKIPPED: ${skipped}건\n- FAILED: ${failed}건`)
}

main()
