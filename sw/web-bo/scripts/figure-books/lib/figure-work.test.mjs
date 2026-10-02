import assert from 'node:assert/strict'
import test from 'node:test'
import { isbn10to13, kakaoByIsbn, kakaoCreator, openLibraryByIsbn, openLibraryEditionForWork } from './figure-work.mjs'

test('ISBN10 변환도 체크 숫자를 검사하고 문자 상품 코드를 거른다', () => {
  assert.equal(isbn10to13('8994228349'), '9788994228341')
  assert.equal(isbn10to13('8994228340'), null)
  assert.equal(isbn10to13('480D490111310'), null)
})

test('카카오 ISBN 검색은 첫 결과가 아닌 동일 판본만 반환한다', async t => {
  process.env.KAKAO_REST_API_KEY = 'test-key'
  t.mock.method(globalThis, 'fetch', async () => Response.json({ documents: [
    { title: '다른 작품', isbn: '9781476766683' },
    { title: '부의 설계자들', isbn: '9781501197260' },
  ] }))
  assert.equal((await kakaoByIsbn('9781501197260'))?.title, '부의 설계자들')
})

test('저자 누락을 역자로 채우지 않는다', () => {
  assert.equal(kakaoCreator({ authors: [], translators: ['김달진'] }), '')
})

test('언어가 없거나 비영문 판본이면 영어 카드용 후보를 반환하지 않는다', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ key: '/books/OL1M', isbn_13: ['9781501197260'], title: 'The Founders', languages: [] }))
  assert.equal(await openLibraryByIsbn('9781501197260'), null)
})

test('원전의 판본 목록도 언어 미상·비영어 판본으로 fallback하지 않는다', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ entries: [
    { isbn_13: ['9781501197260'], languages: [] },
    { isbn_13: ['9781476766683'], languages: [{ key: '/languages/spa' }] },
  ] }))
  assert.equal(await openLibraryEditionForWork('/works/OL1W'), null)
})

test('판본 저자에 섞인 역자를 원전 저자 목록에 더하지 않는다', async t => {
  t.mock.method(globalThis, 'fetch', async url => {
    if (String(url).includes('/isbn/')) return Response.json({ key: '/books/OL1M', isbn_13: ['9781501197260'], title: 'The Founders', languages: [{ key: '/languages/eng' }], authors: [{ key: '/authors/OL1A' }, { key: '/authors/OL2A' }], works: [{ key: '/works/OL1W' }] })
    if (String(url).includes('/works/')) return Response.json({ authors: [{ author: { key: '/authors/OL1A' } }] })
    assert.equal(String(url), 'https://openlibrary.org/authors/OL1A.json')
    return Response.json({ name: 'Jimmy Soni' })
  })
  assert.deepEqual((await openLibraryByIsbn('9781501197260'))?.authors, ['Jimmy Soni'])
})

test('native 판본 조회도 이중나선의 다른 판 낭독자·편집자가 원전에 섞이면 미확인으로 반환한다', async t => {
  const mock = t.mock.method(globalThis, 'fetch', async url => {
    if (String(url).includes('/isbn/')) return Response.json({
      key: '/books/OL7589370M', title: 'The Double Helix', isbn_13: ['9780451624765'],
      languages: [{ key: '/languages/eng' }], authors: [{ key: '/authors/OL264850A' }], works: [{ key: '/works/OL2125469W' }],
    })
    assert.equal(String(url), 'https://openlibrary.org/works/OL2125469W.json')
    return Response.json({ authors: ['OL264850A', 'OL2865718A', 'OL8208858A', 'OL52769A', 'OL2802097A']
      .map(key => ({ author: { key: `/authors/${key}` } })) })
  })
  assert.equal(await openLibraryByIsbn('9780451624765'), null)
  assert.equal(mock.mock.callCount(), 2)
})

test('원전 판본 목록의 ISBN이 다른 실제 원전을 가리키면 첫 영어 후보를 선택하지 않는다', async t => {
  t.mock.method(globalThis, 'fetch', async url => {
    if (String(url).includes('/editions.json')) return Response.json({ entries: [{ isbn_13: ['9781501197260'], languages: [{ key: '/languages/eng' }] }] })
    if (String(url).includes('/isbn/')) return Response.json({ key: '/books/OL1M', isbn_13: ['9781501197260'], title: 'The Founders', languages: [{ key: '/languages/eng' }], authors: [{ key: '/authors/OL1A' }], works: [{ key: '/works/OL2W' }] })
    if (String(url).includes('/works/')) return Response.json({ title: 'Another Original', authors: [{ author: { key: '/authors/OL1A' } }] })
    return Response.json({ name: 'Jimmy Soni' })
  })
  assert.equal(await openLibraryEditionForWork('/works/OL1W'), null)
})

test('원전 ID가 재확인된 영어 오디오 판본도 형식 때문에 배제하지 않는다', async t => {
  t.mock.method(globalThis, 'fetch', async url => {
    if (String(url).includes('/editions.json')) return Response.json({ entries: [{ isbn_13: ['9781501197260'], languages: [{ key: '/languages/eng' }] }] })
    if (String(url).includes('/isbn/')) return Response.json({ key: '/books/OL1M', isbn_13: ['9781501197260'], title: 'The Founders', languages: [{ key: '/languages/eng' }], authors: [{ key: '/authors/OL1A' }], works: [{ key: '/works/OL1W' }], physical_format: 'audio CD' })
    if (String(url).includes('/works/')) return Response.json({ title: 'The Founders', authors: [{ author: { key: '/authors/OL1A' } }] })
    return Response.json({ name: 'Jimmy Soni' })
  })
  assert.equal(await openLibraryEditionForWork('/works/OL1W'), '9781501197260')
})
