/**
 * 역조회 불일치 건의 올바른 한국어판 찾기 — 읽기 전용.
 * 카드 제목(의도된 저작)으로 카카오 제목 검색 → 한국 ISBN + 저자 일치 후보 수집.
 * node --env-file=.env scripts/figure-books/roundtrip-discover.mjs
 * 결과: data/celeb/figure-books/roundtrip-discover.jsonl
 */
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { bareIsbn } from './lib/figure-work.mjs'

// content_id 앞 8자리 → 의도된 저작의 검색어(카드 제목) + 저자 토큰
const TARGETS = {
  '0519a58b': { q: '모든 것은 기본에서 시작한다', author: '손웅정' },
  '08b929b6': { q: '마지막 소원', author: '사프콥스키' },
  '135843f8': { q: '팡세', author: '파스칼' },
  '14e56fa2': { q: '도덕감정론', author: '스미스' },
  '1ac9ae06': { q: '지속 가능한 에너지', author: '맥케이' },
  '21421b46': { q: '슈퍼맨', author: '머레이' },
  '29a65068': { q: '스타트 위드 와이', author: '사이넥' },
  '2e977917': { q: '예경', author: null },
  '38945033': { q: '일뤼미나시옹', author: '랭보' },
  '3e367046': { q: '울부짖음', author: '긴즈버그' },
  '5960b9ca': { q: '생각의 속도', author: '게이츠' },
  '6644ea0e': { q: '이사야서', author: '류호준' },
  '6ddf69ab': { q: '야생의 소년들', author: '버로스' },
  '7239264e': { q: '승리의 리더십', author: '월시' },
  '72a89b33': { q: '마지막 사자', author: '맨체스터' },
  '94675b53': { q: '순수와 경험의 노래', author: '블레이크' },
  '9a8c6ab5': { q: '나폴레옹전', author: null },
  b59da154: { q: '포지셔닝', author: '리스' },
  bd933b14: { q: '마이 라이프', author: '클린턴' },
  bef61871: { q: '여자들', author: '해나' },
  c15f9b6f: { q: '세포의 분자생물학', author: '앨버츠' },
  caae8799: { q: '신의 종말', author: '해리스' },
  dc77271c: { q: '빅서', author: '케루악' },
  dcc023af: { q: '고도를 기다리며', author: '베케트' },
  e236bb7c: { q: '더 하드 씽', author: '호로위츠' },
  '51b3c434': { q: 'V리그 연대기', author: '류한준' },
  b0773e97: { q: '온가족 애송 시집', author: null },
  '6b8e04a9': { q: '죄와 벌', author: '도스토', note: '디 에센셜 판본 확인용' },
  '218b9be3': { q: '반지의 제왕', author: '톨킨', note: '창작자 보충용' },
}
const KAKAO_URL = 'https://dapi.kakao.com/v3/search/book'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const isKoIsbn = (v) => String(v ?? '').split(' ').some((s) => /^(97889|9791)/.test(bareIsbn(s)))

async function main() {
  const key = process.env.KAKAO_REST_API_KEY
  const out = []
  for (const [prefix, t] of Object.entries(TARGETS)) {
    const params = new URLSearchParams({ query: t.q, size: '10', target: 'title' })
    const res = await fetch(`${KAKAO_URL}?${params}`, { headers: { Authorization: `KakaoAK ${key}` } }).catch(() => null)
    const docs = res?.ok ? ((await res.json()).documents ?? []) : []
    const cands = docs.filter((d) => isKoIsbn(d.isbn)).map((d) => ({
      title: d.title, authors: d.authors, translators: d.translators, publisher: d.publisher,
      isbn: d.isbn, datetime: d.datetime, status: d.status,
      authorHit: !t.author || [...(d.authors ?? []), ...(d.translators ?? [])].join(' ').includes(t.author),
    }))
    out.push({ prefix, query: t.q, candidates: cands })
    console.log(`${prefix} ${t.q} → 한국판 ${cands.length} (저자일치 ${cands.filter((c) => c.authorHit).length})`)
    await sleep(300)
  }
  writeFileSync(resolve(process.cwd(), '../../data/celeb/figure-books/roundtrip-discover.jsonl'),
    `${out.map((r) => JSON.stringify(r)).join('\n')}\n`, 'utf8')
  console.log('WROTE roundtrip-discover.jsonl')
}

void main().catch((e) => { console.error(e); process.exitCode = 1 })
