import assert from 'node:assert/strict'
import test from 'node:test'
import { CHART_MAX_AGE_MS } from './bestsellerFeed'
import { chartCategory, chartSource } from './chartSources'
import { fetchMusicChart, musicChartFeedUrl, parseMusicChart, selectMusicChart } from './musicChart'

const now = Date.now()
const payload = (country = 'kr') => ({ feed: {
  id: musicChartFeedUrl(country === 'kr' ? 'ko' : 'en'), country,
  updated: new Date(now).toISOString(), copyright: 'Copyright Apple Inc.',
  results: [{ id: '123', kind: 'songs', name: 'A song', artistName: 'An artist',
    artworkUrl100: 'https://is1-ssl.mzstatic.com/image/cover.jpg',
    url: `https://music.apple.com/${country}/album/a-song/456?i=123` }],
} })

test('preserves official order, artwork, track links and attribution for each region', () => {
  for (const language of ['ko', 'en'] as const) {
    const chart = parseMusicChart(payload(language === 'ko' ? 'kr' : 'us'), language, now)
    assert.equal(chart.items[0].rank, 1)
    assert.equal(chart.items[0].id, '123')
    assert.equal(new URL(chart.items[0].url).searchParams.get('i'), '123')
    assert.equal(chart.copyright, 'Copyright Apple Inc.')
    assert.equal(selectMusicChart(chart, now).status, 'ready')
  }
})

test('rejects another country, stale/future charts, duplicate songs and mismatched links', () => {
  assert.throws(() => parseMusicChart(payload('us'), 'ko', now), /region/)
  for (const date of [now - CHART_MAX_AGE_MS - 1, now + 300_001]) {
    const data = payload()
    data.feed.updated = new Date(date).toISOString()
    assert.throws(() => parseMusicChart(data, 'ko', now), /date/)
  }
  const duplicate = payload()
  duplicate.feed.results.push({ ...duplicate.feed.results[0] })
  assert.throws(() => parseMusicChart(duplicate, 'ko', now), /Duplicate/)
  for (const href of ['https://example.com/kr/album/a/456?i=123', 'javascript:alert(1)', 'https://music.apple.com/kr/album/a/456?i=999']) {
    const data = payload()
    data.feed.results[0].url = href
    assert.throws(() => parseMusicChart(data, 'ko', now), /URL|destination/)
  }
  const image = payload()
  image.feed.results[0].artworkUrl100 = 'https://example.com/cover.jpg'
  assert.throws(() => parseMusicChart(image, 'ko', now), /artwork/)
})

test('shows only supplied song metadata without fabricating a description or including the root Music genre', () => {
  const data = payload('us')
  Object.assign(data.feed.results[0], { releaseDate: '2026-10-02', contentAdvisoryRating: 'Explict',
    genres: [{ genreId: '34', name: 'Music' }, { genreId: '15', name: 'R&B/Soul' }, { genreId: '15', name: 'R&B/Soul' }] })
  const item = parseMusicChart(data, 'en', now).items[0]
  assert.equal(item.releaseDate, '2026-10-02')
  assert.equal(item.explicit, true)
  assert.deepEqual(item.genres, ['R&B/Soul'])
  Object.assign(data.feed.results[0], { releaseDate: '2026-02-30', genres: [null, 1], contentAdvisoryRating: null })
  const missing = parseMusicChart(data, 'en', now).items[0]
  assert.equal(missing.releaseDate, null)
  assert.equal(missing.explicit, false)
  assert.deepEqual(missing.genres, [])
})

test('hides expired successful caches instead of showing them as current rankings', () => {
  const chart = parseMusicChart(payload(), 'ko', now)
  assert.equal(selectMusicChart(chart, now + 3600_001).isStale, true)
  assert.equal(selectMusicChart(chart, now + CHART_MAX_AGE_MS + 1).status, 'unavailable')
  assert.deepEqual(selectMusicChart(null).items, [])
})

test('fetches only the requested official chart with a timeout and rejects redirects/errors', async () => {
  const fetcher = (async (input, init) => {
    assert.equal(input, musicChartFeedUrl('ko'))
    assert.ok(init?.signal)
    assert.equal(init?.redirect, 'error')
    assert.ok(new Headers(init?.headers).get('User-Agent'))
    return Response.json(payload())
  }) as typeof fetch
  assert.equal((await fetchMusicChart(fetcher, 'ko')).items.length, 1)
  await assert.rejects(fetchMusicChart((async () => new Response('Unavailable', { status: 503 })) as typeof fetch, 'en'), /HTTP/)
})

test('movies use public Apple feeds and games use the Steam player chart', () => {
  assert.equal(chartCategory('MUSIC'), 'MUSIC')
  assert.equal(chartCategory('unknown'), 'BOOK')
  for (const language of ['ko', 'en'] as const) {
    assert.equal(chartSource('VIDEO', language).available, true)
    assert.equal(new URL(chartSource('VIDEO', language).url).hostname, 'tv.apple.com')
    assert.equal(chartSource('GAME', language).available, true)
    assert.equal(new URL(chartSource('GAME', language).url).hostname, 'store.steampowered.com')
    assert.equal(chartSource('MUSIC', language).available, true)
  }
})
