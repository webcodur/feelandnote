/**
 * ko-del 판정 재검증 — 재시도 로직으로 오탐(false zero) 제거. 읽기 전용.
 * verdicts의 ko+del 행을 다시 조회해 후보가 나오면 review로, 그대로면 del-confirmed로 기록.
 * node --env-file=.env scripts/figure-books/locale-del-recheck.mjs
 */
import { appendFileSync, existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { bareIsbn } from './lib/figure-work.mjs'

const KAKAO_URL = 'https://dapi.kakao.com/v3/search/book'
const SRC = resolve(process.cwd(), '../../data/celeb/figure-books/locale-global-verdicts.jsonl')
const OUT = resolve(process.cwd(), '../../data/celeb/figure-books/locale-del-recheck.jsonl')
const isKoreanIsbn = (v) => String(v ?? '').split(' ').some((s) => /^(97889|9791)/.test(bareIsbn(s)))
const pick13 = (raw) => String(raw ?? '').split(' ').find((s) => /^(978|979)\d{10}$/.test(bareIsbn(s))) ?? null
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function kakaoByPerson(name) {
  const key = process.env.KAKAO_REST_API_KEY
  const params = new URLSearchParams({ query: name, size: '10', target: 'person' })
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const res = await fetch(`${KAKAO_URL}?${params}`, { headers: { Authorization: `KakaoAK ${key}` } })
      if (res.ok) return (await res.json()).documents ?? []
    } catch { /* 재시도 */ }
    await sleep(1000 * (attempt + 1))
  }
  return null
}

async function main() {
  const targets = readFileSync(SRC, 'utf8').split('\n').filter(Boolean)
    .map((l) => JSON.parse(l)).filter((r) => r.kind === 'ko' && r.verdict === 'del')
  const done = new Set()
  if (existsSync(OUT)) for (const l of readFileSync(OUT, 'utf8').split('\n').filter(Boolean)) {
    try { done.add(JSON.parse(l).content_id) } catch { /* 무시 */ }
  }
  console.log(`재검증 대상 ${targets.length} (완료 ${done.size})`)
  let n = 0
  for (const t of targets) {
    if (done.has(t.content_id)) continue
    n += 1
    const names = [t.searchedAuthor, (t.cardCreator ?? '').split(',')[0].trim()].filter(Boolean)
    let found = []
    let failedAll = true
    for (const name of [...new Set(names)].slice(0, 2)) {
      const got = await kakaoByPerson(name).catch(() => null)
      if (got === null) continue
      failedAll = false
      const ko = got.filter((d) => isKoreanIsbn(d.isbn))
      if (ko.length > 0) { found = ko; break }
    }
    appendFileSync(OUT, `${JSON.stringify({
      content_id: t.content_id, batch: t.batch, cardTitle: t.cardTitle, cardCreator: t.cardCreator,
      verdict: failedAll ? 'api-fail' : (found.length > 0 ? 'review' : 'del-confirmed'),
      candidates: found.slice(0, 6).map((d) => ({ title: d.title, authors: d.authors, publisher: d.publisher, isbn: pick13(d.isbn), status: d.status })),
    })}\n`)
    if (n % 50 === 0) console.log(`  ${n}건`)
    await sleep(250)
  }
  console.log('완료')
}

void main().catch((e) => { console.error(e.message); process.exitCode = 1 })
