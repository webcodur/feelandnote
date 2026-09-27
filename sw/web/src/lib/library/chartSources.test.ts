import assert from 'node:assert/strict'
import test from 'node:test'
import { CHART_CATEGORIES, chartSource, chartSources } from './chartSources'

test('keeps source selections within their category and locale', () => {
  assert.equal(chartSource('BOOK', 'ko', 'yes24').id, 'yes24')
  assert.equal(chartSource('BOOK', 'en', 'yes24').id, 'apple-books')
  assert.equal(chartSource('BOOK', 'ko', 'apple-books').id, 'yes24')
  assert.equal(chartSource('GAME', 'ko', 'playstation').id, 'steam')
  assert.equal(chartSource('GAME', 'en', 'xbox').id, 'steam')
  assert.equal(chartSource('GAME', 'ko', 'igdb').id, 'steam')
  assert.equal(chartSource('MUSIC', 'ko', 'steam').id, 'apple-music')
  assert.equal(chartSource('GAME', 'ko', 'apple-music').id, 'steam')
  assert.equal(chartSource('GAME', 'ko', 'https://example.com').id, 'steam')
  assert.equal(chartSource('VIDEO', 'ko', '').id, 'apple-movies')
})

test('every category has an available default; unfinished game sources are hidden', () => {
  for (const language of ['ko', 'en'] as const) {
    for (const category of CHART_CATEGORIES) {
      const sources = chartSources(category, language)
      assert.ok(sources.length > 0)
      assert.equal(new Set(sources.map(source => source.id)).size, sources.length)
      assert.deepEqual(chartSource(category, language), sources[0])
      assert.equal(chartSource(category, language).available, true)
    }
    const games = chartSources('GAME', language)
    assert.deepEqual(games.map(source => new URL(source.url).hostname), [
      'store.steampowered.com',
    ])
    assert.deepEqual(games.filter(source => source.available).map(source => source.id), ['steam'])
  }
})
