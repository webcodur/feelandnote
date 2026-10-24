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

test('people get equal daily turns even when one person has many more reviews', () => {
  const pool = [100, 3, 1].flatMap((count, person) => Array.from({ length: count }, (_, index) => ({
    id: `${person}-${index}`, celeb_id: `figure-${person}`, content_id: `book-${person}-${index}`,
  })))
  const counts = new Map<string, number>()
  let previous: string | null = null
  for (let index = 0; index < 30; index++) {
    const day = new Date(Date.UTC(2026, 0, 1 + index)).toISOString().slice(0, 10)
    const ordered = orderFeaturedReviews(pool, day)
    const chosen = ordered[0].celeb_id!
    assert.notEqual(chosen, previous)
    counts.set(chosen, (counts.get(chosen) ?? 0) + 1)
    previous = chosen
    // 판매 확인이 실패해도 다른 인물의 첫 후보부터 확인한다.
    assert.equal(new Set(ordered.slice(0, 3).map(row => row.celeb_id)).size, 3)
    assert.equal(new Set(ordered.map(row => row.id)).size, pool.length)
    assert.deepEqual(ordered, orderFeaturedReviews([...pool].reverse(), day))
  }
  assert.deepEqual([...counts.values()], [10, 10, 10])
})

test('each person rotates through their reviews on successive turns', () => {
  const pool = [4, 2].flatMap((count, person) => Array.from({ length: count }, (_, index) => ({
    id: `${person}-${index}`, celeb_id: `figure-${person}`, content_id: `book-${person}-${index}`,
  })))
  const chosen = new Map<string, string[]>()
  for (let index = 0; index < 8; index++) {
    const day = new Date(Date.UTC(2026, 0, 1 + index)).toISOString().slice(0, 10)
    const row = orderFeaturedReviews(pool, day)[0]
    const ids = chosen.get(row.celeb_id!) ?? []
    ids.push(row.id)
    chosen.set(row.celeb_id!, ids)
  }
  assert.equal(new Set(chosen.get('figure-0')).size, 4)
  assert.equal(new Set(chosen.get('figure-1')!.slice(0, 2)).size, 2)
  assert.equal(chosen.get('figure-1')![0], chosen.get('figure-1')![2])
})

test('moderately shorter bilingual reviews qualify at the new minimum', () => {
  assert.ok(featuredReviewHasEnoughText({ review: '가'.repeat(300), review_en: 'a'.repeat(500) }))
})
