import assert from 'node:assert/strict'
import test from 'node:test'
import { CHART_MAX_AGE_MS } from './bestsellerFeed'
import { fetchStoreChart, parseStoreChart, selectStoreChart, storeChartFeedUrl } from './storeChart'
import type { ChartLanguage } from './chartSources'

const now = Date.now()
const payload = (language: ChartLanguage = 'ko') => {
  const country = language === 'ko' ? 'kr' : 'us'
  return { feed: {
    id: { label: storeChartFeedUrl(language) }, updated: { label: new Date(now).toISOString() }, rights: { label: 'Copyright Apple Inc.' },
    entry: [{ id: { attributes: { 'im:id': '123' } }, 'im:name': { label: 'A work' }, 'im:artist': { label: 'A creator' },
      'im:contentType': { attributes: { term: 'Movie' } },
      'im:image': [{ label: 'https://is1-ssl.mzstatic.com/image/cover.jpg' }],
      link: [{ attributes: { rel: 'alternate', type: 'text/html', href: `https://itunes.apple.com/${country}/movie/a-work/id123?uo=2` } },
        { attributes: { rel: 'enclosure', type: 'video/x-m4v', href: 'https://video-ssl.itunes.apple.com/preview.m4v' } }],
    }],
  } }
}

test('keeps movie feed order, correct region and product links, excluding previews', () => {
  for (const language of ['ko', 'en'] as const) {
    const chart = parseStoreChart(payload(language), language, now)
    assert.equal(chart.items[0].rank, 1)
    assert.ok(chart.items[0].url.endsWith('/id123?uo=2'))
    assert.equal(chart.copyright, 'Copyright Apple Inc.')
    assert.equal(selectStoreChart(chart, now).status, 'ready')
    assert.ok(!JSON.stringify(chart).includes('preview.m4v'))
  }
})

test('rejects another region or apps masquerading as movies', () => {
  assert.throws(() => parseStoreChart(payload('en'), 'ko', now), /source/)
  const wrongMedia = payload()
  wrongMedia.feed.entry[0]['im:contentType'].attributes.term = 'Application'
  assert.throws(() => parseStoreChart(wrongMedia, 'ko', now), /media/)
})

test('rejects expired, future, duplicate and unsafe feed data', () => {
  for (const date of [now - CHART_MAX_AGE_MS - 1, now + 300_001]) {
    const data = payload()
    data.feed.updated.label = new Date(date).toISOString()
    assert.throws(() => parseStoreChart(data, 'ko', now), /date/)
  }
  const duplicate = payload()
  duplicate.feed.entry.push(duplicate.feed.entry[0])
  assert.throws(() => parseStoreChart(duplicate, 'ko', now), /Duplicate/)
  for (const href of ['https://example.com/kr/movie/a/id123', 'https://itunes.apple.com/us/movie/a/id123', 'https://itunes.apple.com/kr/movie/a/id999', 'javascript:alert(1)']) {
    const data = payload()
    data.feed.entry[0].link[0].attributes.href = href
    assert.throws(() => parseStoreChart(data, 'ko', now), /URL|destination/)
  }
  const image = payload()
  image.feed.entry[0]['im:image'][0].label = 'https://example.com/cover.jpg'
  assert.throws(() => parseStoreChart(image, 'ko', now), /artwork/)
  const chart = parseStoreChart(payload(), 'ko', now)
  assert.equal(selectStoreChart(chart, now + 3600_001).isStale, true)
  assert.equal(selectStoreChart(chart, now + CHART_MAX_AGE_MS + 1).status, 'unavailable')
})

test('fetches only the selected feed and propagates upstream failures', async () => {
  const fetcher = (async (input, init) => {
    assert.equal(input, storeChartFeedUrl('en'))
    assert.equal(init?.redirect, 'error')
    assert.ok(init?.signal)
    return new Response(JSON.stringify(payload('en')), { headers: { 'Content-Type': 'text/javascript; charset=UTF-8' } })
  }) as typeof fetch
  assert.equal((await fetchStoreChart(fetcher, 'en')).items.length, 1)
  await assert.rejects(fetchStoreChart((async () => new Response('', { status: 503 })) as typeof fetch, 'ko'), /HTTP/)
  await assert.rejects(fetchStoreChart((async () => new Response('callback({})', { headers: { 'Content-Type': 'text/javascript' } })) as typeof fetch, 'ko'), SyntaxError)
})
