/**
 * NULL ISBN review 행의 후보 저장 — 읽기 전용.
 * node --env-file=.env scripts/figure-books/locale-nullisbn-cands.mjs
 * 결과: data/celeb/figure-books/locale-nullisbn-cands.jsonl
 */
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { bareIsbn, dbClient } from './lib/figure-work.mjs'

const KAKAO_URL = 'https://dapi.kakao.com/v3/search/book'
const GATES = '1ab7e089-040f-4aa1-b0a1-81dc1dd510d7'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function kakaoTitle(q) {
  const key = process.env.KAKAO_REST_API_KEY
  const params = new URLSearchParams({ query: q, size: '10', target: 'title' })
  for (let a = 0; a < 3; a += 1) {
    try {
      const res = await fetch(`${KAKAO_URL}?${params}`, { headers: { Authorization: `KakaoAK ${key}` } })
      if (res.ok) return (await res.json()).documents ?? []
    } catch { /* 재시도 */ }
    await sleep(1000 * (a + 1))
  }
  return null
}

async function main() {
  const db = dbClient()
  const plan = JSON.parse((await import('node:fs')).readFileSync(
    resolve(process.cwd(), '../../data/celeb/figure-books/locale-nullisbn-plan.json'), 'utf8'))
  const outPath = resolve(process.cwd(), '../../data/celeb/figure-books/locale-nullisbn-cands.jsonl')
  const rows = []
  for (const prefix of plan.reviewIds) {
    const { data: hit } = await db.from('contents').select('id').ilike('id', `${prefix}%`).limit(1)
    const fullId = hit?.[0]?.id
    if (!fullId) continue
    const { data } = await db.from('content_locales')
      .select('content_id,title,creator').eq('content_id', fullId).eq('locale', 'ko').limit(1)
    const t = data?.[0]
    if (!t || !t.title) continue
    const docs = await kakaoTitle(t.title)
    rows.push({
      id: fullId, prefix, title: t.title, creator: t.creator,
      candidates: (docs ?? []).filter((d) => String(d.isbn ?? '').split(' ').some((s) => /^(97889|9791)/.test(bareIsbn(s)))).slice(0, 5).map((d) => ({
        title: d.title, authors: d.authors, publisher: d.publisher, isbn: d.isbn, status: d.status,
      })),
    })
    if (rows.length % 50 === 0) console.log(`  ${rows.length}/${plan.reviewIds.length}`)
    await sleep(200)
  }
  writeFileSync(outPath, `${rows.map((r) => JSON.stringify(r)).join('\n')}\n`, 'utf8')
  console.log(`WROTE ${outPath} (${rows.length})`)
}

void main().catch((e) => { console.error(e.message); process.exitCode = 1 })
