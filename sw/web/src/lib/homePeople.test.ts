import assert from 'node:assert/strict'
import test from 'node:test'
import { HOME_PEOPLE_COUNT, orderHomePeople, rotateHomePeople } from './homePeople'

const people = [
  { id: 'kr1', country: 'KR' }, { id: 'kr2', country: 'KR' }, { id: 'us1', country: 'US' },
  { id: 'us2', country: 'US' }, { id: 'jp', country: 'JP' }, { id: 'kr1', country: 'KR' },
]
const choose = (country: string | null) => orderHomePeople(people, country, person => person.id, person => person.country).slice(0, HOME_PEOPLE_COUNT).map(person => person.id)

test('home people combine visitors’ country and the US while preserving rank within each country', () => {
  assert.deepEqual(choose('KR'), ['kr1', 'us1', 'kr2'])
  assert.deepEqual(choose('JP'), ['jp', 'us1', 'us2'])
  assert.deepEqual(choose('US'), ['us1', 'us2', 'kr1'])
})

test('missing or unsupported visitor countries use available Americans and then existing candidates without duplicates', () => {
  assert.deepEqual(choose(null), ['us1', 'us2', 'kr1'])
  assert.deepEqual(choose('IS'), ['us1', 'us2', 'kr1'])
  assert.equal(orderHomePeople(people, 'KR', person => person.id, person => person.country).length, 5)
  assert.deepEqual(orderHomePeople([], 'KR', String, () => null), [])
})

test('daily influence-weighted rotations are stable for one day, vary across days and use more than a fixed top six', () => {
  const pool = Array.from({ length: 24 }, (_, index) => ({ id: String(index), total_score: 30 + index * 2 }))
  const pick = (day: string) => rotateHomePeople(pool, day, 'discovery').slice(0, HOME_PEOPLE_COUNT).map(person => person.id)
  assert.deepEqual(pick('2026-11-02'), pick('2026-11-02'))
  assert.deepEqual(pick('2026-11-02'), rotateHomePeople([...pool].reverse(), '2026-11-02', 'discovery').slice(0, HOME_PEOPLE_COUNT).map(person => person.id))
  const selections = Array.from({ length: 14 }, (_, index) => pick(`2026-11-${String(index + 1).padStart(2, '0')}`))
  assert.ok(new Set(selections.map(value => value.join(','))).size > 10)
  assert.ok(new Set(selections.flat()).size > 12)
  assert.notDeepEqual(rotateHomePeople(pool, '2026-11-02', 'books'), rotateHomePeople(pool, '2026-11-02', 'appreciations'))
})

test('greater influence increases selection frequency without excluding lower-scoring candidates', () => {
  const pool = [{ id: 'high', total_score: 60 }, { id: 'low', total_score: 20 }]
  const counts = { high: 0, low: 0 }
  for (let day = 0; day < 1000; day++) counts[rotateHomePeople(pool, `sample-${day}`, 'discovery')[0].id as keyof typeof counts]++
  assert.ok(counts.high > counts.low * 5)
  assert.ok(counts.low > 0)
})

test('the first local and US slots prefer established influence while other slots retain the discovery rotation', () => {
  const pool = [
    { id: 'local-new', nationality: 'KR', score: 20 }, { id: 'us-new', nationality: 'US', score: 20 },
    { id: 'local-established', nationality: 'KR', score: 50 }, { id: 'us-established', nationality: 'US', score: 60 },
  ]
  assert.deepEqual(orderHomePeople(pool, 'KR', person => person.id, person => person.nationality, person => person.score)
    .slice(0, 3).map(person => person.id), ['local-established', 'us-established', 'local-new'])
})
