import assert from 'node:assert/strict';
import test from 'node:test';
import { FEATURED_REVIEW_COOLDOWN_DAYS, featuredReviewDay, featuredReviewCutoff, featuredReviewSchedule, selectFeaturedReview, type FeaturedReviewCandidate } from './featuredReview';

function pool(count: number, approved = '2026-10-07T04:00:00.000Z'): FeaturedReviewCandidate[] {
  return Array.from({ length: count }, (_, i) => ({
    id: 'review-' + i, celeb_id: 'figure-' + i, content_id: 'book-' + i, review_approved_at: approved,
  }));
}

test('one daily choice is stable across query ordering, locales and repeated requests', () => {
  const rows = pool(224);
  const day = '2026-10-07';
  const selected = selectFeaturedReview(rows, day);
  assert.ok(selected);
  assert.deepEqual(selectFeaturedReview([...rows].reverse(), day), selected);
  assert.deepEqual(selectFeaturedReview(rows, day), selected);
  assert.equal(featuredReviewSchedule(rows, day).size, 1);
});

test('the daily review changes its date at Korean noon', () => {
  assert.equal(featuredReviewDay(Date.parse('2026-10-07T02:59:59Z')), '2026-10-06');
  assert.equal(featuredReviewDay(Date.parse('2026-10-07T03:00:00Z')), '2026-10-07');
  assert.equal(featuredReviewCutoff('2026-10-07'), '2026-10-07T03:00:00.000Z');
});

test('a full year shows one review every day with no repeat inside any half-year window', () => {
  const schedule = featuredReviewSchedule(pool(224), '2027-10-06');
  assert.equal(schedule.size, 365);
  const seen = new Map<string, number>();
  for (const [day, row] of schedule) {
    const dayNumber = Date.parse(day) / 86_400_000;
    const previous = seen.get(row.id);
    if (previous !== undefined) assert.ok(dayNumber - previous >= FEATURED_REVIEW_COOLDOWN_DAYS);
    seen.set(row.id, dayNumber);
  }
  assert.ok(FEATURED_REVIEW_COOLDOWN_DAYS >= 184);
});

test('a small pool leaves gaps rather than reusing a review before its cooldown expires', () => {
  const rows = pool(1);
  assert.equal(selectFeaturedReview(rows, '2026-10-07')?.id, rows[0].id);
  assert.equal(selectFeaturedReview(rows, '2026-10-08'), null);
  const first = Date.parse('2026-10-07T00:00:00Z');
  const before = new Date(first + (FEATURED_REVIEW_COOLDOWN_DAYS - 1) * 86_400_000).toISOString().slice(0, 10);
  const after = new Date(first + FEATURED_REVIEW_COOLDOWN_DAYS * 86_400_000).toISOString().slice(0, 10);
  assert.equal(selectFeaturedReview(rows, before), null);
  assert.equal(selectFeaturedReview(rows, after)?.id, rows[0].id);
});

test('later approvals do not change earlier choices and enter at the next Korean noon', () => {
  const original = pool(224);
  const extra = { ...pool(1, '2026-10-10T04:00:00Z')[0], id: 'new-review' };
  assert.deepEqual(featuredReviewSchedule([...original, extra], '2026-10-10'), featuredReviewSchedule(original, '2026-10-10'));
  const single = pool(1);
  assert.equal(selectFeaturedReview([...single, extra], '2026-10-10'), null);
  assert.equal(selectFeaturedReview([...single, extra], '2026-10-11')?.id, extra.id);
});

test('the first approval day includes records approved after noon', () => {
  assert.ok(selectFeaturedReview(pool(4), '2026-10-07'));
  assert.equal(selectFeaturedReview(pool(4), '2026-10-06'), null);
});

test('same person or book still counts as distinct reviews; duplicate IDs do not add slots', () => {
  const rows = pool(5).map(row => ({ ...row, celeb_id: 'same-person', content_id: 'same-book' }));
  const schedule = featuredReviewSchedule([...rows, ...rows], '2026-10-15');
  assert.equal(schedule.size, 5);
  assert.equal(new Set([...schedule.values()].map(row => row.id)).size, 5);
});

test('empty pools, invalid approval dates and missing figures are safe', () => {
  assert.equal(selectFeaturedReview([], '2026-10-07'), null);
  assert.equal(selectFeaturedReview([{ ...pool(1)[0], review_approved_at: 'bad-date' }], '2026-10-07'), null);
  assert.equal(selectFeaturedReview([{ ...pool(1)[0], celeb_id: null }], '2026-10-07'), null);
});
