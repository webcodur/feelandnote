/**
 * 같은 작품이 content 행 두 개로 갈려 목록과 인물 감상이 서로 다른 행에 붙은 것을 잇는다
 *
 * 증상 — 큐레이션 목록에서 책을 눌러도 인물 감상 카드가 뜨지 않는다.
 * 목록은 감상이 하나도 없는 A행을 가리키고, 인물 감상은 같은 작품의 B행에 몰려 있다.
 *
 * 고치는 방법 — `curated_list_items.content_id` 를 A행에서 B행으로 옮긴다.
 * 인물 감상(`celeb_contents`)은 건드리지 않는다. 연결 테이블 한 곳만 바꾸므로 되돌리기 쉽다.
 * 실행 전 원본을 `repoint-backup.json` 에 남긴다.
 *
 * 대상 판정은 `data/curated-lists/_split-rows/repoint.json` 이 쥔다.
 * 동일 작품 확정 근거는 ISBN 일치 또는 제목+저자 일치이며, 제목만 같고 저자가 다른 건은 제외돼 있다.
 *
 * 사용법 (sw/web-bo 에서):
 *   npx tsx scripts/curated/repoint-split-items.ts          # 무엇이 바뀔지 보기만
 *   npx tsx scripts/curated/repoint-split-items.ts --yes    # 실제 반영
 *   npx tsx scripts/curated/repoint-split-items.ts --revert  # 백업으로 되돌리기
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { REPO_ROOT } from '../lib/paths'

const ROOT = REPO_ROOT
const WORK = join(ROOT, 'data/curated-lists/_split-rows')
const PLAN = join(WORK, 'repoint.json')
const BACKUP = join(WORK, 'repoint-backup.json')

function loadEnv(p: string) {
  if (!existsSync(p)) return
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
}
loadEnv(join(ROOT, '.env'))
loadEnv(join(ROOT, 'sw/web-bo/.env'))
loadEnv(join(ROOT, 'sw/web/.env'))

const db = createClient(
  process.env.NEXT_PUBLIC_DB_API_URL!,
  (process.env.DB_SECRET_KEY || process.env.NEXT_PUBLIC_DB_PUBLISHABLE_KEY)!,
)

type Move = { itemId: string; from: string; to: string; slug: string; raw: string; list_id: string }
const args = process.argv.slice(2)
const go = args.includes('--yes')
const revert = args.includes('--revert')

async function main() {
  if (revert) {
    if (!existsSync(BACKUP)) throw new Error('백업 파일이 없다')
    const rows: { id: string; content_id: string }[] = JSON.parse(readFileSync(BACKUP, 'utf8'))
    let n = 0
    for (const r of rows) {
      const { error } = await db.from('curated_list_items').update({ content_id: r.content_id }).eq('id', r.id)
      if (error) console.log('되돌리기 실패', r.id, error.message.slice(0, 80))
      else n++
    }
    console.log(`되돌림 ${n}/${rows.length}`)
    return
  }

  const plan: Move[] = JSON.parse(readFileSync(PLAN, 'utf8'))
  console.log(`대상 목록 항목 ${plan.length}개`)

  if (!go) {
    for (const p of plan.slice(0, 15)) console.log(`  ${p.slug.padEnd(32)} ${String(p.raw).slice(0, 40)}`)
    console.log('\n[점검만] 실제로 옮기려면 --yes 를 붙인다.')
    return
  }

  // 되돌릴 수 있도록 현재 값을 먼저 저장한다
  const { data: before, error: e0 } = await db
    .from('curated_list_items')
    .select('id,list_id,content_id')
    .in('id', plan.map((p) => p.itemId))
  if (e0) throw e0
  writeFileSync(BACKUP, JSON.stringify(before, null, 1))
  console.log(`되돌리기용 원본 ${before!.length}건 저장`)

  let ok = 0
  let fail = 0
  for (const p of plan) {
    const { error } = await db.from('curated_list_items').update({ content_id: p.to }).eq('id', p.itemId)
    if (error) {
      fail++
      console.log('실패', p.slug, p.raw, error.message.slice(0, 80))
    } else ok++
  }
  console.log(`\n연결 이동 완료 — 성공 ${ok} / 실패 ${fail}`)

  // 검증 — 옮긴 항목이 실제로 감상 있는 행을 가리키는가
  const targets = [...new Set(plan.map((p) => p.to))]
  const { data: after } = await db
    .from('curated_list_items')
    .select('id,content_id')
    .in('id', plan.map((p) => p.itemId))
  const moved = (after ?? []).filter((r) => targets.includes(r.content_id!)).length
  const { data: cnt } = await db.from('contents').select('id,celeb_count').in('id', targets)
  const withRev = (cnt ?? []).filter((c) => (c.celeb_count ?? 0) > 0).length
  console.log(`검증 — 옮겨진 항목 ${moved}/${plan.length} · 대상 작품 ${targets.length}건 중 인물 감상 있는 것 ${withRev}건`)
}

main().catch((e) => {
  console.error(String(e?.message ?? e))
  process.exit(1)
})
