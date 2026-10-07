import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FEATURED_REVIEW_MIN_TEXT_LENGTH, featuredReviewDay, featuredReviewHasEnoughText, featuredReviewTextLength, orderFeaturedReviews } from './featuredReviewLength'

test('only body text contributes to the minimum in both languages', () => {
  const full = { review: '가'.repeat(FEATURED_REVIEW_MIN_TEXT_LENGTH.ko), review_en: 'a'.repeat(FEATURED_REVIEW_MIN_TEXT_LENGTH.en) }
  assert.ok(featuredReviewHasEnoughText(full))
  assert.equal(featuredReviewHasEnoughText({ ...full, review: '가'.repeat(FEATURED_REVIEW_MIN_TEXT_LENGTH.ko - 1) + ' \n** https://example.com/' }), false)
  assert.equal(featuredReviewHasEnoughText({ ...full, review_en: null }), false)
  assert.equal(featuredReviewTextLength('**한 글**\n\u200Bhttps://example.com/ 긴😀'), 4)
})

test('the shared daily boundary is noon in Korea', () => {
  assert.equal(featuredReviewDay(Date.parse('2026-10-08T02:59:59Z')), '2026-10-07')
  assert.equal(featuredReviewDay(Date.parse('2026-10-08T03:00:00Z')), '2026-10-08')
})

test('a stable pool cycles without repeats before every candidate has had a turn', () => {
  const pool = Array.from({ length: 184 }, (_, index) => ({ id: String(index), celeb_id: `figure-${index}`, content_id: `book-${index}` }))
  const chosen = []
  for (let index = 0; index < pool.length; index++) {
    const day = new Date(Date.UTC(2026, 0, 1 + index)).toISOString().slice(0, 10)
    chosen.push(orderFeaturedReviews(pool, day)[0].id)
  }
  assert.equal(new Set(chosen).size, pool.length)
  assert.deepEqual(orderFeaturedReviews(pool, '2026-10-08'), orderFeaturedReviews([...pool].reverse(), '2026-10-08'))
  assert.equal(pool[0].id, '0')
})

test('missing people and duplicate relations do not add slots to the rotation', () => {
  const row = { id: 'review', celeb_id: 'figure', content_id: 'book' }
  assert.deepEqual(orderFeaturedReviews([row, row, { ...row, id: 'missing', celeb_id: null }], '2026-10-08'), [row])
  assert.deepEqual(orderFeaturedReviews([], '2026-10-08'), [])
})
