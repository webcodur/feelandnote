import assert from 'node:assert/strict'
import { test } from 'node:test'

test('film details append multiple distinct scene images without extra image requests', async (t) => {
  const beforeKey = process.env.TMDB_API_KEY
  process.env.TMDB_API_KEY = 'test-key'
  t.after(() => { if (beforeKey === undefined) delete process.env.TMDB_API_KEY; else process.env.TMDB_API_KEY = beforeKey })
  const { getVideoById, MAX_VIDEO_STILLS } = await import('./tmdb.ts')
  let calls = 0
  t.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL) => {
    calls++
    const url = new URL(input.toString())
    if (url.pathname.endsWith('/credits')) return Response.json({ cast: [{ name: 'Actor', character: 'Role' }], crew: [{ job: 'Director', name: 'Director' }] })
    assert.equal(url.searchParams.get('append_to_response'), 'images')
    assert.equal(url.searchParams.get('include_image_language'), 'ko,en,null')
    return Response.json({ title: 'Film', production_countries: [{ iso_3166_1: 'KR' }], backdrop_path: '/first.jpg', images: { backdrops: [
      { file_path: '/first.jpg', width: 1000, height: 600 },
      { file_path: '/portrait.jpg', width: 400, height: 600 },
      { file_path: '/text.jpg', width: 1000, height: 600, iso_639_1: 'en' },
      { file_path: '//unsafe/path', width: 1000, height: 600 },
      ...Array.from({ length: 20 }, (_, index) => ({ file_path: `/scene-${index}.jpg`, width: 1000, height: 600 })),
    ] } })
  })
  const film = await getVideoById('tmdb-movie-86267')
  assert.equal(calls, 2)
  assert.equal(film?.metadata.screenshots?.length, MAX_VIDEO_STILLS)
  assert.equal(film?.metadata.screenshots?.[0], film?.metadata.backdropUrl)
  assert.ok(!film?.metadata.screenshots?.some(url => /portrait|text|unsafe/.test(url)))
  assert.equal(new Set(film?.metadata.screenshots).size, MAX_VIDEO_STILLS)
  assert.equal(film?.creator, 'Director')
  assert.equal(film?.metadata.cast?.[0].name, 'Actor')
  assert.deepEqual(film?.metadata.productionCountries, ['KR'])
})

test('TV details keep their representative image when the image list is absent', async (t) => {
  const beforeKey = process.env.TMDB_API_KEY
  process.env.TMDB_API_KEY = 'test-key'
  t.after(() => { if (beforeKey === undefined) delete process.env.TMDB_API_KEY; else process.env.TMDB_API_KEY = beforeKey })
  const { getVideoById } = await import('./tmdb.ts')
  t.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL) => new URL(input.toString()).pathname.endsWith('/credits')
    ? new Response('', { status: 503 })
    : Response.json({ name: 'TV show', backdrop_path: '/tv.jpg', created_by: [{ name: 'Creator' }] }))
  const tv = await getVideoById('tmdb-tv-123', 'en')
  assert.equal(tv?.title, 'TV show')
  assert.equal(tv?.creator, 'Creator')
  assert.deepEqual(tv?.metadata.screenshots, ['https://image.tmdb.org/t/p/w500/tv.jpg'])
})

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
