/**
 * 위키데이터 작품 정보 추출 — 인물에 걸린 작품 항목(책)을 꺼내 인물 단위 JSONL로 쌓는다. 인물 도서 정비의 첫 단계.
 * 인물 12명을 한 SPARQL로 묶어 호출 수를 줄인다.
 * DB는 읽기만 한다. 같은 --out으로 다시 실행하면 이미 기록된 인물은 건너뛴다.
 *
 * node --env-file=.env scripts/figure-books/wikidata-works-extract.mjs [--limit N] [--batch 40]
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { allRows, argumentValue, dbClient, sleep, wbEntities, wdQid, wdValue, wdqs } from './lib/figure-work.mjs'

// /api/celeb-works와 같은 작품 항목 유형. 문학·비문학 책 항목이다.
const BOOK_TYPES = ['Q7725634', 'Q571', 'Q8261', 'Q47461344', 'Q49084', 'Q5185279', 'Q35760',
  'Q277759', 'Q23622', 'Q131539', 'Q780605', 'Q386724', 'Q5292', 'Q860861', 'Q17518461', 'Q3331189', 'Q28869365']

// 간선만 묻는다. 라벨·ISBN은 물론 P31 유형 조인까지 SPARQL에 얹으면 실제 인물 묶음에서 60초를 넘긴다. 유형은 엔티티 API가 준 P31로 거른다.
function buildSparql(qids) {
  return `SELECT ?person ?work ?prop WHERE {
  VALUES ?person { ${qids.map((qid) => `wd:${qid}`).join(' ')} }
  { ?work wdt:P50 ?person . BIND("P50" AS ?prop) }
  UNION { ?person wdt:P800 ?work . BIND("P800" AS ?prop) }
  UNION { ?work wdt:P170 ?person . BIND("P170" AS ?prop) }
}`
}

async function main() {
  const outPath = resolve(process.cwd(), argumentValue('out', '../../data/celeb/figure-books/wikidata-works.jsonl'))
  const limit = Number(argumentValue('limit', '0')) || 0
  const batchSize = Number(argumentValue('batch', '12'))
  const db = dbClient()

  mkdirSync(dirname(outPath), { recursive: true })
  const done = new Set()
  if (existsSync(outPath)) {
    for (const line of readFileSync(outPath, 'utf8').split('\n')) {
      if (!line.trim()) continue
      try { done.add(JSON.parse(line).person.id) } catch { /* 깨진 줄은 다시 */ }
    }
  }

  const celebs = await allRows('celebs', (from, to) => db
    .from('celebs')
    .select('id,slug,nickname,nickname_en,wikidata_qid')
    .eq('publication_status', 'active')
    .neq('celeb_reality', 'FICTION')
    .not('wikidata_qid', 'is', null)
    .order('id')
    .range(from, to))

  const pending = celebs.filter((celeb) => !done.has(celeb.id) && /^Q\d+$/.test(celeb.wikidata_qid))
  const targets = limit > 0 ? pending.slice(0, limit) : pending
  console.log(`QID 보유 실존 인물 ${celebs.length} / 완료 ${done.size} / 이번 실행 ${targets.length} (묶음 ${batchSize})`)

  let works = 0
  for (let index = 0; index < targets.length; index += batchSize) {
    const batch = targets.slice(index, index + batchSize)
    const byQid = new Map(batch.map((celeb) => [celeb.wikidata_qid, celeb]))
    let bindings = null
    for (let attempt = 1; attempt <= 3 && !bindings; attempt += 1) {
      try {
        bindings = await wdqs(buildSparql([...byQid.keys()]))
      } catch (error) {
        // 429는 서버가 알려준 만큼 쉰다. 그 밖의 실패는 30초 뒤 한 번 더 본다.
        const wait = error.retryAfter ? Math.min(error.retryAfter, 180) * 1000 : 30000
        console.log(`  묶음 ${index / batchSize + 1} 실패(${attempt}): ${error.message} — ${attempt < 3 ? `${wait / 1000}초 뒤 재시도` : '이번 실행에서 건너뜀'}`)
        if (attempt < 3) await sleep(wait)
      }
    }
    if (!bindings) continue

    // 간선을 (인물, 작품)으로 모은 뒤 작품 상세는 엔티티 API로 한 번에 받는다.
    const edges = new Map()
    for (const row of bindings) {
      const personQid = wdQid(row, 'person')
      const workQid = wdQid(row, 'work')
      if (!personQid || !workQid) continue
      const entry = edges.get(`${personQid}:${workQid}`) ?? { personQid, qid: workQid, props: new Set() }
      entry.props.add(wdValue(row, 'prop'))
      edges.set(`${personQid}:${workQid}`, entry)
    }
    const detail = await wbEntities([...new Set([...edges.values()].map((entry) => entry.qid))])
    const bookTypes = new Set(BOOK_TYPES)
    const grouped = new Map()
    for (const [key, entry] of edges) {
      const info = detail.get(entry.qid) ?? {}
      if (!(info.types ?? []).some((type) => bookTypes.has(type))) continue
      grouped.set(key, { ...entry, en: info.en ?? null, ko: info.ko ?? null, kowiki: info.kowiki ?? null,
        isbn13: new Set(info.isbn13 ?? []), isbn10: new Set(info.isbn10 ?? []), olid: new Set(info.olid ?? []), year: info.year ?? null,
        types: info.types ?? [], editionOf: info.editionOf ?? [] })
    }

    for (const celeb of batch) {
      const list = [...grouped.values()].filter((entry) => entry.personQid === celeb.wikidata_qid)
        .map((entry) => ({
          qid: entry.qid, props: [...entry.props], en: entry.en, ko: entry.ko, kowiki: entry.kowiki,
          isbn13: [...entry.isbn13], isbn10: [...entry.isbn10], olid: [...entry.olid], year: entry.year,
          types: entry.types, editionOf: entry.editionOf,
        }))
      works += list.length
      appendFileSync(outPath, `${JSON.stringify({
        person: { id: celeb.id, slug: celeb.slug, nickname: celeb.nickname, nicknameEn: celeb.nickname_en, qid: celeb.wikidata_qid },
        works: list,
      })}\n`, 'utf8')
    }
    console.log(`  ${Math.min(index + batchSize, targets.length)}/${targets.length} — 작품 누적 ${works}`)
    await sleep(2500)
  }

  console.log(`\n인물 ${targets.length}명 / 작품 항목 ${works}건`)
  console.log(`WROTE ${outPath}`)
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
