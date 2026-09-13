import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { fetchBestsellerFeed, mergeBestsellerFeeds, parseBestsellerFeed, selectBestsellers } from './bestsellerFeed'

const snapshot = () => JSON.parse(readFileSync(new URL('../../constants/library/bestsellers.json', import.meta.url), 'utf8'))

test('a newly published JSON changes returned titles without replacing the bundled file', async () => {
  const original = snapshot()
  const published = structuredClone(original)
  published.ko.categories.ALL[0].title = 'New weekly number one'
  const fetcher = (async () => new Response(JSON.stringify(published))) as typeof fetch
  const feed = await fetchBestsellerFeed(fetcher)
  assert.equal(selectBestsellers(feed, 'ALL', 'ko').items[0].title, 'New weekly number one')
  assert.equal(snapshot().ko.categories.ALL[0].title, original.ko.categories.ALL[0].title)
})

test('unavailable and malformed feeds throw instead of becoming a successful empty cache', async () => {
  await assert.rejects(fetchBestsellerFeed((async () => new Response('', { status: 503 })) as typeof fetch), /503/)
  await assert.rejects(fetchBestsellerFeed((async () => new Response('{}')) as typeof fetch), /date/)
  const data = snapshot()
  data.ko.categories.ALL = []
  assert.throws(() => parseBestsellerFeed(data), /category/)
})

test('a failed category keeps its previous date even when another category has refreshed', () => {
  const data = snapshot()
  data.updated_at = '2026-08-27T04:38:34.728Z'
  data.ko.category_updated_at = { ALL: '2026-09-13T04:00:00Z', VIDEO: '2026-08-27T04:38:34.728Z' }
  const now = Date.parse('2026-09-13T05:00:00Z')
  const books = selectBestsellers(data, 'ALL', 'ko', now)
  const video = selectBestsellers(data, 'VIDEO', 'ko', now)
  assert.equal(books.isStale, false)
  assert.equal(video.isStale, true)
  const combined = selectBestsellers(data, 'MEDIA_ALL', 'ko', now)
  assert.equal(combined.updatedAt, video.updatedAt)
  assert.equal(combined.isStale, true)
  assert.equal(combined.sources.length, 4)
})

test('English subject lists link to subjects rather than pretending to be weekly charts', () => {
  const data = snapshot()
  assert.match(selectBestsellers(data, 'HUMANITIES', 'en').sources[0].url, /subjects\/philosophy/)
  assert.match(selectBestsellers(data, 'ALL', 'en').sources[0].url, /trending\/weekly/)
  assert.match(selectBestsellers(data, 'STEADY', 'ko').sources[0].url, /SteadySeller/)
})

test('invalid dates, duplicate IDs and unsafe thumbnail URLs are rejected', () => {
  for (const mutate of [
    (d: ReturnType<typeof snapshot>) => { d.updated_at = 'tomorrow' },
    (d: ReturnType<typeof snapshot>) => { d.en.categories.ALL[1].id = d.en.categories.ALL[0].id },
    (d: ReturnType<typeof snapshot>) => { d.ko.categories.ALL[0].thumbnail_url = 'javascript:alert(1)' },
  ]) {
    const data = snapshot(); mutate(data)
    assert.throws(() => parseBestsellerFeed(data))
  }
})

test('an older publication cannot replace a newer bundled category during CDN propagation', () => {
  const published = snapshot()
  published.updated_at = '2026-08-27T04:00:00Z'
  delete published.ko.category_updated_at
  const bundled = structuredClone(published)
  bundled.ko.category_updated_at = { ALL: '2026-09-13T04:00:00Z' }
  bundled.ko.categories.ALL[0].title = 'Newer bundled chart'
  const merged = mergeBestsellerFeeds(published, bundled)
  const result = selectBestsellers(merged, 'ALL', 'ko', Date.parse('2026-09-13T05:00:00Z'))
  assert.equal(result.items[0].title, 'Newer bundled chart')
  assert.equal(result.updatedAt, '2026-09-13T04:00:00Z')
  assert.equal(result.isStale, false)
})
