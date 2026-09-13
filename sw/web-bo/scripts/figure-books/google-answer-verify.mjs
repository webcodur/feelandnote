/**
 * 구글 AI 모드 답변을 카카오 책 검색으로 검증한다. 읽기 전용이다.
 *
 * 브라우저 채팅 경로(docs/resource/browser-chat-automation.md)로 받은 답변은 검증을 거치지
 * 않은 후보다. 실재하지 않는 책, 자가출판·전자책 전용, 제목만 비슷한 책이 섞인다.
 * 여기서 카카오 제목+저자 매칭을 통과한 것만 남긴다.
 *
 * 입력은 표준입력이며 한 줄에 하나씩 아래 형식을 받는다. 구글 답변을 그대로 붙여 넣으면 된다.
 *   인물명 > 제목 | 저자 | 출판사 | 다뤄지는 범위
 *   인물명 > 없음
 *
 * 실행 (sw/web-bo 에서):
 *   node --env-file=.env scripts/figure-books/google-answer-verify.mjs < answer.txt
 *   node --env-file=.env scripts/figure-books/google-answer-verify.mjs --out ../../data/celeb/figure-books/google-verify.jsonl < answer.txt
 */

import { appendFileSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const KAKAO_URL = 'https://dapi.kakao.com/v3/search/book'
const kakaoKey = process.env.KAKAO_REST_API_KEY ?? process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY
if (!kakaoKey) throw new Error('KAKAO_REST_API_KEY 가 필요하다')

const argumentValue = (name, fallback = null) => {
  const index = process.argv.indexOf(`--${name}`)
  return index > -1 ? process.argv[index + 1] : fallback
}
const outPath = argumentValue('out')

const normalize = (value) => String(value ?? '').toLowerCase().replace(/[\s·,()[\]{}『』「」<>《》"'’-]/g, '')

/** 「홍길동 (옮김)」·「A·B」·「A, B 역」에서 사람 이름만 뽑는다 */
function creatorNames(raw) {
  return String(raw ?? '')
    .split(/[,·、]|\s외\s|\s및\s/)
    .map((piece) => normalize(piece.replace(/\((?:지음|저|글|옮김|역|편|엮음|역주)\)/g, '').replace(/(지음|옮김|역주|엮음)$/g, '')))
    .filter((piece) => piece.length >= 2)
}

async function kakaoLookup(book) {
  const params = new URLSearchParams({ query: book.title, size: '20', target: 'title' })
  const response = await fetch(`${KAKAO_URL}?${params}`, { headers: { Authorization: `KakaoAK ${kakaoKey}` } })
  if (!response.ok) return { matched: null, reason: `kakao_http_${response.status}` }

  const documents = (await response.json()).documents ?? []
  if (documents.length === 0) return { matched: null, reason: 'title_not_found' }

  const wantedCreators = creatorNames(book.creator)
  const wantedPublisher = normalize(book.publisher)
  for (const document of documents) {
    const authors = normalize([...(document.authors ?? []), ...(document.translators ?? [])].join(''))
    const creatorHit = wantedCreators.some((name) => authors.includes(name) || (name.includes(authors) && authors.length >= 2))
    const publisherHit = wantedPublisher.length >= 2 && normalize(document.publisher).includes(wantedPublisher)
    // 저자가 맞으면 통과시킨다. 출판사만 맞는 것은 동명 도서일 수 있어 근거로 쓰지 않는다.
    if (creatorHit) {
      return {
        matched: {
          title: document.title,
          authors: document.authors,
          publisher: document.publisher,
          isbn: document.isbn,
          url: document.url,
          publisherHit,
        },
        reason: 'creator_match',
      }
    }
  }
  return { matched: null, reason: 'creator_mismatch', seen: documents.slice(0, 3).map((d) => `${d.title} / ${(d.authors ?? []).join(',')} / ${d.publisher}`) }
}

function parseLines(text) {
  const rows = []
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line.includes('>')) continue
    const [who, rest] = [line.slice(0, line.indexOf('>')).trim(), line.slice(line.indexOf('>') + 1).trim()]
    if (!who || !rest) continue
    if (/^없음/.test(rest)) { rows.push({ person: who, none: true }); continue }
    const cells = rest.split('|').map((cell) => cell.trim())
    if (cells.length < 2 || !cells[0] || !cells[1]) continue
    rows.push({ person: who, title: cells[0], creator: cells[1], publisher: cells[2] || null, scope: cells[3] || null })
  }
  return rows
}

async function main() {
  const text = readFileSync(0, 'utf8')
  const rows = parseLines(text)
  if (outPath) mkdirSync(dirname(resolve(outPath)), { recursive: true })

  let pass = 0, fail = 0, none = 0
  for (const row of rows) {
    if (row.none) { none++; console.log(`·    ${row.person} — 없음`); continue }
    const lookup = await kakaoLookup(row)
    const record = { ...row, kakao: lookup.matched, kakaoReason: lookup.reason, kakaoSeen: lookup.seen ?? null }
    if (lookup.matched) {
      pass++
      console.log(`✔    ${row.person} — ${row.title} / ${row.creator}`)
    } else {
      fail++
      console.log(`✖    ${row.person} — ${row.title} / ${row.creator}  (${lookup.reason})`)
      if (lookup.seen) for (const s of lookup.seen) console.log(`       카카오: ${s}`)
    }
    if (outPath) appendFileSync(resolve(outPath), JSON.stringify(record) + '\n', 'utf8')
  }
  console.log(`\n검증 통과 ${pass}건 · 탈락 ${fail}건 · 없음 ${none}명 / 입력 ${rows.length}줄`)
}

main()
