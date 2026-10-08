import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveBookShelfBook } from './bookShelf'
import type { FigureBookEdition } from '@/actions/figure-books/figureBookLocale'
import type { ContentLocaleRow } from '@/lib/utils/content-locale'

const edition: FigureBookEdition = {
  id: 1, title: '확인된 판본', creator: '저자', description: null, isbn: '9791139721973',
  publisher: null, thumbnailUrl: null, releaseDate: null, editionKind: null,
  textScope: null, sortOrder: 0, platform: null, purchaseUrl: null,
}
const content = (rows: ContentLocaleRow[]) => ({ id: 'work', type: 'BOOK', content_locales: rows })
const row = (locale: string, sources: unknown = { primary: 'kakao_book' }): ContentLocaleRow => ({
  locale, title: '작품 제목', creator: '저자', thumbnail_url: null, sources,
})

test('다른 언어의 판본이나 표시용 번역 제목은 개인·테마 책장의 구매 후보가 아니다', () => {
  assert.equal(resolveBookShelfBook(content([row('ko')]), [], 'en'), null)
  assert.equal(resolveBookShelfBook(content([row('en', { primary: 'none', title: 'translated' })]), [], 'en'), null)
})

test('등록된 실제 언어판은 표시용 제목의 번역본 없음 판정을 바로잡는다', () => {
  const book = resolveBookShelfBook(content([row('en', { primary: 'none', title: 'original' })]), [edition], 'en')
  assert.equal(book?.titleBadge, null)
  assert.equal(book?.editionId, 1)
  assert.equal(book?.title, edition.title)
  assert.match(book?.url ?? '', /amazon\.com/)
})

test('절판 표식은 판본·제휴 링크가 남아 있어도 구매 후보에서 제외한다', () => {
  const out = row('ko', { primary: 'kakao_book', availability: 'out_of_print' })
  out.affiliate_url = [{ platform: 'coupang', url: 'https://link.coupang.com/a/old' }]
  assert.equal(resolveBookShelfBook(content([out]), [edition], 'ko'), null)
})

test('카탈로그 밖 감상 도서는 확인된 locale과 ISBN으로 카드화한다', () => {
  const locale = { ...row('ko'), isbn: '9791139721973' }
  assert.equal(resolveBookShelfBook(content([locale]), [], 'ko')?.isbn, locale.isbn)
})

test('시작권이 없어 제외된 카탈로그 판본을 locale의 중간 권 ISBN·표지·상품으로 되살리지 않는다', () => {
  const middle = { ...row('ko'), isbn: '9791127402228', thumbnail_url: 'https://example.com/vol41.jpg',
    affiliate_url: [{ platform: 'coupang', url: 'https://link.coupang.com/a/vol41' }] }
  assert.equal(resolveBookShelfBook(content([middle]), [], 'ko', undefined, false), null)
  assert.equal(resolveBookShelfBook(content([middle]), [edition], 'ko', undefined, false)?.editionId, 1)
})
