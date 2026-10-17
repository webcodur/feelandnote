import assert from 'node:assert/strict'
import test from 'node:test'
import { NextRequest } from 'next/server'
import { normalizeFilmography, filterFilmography, getFilmographyVisibleCounts, type FilmographyWork, type TmdbCredit } from './filmography'
import { GET } from '@/app/api/celeb-filmography/route'

const credit = (fields: Partial<TmdbCredit> = {}): TmdbCredit => ({
  id: 77, media_type: 'movie', title: 'Same title', release_date: '2000-10-11', vote_count: 100,
  poster_path: '/poster.jpg', ...fields,
})

const work = (index: number, fields: Partial<FilmographyWork> = {}): FilmographyWork => ({
  id: `tmdb-movie-${index}`, mediaType: 'movie', title: `Film ${index}`, year: '2000',
  poster: null, roles: ['acting'], characters: [], jobs: [], ...fields,
})

test('mobile starts with four and adds two, desktop starts with eight and adds four', () => {
  assert.deepEqual(getFilmographyVisibleCounts(30, 0), { mobile: 4, desktop: 8 })
  assert.deepEqual(getFilmographyVisibleCounts(30, 1), { mobile: 6, desktop: 12 })
  assert.deepEqual(getFilmographyVisibleCounts(30, 2), { mobile: 8, desktop: 16 })
  assert.deepEqual(getFilmographyVisibleCounts(9, 1), { mobile: 6, desktop: 9 })
  assert.deepEqual(getFilmographyVisibleCounts(3, 0), { mobile: 3, desktop: 3 })
  assert.deepEqual(getFilmographyVisibleCounts(30, Infinity), { mobile: 30, desktop: 30 })
  assert.deepEqual(getFilmographyVisibleCounts(0, Infinity), { mobile: 0, desktop: 0 })
})

test('search includes the end of a large filmography before any visible-list limit', () => {
  const works = Array.from({ length: 1000 }, (_, index) => work(index))
  const filters = { search: 'Film 999', media: 'all', role: 'all', sort: 'popular' } as const
  assert.deepEqual(filterFilmography(works, filters), [works.at(-1)])
  assert.equal(filterFilmography(works, { ...filters, search: '' }).length, works.length)
})

test('title search ignores case, compatibility characters and spaces while combining media and role filters', () => {
  const works = [work(1, { title: '살인의 추억' }), work(2, { title: 'Midsommar', mediaType: 'tv', roles: ['acting', 'production'] }),
    work(3, { title: 'Midsommar', roles: ['production'] })]
  const filters = { search: '살인의추억', media: 'all', role: 'all', sort: 'popular' } as const
  assert.equal(filterFilmography(works, filters)[0].id, works[0].id)
  const result = filterFilmography(works, { ...filters, search: 'ＭＩＤＳＯＭＭＡＲ', media: 'tv', role: 'production' })
  assert.deepEqual(result.map(item => item.id), [works[1].id])
})

test('newest-first keeps undated works last and does not change the notable-works order', () => {
  const works = [work(1, { year: '2000' }), work(2, { year: null }), work(3, { year: '2025' })]
  const filters = { search: '', media: 'all', role: 'all', sort: 'latest' } as const
  assert.deepEqual(filterFilmography(works, filters).map(item => item.id), [works[2].id, works[0].id, works[1].id])
  assert.deepEqual(filterFilmography(works, { ...filters, sort: 'popular' }).map(item => item.id), ['tmdb-movie-1', 'tmdb-movie-2', 'tmdb-movie-3'])
})

test('an empty search result contains no unrelated credits', () => {
  assert.deepEqual(filterFilmography([work(1)], { search: 'missing', media: 'all', role: 'all', sort: 'popular' }), [])
})

test('merges multiple roles by media and ID, preserving remakes and movie/TV ID collisions', () => {
  const result = normalizeFilmography({ id: 525, combined_credits: {
    cast: [credit({ character: 'Leonard' }), credit({ id: 78, character: 'Another lead' }), credit({ media_type: 'tv', character: 'A guest' })],
    crew: [credit({ department: 'Directing', job: 'Director' }), credit({ department: 'Writing', job: 'Screenplay' }),
      credit({ department: 'Writing', job: 'Screenplay' }), credit({ department: 'Production', job: 'Producer' })],
  } })
  assert.equal(result.works.length, 3)
  const movie = result.works.find(work => work.id === 'tmdb-movie-77')!
  assert.deepEqual(movie.roles, ['acting', 'directing', 'writing', 'production'])
  assert.deepEqual(movie.characters, ['Leonard'])
  assert.deepEqual(movie.jobs, ['Director', 'Screenplay', 'Producer'])
})

test('excludes self, archive, adult and thanks credits while preserving voice work', () => {
  const result = normalizeFilmography({ id: 1, combined_credits: {
    cast: [credit({ character: 'Self - Host' }), credit({ id: 2, character: 'Goldilocks (voice)' }),
      credit({ id: 3, character: 'Himself (archive footage)' }), credit({ id: 4, adult: true }),
      credit({ id: 5, character: 'A historical figure (archive sound)' }),
      credit({ id: 8, media_type: 'tv', genre_ids: [10767], character: '本人' }),
      credit({ id: 9, character: 'Interviewee' })],
    crew: [credit({ id: 6, department: 'Thanks', job: 'Thanks' }), credit({ id: 7, department: 'Camera', job: 'Director of Photography' })],
  } })
  assert.deepEqual(result.works.map(work => work.id).sort(), ['tmdb-movie-2', 'tmdb-movie-7'])
  assert.deepEqual(result.works.find(work => work.id === 'tmdb-movie-2')?.characters, ['Goldilocks (voice)'])
})

test('a director’s directed films and an actor’s major roles precede incidental credits', () => {
  const director = normalizeFilmography({ id: 1, known_for_department: 'Directing', combined_credits: {
    crew: [credit({ id: 1, department: 'Directing', job: 'Director', vote_count: 10 }),
      credit({ id: 2, department: 'Production', job: 'Executive Producer', vote_count: 9000 })],
  } })
  assert.equal(director.works[0].id, 'tmdb-movie-1')
  const actor = normalizeFilmography({ id: 1, known_for_department: 'Acting', combined_credits: {
    cast: [credit({ id: 1, order: 0, vote_count: 100 }), credit({ id: 2, order: 40, vote_count: 9000 })],
  } })
  assert.equal(actor.works[0].id, 'tmdb-movie-1')
})

test('rejects unsafe image paths and preserves original titles when localized names are absent', () => {
  const result = normalizeFilmography({ id: 1, external_ids: { imdb_id: 'javascript:bad' }, combined_credits: {
    cast: [credit({ title: '', original_title: 'Original title', release_date: '', poster_path: '//bad.example/x', character: 'A role' })],
  } })
  assert.equal(result.imdbId, null)
  assert.equal(result.works[0].poster, null)
  assert.equal(result.works[0].title, 'Original title')
  assert.equal(result.works[0].year, null)
})

test('route validates QID and locale without making upstream requests', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('must not fetch') })
  for (const query of ['qid=bad', 'qid=Q1&locale=fr', 'qid=Q1234567890123']) {
    assert.equal((await GET(new NextRequest(`http://localhost/api/celeb-filmography?${query}`))).status, 400)
  }
})

test('uses exact external IDs, caches success, and never returns the API key', async (t) => {
  const original = process.env.TMDB_API_KEY
  process.env.TMDB_API_KEY = 'test-filmography-key'
  t.after(() => { if (original === undefined) delete process.env.TMDB_API_KEY; else process.env.TMDB_API_KEY = original })
  let calls = 0
  t.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL) => {
    calls++
    const url = new URL(input.toString())
    assert.equal(url.searchParams.get('language'), 'en-US')
    return url.pathname.includes('/find/') ? Response.json({ person_results: [{ id: 525 }] })
      : Response.json({ id: 525, external_ids: { wikidata_id: 'Q999991', imdb_id: 'nm123' }, combined_credits: { cast: [credit()] } })
  })
  const request = () => new NextRequest('http://localhost/api/celeb-filmography?qid=Q999991&locale=en')
  const response = await GET(request())
  assert.equal(response.status, 200)
  const body = await response.text()
  assert.ok(!body.includes('test-filmography-key'))
  assert.equal(JSON.parse(body).works.length, 1)
  await GET(request())
  assert.equal(calls, 2)
})

test('fails closed on conflicting identity and does not guess a name match', async (t) => {
  const original = process.env.TMDB_API_KEY
  process.env.TMDB_API_KEY = 'test-filmography-key'
  t.after(() => { if (original === undefined) delete process.env.TMDB_API_KEY; else process.env.TMDB_API_KEY = original })
  t.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL) => new URL(input.toString()).pathname.includes('/find/')
    ? Response.json({ person_results: [{ id: 525 }] })
    : Response.json({ id: 525, external_ids: { wikidata_id: 'Q123' }, combined_credits: { cast: [credit()] } }))
  const response = await GET(new NextRequest('http://localhost/api/celeb-filmography?qid=Q999992'))
  assert.deepEqual(await response.json(), { personId: null, imdbId: null, works: [] })
})

test('falls back to the same Wikidata entity’s IMDb ID when direct QID lookup is absent', async (t) => {
  const original = process.env.TMDB_API_KEY
  process.env.TMDB_API_KEY = 'test-filmography-key'
  t.after(() => { if (original === undefined) delete process.env.TMDB_API_KEY; else process.env.TMDB_API_KEY = original })
  const calls: string[] = []
  t.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL) => {
    const url = new URL(input.toString())
    calls.push(url.pathname)
    if (url.hostname === 'www.wikidata.org') return Response.json({ entities: { Q999993: { claims: {
      P345: [{ mainsnak: { datavalue: { value: 'nm123' } } }],
    } } } })
    if (url.pathname.includes('/find/Q')) return Response.json({ person_results: [] })
    if (url.pathname.includes('/find/nm')) return Response.json({ person_results: [{ id: 525 }] })
    return Response.json({ id: 525, external_ids: { imdb_id: 'nm123' }, combined_credits: { cast: [credit()] } })
  })
  const response = await GET(new NextRequest('http://localhost/api/celeb-filmography?qid=Q999993'))
  assert.equal((await response.json()).works.length, 1)
  assert.equal(calls.length, 4)
})

test('an upstream failure is uncached and a retry can recover', async (t) => {
  const original = process.env.TMDB_API_KEY
  process.env.TMDB_API_KEY = 'test-filmography-key'
  t.after(() => { if (original === undefined) delete process.env.TMDB_API_KEY; else process.env.TMDB_API_KEY = original })
  let calls = 0
  t.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL) => {
    if (++calls === 1) return new Response('', { status: 429 })
    if (new URL(input.toString()).pathname.includes('/find/')) return Response.json({ person_results: [{ id: 525 }] })
    return Response.json({ id: 525, external_ids: { wikidata_id: 'Q999994' }, combined_credits: {} })
  })
  const request = () => new NextRequest('http://localhost/api/celeb-filmography?qid=Q999994')
  const failed = await GET(request())
  assert.equal(failed.status, 502)
  assert.equal(failed.headers.get('cache-control'), 'no-store')
  assert.equal((await GET(request())).status, 200)
  assert.equal(calls, 3)
})
