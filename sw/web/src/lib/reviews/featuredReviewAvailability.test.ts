import { test } from 'node:test'
import assert from 'node:assert/strict'
import { availableFeaturedReviews, featuredReviewEdition, type FeaturedReviewBookCandidate } from './featuredReviewAvailability'
import type { Yes24BookDetail } from '@/lib/books/yes24Purchase'

const KO = '9791191805086'
const EN = '9780140443486'
const book = (id: string): FeaturedReviewBookCandidate => ({
  id, celeb_id: 'figure', content_id: id, review_approved_at: '2026-10-01T00:00:00Z',
  contents: { content_locales: [
    { locale: 'ko', title: '논어', isbn: KO, creator: '공자', thumbnail_url: null },
    { locale: 'en', title: 'The Analects', isbn: EN, creator: 'Confucius', thumbnail_url: null },
  ] },
})
const detail = (isbn: string, onSale = true): Yes24BookDetail => ({
  isbn, onSale, itemId: 1, title: 'Actual edition', purchaseUrl: 'https://www.yes24.com/product/goods/1',
  subTitle: null, author: null, publisher: null, publishDate: null, pages: null, shopPrice: null,
  salePrice: null, starScore: null, salePoint: null, cover: null, introduction: null,
})

test('display-only titles, missing ISBN and out-of-print editions cannot qualify', () => {
  const row = book('real').contents.content_locales![0]
  assert.ok(featuredReviewEdition([row], 'ko'))
  assert.equal(featuredReviewEdition([{ ...row, isbn: null }], 'ko'), null)
  assert.equal(featuredReviewEdition([{ ...row, isbn: '9791191805080' }], 'ko'), null)
  assert.equal(featuredReviewEdition([{ ...row, sources: { primary: 'none', title: 'translated' } }], 'ko'), null)
  assert.equal(featuredReviewEdition([{ ...row, sources: { availability: 'out_of_print' } }], 'ko'), null)
})

test('the shared selection requires actual on-sale editions in both languages', async () => {
  assert.equal((await availableFeaturedReviews([book('real')], async isbn => detail(isbn))).length, 1)
  assert.deepEqual(await availableFeaturedReviews([book('sold-out')], async isbn => detail(isbn, isbn !== EN)), [])
  assert.deepEqual(await availableFeaturedReviews([book('not-found')], async () => null), [])
  assert.deepEqual(await availableFeaturedReviews([book('wrong-edition')], async () => detail('9780262035613')), [])
  assert.deepEqual(await availableFeaturedReviews([book('no-product')], async isbn => ({ ...detail(isbn), purchaseUrl: null })), [])
  const missingEnglish = book('no-english')
  missingEnglish.contents.content_locales!.pop()
  assert.deepEqual(await availableFeaturedReviews([missingEnglish], async () => { throw new Error('Must not query') }), [])
})

test('duplicate ISBNs are queried once and upstream failures are excluded only for this request', async () => {
  const queried: string[] = []
  const rows = await availableFeaturedReviews([book('first'), book('second')], async isbn => {
    queried.push(isbn)
    return detail(isbn)
  })
  assert.deepEqual(rows.map(row => row.id), ['first', 'second'])
  assert.deepEqual(queried.sort(), [KO, EN].sort())
  assert.deepEqual(await availableFeaturedReviews([book('failure')], async isbn => {
    if (isbn === EN) throw new Error('Upstream unavailable')
    return detail(isbn)
  }), [])
  assert.equal((await availableFeaturedReviews([book('failure')], async isbn => detail(isbn))).length, 1)
})
