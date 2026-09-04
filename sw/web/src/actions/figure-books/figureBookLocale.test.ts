import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getFigureBookCharacterDescription,
  getFigureBookPurchasePlatform,
  mapFigureBookPurchaseOptions,
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

test('인물별 등장 설명은 요청 언어 값만 사용한다', () => {
  const assignment = {
    description: '한국어 등장 설명',
    description_en: 'English appearance description',
  }

  assert.equal(getFigureBookCharacterDescription(assignment, 'ko'), '한국어 등장 설명')
  assert.equal(getFigureBookCharacterDescription(assignment, 'en'), 'English appearance description')
  assert.equal(getFigureBookCharacterDescription({
    description: '한국어 등장 설명',
    description_en: null,
  }, 'en'), null)
})
