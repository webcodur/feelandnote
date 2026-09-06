/*
  근거 회수 결과에서 작품당 상품 하나를 골라 pick.mjs 입력을 만든다.
  같은 판본·플랫폼에는 활성 상품이 하나만 있어야 하므로 content_id마다 한 건만 남긴다.

  고르는 순서: 상품명에 출판사·저자가 함께 보이는 것 > 상품평이 많은 것 > 싼 것.
  쿠팡 상품 페이지는 ISBN을 대개 노출하지 않으므로 판본 일치는 상품명으로 판정한다.
  pick.mjs가 다시 검색해 같은 상품 ID를 확인하므로 여기서 확정하지 않는다.

  사용: node choose.mjs <근거.json> <후보.json> <선택.json>
*/
import fs from 'node:fs'
import path from 'node:path'

const [evidenceFile, shortlistFile, outFile] = process.argv.slice(2)
if (!evidenceFile || !shortlistFile || !outFile) {
  throw new Error('근거.json, 후보.json, 선택.json 경로가 필요합니다.')
}

const evidence = JSON.parse(fs.readFileSync(evidenceFile, 'utf8'))
const shortlist = JSON.parse(fs.readFileSync(shortlistFile, 'utf8'))

const shortByKey = new Map(shortlist.map((row) => [`${row.isbn}:${row.productId}`, row]))

function reviewCount(salesLines) {
  let best = 0
  for (const line of salesLines ?? []) {
    const matched = String(line).match(/([\d,]+)\s*개\s*상품평/)
    if (matched) best = Math.max(best, Number(matched[1].replace(/,/g, '')) || 0)
  }
  return best
}

// 배송 배지 문구만 남긴다. 안내·환불 문구는 근거가 아니다.
function deliveryEvidence(lines) {
  const keep = []
  for (const line of lines ?? []) {
    const text = String(line).trim()
    if (text.length > 30) continue
    if (/로켓배송|로켓프레시|로켓직구|도착 보장|오늘도착|내일도착|무료배송/.test(text)) keep.push(text)
  }
  return [...new Set(keep)].slice(0, 4)
}

const byContent = new Map()
for (const row of evidence) {
  if (!row.hasDeliveryEvidence) continue
  const short = shortByKey.get(`${row.isbn}:${row.productId}`)
  const matchedOn = short?.matchedOn ?? []
  const score = (matchedOn.includes('publisher') ? 2 : 0) + (matchedOn.includes('creator') ? 1 : 0)
  const entry = {
    row,
    short,
    score,
    reviews: reviewCount(row.salesLines),
    price: Number(String(short?.price ?? '').replace(/[^\d]/g, '')) || Number.MAX_SAFE_INTEGER,
  }
  const bucket = byContent.get(row.content_id) ?? []
  bucket.push(entry)
  byContent.set(row.content_id, bucket)
}

const picks = []
const dropped = []
for (const [contentId, bucket] of byContent) {
  bucket.sort((left, right) => (
    right.score - left.score || right.reviews - left.reviews || left.price - right.price
  ))
  const best = bucket[0]
  const badges = deliveryEvidence(best.row.deliveryLines)
  if (badges.length === 0) {
    dropped.push({ contentId, title: best.row.title, reason: 'no_delivery_badge_text' })
    continue
  }
  const evidenceLines = [...badges]
  if (best.reviews > 0) evidenceLines.push(`상품평 ${best.reviews}개`)

  picks.push({
    content_id: contentId,
    isbn: best.row.isbn,
    title: best.row.title,
    query: best.row.query,
    name: best.row.name,
    productId: best.row.productId,
    productUrl: best.row.productUrl,
    qualityEvidence: evidenceLines,
    state: 'pending_short_link',
  })
}

fs.mkdirSync(path.dirname(outFile), { recursive: true })
fs.writeFileSync(outFile, JSON.stringify(picks, null, 2), 'utf8')

console.log(`작품 ${byContent.size}권 중 ${picks.length}권 선택 / 배지 문구 없어 제외 ${dropped.length}권`)
console.log(`WROTE ${outFile}`)
