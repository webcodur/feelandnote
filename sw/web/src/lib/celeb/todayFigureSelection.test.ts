import assert from 'node:assert/strict'
import { test } from 'node:test'
import { pickCountryTodayFigure, selectTodayFigure, TODAY_FIGURE_RECENT_DAYS, type TodayFigureCandidate } from './todayFigureSelection'

const pool = (country: string, count: number): TodayFigureCandidate[] => Array.from({ length: count }, (_, index) => ({
  id: `${country}-${index}`, nationality: country, birth_date: null, content_count: 5,
}))
const date = (index: number) => new Date(Date.UTC(2026, 11, 20 + index)).toISOString().slice(0, 10)

test('selection is stable across input order and rotates without recent repeats across year boundaries', () => {
  const candidates = pool('KR', 40)
  candidates[0].birth_date = '1980-12-25'
  candidates[1].birth_date = '1980-01-01'
  const last = new Map<string, number>()
  for (let day = 0; day < 45; day++) {
    const selected = selectTodayFigure(candidates, date(day), 'KR')!
    assert.ok(selected)
    assert.deepEqual(selected, selectTodayFigure([...candidates].reverse(), date(day), 'KR'))
    assert.ok(day - (last.get(selected.id) ?? -Infinity) > TODAY_FIGURE_RECENT_DAYS)
    last.set(selected.id, day)
  }
  assert.equal(last.size, candidates.length)
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

test('birthdays take priority, then respect the recent window even in a small pool', () => {
  const candidates = pool('KR', 2)
  candidates[0].birth_date = '1980-10-07'
  candidates[0].content_count = 10
  candidates[1].birth_date = '1990-10-07'
  const selected = pickCountryTodayFigure(candidates, '2026-10-07', 'KR')!
  assert.equal(selected.birthday, true)
  for (let day = 1; day <= TODAY_FIGURE_RECENT_DAYS; day++) {
    const today = new Date(Date.UTC(2026, 9, 7 + day)).toISOString().slice(0, 10)
    assert.notEqual(pickCountryTodayFigure(candidates, today, 'KR')?.id, selected.id)
  }
})

test('invalid dates do not select a figure', () => {
  assert.equal(pickCountryTodayFigure(pool('KR', 20), 'invalid', 'KR'), null)
})
