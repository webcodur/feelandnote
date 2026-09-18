import assert from 'node:assert/strict'
import test from 'node:test'
import { fetchYes24BookDetail, parseYes24BookDetail, selectYes24Sales } from './yes24Purchase'

const isbn = '9788966260959'
const payload = (item: Record<string, unknown> = {}) => ({ success: true, errorCode: null, data: { items: [{
  itemId: 123, isbn13: isbn, title: 'Book', subTitle: '', author: 'Author', publisher: 'Pub', publishDate: '20260701',
  pages: 236, shopPrice: 18000, salePrice: 16200, starScore: 8.3, cover: 'https://image.yes24.com/goods/123/L',
  link: 'https://www.yes24.com/product/goods/123', addOnLink: 'https://apis.yes24.com/a/partner_1/goods/123',
  contentDetail: { bookIntroduction: '첫 줄<br/>둘째 줄\r\n\r\n\r\n셋째 &amp; 넷째', tableOfContents: '<b>1장</b>' },
  ...item,
}] } })

test('YES24 detail keeps verified fields and turns markup into plain paragraphs', () => {
  const detail = parseYes24BookDetail(payload(), isbn)
  assert.ok(detail)
  assert.equal(detail.publishDate, '2026-07-01')
  assert.equal(detail.subTitle, null)
  assert.equal(detail.salePrice, 16200)
  assert.equal(detail.purchaseUrl, 'https://apis.yes24.com/a/partner_1/goods/123')
  assert.equal(detail.introduction, '첫 줄\n둘째 줄\n\n셋째 & 넷째')
})

test('YES24 detail drops unverified covers and affiliate links', () => {
  const detail = parseYes24BookDetail(payload({ cover: 'https://example.com/cover.jpg', addOnLink: 'https://apis.yes24.com/a/partner_1/goods/999' }), isbn)
  assert.equal(detail?.cover, null)
  assert.equal(detail?.purchaseUrl, 'https://www.yes24.com/product/goods/123')
})

test('YES24 sales info flags off-sale products instead of dropping them', () => {
  const onSale = parseYes24BookDetail(payload({ itemStatus: '판매중', salePoint: 223002 }), isbn)
  assert.equal(onSale?.onSale, true)
  assert.deepEqual(selectYes24Sales(onSale), { salePoint: 223002, starScore: 8.3, salePrice: 16200, shopPrice: 18000, pages: 236, publishDate: '2026-07-01', onSale: true })
  const offSale = selectYes24Sales(parseYes24BookDetail(payload({ itemStatus: '절판', salePoint: 3702 }), isbn))
  assert.equal(offSale?.onSale, false)
  assert.equal(offSale?.salePoint, 3702)
  assert.equal(selectYes24Sales(parseYes24BookDetail(payload(), isbn))?.onSale, false)
  assert.equal(selectYes24Sales(null), null)
})

test('YES24 detail ignores other ISBNs, rejects failed payloads and asks for detail fields', async () => {
  assert.equal(parseYes24BookDetail(payload({ isbn13: '9791199489561' }), isbn), null)
  assert.throws(() => parseYes24BookDetail({ success: false }, isbn), /rejected/)
  const fetcher = (async (url: string | URL | Request) => {
    assert.equal(new URL(String(url)).searchParams.get('detail'), 'Y')
    return Response.json(payload())
  }) as typeof fetch
  assert.equal((await fetchYes24BookDetail(fetcher, isbn, 'test-only'))?.itemId, 123)
})
