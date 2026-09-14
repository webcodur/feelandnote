import assert from 'node:assert/strict'
import test from 'node:test'
import { APPLE_BOOKS_FEED_URL, CHART_MAX_AGE_MS, fetchAppleBooksChart, fetchYes24Chart, parseAppleBooksChart, parseYes24Chart, previousKoreanDate, selectBookChart, yes24ChartEnabled } from './bestsellerFeed'

const now = Date.parse('2026-09-14T05:00:00Z')
const basis = '2026-09-13'
const apple = () => ({ feed: { id: APPLE_BOOKS_FEED_URL, country: 'us', updated: new Date(now).toISOString(),
  results: [{ id: '123', kind: 'books', name: 'Current book', artistName: 'Author',
    artworkUrl100: 'https://is1-ssl.mzstatic.com/image/book.png', url: 'https://books.apple.com/us/book/current/id123' }] } })
const yes24 = () => ({ success: true, errorCode: null, data: {
  meta: { apiLink: 'https://apis.yes24.com/v1/category/bestsellerDaily?date=2026-09-13', pubDate: new Date(now).toISOString() },
  items: [{ itemId: 123, sortOrder: 1, title: 'Current book', author: 'Author', goodsType: '도서',
    isbn13: '9788966260959', cover: 'https://image.yes24.com/goods/123/L', link: 'https://www.yes24.com/product/goods/123' }] } })
const respond = (payload: unknown) => (async () => Response.json(payload)) as typeof fetch

test('Korean date switches at KST midnight and handles month/year boundaries', () => {
  assert.equal(previousKoreanDate(Date.parse('2026-09-13T14:59:59Z')), '2026-09-12')
  assert.equal(previousKoreanDate(Date.parse('2026-09-13T15:00:00Z')), '2026-09-13')
  assert.equal(previousKoreanDate(Date.parse('2026-01-01T00:00:00Z')), '2025-12-31')
})
test('YES24 production requires both a key and explicit enablement', () => {
  assert.equal(yes24ChartEnabled({ NODE_ENV: 'production', YES24_API_KEY: 'test' }), false)
  assert.equal(yes24ChartEnabled({ NODE_ENV: 'production', YES24_API_KEY: 'test', YES24_CHARTS_ENABLED: 'true' }), true)
  assert.equal(yes24ChartEnabled({ NODE_ENV: 'development', YES24_API_KEY: 'test' }), true)
  assert.equal(yes24ChartEnabled({ NODE_ENV: 'development', YES24_API_KEY: ' ' }), false)
  assert.equal(yes24ChartEnabled({ YES24_CHARTS_ENABLED: 'true' }), false)
})
test('YES24 requests the explicit previous day and keeps response time separate', async () => {
  const fetcher = (async (url, init) => {
    assert.equal(new URL(String(url)).searchParams.get('date'), basis)
    assert.equal(new URL(String(url)).searchParams.get('pageSize'), '20')
    assert.equal(new Headers(init?.headers).get('X-Api-Key'), 'test-only')
    assert.equal(init?.redirect, 'error')
    return Response.json(yes24())
  }) as typeof fetch
  const result = await fetchYes24Chart(fetcher, 'test-only', basis, now)
  assert.equal(result.basisDate, basis)
  assert.equal(result.updatedAt, new Date(now).toISOString())
  assert.equal(result.items[0].source_url, 'https://www.yes24.com/product/goods/123')
})
test('missing keys, error payloads and mismatched dates are not successful charts', async () => {
  await assert.rejects(fetchYes24Chart(respond(yes24()), '', basis, now), /key missing/)
  assert.throws(() => parseYes24Chart({ success: false }, basis, now), /rejected/)
  assert.throws(() => parseYes24Chart(yes24(), '2026-02-30', now), /basis date/)
  const wrong = yes24(); wrong.data.meta.apiLink = wrong.data.meta.apiLink.replace(basis, '2026-09-12')
  assert.throws(() => parseYes24Chart(wrong, basis, now), /mismatch/)
})
test('Apple accepts only the US paid-books feed and canonical book identity', () => {
  const result = parseAppleBooksChart(apple(), now)
  assert.equal(result.items[0].type, 'BOOK')
  assert.equal(result.items[0].id, 'apple-books-123')
  assert.equal(result.basisDate, undefined)
  for (const mutate of [
    (v: ReturnType<typeof apple>) => { v.feed.country = 'kr' },
    (v: ReturnType<typeof apple>) => { v.feed.id = APPLE_BOOKS_FEED_URL.replace('top-paid', 'top-free') },
    (v: ReturnType<typeof apple>) => { v.feed.results[0].kind = 'songs' },
    (v: ReturnType<typeof apple>) => { v.feed.results[0].url = 'https://books.apple.com/us/book/fake/id999' },
  ]) { const value = apple(); mutate(value); assert.throws(() => parseAppleBooksChart(value, now)) }
})
test('empty lists, duplicate identities, injected URLs and future dates are rejected', () => {
  for (const mutate of [
    (v: ReturnType<typeof yes24>) => { v.data.items = [] },
    (v: ReturnType<typeof yes24>) => { v.data.items.push({ ...v.data.items[0], sortOrder: 2 }) },
    (v: ReturnType<typeof yes24>) => { v.data.items[0].cover = 'javascript:alert(1)' },
    (v: ReturnType<typeof yes24>) => { v.data.items[0].link = 'https://www.yes24.com@evil.test/product/goods/123' },
    (v: ReturnType<typeof yes24>) => { v.data.meta.pubDate = '2027-01-01' },
    (v: ReturnType<typeof yes24>) => { v.data.items[0].goodsType = '음반' },
  ]) { const value = yes24(); mutate(value); assert.throws(() => parseYes24Chart(value, basis, now)) }
})
test('a valid short list remains usable and lists are capped at 20', () => {
  assert.equal(parseAppleBooksChart(apple(), now).items.length, 1)
  const payload = apple()
  payload.feed.results = Array.from({ length: 25 }, (_, n) => ({ ...payload.feed.results[0], id: String(n + 1), url: `https://books.apple.com/us/book/book/id${n + 1}` }))
  assert.equal(parseAppleBooksChart(payload, now).items.length, 20)
})
test('optional book metadata does not discard an otherwise valid chart', () => {
  const value = yes24()
  value.data.items[0].isbn13 = ''; value.data.items[0].author = ''; value.data.items[0].cover = ''
  const result = parseYes24Chart(value, basis, now).items[0]
  assert.equal(result.isbn, null); assert.equal(result.creator, ''); assert.equal(result.thumbnail_url, null)
  const cover = apple(); cover.feed.results[0].artworkUrl100 = 'https://unapproved.test/book.png'
  assert.equal(parseAppleBooksChart(cover, now).items[0].thumbnail_url, null)
  const sameIsbn = yes24()
  sameIsbn.data.items.push({ ...sameIsbn.data.items[0], itemId: 124, sortOrder: 2, link: 'https://www.yes24.com/product/goods/124' })
  assert.equal(parseYes24Chart(sameIsbn, basis, now).items.length, 2)
})
test('Apple cover size is increased only on a verified artwork URL', () => {
  const payload = apple()
  payload.feed.results[0].artworkUrl100 = 'https://is1-ssl.mzstatic.com/image/book/100x151bb.png'
  assert.equal(parseAppleBooksChart(payload, now).items[0].thumbnail_url, 'https://is1-ssl.mzstatic.com/image/book/300x450bb.jpg')
  assert.equal(parseAppleBooksChart(apple(), now).items[0].thumbnail_url, 'https://is1-ssl.mzstatic.com/image/book.png')
})
test('HTTP, content type, streamed size and body errors do not populate charts', async () => {
  for (const response of [new Response('', { status: 403 }), new Response('<html>error</html>'), new Response('{}', { headers: { 'Content-Type': 'application/json', 'Content-Length': '1000001' } })]) {
    await assert.rejects(fetchAppleBooksChart((async () => response) as typeof fetch, now))
  }
  await assert.rejects(fetchAppleBooksChart(respond({ oversized: 'x'.repeat(1_000_001) }), now), /size limit/)
})
test('last valid cache becomes stale, then disappears after 48 hours', () => {
  const chart = parseAppleBooksChart(apple(), now)
  assert.equal(selectBookChart(chart, 'en', now + 2 * 3600_000).isStale, true)
  const hidden = selectBookChart(chart, 'en', now + CHART_MAX_AGE_MS + 1)
  assert.equal(hidden.status, 'unavailable')
  assert.equal(hidden.items.length, 0)
  assert.equal(hidden.updatedAt, '')
  assert.equal(selectBookChart(null, 'ko').status, 'unavailable')
})
test('an old Korean basis date is hidden even if response timestamps were refreshed', () => {
  const chart = parseYes24Chart(yes24(), basis, now)
  chart.basisDate = '2026-09-10'
  assert.equal(selectBookChart(chart, 'ko', now).status, 'unavailable')
})
test('network error details never include credentials in the propagated error', async () => {
  const fetcher = (async () => { throw new Error('X-Api-Key: test-secret') }) as typeof fetch
  await assert.rejects(fetchYes24Chart(fetcher, 'test-secret', basis, now), error => {
    assert.equal((error as Error).message, 'Book chart network request failed')
    return true
  })
})
