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
  const second = { ...first, id: 8, isbn: '9788937460012', creator: '호메로스,김기영', sort_order: 2 }
  const editions = mergeFigureBookEditions([second, first], [BASE_ROW], 'ko')
  assert.deepEqual(editions.map((edition) => edition.id), [7, 8])
  assert.equal(editions[0].purchaseUrl, BASE_ROW.affiliate_url)
  assert.equal(editions[1].purchaseUrl, null)
  const mismatch = mergeFigureBookEditions([first], [{ ...BASE_ROW, isbn: second.isbn }], 'ko')
  assert.equal(mismatch[0].purchaseUrl, null)
})

test('같은 책의 재판·개정판·전자책은 대표 하나만 노출한다', () => {
  const row = (id: number, isbn: string, date: string, title = '사토시의 서'): FigureBookEditionRow => ({
    ...BASE_ROW, id, isbn, release_date: date, title, sort_order: id,
  })
  const editions = mergeFigureBookEditions([
    row(1, '9791162243855', '2021-02-05'),
    row(2, '9791175796898', '2026-08-06', '사토시의 서(개정증보판)'),
    row(3, '9791175790834', '2026-08-14'),
  ], [], 'ko')
  assert.deepEqual(editions.map((edition) => edition.id), [3])
})

test('역자가 같으면 출판사가 바뀐 재출간도 같은 책으로 접고, 역자가 다르면 다른 번역으로 남긴다', () => {
  const row = (id: number, isbn: string, publisher: string, translators: string[], release_date = '2020-01-01'): FigureBookEditionRow => ({
    ...BASE_ROW, id, isbn, publisher, release_date, sort_order: id, sources: { translators },
  })
  const same = mergeFigureBookEditions([
    row(1, '9791188626007', '케이디북스', []),
    row(2, '9791188626069', '백산출판사', [], '2022-07-30'),
  ], [], 'ko', false, true)
  assert.deepEqual(same.map((edition) => edition.id), [2])
  const sameTranslation = mergeFigureBookEditions([
    row(1, '9791188626007', '케이디북스', ['김철수']),
    row(2, '9791188626069', '백산출판사', ['김철수'], '2022-07-30'),
  ], [], 'ko', false, false)
  assert.deepEqual(sameTranslation.map((edition) => edition.id), [2])
  const diff = mergeFigureBookEditions([
    row(1, '9788937460883', '민음사', ['전승희']),
    row(2, '9788932925929', '열린책들', ['원유경']),
  ], [], 'ko', false, true)
  assert.deepEqual(diff.map((edition) => edition.id), [1, 2])
  const unknownTranslations = mergeFigureBookEditions([
    row(1, '9791188626007', '케이디북스', []),
    row(2, '9791188626069', '백산출판사', []),
  ], [], 'ko', false, false)
  assert.deepEqual(unknownTranslations.map((edition) => edition.id), [1, 2])
})

test('같은 책 그룹에서는 구매 링크가 있는 판본이 대표가 된다', () => {
  const first: FigureBookEditionRow = { ...BASE_ROW, id: 7, release_date: '2023-06-30' }
  const second = { ...first, id: 8, isbn: '9791139721966'.replace('966', '967'), release_date: '2024-01-01' }
  const editions = mergeFigureBookEditions([second, first], [BASE_ROW], 'ko')
  assert.deepEqual(editions.map((edition) => edition.id), [7])
  assert.equal(editions[0].purchaseUrl, BASE_ROW.affiliate_url)
})

test('includeAll이면 같은 책 판본도 전부 돌려준다', () => {
  const first: FigureBookEditionRow = { ...BASE_ROW, id: 7 }
  const second = { ...first, id: 8, isbn: '9788937460012', sort_order: 2 }
  const editions = mergeFigureBookEditions([second, first], [BASE_ROW], 'ko', true)
  assert.deepEqual(editions.map((edition) => edition.id), [7, 8])
})
