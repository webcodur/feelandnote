/*
  candidates.mjs가 모은 후보에서 사람이 볼 목록을 짧게 만든다.
  상품을 고르지 않는다. 출판사·저자가 상품명에 그대로 보이고 배송 배지가 붙은 것만 남겨
  36개짜리 검색 결과를 한두 개로 줄이는 일만 한다. 최종 판정은 inspect.mjs와 사람이 한다.

  사용: node shortlist.mjs <후보.json> <검토대상.json> [--all]
        --all 을 주면 배송 배지가 없는 일치 후보도 함께 남긴다(판정 참고용).
*/
import fs from 'node:fs'
import path from 'node:path'

const [inFile, outFile] = process.argv.slice(2).filter((argument) => !argument.startsWith('--'))
const keepUnbadged = process.argv.includes('--all')
if (!inFile || !outFile) throw new Error('후보.json과 검토대상.json 경로가 필요합니다.')

const rows = JSON.parse(fs.readFileSync(inFile, 'utf8'))

function squash(value) {
  return String(value ?? '').replace(/[\s·:;,()[\]{}"'`~!?.「」『』<>-]/g, '').toLowerCase()
}

// 저자 표기는 "등용 저/정인갑 역"처럼 역할어가 붙는다. 이름 조각만 뽑아 대조한다.
function creatorParts(value) {
  return String(value ?? '')
    .replace(/\((.*?)\)/g, ' ')
    .split(/[,;/]|\s외\s/)
    .map((part) => squash(part.replace(/(지음|옮김|엮음|편저|편역|역주|주해|해설|글|그림|편|저|역)\s*$/g, '')))
    .filter((part) => part.length >= 2)
}

const shortlist = []
const empty = []

for (const row of rows) {
  const publisher = squash(row.publisher)
  const creators = creatorParts(row.creator)
  const scored = (row.candidates ?? []).map((candidate) => {
    const name = squash(candidate.name)
    const publisherHit = publisher.length >= 2 && name.includes(publisher)
    const creatorHit = creators.some((part) => name.includes(part))
    return { candidate, publisherHit, creatorHit }
  })

  const matched = scored.filter((entry) => entry.publisherHit || entry.creatorHit)
  const strong = matched.filter((entry) => entry.candidate.hasDeliveryBadge)
  const chosen = strong.length > 0 ? strong : (keepUnbadged ? matched : [])

  if (chosen.length === 0) {
    empty.push({ title: row.title, publisher: row.publisher, isbn: row.isbn, matchedWithoutBadge: matched.length })
    continue
  }

  for (const entry of chosen) {
    shortlist.push({
      ...(row.content_id ? { content_id: row.content_id } : { candidate_key: row.candidate_key }),
      isbn: row.isbn,
      title: row.title,
      creator: row.creator,
      publisher: row.publisher,
      query: row.query,
      name: entry.candidate.name,
      price: entry.candidate.price,
      productId: entry.candidate.productId,
      productUrl: entry.candidate.productUrl,
      hasDeliveryBadge: Boolean(entry.candidate.hasDeliveryBadge),
      matchedOn: [entry.publisherHit ? 'publisher' : null, entry.creatorHit ? 'creator' : null].filter(Boolean),
    })
  }
}

fs.mkdirSync(path.dirname(outFile), { recursive: true })
fs.writeFileSync(outFile, JSON.stringify(shortlist, null, 2), 'utf8')

const works = new Set(shortlist.map((row) => row.isbn)).size
console.log(`대상 ${rows.length}권 / 후보 남김 ${shortlist.length}건 (작품 ${works}권) / 후보 없음 ${empty.length}권`)
console.log(`  배송 배지 있는 후보만 남겼다${keepUnbadged ? ' (--all: 배지 없는 일치 후보 포함)' : ''}.`)
console.log(`WROTE ${outFile}`)
if (empty.length > 0) {
  console.log('\n후보를 못 찾은 책 (앞 15권):')
  for (const row of empty.slice(0, 15)) {
    console.log(`  · ${row.title} | ${row.publisher} | 배지 없는 일치 ${row.matchedWithoutBadge}건`)
  }
}
