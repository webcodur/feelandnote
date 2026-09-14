import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getFigureBookPurchasePlatform,
  mapFigureBookPurchaseOptions,
  mergeFigureBookEditions,
  type FigureBookEditionRow,
  type FigureBookPurchaseOptionRow,
} from './figureBookLocale'

const BASE_ROW: FigureBookPurchaseOptionRow = {
  edition_id: 7,
  content_id: 'work-1',
  locale: 'ko',
  title: '일리아스',
  creator: '호메로스',
  description: '완역 판본 소개',
  isbn: '9791139721966',
  publisher: '민음사',
  thumbnail_url: 'https://example.com/iliad.jpg',
  release_date: '2023-06-30',
  edition_kind: 'full',
  text_scope: 'complete',
  sort_order: 1,
  platform: 'coupang',
  affiliate_url: 'https://link.coupang.com/a/example',
}

test('요청 locale은 구매 플랫폼 하나로 고정한다', () => {
  assert.equal(getFigureBookPurchasePlatform('ko'), 'coupang')
  assert.equal(getFigureBookPurchasePlatform('en'), 'amazon')
  assert.equal(getFigureBookPurchasePlatform('ja'), null)
})

test('같은 작품의 여러 활성 판본을 순서대로 보존한다', () => {
  const editions = mapFigureBookPurchaseOptions([
    { ...BASE_ROW, edition_id: 9, title: '일리아스 다른 번역', sort_order: 2 },
    BASE_ROW,
  ], 'ko')

  assert.deepEqual(editions.map((edition) => edition.id), [7, 9])
  assert.equal(editions[0].isbn, '9791139721966')
  assert.equal(editions[0].purchaseUrl, 'https://link.coupang.com/a/example')
})

test('다른 locale이나 플랫폼의 판본은 대체 노출하지 않는다', () => {
  const editions = mapFigureBookPurchaseOptions([
    { ...BASE_ROW, locale: 'en', platform: 'amazon', affiliate_url: 'https://www.amazon.com/dp/example' },
    { ...BASE_ROW, platform: 'amazon', affiliate_url: 'https://www.amazon.com/dp/example' },
    { ...BASE_ROW, affiliate_url: 'javascript:alert(1)' },
  ], 'ko')

  assert.deepEqual(editions, [])
})

test('쿠팡 상품이 없는 한국어 판본도 보존하고 같은 판본의 기존 링크만 합친다', () => {
  const first: FigureBookEditionRow = { ...BASE_ROW, id: 7 }
  const second = { ...first, id: 8, isbn: '9788937460012', sort_order: 2 }
  const editions = mergeFigureBookEditions([second, first], [BASE_ROW], 'ko')
  assert.deepEqual(editions.map((edition) => edition.id), [7, 8])
  assert.equal(editions[0].purchaseUrl, BASE_ROW.affiliate_url)
  assert.equal(editions[1].purchaseUrl, null)
  const mismatch = mergeFigureBookEditions([first], [{ ...BASE_ROW, isbn: second.isbn }], 'ko')
  assert.equal(mismatch[0].purchaseUrl, null)
})
