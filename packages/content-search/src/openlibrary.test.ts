import assert from 'node:assert/strict'
import test from 'node:test'

import { getBookDescriptionByIsbn, getOpenLibraryBookMetadata } from './openlibrary'

const metadataEdition = {
  key: '/books/OL1M', title: 'The Founders', isbn_13: ['9781501197260'],
  publishers: ['Simon & Schuster'], languages: [{ key: '/languages/eng' }],
  authors: [{ key: '/authors/OL1A' }], works: [{ key: '/works/OL1W' }],
}

test('영어권 ISBN도 판본 언어가 없거나 영어가 아니면 영문 메타로 등록하지 않는다', async (t) => {
  for (const languages of [[], [{ key: '/languages/spa' }]]) {
    const mock = t.mock.method(globalThis, 'fetch', async () => Response.json({ ...metadataEdition, languages }))
    await assert.rejects(getOpenLibraryBookMetadata('9781501197260'), /영어를 확인/)
    assert.equal(mock.mock.callCount(), 1)
    mock.mock.restore()
  }
})

test('ISBN 조회가 다른 판본으로 연결되면 메타를 돌려주지 않는다', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ ...metadataEdition, isbn_13: ['9781476766683'] }))
  await assert.rejects(getOpenLibraryBookMetadata('9781501197260'), /다른 판본/)
})

test('원전 저자로 판본의 번역자·서문 저자를 구분하고 확인 안 된 표지는 비운다', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url: Parameters<typeof fetch>[0]) => {
    if (String(url).includes('/isbn/')) return Response.json({ ...metadataEdition, authors: [{ key: '/authors/OL1A' }, { key: '/authors/OL2A' }], covers: [123] })
    if (String(url).includes('/works/')) return Response.json({ authors: [{ author: { key: '/authors/OL1A' } }] })
    if (String(url).includes('covers.openlibrary.org')) return new Response('', { status: 404 })
    assert.equal(String(url), 'https://openlibrary.org/authors/OL1A.json')
    return Response.json({ name: 'Jimmy Soni' })
  })
  const book = await getOpenLibraryBookMetadata('9781501197260')
  assert.equal(book?.creator, 'Jimmy Soni')
  assert.equal(book?.coverImageUrl, null)
  assert.equal(book?.publisher, 'Simon & Schuster')
})

test('단편집 범위를 표시하는 판본 부제를 버리지 않는다', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url: Parameters<typeof fetch>[0]) => {
    if (String(url).includes('/isbn/')) return Response.json({ ...metadataEdition, title: 'Diary of a Murderer', subtitle: 'and Other Stories', works: [] })
    return Response.json({ name: 'Young-ha Kim' })
  })
  assert.equal((await getOpenLibraryBookMetadata('9781501197260'))?.title, 'Diary of a Murderer: and Other Stories')
})

test('같은 원전의 영어 오디오 판본은 매체 형식을 보존하고 전체 수록으로 추정하지 않는다', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url: Parameters<typeof fetch>[0]) => {
    if (String(url).includes('/isbn/')) return Response.json({ ...metadataEdition, physical_format: 'Audio Cassette', works: [] })
    return Response.json({ name: 'Jimmy Soni' })
  })
  const book = await getOpenLibraryBookMetadata('9781501197260')
  assert.equal(book?.physicalFormat, 'Audio Cassette')
  assert.equal(book?.isbn, '9781501197260')
  assert.equal(book?.creator, 'Jimmy Soni')
  assert.equal(Object.hasOwn(book ?? {}, 'textScope'), false)
})

test('판본과 연결 원전의 저자가 서로 다르면 잘못된 원전 메타를 입히지 않는다', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url: Parameters<typeof fetch>[0]) => String(url).includes('/isbn/')
    ? Response.json(metadataEdition)
    : Response.json({ authors: [{ author: { key: '/authors/OL2A' } }] }))
  await assert.rejects(getOpenLibraryBookMetadata('9781501197260'), /작품 연결/)
})

test('공급처 상품 코드와 체크섬 오류는 OL 판본 조회 전에 거른다', async (t) => {
  const mock = t.mock.method(globalThis, 'fetch', async () => { throw new Error('unexpected fetch') })
  assert.equal(await getOpenLibraryBookMetadata('4808952741950'), null)
  assert.equal(await getOpenLibraryBookMetadata('9781501197261'), null)
  assert.equal(mock.mock.callCount(), 0)
})

test('OpenLibrary는 선택한 ISBN의 판본 소개를 우선한다', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async (url: Parameters<typeof fetch>[0]) => {
    assert.equal(String(url), 'https://openlibrary.org/isbn/9780140328721.json')
    return Response.json({ description: { value: 'Edition introduction' }, works: [{ key: '/works/OL1W' }] })
  })
  assert.equal(await getBookDescriptionByIsbn('9780140328721'), 'Edition introduction')
  assert.equal(fetchMock.mock.callCount(), 1)
})

test('판본 소개가 없으면 그 판본이 속한 작품 소개만 가져온다', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url: Parameters<typeof fetch>[0]) => {
    if (String(url).endsWith('/isbn/9780140328721.json')) return Response.json({ works: [{ key: '/works/OL1W' }] })
    assert.equal(String(url), 'https://openlibrary.org/works/OL1W.json')
    return Response.json({ description: 'Work introduction' })
  })
  assert.equal(await getBookDescriptionByIsbn('9780140328721'), 'Work introduction')
})

test('404와 정상 응답의 소개 누락만 null로 반환한다', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => new Response('', { status: 404 }))
  assert.equal(await getBookDescriptionByIsbn('9780140328721'), null)
  fetchMock.mock.mockImplementation(async () => Response.json({}))
  assert.equal(await getBookDescriptionByIsbn('9780140328721'), null)
})

test('일시적인 네트워크/HTTP 장애는 캐시 가능한 소개 누락으로 바꾸지 않는다', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => new Response('', { status: 503 }))
  await assert.rejects(getBookDescriptionByIsbn('9780140328721'), /503/)
  fetchMock.mock.mockImplementation(async () => { throw new Error('timeout') })
  await assert.rejects(getBookDescriptionByIsbn('9780140328721'), /timeout/)
})
