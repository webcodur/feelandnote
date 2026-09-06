import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import type { FigureBookContent, FigureBookEdition } from '@/actions/figure-books/getFigureBooks'

import { createAffiliateBooksLoadGate } from './CelebAffiliateBooksLoadGate'
import { mapRelatedFigureBooksToAffiliateBooks } from './CelebRelatedAffiliateBooks'

const RESULT = {
  books: [{
    contentId: 'book-1',
    title: '테스트 책',
    url: 'https://example.com/book',
  }],
  source: 'read' as const,
}

function flushPromises() {
  return new Promise<void>((resolve) => setImmediate(resolve))
}

test('실제 컴포넌트는 한국어 화면이 뷰포트에 가까워진 뒤에만 loader를 연다', () => {
  const source = readFileSync(new URL('./CelebAffiliateBooks.tsx', import.meta.url), 'utf8')

  assert.match(source, /useNearViewport\('600px 0px'\)/)
  assert.match(source, /enabled: locale === 'ko' && isNear/)
})

test('뷰포트에 가까워지기 전에는 제휴 도서 액션을 부르지 않는다', async () => {
  let calls = 0
  const gate = createAffiliateBooksLoadGate(async () => {
    calls += 1
    return RESULT
  })

  gate.observe({
    enabled: false,
    key: 'celeb:0',
    userId: 'celeb',
    onReady: () => undefined,
    onError: () => undefined,
  })
  await flushPromises()

  assert.equal(calls, 0)
})

test('근접 뒤 effect가 다시 붙어도 같은 액션 요청을 한 번만 공유한다', async () => {
  let calls = 0
  let ready = 0
  const gate = createAffiliateBooksLoadGate(async () => {
    calls += 1
    return RESULT
  })
  const observer = {
    enabled: true,
    key: 'celeb:0',
    userId: 'celeb',
    onReady: () => { ready += 1 },
    onError: () => undefined,
  }

  const detachFirst = gate.observe(observer)
  detachFirst()
  gate.observe(observer)
  await flushPromises()

  assert.equal(calls, 1)
  assert.equal(ready, 1)
})

test('빈 목록과 null 응답은 모두 표시할 자료 없음으로 정규화한다', async () => {
  for (const result of [
    { books: [], source: 'popular' as const },
    null,
  ]) {
    let received: unknown = '호출 안 됨'
    const gate = createAffiliateBooksLoadGate(async () => result)
    gate.observe({
      enabled: true,
      key: String(result),
      userId: 'celeb',
      onReady: (value) => { received = value },
      onError: () => undefined,
    })
    await flushPromises()
    assert.equal(received, null)
  }
})

test('액션 오류는 준비 완료로 오인하지 않고 오류 콜백에 전달한다', async () => {
  const failure = new Error('조회 실패')
  let received: unknown = null
  let ready = 0
  const gate = createAffiliateBooksLoadGate(async () => {
    throw failure
  })

  gate.observe({
    enabled: true,
    key: 'celeb:0',
    userId: 'celeb',
    onReady: () => { ready += 1 },
    onError: (error) => { received = error },
  })
  await flushPromises()

  assert.equal(ready, 0)
  assert.equal(received, failure)
})

test('언마운트 뒤 끝난 요청은 상태 콜백을 실행하지 않는다', async () => {
  let resolveRequest!: (value: typeof RESULT) => void
  const request = new Promise<typeof RESULT>((resolve) => {
    resolveRequest = resolve
  })
  let callbacks = 0
  const gate = createAffiliateBooksLoadGate(() => request)

  const detach = gate.observe({
    enabled: true,
    key: 'celeb:0',
    userId: 'celeb',
    onReady: () => { callbacks += 1 },
    onError: () => { callbacks += 1 },
  })
  detach()
  resolveRequest(RESULT)
  await flushPromises()

  assert.equal(callbacks, 0)
})

function relatedBook(overrides: Partial<FigureBookContent> = {}): FigureBookContent {
  return {
    id: 'related-book', title: '작품 제목', creator: null, thumbnailUrl: null,
    type: 'BOOK', category: 'book', relationType: 'related', appearanceDescription: null,
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

test('등장 도서와 판매 링크 없는 판본은 연관 상품으로 내보내지 않는다', () => {
  const books = [
    relatedBook({ relationType: 'appearance', editions: [saleEdition()] }),
    relatedBook({ id: 'missing-link', editions: [saleEdition({ purchaseUrl: null })] }),
    relatedBook({ id: 'invalid-link', editions: [saleEdition({ purchaseUrl: 'javascript:void(0)' })] }),
    relatedBook({ id: 'wrong-platform', editions: [saleEdition({ platform: 'amazon' })] }),
    relatedBook({ id: 'not-book', type: 'VIDEO', category: 'video', editions: [saleEdition()] }),
    relatedBook({ id: 'valid', editions: [saleEdition({ purchaseUrl: null }), saleEdition()] }),
  ]

  assert.deepEqual(mapRelatedFigureBooksToAffiliateBooks(books, 'ko').map((book) => book.contentId), ['valid'])
})

test('여러 판본과 중복 작품은 한 상품으로 묶고 연관 상품을 여섯 권에서 자르지 않는다', () => {
  const books = Array.from({ length: 8 }, (_, index) => relatedBook({
    id: `book-${index}`, editions: [saleEdition(), saleEdition({ id: 2 })],
  }))
  const products = mapRelatedFigureBooksToAffiliateBooks([...books, books[0]], 'ko')

  assert.deepEqual(products.map((book) => book.contentId), books.map((book) => book.id))
})
