import assert from 'node:assert/strict'
import { test } from 'node:test'
import { countryFirst, orderMythRegions, parseVisitorCountry } from './visitorCountry'
import { selectDailyPromotions, mergePromotedIntoPage } from './celeb/dailyRecommendTrend'
import { paginateTimeline } from '../components/features/user/explore/sections/TimelineSection/pagination'
import type { TimelineData } from '../actions/home/getCelebTimeline'
import { lastMythFromCookies } from '../components/features/user/explore/myth/mythHref'

test('only actual country headers supply a preference', () => {
  assert.equal(parseVisitorCountry(' tr '), 'TR')
  assert.equal(parseVisitorCountry('KR'), 'KR')
  for (const invalid of [undefined, null, '', 'XX', 'T1', 'ZZ', 'EU', 'en', 'Türkiye']) assert.equal(parseVisitorCountry(invalid), null)
})

test('local ordering keeps all entries and their existing relative order', () => {
  const items = [{ country: 'US', id: 1 }, { country: 'TR', id: 2 }, { country: 'KR', id: 3 }, { country: 'TR', id: 4 }]
  assert.deepEqual(countryFirst(items, 'TR', item => item.country).map(item => item.id), [2, 4, 1, 3])
  assert.deepEqual(countryFirst(items, null, item => item.country), items)
  assert.deepEqual(countryFirst(items, 'JP', item => item.country), items)
  assert.deepEqual(items.map(item => item.id), [1, 2, 3, 4])
})

test('myth regional ordering never changes or removes works in the selected region', () => {
  const regions = [{ slug: 'greek-roman', works: ['homer-odyssey'] }, { slug: 'korea', works: ['dangun'] }, { slug: 'west-asia', works: ['gilgamesh'] }]
  assert.deepEqual(orderMythRegions(regions, 'KR').map(item => item.slug), ['korea', 'greek-roman', 'west-asia'])
  assert.deepEqual(orderMythRegions(regions, 'TR').map(item => item.slug), ['west-asia', 'greek-roman', 'korea'])
  assert.equal(orderMythRegions(regions, 'KR').find(item => item.slug === 'greek-roman')?.works[0], 'homer-odyssey')
  assert.deepEqual(orderMythRegions(regions, null), regions)
})

test('myth selection can resume safely even when unrelated cookies or malformed values exist', () => {
  assert.equal(lastMythFromCookies('foo=bar; fn-last-myth=homer-odyssey'), 'homer-odyssey')
  assert.equal(lastMythFromCookies('fn-last-myth=%E0%A4%A'), null)
  assert.equal(lastMythFromCookies('foo=bar'), null)
})

test('daily country promotions are capped, deduplicated and deterministic', () => {
  const people = Array.from({ length: 30 }, (_, i) => ({ id: `person-${i}` }))
  const selected = selectDailyPromotions(people, people, 24, '2026-10-03')
  assert.deepEqual(selected, selectDailyPromotions(people, people, 24, '2026-10-03'))
  assert.equal(new Set(selected.map(item => item.id)).size, selected.length)
  assert(selected.length <= 9)
  const remaining = people.filter(item => !selected.some(local => local.id === item.id))
  const first = mergePromotedIntoPage(selected, remaining.slice(0, 24 - selected.length), 24, '2026-10-03')
  const second = remaining.slice(24 - selected.length)
  assert.equal(first.length, 24)
  assert.equal(new Set([...first, ...second].map(item => item.id)).size, people.length)
  assert.deepEqual(selectDailyPromotions(people, [], 12, '2026-10-03'), people.slice(0, 3))
})

test('timeline uses visitor preference only without an explicit available selection', () => {
  const data: TimelineData = { celebs: [], countries: [{ code: 'KR', name: 'Korea', count: 0 }, { code: 'TR', name: 'Türkiye', count: 0 }] }
  assert.equal(paginateTimeline(data, undefined, undefined, 'TR').country, 'TR')
  assert.equal(paginateTimeline(data, undefined, undefined, 'TR').path, '/explore/timeline?country=TR')
  assert.equal(paginateTimeline(data, 'KR', undefined, 'TR').country, 'KR')
  assert.equal(paginateTimeline(data, undefined, undefined, 'ZZ').country, 'KR')
})
