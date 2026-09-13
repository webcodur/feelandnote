/**
 * 전역 locale 판정 — 읽기 전용(DB 쓰기 없음). 재개 가능(출력에 있는 id+kind 건너뜀).
 * - en: OpenLibrary eng 판본 후보 수집
 * - ko: 카카오 저자명 검색으로 한국어판 후보 수집 (ko creator → en creator 순)
 * 자동 판정: 후보 0건 → del / 그 외 → review
 *
 * node --env-file=.env scripts/figure-books/locale-global-prep.mjs --census <path> [--only en|ko] [--batch YYYY-MM-DD] [--limit N]
 * 결과: data/celeb/figure-books/locale-global-verdicts.jsonl (append)
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import {
  argumentValue, bareIsbn, kakaoByIsbn, openLibraryByIsbn, openLibrarySearch,
} from './lib/figure-work.mjs'

const KAKAO_URL = 'https://dapi.kakao.com/v3/search/book'
const OUT = resolve(process.cwd(), '../../data/celeb/figure-books/locale-global-verdicts.jsonl')
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
  return null // 3회 실패 — 결과 없음과 구분
}

async function main() {
  const censusPath = resolve(process.cwd(), argumentValue('census', ''))
  if (!censusPath) throw new Error('--census <path> 필요')
  const census = JSON.parse(readFileSync(censusPath, 'utf8'))
  const only = argumentValue('only', 'all')
  const batch = argumentValue('batch', null)
  const limit = Number(argumentValue('limit', '0')) || Infinity
  const done = new Set()
  if (existsSync(OUT)) for (const line of readFileSync(OUT, 'utf8').split('\n')) {
    if (!line.trim()) continue
    try { const r = JSON.parse(line); done.add(`${r.kind}:${r.content_id}`) } catch { /* 무시 */ }
  }
  mkdirSync(dirname(OUT), { recursive: true })
  const inBatch = (r) => !batch || r.batch === batch
  let n = 0

  if (only === 'all' || only === 'en') {
    const targets = census.enNonEng.filter(inBatch)
    console.log(`en 대상 ${targets.length}`)
    for (const t of targets) {
      if (n >= limit) break
      if (done.has(`en:${t.id}`)) continue
      n += 1
      // 현재 ISBN 언어 재확인 (이미 eng면 스킵 기록)
      const cur = t.isbn ? await openLibraryByIsbn(t.isbn).catch(() => null) : null
      if (cur && cur.languages.includes('/languages/eng')) {
        appendFileSync(OUT, `${JSON.stringify({ kind: 'en', content_id: t.id, verdict: 'already-eng', cardIsbn: t.isbn })}\n`)
        continue
      }
      const cands = await openLibrarySearch(t.title, (t.creator ?? '').split(',')[0]).catch(() => [])
      const verified = []
      for (const c of cands.slice(0, 3)) {
        for (const isbn of (c.isbns ?? []).filter((s) => /^(9780|9781|9798)/.test(s)).slice(0, 4)) {
          const d = await openLibraryByIsbn(isbn).catch(() => null)
          if (d && d.languages.includes('/languages/eng')) {
            verified.push({ isbn, title: d.title, authors: d.authors, publisher: d.publisher, date: d.publishDate, cover: d.thumbnailUrl })
            break
          }
        }
        if (verified.length >= 2) break
      }
      appendFileSync(OUT, `${JSON.stringify({
        kind: 'en', content_id: t.id, batch: t.batch, cardTitle: t.title, cardCreator: t.creator,
        cardIsbn: t.isbn, cardPrimary: t.primary ?? null, curLang: cur?.languages ?? null,
        candidates: verified, verdict: verified.length > 0 ? 'review' : 'no-candidate',
      })}\n`)
      if (n % 20 === 0) console.log(`  en ${n}건 처리`)
      await sleep(250)
    }
  }

  if (only === 'all' || only === 'ko') {
    const byId = new Map()
    for (const r of [...census.koEnTitle, ...census.koStoredDesc]) {
      if (!inBatch(r)) continue
      if (!byId.has(r.id)) byId.set(r.id, { titles: new Set(), creators: new Set(), isbns: new Set(), batches: new Set(), storedDesc: false })
      const e = byId.get(r.id)
      e.titles.add(r.title); e.creators.add(r.creator); e.isbns.add(r.isbn); e.batches.add(r.batch)
    }
    const storedIds = new Set(census.koStoredDesc.map((r) => r.id))
    console.log(`ko 대상 ${byId.size}`)
    for (const [id, e] of byId) {
      if (n >= limit) break
      if (done.has(`ko:${id}`)) continue
      n += 1
      const creators = [...e.creators].filter(Boolean)
      let docs = null
      let searched = null
      let failedAll = true
      for (const name of creators.slice(0, 2)) {
        const first = name.split(',')[0].trim()
        if (!first) continue
        searched = first
        const got = await kakaoByPerson(first).catch(() => null)
        if (got === null) continue // API 실패 — 다음 이름 시도
        failedAll = false
        if (got.length > 0) { docs = got; break }
      }
      if (failedAll || docs === null) {
        appendFileSync(OUT, `${JSON.stringify({
          kind: 'ko', content_id: id, batch: [...e.batches][0], cardTitle: [...e.titles][0],
          cardCreator: [...e.creators][0], cardIsbn: [...e.isbns][0], storedDesc: storedIds.has(id),
          searchedAuthor: searched, verdict: 'api-fail',
        })}\n`)
        continue
      }
      docs = docs ?? []
      const koEditions = docs.filter((d) => isKoreanIsbn(d.isbn)).map((d) => ({
        title: d.title, authors: d.authors, translators: d.translators, publisher: d.publisher,
        isbn: pick13(d.isbn), datetime: d.datetime, status: d.status,
      }))
      appendFileSync(OUT, `${JSON.stringify({
        kind: 'ko', content_id: id, batch: [...e.batches][0], cardTitle: [...e.titles][0],
        cardCreator: [...e.creators][0], cardIsbn: [...e.isbns][0], storedDesc: storedIds.has(id),
        searchedAuthor: searched, candidates: koEditions.slice(0, 6), candidateCount: koEditions.length,
        verdict: koEditions.length === 0 ? 'del' : 'review',
      })}\n`)
      if (n % 50 === 0) console.log(`  ko ${n}건 처리`)
      await sleep(250)
    }
  }
  console.log('완료')
}

void main().catch((e) => { console.error(e.message); process.exitCode = 1 })
