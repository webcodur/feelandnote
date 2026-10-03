import assert from 'node:assert/strict'
import test from 'node:test'

import { getBookDescriptionByIsbn, getOpenLibraryBookMetadata } from './openlibrary'

const metadataEdition = {
  key: '/books/OL1M', title: 'The Founders', isbn_13: ['9781501197260'],
  publishers: ['Simon & Schuster'], languages: [{ key: '/languages/eng' }],
  authors: [{ key: '/authors/OL1A' }], works: [{ key: '/works/OL1W' }],
}

test('출판사 누락은 기본 경로에서 거부하고 명시한 등록 경로에서만 빈 값으로 보존한다', async (t) => {
  const mock = t.mock.method(globalThis, 'fetch', async (url: Parameters<typeof fetch>[0]) => {
    if (String(url).includes('/isbn/')) return Response.json({ ...metadataEdition, publishers: [], covers: [123] })
    if (String(url).includes('/works/')) return Response.json({ authors: [{ author: { key: '/authors/OL1A' } }] })
    if (String(url).includes('covers.openlibrary.org')) return new Response('', { headers: { 'content-type': 'image/jpeg' } })
    return Response.json({ name: 'Jimmy Soni' })
  })
  await assert.rejects(getOpenLibraryBookMetadata('9781501197260'), /출판사가 없습니다/)
  assert.equal(mock.mock.callCount(), 1)
  const book = await getOpenLibraryBookMetadata('9781501197260', { allowMissingPublisher: true })
  assert.equal(book?.publisher, '')
  assert.equal(book?.creator, 'Jimmy Soni')
  assert.equal(book?.coverImageUrl, 'https://covers.openlibrary.org/b/id/123-L.jpg')
  assert.deepEqual(book?.languages, ['/languages/eng'])
  await assert.rejects(getOpenLibraryBookMetadata('9781501197260'), /출판사가 없습니다/)
})

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

test('검증된 밀그롬 판본은 표지 리다이렉트·접속 실패에도 메타를 보존하고 표지만 비운다', async (t) => {
  for (const failure of ['redirect', 'network', 'missing-cover'] as const) {
    const mock = t.mock.method(globalThis, 'fetch', async (url: Parameters<typeof fetch>[0], init?: RequestInit) => {
      if (String(url).includes('/isbn/')) return Response.json({
        ...metadataEdition, key: '/books/OL7843999M', title: 'Leviticus',
        subtitle: 'A Book of Ritual and Ethics (Continental Commentary)', isbn_13: ['9780800695149'],
        publishers: ['Augsburg Fortress Publishers'], covers: failure === 'missing-cover' ? [] : [561773],
        authors: [{ key: '/authors/OL1010426A' }], works: [{ key: '/works/OL4801104W' }],
      })
      if (String(url).includes('/works/')) return Response.json({
        title: 'Leviticus', authors: [{ author: { key: '/authors/OL1010426A' } }],
      })
      if (String(url).includes('/authors/')) return Response.json({ name: 'Jacob Milgrom' })
      assert.equal(init?.method, 'HEAD')
      assert.equal(init?.redirect, 'error')
      throw new TypeError(failure === 'redirect' ? 'fetch failed: unexpected redirect' : 'fetch failed: ECONNRESET')
    })
    const book = await getOpenLibraryBookMetadata('9780800695149')
    assert.equal(book?.isbn, '9780800695149')
    assert.equal(book?.creator, 'Jacob Milgrom')
    assert.equal(book?.publisher, 'Augsburg Fortress Publishers')
    assert.deepEqual(book?.languages, ['/languages/eng'])
    assert.equal(book?.coverImageUrl, null)
    assert.equal(mock.mock.callCount(), failure === 'missing-cover' ? 3 : 4)
    mock.mock.restore()
  }
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

test('이중나선 실제 ISBN 응답에서 원전에 섞인 낭독자·다른 판 편집자를 원저자로 추가하지 않는다', async (t) => {
  const mock = t.mock.method(globalThis, 'fetch', async (url: Parameters<typeof fetch>[0]) => {
    if (String(url).includes('/isbn/')) return Response.json({
      ...metadataEdition, key: '/books/OL7589370M', title: 'The Double Helix', isbn_13: ['9780451624765'],
      publishers: ['Signet'], authors: [{ key: '/authors/OL264850A' }], works: [{ key: '/works/OL2125469W' }],
    })
    assert.equal(String(url), 'https://openlibrary.org/works/OL2125469W.json')
    return Response.json({ title: 'The double helix', authors: [
      'OL264850A', 'OL2865718A', 'OL8208858A', 'OL52769A', 'OL2802097A',
    ].map(key => ({ author: { key: `/authors/${key}` } })) })
  })
  await assert.rejects(getOpenLibraryBookMetadata('9780451624765'), /저자 목록을 판본에서 확인할 수 없어/)
  assert.equal(mock.mock.callCount(), 2)
})

test('판본과 원전에서 확인한 모든 공저자를 보존하고 판본에만 있는 역자는 제외한다', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url: Parameters<typeof fetch>[0]) => {
    if (String(url).includes('/isbn/')) return Response.json({ ...metadataEdition,
      authors: ['OL1A', 'OL2A', 'OL3A'].map(key => ({ key: `/authors/${key}` })),
    })
    if (String(url).includes('/works/')) return Response.json({ authors: ['OL1A', 'OL2A'].map(key => ({ author: { key: `/authors/${key}` } })) })
    if (String(url).includes('/authors/OL1A')) return Response.json({ name: 'Terry Pratchett' })
    assert.equal(String(url), 'https://openlibrary.org/authors/OL2A.json')
    return Response.json({ name: 'Neil Gaiman' })
  })
  assert.equal((await getOpenLibraryBookMetadata('9781501197260'))?.creator, 'Terry Pratchett, Neil Gaiman')
})

test('공저자 일부가 판본 응답에 없으면 한 명만 남기거나 미확인 공저자를 추가하지 않는다', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url: Parameters<typeof fetch>[0]) => String(url).includes('/isbn/')
    ? Response.json(metadataEdition)
    : Response.json({ authors: ['OL1A', 'OL2A'].map(key => ({ author: { key: `/authors/${key}` } })) }))
  await assert.rejects(getOpenLibraryBookMetadata('9781501197260'), /저자 목록을 판본에서 확인할 수 없어/)
})

test('판본과 원전 모두에 원저자가 없으면 메타를 등록하지 않는다', async (t) => {
  const mock = t.mock.method(globalThis, 'fetch', async (url: Parameters<typeof fetch>[0]) => String(url).includes('/isbn/')
    ? Response.json({ ...metadataEdition, authors: [] })
    : Response.json({ authors: [] }))
  await assert.rejects(getOpenLibraryBookMetadata('9781501197260'), /원저자를 확인할 수 없습니다/)
  assert.equal(mock.mock.callCount(), 2)
})

test('판본과 원전의 단독 저자가 일치하면 기존 메타와 원제 정보를 보존한다', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url: Parameters<typeof fetch>[0]) => {
    if (String(url).includes('/isbn/')) return Response.json(metadataEdition)
    if (String(url).includes('/works/')) return Response.json({ title: 'The Founders', authors: [{ author: { key: '/authors/OL1A' } }] })
    return Response.json({ name: 'Jimmy Soni' })
  })
  const book = await getOpenLibraryBookMetadata('9781501197260')
  assert.equal(book?.creator, 'Jimmy Soni')
  assert.equal(book?.workTitle, 'The Founders')
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
