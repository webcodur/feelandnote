import assert from 'node:assert/strict'
import test from 'node:test'
import { orderRecommendedCelebs } from './recommendCelebs'

const candidates = [
  { id: 'major', total_score: 100, content_count: 20 },
  { id: 'minor', total_score: 0, content_count: 1 },
]

test('recommendation is stable for a seed and gives both people a chance', () => {
  const counts = { major: 0, minor: 0 }
  for (let day = 1; day <= 180; day++) {
    const seed = `2026-09-${day}`
    const first = orderRecommendedCelebs(candidates, seed, new Set())[0].id as keyof typeof counts
    assert.equal(first, orderRecommendedCelebs(candidates, seed, new Set())[0].id)
    counts[first]++
  }
  assert.ok(counts.major > counts.minor)
  assert.ok(counts.minor > 0)
})

test('a verified trend match raises selection chance without guaranteeing a slot', () => {
  let withoutTrend = 0
  let withTrend = 0
  for (let day = 1; day <= 180; day++) {
    const seed = `2026-10-${day}`
    if (orderRecommendedCelebs(candidates, seed, new Set())[0].id === 'minor') withoutTrend++
    if (orderRecommendedCelebs(candidates, seed, new Set(['minor']))[0].id === 'minor') withTrend++
  }
  assert.ok(withTrend > withoutTrend)
  assert.ok(withTrend < 180)
})
