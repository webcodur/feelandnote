/*
  판본 대조에서 어긋난 쿠팡 상품을 비활성화한다.
  작품·판본·인물 관계는 건드리지 않는다. 상품만 이력으로 남기고 활성 표시를 내린다.

  사용: node deactivate-mismatched.mjs <대조결과.json>            (dry-run)
        node deactivate-mismatched.mjs <대조결과.json> --apply

  대상:
    - isbnVerdict === 'mismatch'            상품 ISBN이 등록 판본과 다르다
    - hasRealBadge === false (읽기 성공분)   상품 영역에 배송 배지가 없다
  읽기에 실패한 행(detailPublisher가 비었다)은 판정하지 않고 남긴다.
*/
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(HERE, '../../../..')
const requireWeb = createRequire(path.join(REPO, 'sw/web/package.json'))
const { createClient } = requireWeb('@supabase/supabase-js')

const [inFile] = process.argv.slice(2).filter((argument) => !argument.startsWith('--'))
const apply = process.argv.includes('--apply')
if (!inFile) throw new Error('대조결과.json 경로가 필요합니다.')

function pickEnv(name) {
  const value = process.env[name]
  if (!value) throw new Error(`${name}이(가) 필요합니다.`)
  return value
}
const db = createClient(pickEnv('NEXT_PUBLIC_DB_API_URL'), pickEnv('DB_SECRET_KEY'), {
  auth: { autoRefreshToken: false, persistSession: false },
})

const rows = JSON.parse(fs.readFileSync(inFile, 'utf8'))
const readable = rows.filter((row) => row.detailPublisher)
const unreadable = rows.length - readable.length

const targets = readable.filter((row) => row.isbnVerdict === 'mismatch' || !row.hasRealBadge)
if (targets.length === 0) {
  console.log(`정리 대상 없음 (읽기 성공 ${readable.length} / 실패 ${unreadable})`)
  process.exit(0)
}

const contentIds = [...new Set(targets.map((row) => row.content_id))]
const { data: editions, error: editionError } = await db
  .from('figure_book_editions')
  .select('id,content_id,isbn')
  .eq('locale', 'ko')
  .in('content_id', contentIds)
if (editionError) throw new Error(`판본 조회 실패: ${editionError.message}`)

const editionByKey = new Map((editions ?? []).map((row) => (
  [`${row.content_id}:${String(row.isbn ?? '').replace(/[\s-]/g, '')}`, row.id]
)))

const plan = []
const skipped = []
for (const row of targets) {
  const editionId = editionByKey.get(`${row.content_id}:${row.wantIsbn}`)
  if (!editionId) {
    skipped.push({ ...row, reason: 'edition_not_found' })
    continue
  }
  plan.push({
    editionId,
    productId: row.productId,
    title: row.title,
    reason: row.isbnVerdict === 'mismatch'
      ? `판본 불일치 (등록 ${row.wantIsbn} / 상품 ${row.gotIsbn})`
      : '상품 영역에 배송 배지 없음',
  })
}

console.log(`읽기 성공 ${readable.length} / 실패 ${unreadable}`)
console.log(`비활성화 대상 ${plan.length}건 / 판본 못 찾음 ${skipped.length}건`)
for (const row of plan.slice(0, 20)) console.log(`  · ${row.title.slice(0, 40)} — ${row.reason}`)
if (plan.length > 20) console.log(`  … 외 ${plan.length - 20}건`)

if (!apply) {
  console.log('\ndry-run이다. 반영하려면 --apply를 붙인다.')
  process.exit(0)
}

let done = 0
for (const row of plan) {
  const { error } = await db
    .from('figure_book_products')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('edition_id', row.editionId)
    .eq('platform', 'coupang')
    .eq('product_id', row.productId)
    .eq('is_active', true)
  if (error) console.error(`실패: ${row.title} — ${error.message}`)
  else done += 1
}
console.log(`\n비활성화 완료 ${done} / ${plan.length}`)
