import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import type { FigureBookContent, FigureBookEdition } from '@/actions/figure-books/getFigureBooks'

import { isShelfSellable, mapRelatedFigureBooksToAffiliateBooks } from './CelebRelatedAffiliateBooks'

test('실제 컴포넌트는 탭이 열리면 첫 묶음을 자동으로 부르고 이후는 더 보기로 잇는다', () => {
  const source = readFileSync(new URL('./CelebAffiliateBooks.tsx', import.meta.url), 'utf8')

  // 마운트(탭 열림) 시 첫 묶음을 부른다 — requested가 이미 부른 뒤의 재실행을 막는다
  assert.match(source, /const \[requested, setRequested\] = useState\(false\)/)
  assert.match(source, /if \(!requested\) void loadMore\(\)/)
  assert.match(source, /const loadMore = useCallback\(async \(\) =>/)
})

test('이어 받는 묶음은 이미 선 책을 제외 목록에 실어 다음 후보를 부른다', () => {
  const source = readFileSync(new URL('./CelebAffiliateBooks.tsx', import.meta.url), 'utf8')

  assert.match(source, /productsRef\.current\.map\(\(book\) => book\.contentId\)/)
  assert.match(source, /usable\.books\.length < BATCH_SIZE/)
})

function relatedBook(overrides: Partial<FigureBookContent> = {}): FigureBookContent {
  return {
    id: 'related-book', title: '작품 제목', creator: null, thumbnailUrl: null,
    type: 'BOOK', category: 'book', relationType: 'related',
    editions: [], ...overrides,
  }
}

function saleEdition(overrides: Partial<FigureBookEdition> = {}): FigureBookEdition {
  return {
    id: 1, title: '판매 판본', creator: null, description: null, isbn: null,
    publisher: null, thumbnailUrl: null, releaseDate: null, editionKind: null,
    textScope: null, sortOrder: 0, platform: 'coupang',
    purchaseUrl: 'https://link.coupang.com/a/registered', ...overrides,
  }
}

test('연관 상품은 언어에 맞는 판매 판본의 제목과 실제 구매 링크만 사용한다', () => {
  const korean = saleEdition({ title: '한국어판' })
  const english = saleEdition({
    id: 2, title: 'English edition', platform: 'amazon', purchaseUrl: 'https://amzn.to/registered',
  })
  const book = relatedBook({ editions: [korean, english] })

  assert.deepEqual(mapRelatedFigureBooksToAffiliateBooks([book], 'ko').map(({ title, url }) => ({ title, url })), [
    { title: korean.title, url: korean.purchaseUrl },
  ])
  assert.deepEqual(mapRelatedFigureBooksToAffiliateBooks([book], 'en').map(({ title, url }) => ({ title, url })), [
    { title: english.title, url: english.purchaseUrl },
  ])
  assert.deepEqual(mapRelatedFigureBooksToAffiliateBooks([book], 'fr'), [])
})

test('창작 도서와 구매 링크·유효 ISBN이 모두 없는 판본은 참고도서로 내보내지 않는다', () => {
  const books = [
    relatedBook({ relationType: 'authored', editions: [saleEdition()] }),
    relatedBook({ id: 'missing-link', editions: [saleEdition({ purchaseUrl: null })] }),
    relatedBook({ id: 'invalid-link', editions: [saleEdition({ purchaseUrl: 'javascript:void(0)' })] }),
    relatedBook({ id: 'wrong-platform', editions: [saleEdition({ platform: 'amazon' })] }),
    relatedBook({ id: 'invalid-isbn', editions: [saleEdition({ platform: null, purchaseUrl: null, isbn: '9788966260950' })] }),
    relatedBook({ id: 'empty-title', editions: [saleEdition({ title: '  ', platform: null, purchaseUrl: null, isbn: '9788966260959' })] }),
    relatedBook({ id: 'not-book', type: 'VIDEO', category: 'video', editions: [saleEdition()] }),
    relatedBook({ id: 'valid', editions: [saleEdition({ purchaseUrl: null }), saleEdition()] }),
  ]

  assert.deepEqual(mapRelatedFigureBooksToAffiliateBooks(books, 'ko').map((book) => book.contentId), ['valid'])
})

test('창작 탭이 없는 화면은 includeAuthored로 인물 저서도 상품에 올린다', () => {
  const books = [
    relatedBook({ id: 'written', relationType: 'authored', editions: [saleEdition()] }),
    relatedBook({ id: 'related', editions: [saleEdition({ id: 2 })] }),
  ]

  assert.deepEqual(
    mapRelatedFigureBooksToAffiliateBooks(books, 'ko', { includeAuthored: true }).map((book) => book.contentId),
    ['written', 'related'],
  )
})

test('한국어 ISBN이 있는 연관 판본은 쿠팡 상품 없이도 제목·판본 ID를 유지해 표시한다', () => {
  const edition = saleEdition({ id: 42, platform: null, purchaseUrl: null, isbn: '978-89-6626-095-9' })
  const books = [relatedBook({ editions: [edition] })]
  assert.deepEqual(mapRelatedFigureBooksToAffiliateBooks(books, 'ko'), [{
    contentId: 'related-book', editionId: 42, title: edition.title,
    creator: undefined, thumbnail: undefined, url: '', titleBadge: null,
  }])
})

test('영문 연관 판본은 아마존 상품이 없으면 제목·저자 검색 주소로 잇는다', () => {
  const edition = saleEdition({ id: 7, title: 'The Iliad', creator: 'Homer', platform: null, purchaseUrl: null })
  const [book] = mapRelatedFigureBooksToAffiliateBooks([relatedBook({ editions: [edition] })], 'en')
  assert.equal(book.editionId, 7)
  assert.match(book.url, /^https:\/\/www\.amazon\.com\/s\?/)
  assert.match(decodeURIComponent(book.url.replace(/\+/g, ' ')), /The Iliad Homer/)
})

test('한국어 참고도서는 Amazon 판본을 빼고 YES24가 찾을 ISBN 판본을 판본 차례대로 고른다 — 쿠팡은 고르는 기준이 아니다', () => {
  const isbn = '9788966260959'
  const amazon = saleEdition({ platform: 'amazon', isbn, purchaseUrl: 'https://amzn.to/registered' })
  assert.deepEqual(mapRelatedFigureBooksToAffiliateBooks([relatedBook({ editions: [amazon] })], 'ko'), [])
  const noLink = saleEdition({ id: 2, platform: null, isbn, purchaseUrl: null })
  const linked = saleEdition({ id: 3, isbn })
  const [book] = mapRelatedFigureBooksToAffiliateBooks([relatedBook({ editions: [amazon, noLink, linked] })], 'ko')
  assert.equal(book.editionId, noLink.id)
  assert.equal(book.url, '')
  const [linkedFirst] = mapRelatedFigureBooksToAffiliateBooks([relatedBook({ editions: [linked, noLink] })], 'ko')
  assert.equal(linkedFirst.editionId, linked.id)
  assert.equal(linkedFirst.url, linked.purchaseUrl)
})

test('ISBN으로 표시하는 판본의 비쿠팡 주소를 쿠팡 버튼 주소로 내보내지 않는다', () => {
  const edition = saleEdition({ platform: null, isbn: '9788966260959', purchaseUrl: 'https://www.yes24.com/product/goods/1' })
  const [book] = mapRelatedFigureBooksToAffiliateBooks([relatedBook({ editions: [edition] })], 'ko')
  assert.equal(book.url, '')
})

test('여러 판본과 중복 작품은 한 상품으로 묶고 연관 상품을 여섯 권에서 자르지 않는다', () => {
  const books = Array.from({ length: 8 }, (_, index) => relatedBook({
    id: `book-${index}`, editions: [saleEdition(), saleEdition({ id: 2 })],
  }))
  const products = mapRelatedFigureBooksToAffiliateBooks([...books, books[0]], 'ko')

  assert.deepEqual(products.map((book) => book.contentId), books.map((book) => book.id))
})

test('판촉 선반은 번역본 없음·절판 띠가 붙은 책을 모두 뺀다', () => {
  for (const titleBadge of ['no-ko', 'no-en', 'out-of-print'] as const) {
    assert.equal(isShelfSellable({ contentId: 'x', title: 'x', url: '', titleBadge }), false)
  }
  assert.equal(isShelfSellable({ contentId: 'x', title: 'x', url: '', titleBadge: null }), true)
  assert.equal(isShelfSellable({ contentId: 'x', title: 'x', url: '' }), true)
})
