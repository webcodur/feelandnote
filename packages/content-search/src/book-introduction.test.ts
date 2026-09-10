import assert from 'node:assert/strict'
import test, { before } from 'node:test'
import { BOOK_INTRODUCTION_SOURCES, isBookIntroductionSource } from './book-introduction-contract'

let introductions: typeof import('./book-introduction')
before(async () => {
  const previousKey = process.env.KAKAO_REST_API_KEY
  process.env.KAKAO_REST_API_KEY = 'test-key'
  try {
    introductions = await import('./book-introduction')
  } finally {
    if (previousKey === undefined) delete process.env.KAKAO_REST_API_KEY
    else process.env.KAKAO_REST_API_KEY = previousKey
  }
})

const ISBN = '9788994228341'
const DAUM = `https://m.search.daum.net/search?w=bookpage&bookId=123&tab=introduction&q=${ISBN}`

function kakaoResponse(description = '짧은 한국어 소개입니다.', isbn = ISBN) {
  return Response.json({
    documents: [{
      title: '책 제목', contents: description, isbn,
      url: DAUM, authors: ['저자'], translators: [], publisher: '출판사',
      datetime: '', thumbnail: '', status: '정상판매',
    }],
    meta: { total_count: 1, is_end: true },
  })
}

function daumResponse(description: string) {
  return new Response(`<div class="info_desc"><p class="desc">${description}</p></div>`)
}

test('브라우저 계약은 허용된 세 출처만 인식한다', () => {
  assert.deepEqual(BOOK_INTRODUCTION_SOURCES, ['KAKAO', 'DAUM', 'OPEN'])
  for (const source of BOOK_INTRODUCTION_SOURCES) assert.equal(isBookIntroductionSource(source), true)
  for (const value of ['PUBLISHER', 'kakao', '', null, {}, 1]) assert.equal(isBookIntroductionSource(value), false)
})

test('자동 한국어 선정은 같은 ISBN의 실제 소개 본문 중 긴 것을 선택한다', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url: Parameters<typeof fetch>[0]) => String(url).includes('dapi.kakao.com')
    ? kakaoResponse()
    : daumResponse('검색 소개보다 더 길게 이어지는 한국어 책 소개입니다. 마지막 문장까지 읽을 수 있습니다.'))
  const result = await introductions.fetchBookIntroduction({ isbn: '8994228349', locale: 'ko' })
  assert.equal(result.source, 'DAUM')
  assert.equal(result.sourceUrl, DAUM)
  assert.match(result.description!, /마지막 문장/)
})

test('KAKAO 지정은 다음에 접속하지 않는다', async (t) => {
  const calls: string[] = []
  t.mock.method(globalThis, 'fetch', async (url: Parameters<typeof fetch>[0]) => {
    calls.push(String(url))
    assert.match(String(url), /^https:\/\/dapi\.kakao\.com\//)
    return kakaoResponse()
  })
  const result = await introductions.fetchBookIntroduction({ isbn: ISBN, locale: 'ko', source: 'KAKAO' })
  assert.equal(result.source, 'KAKAO')
  assert.equal(result.description, '짧은 한국어 소개입니다.')
  assert.equal(calls.length, 1)
  assert.equal(new URL(result.sourceUrl!).searchParams.get('query'), ISBN)
})

test('DAUM 주소가 있으면 카카오와 ISBN 없이 저장한 다음 주소만 조회한다', async (t) => {
  const calls: string[] = []
  t.mock.method(globalThis, 'fetch', async (url: Parameters<typeof fetch>[0], options?: Parameters<typeof fetch>[1]) => {
    calls.push(String(url))
    assert.equal(String(url), DAUM)
    assert.equal(options?.redirect, 'error')
    return daumResponse('다음에서 직접 가져온 한국어 소개입니다.')
  })
  const result = await introductions.fetchBookIntroduction({ locale: 'ko', source: 'DAUM', sourceUrl: DAUM })
  assert.equal(result.description, '다음에서 직접 가져온 한국어 소개입니다.')
  assert.equal(calls.length, 1)
})

test('다음 장애는 자동선정에서만 검증된 카카오 소개로 대체한다', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url: Parameters<typeof fetch>[0]) => {
    if (String(url).includes('dapi.kakao.com')) return kakaoResponse()
    throw new Error('Daum timeout')
  })
  const automatic = await introductions.fetchBookIntroduction({ isbn: ISBN, locale: 'ko' })
  assert.equal(automatic.source, 'KAKAO')
  await assert.rejects(introductions.fetchBookIntroduction({ locale: 'ko', source: 'DAUM', sourceUrl: DAUM }), /timeout/)
})

test('자동선정도 유효한 카카오 소개 없이 다음이 실패하면 장애를 전달한다', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url: Parameters<typeof fetch>[0]) => String(url).includes('dapi.kakao.com')
    ? kakaoResponse('') : new Response('', { status: 503 }))
  await assert.rejects(introductions.fetchBookIntroduction({ isbn: ISBN, locale: 'ko' }), /503/)
})

test('다음의 긴 HTML과 영문 본문을 긴 한국어 소개로 선택하지 않는다', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async (url: Parameters<typeof fetch>[0]) => String(url).includes('dapi.kakao.com')
    ? kakaoResponse() : new Response(`<main>${'광고'.repeat(500)}</main>`))
  assert.equal((await introductions.fetchBookIntroduction({ isbn: ISBN, locale: 'ko' })).source, 'KAKAO')
  fetchMock.mock.mockImplementation(async (url: Parameters<typeof fetch>[0]) => String(url).includes('dapi.kakao.com')
    ? kakaoResponse() : daumResponse('This is a very long English introduction that must not replace the Korean description.'))
  assert.equal((await introductions.fetchBookIntroduction({ isbn: ISBN, locale: 'ko' })).source, 'KAKAO')
})

test('동일 ISBN 결과가 없으면 다른 책의 소개를 조회하거나 선택하지 않는다', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => kakaoResponse('다른 책의 소개', '9788970446653'))
  assert.deepEqual(await introductions.fetchBookIntroduction({ isbn: ISBN, locale: 'ko' }), {
    source: null, sourceUrl: null, description: null,
  })
  assert.equal(fetchMock.mock.callCount(), 1)
})

test('자동 영문 선정은 OpenLibrary의 실제 작품 소개 주소를 반환하고 재조회에 재사용한다', async (t) => {
  const calls: string[] = []
  t.mock.method(globalThis, 'fetch', async (url: Parameters<typeof fetch>[0]) => {
    calls.push(String(url))
    return String(url).includes('/isbn/')
      ? Response.json({ works: [{ key: '/works/OL1W' }], languages: [{ key: '/languages/eng' }] })
      : Response.json({ description: 'This is an English description of the book.' })
  })
  const selected = await introductions.fetchBookIntroduction({ isbn: '9780140328721', locale: 'en' })
  assert.equal(selected.source, 'OPEN')
  assert.equal(selected.sourceUrl, 'https://openlibrary.org/works/OL1W')
  calls.length = 0
  const repeated = await introductions.fetchBookIntroduction({ source: 'OPEN', sourceUrl: selected.sourceUrl, locale: 'en' })
  assert.equal(repeated.description, selected.description)
  assert.deepEqual(calls, ['https://openlibrary.org/works/OL1W.json'])
})

test('OpenLibrary의 한글 소개와 명시된 비영어 자료는 영문 소개로 채택하지 않는다', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => Response.json({ description: '이것은 한국어 소개입니다.' }))
  assert.equal((await introductions.fetchBookIntroduction({ isbn: '9780140328721', locale: 'en' })).source, null)
  fetchMock.mock.mockImplementation(async () => Response.json({ description: 'Une description du livre.', languages: [{ key: '/languages/fre' }] }))
  assert.equal((await introductions.fetchBookIntroduction({ isbn: '9780140328721', locale: 'en' })).source, null)
  fetchMock.mock.mockImplementation(async () => Response.json({ description: 'Une description du livre.' }))
  assert.equal((await introductions.fetchBookIntroduction({ isbn: '9780140328721', locale: 'en' })).source, null)
})

test('출처와 화면 언어가 다르면 외부에 요청하지 않는다', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => { throw new Error('unexpected fetch') })
  assert.equal((await introductions.fetchBookIntroduction({ isbn: ISBN, locale: 'en', source: 'DAUM' })).description, null)
  assert.equal((await introductions.fetchBookIntroduction({ isbn: ISBN, locale: 'ko', source: 'OPEN' })).description, null)
  assert.equal(fetchMock.mock.callCount(), 0)
})

test('외부 주소의 호스트·경로·사용자정보와 저장 주소의 ISBN 불일치를 거부한다', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => { throw new Error('unexpected fetch') })
  for (const sourceUrl of ['http://127.0.0.1/search?bookId=1', 'https://search.daum.net.evil.test/search?bookId=1', 'https://search.daum.net/admin?bookId=1', 'https://user@search.daum.net/search?bookId=1']) {
    await assert.rejects(introductions.fetchBookIntroduction({ locale: 'ko', source: 'DAUM', sourceUrl }), /Invalid/)
  }
  await assert.rejects(introductions.fetchBookIntroduction({ locale: 'en', source: 'OPEN', sourceUrl: 'https://openlibrary.org/account' }), /Invalid/)
  await assert.rejects(introductions.fetchBookIntroduction({ isbn: '9788970446653', locale: 'ko', source: 'DAUM', sourceUrl: DAUM }), /ISBN/)
  await assert.rejects(introductions.fetchBookIntroduction({ isbn: ISBN, locale: 'ko', source: 'KAKAO', sourceUrl: 'https://dapi.kakao.com/v3/search/book?target=isbn&query=9788970446653' }), /ISBN/)
  assert.equal(fetchMock.mock.callCount(), 0)
})

test('OpenLibrary 리다이렉트는 동일 호스트의 책 경로만 따라간다', async (t) => {
  const calls: string[] = []
  const fetchMock = t.mock.method(globalThis, 'fetch', async (url: Parameters<typeof fetch>[0], options?: Parameters<typeof fetch>[1]) => {
    calls.push(String(url))
    assert.equal(options?.redirect, 'manual')
    return String(url).includes('/isbn/')
      ? new Response('', { status: 302, headers: { location: '/books/OL123M.json' } })
      : Response.json({ description: 'This is an English description.' })
  })
  assert.equal((await introductions.fetchBookIntroduction({ isbn: '9780140328721', locale: 'en' })).sourceUrl, 'https://openlibrary.org/books/OL123M')
  assert.equal(calls.length, 2)
  fetchMock.mock.mockImplementation(async () => new Response('', { status: 302, headers: { location: 'http://127.0.0.1/private' } }))
  await assert.rejects(introductions.fetchBookIntroduction({ isbn: '9780140328721', locale: 'en' }), /redirect/)
})

test('고정 출처의 404는 소개 누락이며 HTTP 장애와 구별한다', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => new Response('', { status: 404 }))
  assert.deepEqual(await introductions.fetchBookIntroduction({ locale: 'ko', source: 'DAUM', sourceUrl: DAUM }), {
    source: 'DAUM', sourceUrl: DAUM, description: null,
  })
  assert.equal((await introductions.fetchBookIntroduction({ locale: 'en', source: 'OPEN', sourceUrl: 'https://openlibrary.org/works/OL1W' })).description, null)
  fetchMock.mock.mockImplementation(async () => Response.json({}))
  assert.equal((await introductions.fetchBookIntroduction({ locale: 'en', source: 'OPEN', sourceUrl: 'https://openlibrary.org/works/OL1W' })).description, null)
  fetchMock.mock.mockImplementation(async () => new Response('', { status: 429 }))
  await assert.rejects(introductions.fetchBookIntroduction({ locale: 'en', source: 'OPEN', sourceUrl: 'https://openlibrary.org/works/OL1W' }), /429/)
})
