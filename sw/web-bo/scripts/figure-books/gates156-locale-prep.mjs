/**
 * 게이츠 156권 locale 판정 — 읽기 전용(DB 쓰기 없음).
 * ko 30건: 알려진 후보 7건은 카카오 ISBN 확정, 나머지 23건은 저자명 검색으로 한국어판 후보 수집.
 * en 10건: OpenLibrary eng 판본 후보 수집. Growth(d23a1bde) 별도 확인.
 *
 * node --env-file=.env scripts/figure-books/gates156-locale-prep.mjs
 * 결과: data/celeb/figure-books/gates156-locale-verdicts.jsonl
 */
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  bareIsbn, dbClient, kakaoByIsbn, openLibraryByIsbn, openLibrarySearch,
} from './lib/figure-work.mjs'

const BILL = '1ab7e089-040f-4aa1-b0a1-81dc1dd510d7'
const KAKAO_URL = 'https://dapi.kakao.com/v3/search/book'
const KNOWN_KO = {
  d30d1627: '9788925535227', // In FED We Trust → 살아있는 역사 버냉키와 금융전쟁
  '857d79cd': null, // Personal History — ISBN 비정상, 저자 검색으로
  '2ba230f1': '9788947540537', // The Great Escape → 위대한 탈출
  '61ea5805': '9788947502436', // Abundance → 어번던스
  '83e1455c': '9791157834013', // Ministry for the Future → 미래부 (예약판매)
  '897a6543': '9788950933739', // Most Powerful Idea → 역사를 만든 위대한 아이디어
  f10d2e24: '9788986022605', // Tap Dancing to Work → 포춘으로 읽는 워런 버핏
}

const isKoreanIsbn = (value) => String(value ?? '').split(' ').some((s) => /^(97889|9791)/.test(bareIsbn(s)))
const pick13 = (raw) => String(raw ?? '').split(' ').find((s) => /^(978|979)\d{10}$/.test(bareIsbn(s))) ?? null
const noHangul = (s) => !/[\uAC00-\uD7A3]/.test(String(s ?? ''))

async function kakaoByPerson(name) {
  const key = process.env.KAKAO_REST_API_KEY
  const params = new URLSearchParams({ query: name, size: '10', target: 'person' })
  const res = await fetch(`${KAKAO_URL}?${params}`, { headers: { Authorization: `KakaoAK ${key}` } })
  if (!res.ok) return []
  return (await res.json()).documents ?? []
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function main() {
  const db = dbClient()
  const { data: rels } = await db.from('celeb_contents').select('content_id').eq('celeb_id', BILL)
  const ids = [...new Set(rels.map((r) => r.content_id))]
  const locs = []
  for (let i = 0; i < ids.length; i += 100) {
    const { data } = await db.from('content_locales')
      .select('content_id,locale,title,creator,publisher,isbn,description,sources').in('content_id', ids.slice(i, i + 100))
    locs.push(...data)
  }
  const byId = new Map()
  for (const r of locs) {
    if (!byId.has(r.content_id)) byId.set(r.content_id, {})
    byId.get(r.content_id)[r.locale] = r
  }
  const out = []
  const koTargets = [...byId.entries()].filter(([, v]) => v.ko && noHangul(v.ko.title))
  console.log(`ko 영문 제목 ${koTargets.length}`)

  for (const [id, v] of koTargets) {
    const short = id.slice(0, 8)
    const known = KNOWN_KO[short]
    if (known) {
      const doc = await kakaoByIsbn(known).catch(() => null)
      out.push({
        content_id: id, kind: 'ko-known', isbn: known,
        cardTitle: v.ko.title, cardCreator: v.ko.creator, cardIsbn: v.ko.isbn,
        found: doc ? {
          title: doc.title, authors: doc.authors, translators: doc.translators,
          publisher: doc.publisher, isbn: doc.isbn, datetime: doc.datetime, status: doc.status,
        } : null,
      })
      console.log(`${known ? '●' : '○'} ${short} ${v.ko.title.slice(0, 40)} → ${doc ? `${doc.title} / ${doc.status}` : 'KAKAO NULL'}`)
      await sleep(300)
      continue
    }
    // 저자명 검색
    const koAuthor = (v.ko.creator ?? '').split(',')[0].trim()
    const docs = koAuthor ? await kakaoByPerson(koAuthor).catch(() => []) : []
    const koEditions = docs.filter((d) => isKoreanIsbn(d.isbn)).map((d) => ({
      title: d.title, authors: d.authors, translators: d.translators, publisher: d.publisher,
      isbn: pick13(d.isbn), datetime: d.datetime, status: d.status,
    }))
    out.push({
      content_id: id, kind: 'ko-search', cardTitle: v.ko.title, cardCreator: v.ko.creator,
      cardIsbn: v.ko.isbn, cardPrimary: v.ko.sources?.primary, searchedAuthor: koAuthor,
      candidates: koEditions.slice(0, 6), candidateCount: koEditions.length,
      enTitle: v.en?.title ?? null, enCreator: v.en?.creator ?? null,
    })
    console.log(`? ${short} ${v.ko.title.slice(0, 40)} [${koAuthor}] → 한국어판 후보 ${koEditions.length}`)
    await sleep(300)
  }

  // Growth 별도
  {
    const g = byId.get([...byId.keys()].find((k) => k.startsWith('d23a1bde')))
    const doc = await kakaoByIsbn(g.ko.isbn).catch(() => null)
    const byAuthor = await kakaoByPerson('바츨라프 스밀').catch(() => [])
    out.push({
      content_id: 'd23a1bde', kind: 'growth',
      card: { title: g.ko.title, creator: g.ko.creator, isbn: g.ko.isbn },
      isbnLookup: doc ? { title: doc.title, authors: doc.authors, publisher: doc.publisher } : null,
      smilKorean: byAuthor.filter((d) => isKoreanIsbn(d.isbn)).map((d) => ({ title: d.title, isbn: pick13(d.isbn), publisher: d.publisher, status: d.status })),
    })
    console.log(`Growth ISBN 역조회: ${doc ? doc.title : 'NULL'}`)
  }

  // en 비영어권 + ISBN 없음
  const enTargets = [...byId.entries()].filter(([, v]) => v.en && !/^(9780|9781|9798)/.test(bareIsbn(v.en.isbn ?? '')))
  console.log(`en 교체 대상 ${enTargets.length}`)
  for (const [id, v] of enTargets) {
    const cands = await openLibrarySearch(v.en.title, (v.en.creator ?? '').split(',')[0]).catch(() => [])
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
    out.push({ content_id: id, kind: 'en', cardTitle: v.en.title, cardCreator: v.en.creator, cardIsbn: v.en.isbn, candidates: verified })
    console.log(`EN ${id.slice(0, 8)} ${v.en.title.slice(0, 40)} → eng 후보 ${verified.length}`)
    await sleep(300)
  }

  const outPath = resolve(process.cwd(), '../../data/celeb/figure-books/gates156-locale-verdicts.jsonl')
  writeFileSync(outPath, `${out.map((r) => JSON.stringify(r)).join('\n')}\n`, 'utf8')
  console.log(`WROTE ${outPath} (${out.length}행)`)
}

void main().catch((e) => { console.error(e); process.exitCode = 1 })
