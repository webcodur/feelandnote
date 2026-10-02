import assert from 'node:assert/strict'
import test, { before } from 'node:test'

let books: typeof import('./external-book-input')
before(async () => {
  process.env.KAKAO_REST_API_KEY = 'test-key'
  books = await import('./external-book-input')
})

const input = {
  externalId: '9788954655972', externalSource: 'kakao_book',
  title: '여행의 이유', creator: '김영하', coverImageUrl: 'https://wrong.example/cover.jpg',
  metadata: { isbn: '9788954655972', publisher: '다른 출판사' },
}

function kakaoResponse(overrides = {}) {
  return Response.json({ documents: [{
    title: '여행의 이유', authors: ['김영하'], translators: [], isbn: '9788954655972',
    publisher: '문학동네', url: 'https://search.daum.net/search?w=bookpage&bookId=123',
    datetime: '', contents: '', thumbnail: '', status: '정상판매', ...overrides,
  }], meta: { total_count: 1, is_end: true } })
}

test('ISBN·제목이 같아도 원저자가 다르면 검색 객체를 등록하지 않는다', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => kakaoResponse({ authors: ['다른 저자'] }))
  await assert.rejects(books.resolveExternalBookInput(input), /제목·원저자/)
})

test('ISBN이 다른 작품을 가리키면 현재 카드 메타에 섞지 않는다', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => kakaoResponse({ title: '살인자의 기억법' }))
  await assert.rejects(books.resolveExternalBookInput(input), /제목·원저자/)
})

test('선택 객체의 표지·출판사를 그대로 믿지 않고 같은 ISBN의 공식 메타를 쓴다', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => kakaoResponse())
  const resolved = await books.resolveExternalBookInput(input)
  assert.equal(resolved.coverImageUrl, null)
  assert.equal(resolved.metadata.publisher, '문학동네')
  assert.equal(resolved.locale, 'ko')
})

test('상품 코드와 허용하지 않는 공급처는 DB 진입 전 거른다', async (t) => {
  const mock = t.mock.method(globalThis, 'fetch', async () => { throw new Error('unexpected fetch') })
  await assert.rejects(books.resolveExternalBookInput({ ...input, metadata: { isbn: '4808952741950' } }), /상품 코드/)
  await assert.rejects(books.resolveExternalBookInput({ ...input, externalSource: 'google_books' }), /카카오 또는 OpenLibrary/)
  assert.equal(mock.mock.callCount(), 0)
})

test('동명 다른 저자와 단독 원전·합본·학습서를 자동으로 같은 작품이라 처리하지 않는다', () => {
  assert.equal(books.sameBookIdentity({ title: 'The Founders', creator: 'Jimmy Soni' }, { title: 'The Founders', creator: 'Rob Goodman' }), false)
  assert.equal(books.sameBookIdentity({ title: '죽은 시인의 사회', creator: '' }, { title: '죽은 시인의 사회', creator: 'N. H. Kleinbaum' }), false)
  assert.equal(books.sameBookIdentity({ title: 'Death of a Salesman', creator: 'Arthur Miller' }, { title: 'Death of a Salesman (SparkNotes)', creator: 'Arthur Miller' }), false)
  assert.equal(books.sameBookIdentity({ title: 'The Ballad of the Sad Cafe', creator: 'Carson McCullers' }, { title: 'The Ballad of the Sad Cafe - and Other Stories', creator: 'Carson McCullers' }), false)
})

const bookkIsbn = '9791127238216'
const bookkTitle = '스완네 집 쪽으로 : Swann’s Way (영문판)'
const bookkCreator = 'Marcel Proust (마르셀 프루스트)'

function languageFixture(title: string, options: { isbn?: string; missing?: boolean; language?: string; olTitle?: string } = {}) {
  const isbn = options.isbn ?? bookkIsbn
  const selected = { externalId: isbn, externalSource: 'kakao_book', title, creator: bookkCreator, coverImageUrl: null, metadata: { isbn } }
  const requests: string[] = []
  const fetch = async (value: Parameters<typeof globalThis.fetch>[0]) => {
    const url = String(value); requests.push(url)
    if (url.includes('dapi.kakao.com')) return kakaoResponse({ isbn, title, authors: [bookkCreator], publisher: 'Bookk' })
    if (url.includes('/isbn/')) {
      if (options.missing) return new Response('', { status: 404 })
      return Response.json({ key: '/books/OL1M', title: options.olTitle ?? title, isbn_13: [isbn], publishers: ['Verified English publisher'],
        works: [{ key: '/works/OL1W' }], authors: [{ key: '/authors/OL1A' }], languages: options.language ? [{ key: options.language }] : [] })
    }
    if (url.includes('/works/')) return Response.json({ title: options.olTitle ?? title, authors: [{ author: { key: '/authors/OL1A' } }] })
    if (url.includes('/authors/')) return Response.json({ name: bookkCreator })
    throw Error('Unexpected provider request')
  }
  return { selected, fetch, requests }
}

test('국내 ISBN·한글 검색 제목의 명시 영문판은 OL 부재 시 원자료를 보존한 오류로 차단한다', async t => {
  const f = languageFixture(bookkTitle, { missing: true })
  t.mock.method(globalThis, 'fetch', f.fetch)
  await assert.rejects(books.resolveExternalBookInput(f.selected), error => {
    assert.ok(error instanceof Error)
    assert.match(error.message, /명시된 영문판.*OpenLibrary/)
    const cause = error.cause as { isbn: string; officialBook: { title: string; creator: string; metadata: Record<string, unknown> } }
    assert.equal(cause.isbn, bookkIsbn)
    assert.equal(cause.officialBook.title, bookkTitle)
    assert.equal(cause.officialBook.creator, bookkCreator)
    assert.equal(cause.officialBook.metadata.publisher, 'Bookk')
    return true
  })
  assert.ok(f.requests.some(url => url.includes('/isbn/')))
})

test('한글 메타의 영문판·영어 원서 표시는 국가 코드보다 먼저 실제 영어 판본 언어를 확인한다', async t => {
  for (const title of [bookkTitle, '스완네 집 쪽으로 (영어 원서)', 'Swann’s Way (English edition)']) {
    const f = languageFixture(title, { language: '/languages/eng' })
    const mock = t.mock.method(globalThis, 'fetch', f.fetch)
    const resolved = await books.resolveExternalBookInput(f.selected)
    assert.equal(resolved.locale, 'en')
    assert.equal(resolved.externalSource, 'openlibrary')
    assert.deepEqual(resolved.metadata.languages, ['/languages/eng'])
    mock.mock.restore()
  }
})

test('명시 영문판도 언어가 없거나 프랑스어인 OL 응답은 한국어판으로 fallback하지 않는다', async t => {
  for (const language of [undefined, '/languages/fre']) {
    const f = languageFixture(bookkTitle, { language })
    const mock = t.mock.method(globalThis, 'fetch', f.fetch)
    await assert.rejects(books.resolveExternalBookInput(f.selected), /명시된 영문판/)
    mock.mock.restore()
  }
})

test('한국어 검색용 영문판 제목과 OL 원제·저자를 추정해 자동으로 동일 판본 처리하지 않는다', async t => {
  const f = languageFixture(bookkTitle, { language: '/languages/eng', olTitle: 'Swann’s Way' })
  t.mock.method(globalThis, 'fetch', f.fetch)
  await assert.rejects(books.resolveExternalBookInput(f.selected), /제목·원저자/)
})

test('명백한 다른 언어판·원서 표시는 한국어판 등록을 차단하고 일반 언어 관련 제목은 그대로 둔다', async t => {
  for (const title of ['어린 왕자 (프랑스어판)', '데미안 (독일어 원서)', 'Le Petit Prince (French edition)']) {
    const f = languageFixture(title)
    const mock = t.mock.method(globalThis, 'fetch', f.fetch)
    await assert.rejects(books.resolveExternalBookInput(f.selected), /명시된 외국어판/)
    assert.equal(f.requests.some(url => url.includes('openlibrary.org')), false)
    mock.mock.restore()
  }
  for (const title of ['English Grammar', '프랑스어 문법', '영어 원서 읽는 법']) {
    const f = languageFixture(title)
    const mock = t.mock.method(globalThis, 'fetch', f.fetch)
    const resolved = await books.resolveExternalBookInput(f.selected)
    assert.equal(resolved.locale, 'ko', title)
    mock.mock.restore()
  }
})
