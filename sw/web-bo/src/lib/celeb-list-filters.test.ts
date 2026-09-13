import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveCelebContentCount } from '@feelandnote/shared/constants/celeb-content-research'
import {
  getCelebCreatedAtBounds,
  hasCelebColumnFilters,
  hasCelebContentRange,
  matchesCelebNumericRanges,
  parseCelebColumnFilters,
} from './celeb-list-filters'

test('blank and all filters do not become zero or active filters', () => {
  const filters = parseCelebColumnFilters({
    nationality: 'all', gender: 'all', avatar: 'all', portrait: '', awakened: 'all',
    influenceMin: '', contentMin: '  ', followerMin: '', createdFrom: '',
  })
  assert.deepEqual(filters, {})
  assert.equal(hasCelebColumnFilters(filters), false)
  assert.equal(hasCelebColumnFilters({ avatar: 'all', gender: 'all' }), false)
})

test('URL parser retains independent image filters and zero or confirmed-empty count bounds', () => {
  assert.deepEqual(parseCelebColumnFilters({
    nationality: ' KR ', gender: 'unknown', avatar: 'present', portrait: 'missing', awakened: 'missing',
    influenceMin: '0', contentMin: '-1', contentMax: '0', followerMax: '12',
  }), {
    nationality: 'KR', gender: 'unknown', avatar: 'present', portrait: 'missing', awakened: 'missing',
    influenceMin: 0, contentMin: -1, contentMax: 0, followerMax: 12,
  })
  assert.equal(hasCelebColumnFilters({ contentMax: 0 }), true)
  assert.equal(hasCelebContentRange({ contentMin: -1 }), true)
})

test('URL parser rejects invalid enums, fractional, unsafe and out-of-domain numeric values', () => {
  assert.deepEqual(parseCelebColumnFilters({
    gender: 'invalid', avatar: 'yes', influenceMin: '-1', influenceMax: '1.5',
    contentMin: '-2', contentMax: '1e2', followerMin: 'NaN', followerMax: '9007199254740992',
  }), {})
})

test('calendar dates are real dates rather than JavaScript rollover dates', () => {
  assert.deepEqual(parseCelebColumnFilters({ createdFrom: '2024-02-29', createdTo: '2026-09-05' }), {
    createdFrom: '2024-02-29', createdTo: '2026-09-05',
  })
  for (const value of ['2026-02-29', '2026-02-30', '2026-13-01', '2026-9-05', '0000-01-01']) {
    assert.deepEqual(parseCelebColumnFilters({ createdFrom: value, createdTo: value }), {})
  }
})

test('date ranges include the entire selected Korean date and exclude the next date', () => {
  const bounds = getCelebCreatedAtBounds({ createdFrom: '2026-12-31', createdTo: '2026-12-31' })
  assert.equal(new Date(bounds.fromInclusive!).toISOString(), '2026-12-30T15:00:00.000Z')
  assert.equal(bounds.toExclusive, '2026-12-31T15:00:00.000Z')
  assert.equal(new Date('2026-12-31T14:59:59.999Z') < new Date(bounds.toExclusive!), true)
  assert.deepEqual(getCelebCreatedAtBounds({ createdFrom: '2026-02-30' }), {
    fromInclusive: undefined, toExclusive: undefined,
  })
})

test('numeric filters compose inclusively before callers count or paginate results', () => {
  const celebs = [
    { influence_total: 20, follower_count: 0, content_count: resolveCelebContentCount(0, '2026-01-01') },
    { influence_total: 20, follower_count: 0, content_count: resolveCelebContentCount(0, null) },
    { influence_total: 20, follower_count: 1, content_count: resolveCelebContentCount(3, '2026-01-01') },
    { influence_total: 19, follower_count: 1, content_count: 3 },
  ]
  assert.deepEqual(celebs.filter((celeb) => matchesCelebNumericRanges(celeb, {
    influenceMin: 20, influenceMax: 20, contentMin: -1, contentMax: 0, followerMax: 0,
  })), celebs.slice(0, 2))
  assert.deepEqual(celebs.filter((celeb) => matchesCelebNumericRanges(celeb, {
    contentMin: -1, contentMax: -1,
  })), [celebs[0]])
  assert.deepEqual(celebs.filter((celeb) => matchesCelebNumericRanges(celeb, {
    contentMin: 3, followerMin: 1, influenceMin: 20,
  })), [celebs[2]])
  assert.equal(matchesCelebNumericRanges(celebs[2], { contentMin: 4, contentMax: 2 }), false)
})
