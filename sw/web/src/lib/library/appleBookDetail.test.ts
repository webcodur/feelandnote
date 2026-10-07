import assert from 'node:assert/strict'
import test from 'node:test'
import { appleChartBookId, fetchAppleBookDetail, parseAppleBookDetail } from './appleBookDetail'

const chartId = 'apple-books-123'
const payload = () => ({ resultCount: 1, results: [{ kind: 'ebook', trackId: 123,
  trackViewUrl: 'https://books.apple.com/us/book/example/id123?uo=4', releaseDate: '2026-09-29T07:00:00Z',
  genres: ['Books', 'Mysteries & Thrillers'], description: '<p>A <b>story</b> &amp; its author.</p><p>Next<br>line.</p>' }] })

test('keeps paragraphs and decodes text while removing executable content', () => {
  const value = payload()
  value.results[0].description += '<script>alert(1)</script><style>body{}</style>'
  assert.deepEqual(parseAppleBookDetail(value, chartId), {
    description: 'A story & its author.\n\nNext\nline.', releaseDate: '2026-09-29',
    genres: ['Mysteries & Thrillers'], sourceUrl: 'https://books.apple.com/us/book/example/id123',
  })
})

test('never substitutes another book, media type, country or source host', () => {
  for (const changes of [{ trackId: 124 }, { kind: 'audiobook' },
    { trackViewUrl: 'https://books.apple.com/us/book/example/id124' },
    { trackViewUrl: 'https://books.apple.com/gb/book/example/id123' },
    { trackViewUrl: 'https://books.apple.com.evil.test/us/book/example/id123' },
    { trackViewUrl: 'https://user:pass@books.apple.com/us/book/example/id123' }]) {
    const value = payload()
    Object.assign(value.results[0], changes)
    assert.throws(() => parseAppleBookDetail(value, chartId))
  }
})

test('missing optional information and absent books remain honest empty results', () => {
  const value = payload()
  Object.assign(value.results[0], { description: null, releaseDate: '2026-02-30', genres: null })
  const result = parseAppleBookDetail(value, chartId)
  assert.equal(result?.description, null)
  assert.equal(result?.releaseDate, null)
  assert.deepEqual(result?.genres, [])
  assert.equal(parseAppleBookDetail({ resultCount: 0, results: [] }, chartId), null)
  assert.throws(() => parseAppleBookDetail({ resultCount: 1, results: [] }, chartId))
})

test('fixed ID lookup uses the US ebook endpoint and accepts its JSON MIME type', async () => {
  const fetcher = (async (input, init) => {
    const url = new URL(String(input))
    assert.equal(url.origin + url.pathname, 'https://itunes.apple.com/lookup')
    assert.equal(url.searchParams.get('id'), '123')
    assert.equal(url.searchParams.get('country'), 'us')
    assert.equal(url.searchParams.get('entity'), 'ebook')
    assert.equal(init?.redirect, 'error')
    return new Response(JSON.stringify(payload()), { headers: { 'Content-Type': 'text/javascript; charset=utf-8' } })
  }) as typeof fetch
  assert.equal((await fetchAppleBookDetail(fetcher, chartId))?.releaseDate, '2026-09-29')
  for (const id of ['yes24-123', 'apple-books-123&country=gb', 'apple-books-0', '', null]) {
    assert.equal(appleChartBookId(id), null)
  }
  await assert.rejects(fetchAppleBookDetail(fetcher, 'invalid'))
})
