import assert from 'node:assert/strict'
import { test } from 'node:test'

test('movie and TV searches retain results whose genre IDs are missing or null', async () => {
  const beforeKey = process.env.TMDB_API_KEY
  process.env.TMDB_API_KEY = 'test-key'
  const { searchMovies, searchTVShows } = await import('./tmdb.ts')
  const beforeFetch = globalThis.fetch
  globalThis.fetch = async () => Response.json({
    page: 1, total_pages: 2, total_results: 3,
    results: [
      { id: 1, title: 'First', name: 'First', genre_ids: [35] },
      { id: 2, title: 'Second', name: 'Second' },
      { id: 3, title: 'Third', name: 'Third', genre_ids: null },
    ],
  })
  try {
    for (const search of [searchMovies, searchTVShows]) {
      const result = await search('example')
      assert.equal(result.total, 3)
      assert.equal(result.hasMore, true)
      assert.equal(result.items.length, 3)
      assert.deepEqual(result.items.map(row => row.metadata.genres), [['코미디'], [], []])
      assert.deepEqual(result.items.map(row => row.title), ['First', 'Second', 'Third'])
    }
  } finally {
    globalThis.fetch = beforeFetch
    if (beforeKey === undefined) delete process.env.TMDB_API_KEY
    else process.env.TMDB_API_KEY = beforeKey
  }
})
