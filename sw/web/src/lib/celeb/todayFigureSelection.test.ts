import assert from 'node:assert/strict'
import { test } from 'node:test'
import { pickCountryTodayFigure, selectTodayFigure, TODAY_FIGURE_RECENT_DAYS, type TodayFigureCandidate } from './todayFigureSelection'

const pool = (country: string, count: number): TodayFigureCandidate[] => Array.from({ length: count }, (_, index) => ({
  id: `${country}-${index}`, nationality: country,
}))
const date = (index: number) => new Date(Date.UTC(2026, 11, 20 + index)).toISOString().slice(0, 10)

test('selection is stable across input order and rotates without recent repeats across year boundaries', () => {
  const candidates = pool('KR', 40)
  const last = new Map<string, number>()
  for (let day = 0; day < 45; day++) {
    const selected = selectTodayFigure(candidates, date(day), 'KR')!
    assert.ok(selected)
    assert.deepEqual(selected, selectTodayFigure([...candidates].reverse(), date(day), 'KR'))
    assert.ok(day - (last.get(selected.id) ?? -Infinity) > TODAY_FIGURE_RECENT_DAYS)
    last.set(selected.id, day)
  }
  assert.ok(last.size > TODAY_FIGURE_RECENT_DAYS + 1)
})

test('small national pools keep appearing with US filling the gaps, without repeated figures', () => {
  const candidates = [...pool('TR', 3), ...pool('US', 60)]
  const last = new Map<string, number>()
  let local = 0
  for (let day = 0; day < 60; day++) {
    const selected = selectTodayFigure(candidates, date(day), 'TR')!
    assert.ok(selected)
    if (selected.id.startsWith('TR-')) local++
    else assert.deepEqual(selected, selectTodayFigure(candidates, date(day), 'US'))
    assert.ok(day - (last.get(selected.id) ?? -Infinity) > TODAY_FIGURE_RECENT_DAYS)
    last.set(selected.id, day)
  }
  assert.equal(local, 12)
})

test('unknown and empty countries share the US choice; an empty directory produces no figure', () => {
  const candidates = pool('US', 30)
  const expected = selectTodayFigure(candidates, '2026-10-07', 'US')
  assert.deepEqual(selectTodayFigure(candidates, '2026-10-07', null), expected)
  assert.deepEqual(selectTodayFigure(candidates, '2026-10-07', 'JP'), expected)
  assert.equal(selectTodayFigure([], '2026-10-07', 'KR'), null)
})

test('birthdays and content counts do not affect random selection', () => {
  const candidates = pool('KR', 30)
  const withBirthdays = candidates.map((row, index) => ({
    ...row, birth_date: index % 2 ? '1980-12-25' : '1980-01-01', content_count: 100 - index,
  }))
  for (let day = 0; day < 30; day++) {
    assert.deepEqual(selectTodayFigure(withBirthdays, date(day), 'KR'), selectTodayFigure(candidates, date(day), 'KR'))
  }
})

test('random selection does not follow a fixed circular order', () => {
  const candidates = pool('KR', 30)
  const following = new Map<string, Set<string>>()
  let previous = selectTodayFigure(candidates, date(0), 'KR')!.id
  for (let day = 1; day < 90; day++) {
    const selected = selectTodayFigure(candidates, date(day), 'KR')!.id
    const next = following.get(previous) ?? new Set<string>()
    next.add(selected)
    following.set(previous, next)
    previous = selected
  }
  assert.ok([...following.values()].some(next => next.size > 1))
})

test('invalid dates do not select a figure', () => {
  assert.equal(pickCountryTodayFigure(pool('KR', 20), 'invalid', 'KR'), null)
})
