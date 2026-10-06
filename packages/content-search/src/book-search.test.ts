import assert from 'node:assert/strict'
import test from 'node:test'
import { getSearchContentHref, getBookSearchLanguage } from './book-search-language'

process.env.KAKAO_REST_API_KEY = 'test-only-placeholder'
const { searchBookCatalog } = await import('./book-search')
const edition = {
  key: '/books/OL26811912M', title: 'The Vegetarian', isbn: ['9780553448191'],
  language: ['eng'], publisher: ['Hogarth'], cover_i: 8469702,
}
const work = { key: '/works/OL17334243W', title: '채식주의자', author_name: ['Han Kang'], editions: { docs: [edition] } }

test('en searches OpenLibrary English editions and displays the edition title', async t => {
  const mock = t.mock.method(globalThis, 'fetch', async (input: Parameters<typeof fetch>[0]) => {
    const url = new URL(String(input))
    assert.equal(url.origin, 'https://openlibrary.org')
    assert.equal(url.pathname, '/search.json')
    assert.equal(url.searchParams.get('lang'), 'en')
    assert.ok(url.searchParams.get('q')?.includes('language:eng'))
    return Response.json({ numFound: 21, docs: [work] })
  })
  const result = await searchBookCatalog('The Vegetarian', 'en')
  assert.equal(mock.mock.callCount(), 1)
  assert.equal(result.items[0].title, 'The Vegetarian')
  assert.equal(result.items[0].externalSource, 'openlibrary')
  assert.equal(result.items[0].externalId, '9780553448191')
  assert.equal(result.items[0].metadata.workKey, '/works/OL17334243W')
  assert.equal(result.items[0].metadata.editionKey, '/books/OL26811912M')
  assert.equal(result.hasMore, true)
})

test('ko keeps Kakao even for an English query', async t => {
  t.mock.method(globalThis, 'fetch', async (input: Parameters<typeof fetch>[0]) => {
    assert.equal(new URL(String(input)).hostname, 'dapi.kakao.com')
    return Response.json({ documents: [], meta: { total_count: 0, pageable_count: 0, is_end: true } })
  })
  assert.equal((await searchBookCatalog('The Vegetarian', 'ko')).total, 0)
})

test('non-English, ISBN-less and invalid candidates are omitted, duplicates collapse, pagination uses the raw page', async t => {
  t.mock.method(globalThis, 'fetch', async (input: Parameters<typeof fetch>[0]) => {
    assert.equal(new URL(String(input)).searchParams.get('page'), '2')
    return Response.json({ numFound: 60, docs: [work, work,
      { ...work, editions: { docs: [{ ...edition, language: ['kor'] }] } },
      { ...work, editions: { docs: [{ ...edition, isbn: [] }] } },
      { ...work, editions: { docs: [{ ...edition, isbn: ['9780553448192'] }] } },
    ] })
  })
  const result = await searchBookCatalog('Vegetarian', 'en', 2)
  assert.equal(result.items.length, 1)
  assert.equal(result.hasMore, true)
})

test('provider errors propagate rather than falling back to the Korean catalog or zero results', async t => {
  t.mock.method(globalThis, 'fetch', async (input: Parameters<typeof fetch>[0]) => {
    assert.equal(new URL(String(input)).hostname, 'openlibrary.org')
    return new Response('', { status: 429 })
  })
  await assert.rejects(searchBookCatalog('Sapiens', 'en'), /429/)
})

test('ISBN lookup verifies an English edition, normalizes ISBN-10 and uses canonical metadata', async t => {
  t.mock.method(globalThis, 'fetch', async (input: Parameters<typeof fetch>[0]) => {
    const path = new URL(String(input)).pathname
    if (path.startsWith('/isbn/')) return Response.json({
      key: edition.key, title: edition.title, isbn_13: edition.isbn, publishers: edition.publisher,
      languages: [{ key: '/languages/eng' }], authors: [{ key: '/authors/OL1A' }], works: [{ key: work.key }],
    })
    if (path.startsWith('/works/')) return Response.json({ authors: [{ author: { key: '/authors/OL1A' } }] })
    if (path.startsWith('/authors/')) return Response.json({ name: 'Han Kang' })
    throw new Error(`Unexpected request: ${path}`)
  })
  const result = await searchBookCatalog('0553448196', 'en')
  assert.equal(result.items[0].externalId, '9780553448191')
  assert.equal(result.items[0].creator, 'Han Kang')
  assert.equal(result.hasMore, false)
})

test('empty query makes no request and navigation preserves the selected edition language', async t => {
  const mock = t.mock.method(globalThis, 'fetch', async () => { throw new Error('Should not fetch') })
  assert.deepEqual(await searchBookCatalog(' ', 'en'), { items: [], total: 0, hasMore: false })
  assert.equal(mock.mock.callCount(), 0)
  assert.equal(getBookSearchLanguage('en'), 'en')
  assert.equal(getSearchContentHref('9780553448191', 'book', 'en'), '/content/9780553448191?category=book&bookLanguage=en')
  assert.equal(getSearchContentHref('tmdb-movie-1', 'video', 'en'), '/content/tmdb-movie-1?category=video')
})
