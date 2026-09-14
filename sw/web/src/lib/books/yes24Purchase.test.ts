import assert from 'node:assert/strict'
import test from 'node:test'
import {
  fetchYes24Purchase, isYes24PurchaseRequest, normalizePurchaseIsbn, parseYes24Purchase,
  selectYes24Purchase, yes24PurchaseEnabled, YES24_PURCHASE_MAX_AGE_MS,
} from './yes24Purchase'

const isbn = '9788966260959'
const item = { itemId: 123, isbn13: isbn, goodsType: '도서', itemStatus: '판매중', link: 'https://www.yes24.com/product/goods/123' }
const response = (...items: unknown[]) => ({ success: true, errorCode: null, data: { items } })

test('only a checksum-valid ISBN13 can be looked up without changing its edition', () => {
  assert.equal(normalizePurchaseIsbn('978-89-6626-095-9'), isbn)
  for (const value of ['9788966260958', '8966260950', '9788966260959 9780140328721', null, 9788966260959]) {
    assert.equal(normalizePurchaseIsbn(value), null)
  }
})
test('purchases require a Korean registered content and optional positive edition identity', () => {
  const id = 'c53aab37-7ed8-42b6-9f06-929b8825c006'
  assert.equal(isYes24PurchaseRequest(id, 'ko', 1), true)
  for (const edition of [null, 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, '1']) assert.equal(isYes24PurchaseRequest(id, 'ko', edition), false)
  assert.equal(isYes24PurchaseRequest('9788966260959', 'ko'), false)
  assert.equal(isYes24PurchaseRequest(id, 'en'), false)
  assert.equal(yes24PurchaseEnabled({ NODE_ENV: 'production', YES24_API_KEY: 'test' }), false)
  assert.equal(yes24PurchaseEnabled({ NODE_ENV: 'development', YES24_API_KEY: 'test' }), true)
  assert.equal(yes24PurchaseEnabled({ NODE_ENV: 'production', YES24_API_KEY: 'test', YES24_PURCHASE_ENABLED: 'true' }), true)
})
test('only exact ISBN, available physical books receive a link', () => {
  assert.deepEqual(parseYes24Purchase(response(item), isbn, 1), { link: { platform: 'yes24', url: item.link }, fetchedAt: 1 })
  for (const change of [{ isbn13: '9780140328721' }, { itemStatus: '절판' }, { itemStatus: '품절' }, { itemStatus: '예약판매' }, { goodsType: 'eBook' }]) {
    assert.equal(parseYes24Purchase(response({ ...item, ...change }), isbn).link, null)
  }
})
test('available comics sets link to the exact ISBN product', () => {
  const setIsbn = '9791133469420'
  const comic = { ...item, isbn13: setIsbn, goodsType: '만화', itemId: 90064457, link: 'https://www.yes24.com/Product/Goods/90064457' }
  assert.equal(parseYes24Purchase(response(comic), setIsbn).link?.url, comic.link)
  assert.equal(parseYes24Purchase(response({ ...comic, itemStatus: '품절' }), setIsbn).link, null)
  assert.equal(parseYes24Purchase(response({ ...comic, isbn13: isbn }), setIsbn).link, null)
})
test('duplicate ISBN matches select available product deterministically', () => {
  const second = { ...item, itemId: 124, link: 'https://www.yes24.com/product/goods/124' }
  assert.equal(parseYes24Purchase(response(second, item), isbn).link?.url, item.link)
  assert.equal(parseYes24Purchase(response({ ...item, itemStatus: '절판' }, second), isbn).link?.url, second.link)
})
test('affiliate link must belong to official host and the same product', () => {
  const addon = 'https://apis.yes24.com/a/user_123/goods/123'
  assert.equal(parseYes24Purchase(response({ ...item, addOnLink: addon }), isbn).link?.url, addon)
  for (const addOnLink of [addon.replace('/123', '/456'), addon.replace('apis.', 'evil.'), `${addon}?redirect=evil`, 'javascript:alert(1)']) {
    assert.equal(parseYes24Purchase(response({ ...item, addOnLink }), isbn).link?.url, item.link)
  }
  for (const link of [item.link.replace('/123', '/124'), 'https://evil.test/product/goods/123', 'http://www.yes24.com/product/goods/123']) {
    assert.equal(parseYes24Purchase(response({ ...item, link }), isbn).link, null)
  }
})
test('cached availability is hidden after 48 hours', () => {
  const result = parseYes24Purchase(response(item), isbn, 100)
  assert.ok(selectYes24Purchase(result, 100 + YES24_PURCHASE_MAX_AGE_MS))
  assert.equal(selectYes24Purchase(result, 101 + YES24_PURCHASE_MAX_AGE_MS), null)
})
test('404 is normal absence but outages and rejected API responses throw', async () => {
  const fetcher = (status: number) => (async () => new Response('', { status })) as typeof fetch
  assert.equal((await fetchYes24Purchase(fetcher(404), isbn, 'test')).link, null)
  for (const status of [401, 403, 429, 500, 503]) await assert.rejects(fetchYes24Purchase(fetcher(status), isbn, 'test'), /unavailable/)
  await assert.rejects(fetchYes24Purchase((async () => Response.json({ success: false })) as typeof fetch, isbn, 'test'))
  await assert.rejects(fetchYes24Purchase((async () => { throw new Error('secret-test-key') }) as typeof fetch, isbn, 'test'), error => !String(error).includes('secret-test-key'))
})
test('oversize responses are rejected and request has bounded lifetime without redirects', async () => {
  const fetcher: typeof fetch = async (input, init) => {
    assert.equal(new URL(String(input)).searchParams.get('query'), isbn)
    assert.equal(init?.redirect, 'error')
    assert.ok(init?.signal)
    return Response.json(response(item), { headers: { 'content-length': '1000001' } })
  }
  await assert.rejects(fetchYes24Purchase(fetcher, isbn, 'test'), /unavailable/)
})
