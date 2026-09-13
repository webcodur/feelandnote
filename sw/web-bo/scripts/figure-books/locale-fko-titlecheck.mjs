/**
 * FKO 한국어판 실재 확인 — 읽기 전용.
 * FKO 카드의 한국어 제목으로 카카오 제목 검색 → 동일 저작 한국어판 유무 판정 재료 수집.
 * node --env-file=.env scripts/figure-books/locale-fko-titlecheck.mjs
 * 결과: data/celeb/figure-books/locale-fko-titlecheck.jsonl
 */
import { appendFileSync, existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { bareIsbn, dbClient } from './lib/figure-work.mjs'

const KAKAO_URL = 'https://dapi.kakao.com/v3/search/book'
const GATES = '1ab7e089-040f-4aa1-b0a1-81dc1dd510d7'
const OUT = resolve(process.cwd(), '../../data/celeb/figure-books/locale-fko-titlecheck.jsonl')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const core = (s) => String(s ?? '').replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').replace(/[\s·:;,.!?'"`~「」『』\-–—_/\\[\]{}]/g, '').toLowerCase()

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
  const fko = new Map()
  for (const line of readFileSync(resolve(process.cwd(), '../../data/celeb/figure-books/locale-fko-verdicts.jsonl'), 'utf8').split('\n').filter(Boolean)) {
    const r = JSON.parse(line)
    if (r.verdict === 'MISMATCH' || r.verdict === 'kakao_not_found') fko.set(r.content_id, r)
  }
  const done = new Set()
  if (existsSync(OUT)) for (const l of readFileSync(OUT, 'utf8').split('\n').filter(Boolean)) {
    try { done.add(JSON.parse(l).content_id) } catch { /* 무시 */ }
  }
  console.log(`대상 ${fko.size} (완료 ${done.size})`)
  let n = 0
  for (const [cid, r] of fko) {
    if (done.has(cid)) continue
    n += 1
    const docs = await kakaoTitle(r.card.title)
    const koEd = (docs ?? []).filter((d) => String(d.isbn ?? '').split(' ').some((s) => /^(97889|9791)/.test(bareIsbn(s))))
      .map((d) => ({ title: d.title, authors: d.authors, publisher: d.publisher, isbn: d.isbn, status: d.status }))
    const cardCore = core(r.card.title)
    const sameWork = koEd.filter((d) => { const c = core(d.title); return c && cardCore && (c === cardCore || c.startsWith(cardCore) || cardCore.startsWith(c)) })
    appendFileSync(OUT, `${JSON.stringify({
      content_id: cid, isbn: r.isbn, cardTitle: r.card.title, cardCreator: r.card.creator,
      koEditions: koEd.slice(0, 5), sameWorkCount: sameWork.length,
      verdict: docs === null ? 'api-fail' : (sameWork.length > 0 ? 'has-korean' : 'no-korean'),
    })}\n`)
    if (n % 20 === 0) console.log(`  ${n}건`)
    await sleep(250)
  }
  console.log('완료')
}

void main().catch((e) => { console.error(e.message); process.exitCode = 1 })
