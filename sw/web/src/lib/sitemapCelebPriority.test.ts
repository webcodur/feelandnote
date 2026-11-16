import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CELEB_PRIORITY_START_DATE,
  CELEB_PRIORITY_START_SIZE,
  celebPriorityQuota,
  selectPriorityCelebs,
} from './sitemapCelebPriority'

const start = new Date(`${CELEB_PRIORITY_START_DATE}T00:00:00Z`)
const monthsLater = (months: number) => new Date(start.getTime() + months * 30.4375 * 24 * 60 * 60 * 1000)

test('명단 크기는 시작 크기에서 한 달마다 5%씩 저절로 커진다', () => {
  assert.equal(celebPriorityQuota(new Date('2026-01-01T00:00:00Z')), CELEB_PRIORITY_START_SIZE)
  assert.equal(celebPriorityQuota(start), 400)
  assert.equal(celebPriorityQuota(monthsLater(1)), 420)
  assert.equal(celebPriorityQuota(monthsLater(6)), 536)
  assert.equal(celebPriorityQuota(monthsLater(12)), 718)
  assert.equal(celebPriorityQuota(monthsLater(24)), 1290)
})

test('명단의 30%는 방문 순, 나머지는 기록 순이며 입력 순서와 무관하다', () => {
  // p-0000~0599: 기록 많음·방문 없음, p-0600~0999: 기록 없음·방문 있음
  const celebs = Array.from({ length: 1000 }, (_, index) => ({ slug: `p-${String(index).padStart(4, '0')}` }))
  const signals = new Map(celebs.map(({ slug }, index) => [slug, index < 600
    ? { records: 600 - index, recentViews: 0 }
    : { records: 0, recentViews: index }]))
  const picked = selectPriorityCelebs(celebs, signals, start)
  assert.equal(picked.length, 400)
  assert.deepEqual(selectPriorityCelebs([...celebs].reverse(), signals, start), picked)
  const slugs = new Set(picked.map(({ slug }) => slug))
  assert.equal(picked.filter(({ slug }) => Number(slug.slice(2)) >= 600).length, 120, '방문 몫 120명')
  assert.ok(slugs.has('p-0999') && slugs.has('p-0880') && !slugs.has('p-0879'), '방문 상위 120명')
  assert.ok(slugs.has('p-0000') && slugs.has('p-0279') && !slugs.has('p-0280'), '기록 상위 280명')
})

test('겹치는 인물은 한 번만 싣고 빈자리는 다음 순위로 채운다', () => {
  const celebs = Array.from({ length: 900 }, (_, index) => ({ slug: `q-${String(index).padStart(4, '0')}` }))
  const signals = new Map(celebs.map(({ slug }, index) => [slug, { records: 900 - index, recentViews: 900 - index }]))
  const picked = selectPriorityCelebs(celebs, signals, start)
  assert.equal(picked.length, 400)
  assert.equal(new Set(picked).size, 400)
  assert.deepEqual(picked.map(({ slug }) => slug), celebs.slice(0, 400).map(({ slug }) => slug))
  assert.equal(selectPriorityCelebs(celebs.slice(0, 50), signals, start).length, 50, '인물이 크기보다 적으면 전원')
  assert.equal(selectPriorityCelebs(celebs, signals, monthsLater(12)).length, 718)
})
