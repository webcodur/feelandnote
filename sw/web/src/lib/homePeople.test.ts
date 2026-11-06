import assert from 'node:assert/strict'
import test from 'node:test'
import { HOME_PEOPLE_COUNT, isHomePersonContemporary, isHomeShowcasePerson, orderHomePeople, rotateHomePeople } from './homePeople'

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
  const pool = Array.from({ length: 24 }, (_, index) => ({ id: String(index), total_score: 30 + index * 2, category_count: 1 }))
  const pick = (day: string) => rotateHomePeople(pool, day, 'discovery').slice(0, HOME_PEOPLE_COUNT).map(person => person.id)
  assert.deepEqual(pick('2026-11-02'), pick('2026-11-02'))
  assert.deepEqual(pick('2026-11-02'), rotateHomePeople([...pool].reverse(), '2026-11-02', 'discovery').slice(0, HOME_PEOPLE_COUNT).map(person => person.id))
  const selections = Array.from({ length: 14 }, (_, index) => pick(`2026-11-${String(index + 1).padStart(2, '0')}`))
  assert.ok(new Set(selections.map(value => value.join(','))).size > 10)
  assert.ok(new Set(selections.flat()).size > 12)
  assert.notDeepEqual(rotateHomePeople(pool, '2026-11-02', 'books'), rotateHomePeople(pool, '2026-11-02', 'appreciations'))
})

test('greater influence increases selection frequency without excluding lower-scoring candidates', () => {
  const pool = [{ id: 'high', total_score: 60, category_count: 1 }, { id: 'low', total_score: 20, category_count: 1 }]
  const counts = { high: 0, low: 0 }
  for (let day = 0; day < 1000; day++) counts[rotateHomePeople(pool, `sample-${day}`, 'discovery')[0].id as keyof typeof counts]++
  assert.ok(counts.high > counts.low * 5)
  assert.ok(counts.low > 0)
})

test('varied categories raise selection frequency even with equal influence', () => {
  const pool = [{ id: 'varied', total_score: 50, category_count: 4 }, { id: 'single', total_score: 50, category_count: 1 }]
  const counts = { varied: 0, single: 0 }
  for (let day = 0; day < 1000; day++) counts[rotateHomePeople(pool, `sample-${day}`, 'discovery')[0].id as keyof typeof counts]++
  assert.ok(counts.varied > counts.single * 5)
  assert.ok(counts.single > 0, 'Weights never exclude a qualified person')
})

test('showcase people must be contemporary and clear the influence bar regardless of record volume', () => {
  assert.equal(isHomeShowcasePerson({ contemporary: true, total_score: 40 }), true)
  assert.equal(isHomeShowcasePerson({ contemporary: true, total_score: 27 }), false)
  assert.equal(isHomeShowcasePerson({ contemporary: false, total_score: 77 }), false)
})

test('an established person does not hold the first slot every day', () => {
  const pool = [
    { id: 'established', nationality: 'KR', total_score: 45, category_count: 2 },
    ...Array.from({ length: 30 }, (_, index) => ({ id: `new-${index}`, nationality: 'KR', total_score: 25, category_count: 2 })),
  ]
  const leaders = new Set(Array.from({ length: 60 }, (_, day) =>
    orderHomePeople(rotateHomePeople(pool, `sample-${day}`, 'appreciations'), 'KR', person => person.id, person => person.nationality)[0].id))
  assert.ok(leaders.size > 10)
})

test('contemporary people were born from 1900 and are alive', () => {
  assert.equal(isHomePersonContemporary('1971-06-28', null), true)
  assert.equal(isHomePersonContemporary('1955-02-24', '2011-10-05'), false)
  assert.equal(isHomePersonContemporary('1879-03-14', ''), false)
  assert.equal(isHomePersonContemporary('-384', null), false)
  assert.equal(isHomePersonContemporary(null, null), false)
})
