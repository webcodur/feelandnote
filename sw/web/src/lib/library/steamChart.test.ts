import assert from 'node:assert/strict'
import test from 'node:test'
import { assembleSteamChart, fetchSteamChart, parseSteamRanks, selectSteamChart, steamItemsUrl, STEAM_CHART_MAX_AGE_MS, STEAM_CHART_URL } from './steamChart'

const now = Math.floor(Date.now() / 1000) * 1000
const ranks = () => ({ response: { last_update: now / 1000, ranks: [
  { rank: 1, appid: 730, concurrent_in_game: 1234, peak_in_game: 2000 },
  { rank: 2, appid: 431960, concurrent_in_game: 500, peak_in_game: 600 },
  { rank: 3, appid: 570, concurrent_in_game: 300, peak_in_game: 400 },
] } })
const item = (id: number, type = 0) => ({ id, appid: id, success: 1, item_type: 0, type, name: `Game ${id}`,
  assets: { asset_url_format: `steam/apps/${id}/` + '${FILENAME}?t=123', library_capsule: 'abc/library_600x900.jpg' } })
const metadata = () => ({ response: { store_items: [item(570), item(431960, 6), item(730)] } })
const chart = () => assembleSteamChart(parseSteamRanks(ranks(), now), metadata(), now)

test('joins metadata by identity, filters software, and preserves official rank numbers and player counts', () => {
  const result = chart()
  assert.deepEqual(result.items.map(row => [row.id, row.rank, row.players]), [[730, 1, 1234], [570, 3, 300]])
  assert.equal(result.items[0].peakPlayers, 2000)
  assert.equal(result.items[0].url, 'https://store.steampowered.com/app/730/')
  assert.equal(result.items[0].artwork, 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/730/abc/library_600x900.jpg?t=123')
})

test('rejects stale or future rankings, duplicate identities, rank disorder, and invalid counts', () => {
  for (const date of [now - STEAM_CHART_MAX_AGE_MS - 1000, now + 301_000]) {
    const data = ranks(); data.response.last_update = date / 1000
    assert.throws(() => parseSteamRanks(data, now), /date/)
  }
  const duplicate = ranks(); duplicate.response.ranks[1].appid = 730
  assert.throws(() => parseSteamRanks(duplicate, now), /order/)
  const disorder = ranks(); disorder.response.ranks[1].rank = 1
  assert.throws(() => parseSteamRanks(disorder, now), /order/)
  for (const count of [-1, 1.5, Infinity, 3000]) {
    const data = ranks(); data.response.ranks[0].concurrent_in_game = count
    assert.throws(() => parseSteamRanks(data, now), /number|count/)
  }
})

test('joins Steam descriptions and creators by the verified app ID and tolerates absent optional data', () => {
  const data = metadata()
  Object.assign(data.response.store_items[2], { basic_info: {
    short_description: '<p>A competitive game.</p><script>injected()</script>',
    developers: [{ name: 'Valve' }, { name: 'Valve' }], publishers: [{ name: 'Valve' }],
  } })
  const items = assembleSteamChart(parseSteamRanks(ranks(), now), data, now).items
  assert.equal(items[0].description, 'A competitive game.')
  assert.deepEqual(items[0].developers, ['Valve'])
  assert.deepEqual(items[0].publishers, ['Valve'])
  assert.equal(items[1].description, null)
  assert.deepEqual(items[1].developers, [])
})

test('never mixes another app or an injected image address into the chart', () => {
  const mismatched = metadata(); mismatched.response.store_items[0].appid = 999
  assert.throws(() => assembleSteamChart(parseSteamRanks(ranks(), now), mismatched, now), /identity/)
  const extra = metadata(); extra.response.store_items.push(item(999))
  assert.throws(() => assembleSteamChart(parseSteamRanks(ranks(), now), extra, now), /identity/)
  const duplicate = metadata(); duplicate.response.store_items.push(item(730))
  assert.throws(() => assembleSteamChart(parseSteamRanks(ranks(), now), duplicate, now), /identity/)
  for (const template of ['https://evil.example/${FILENAME}', 'steam/apps/999/${FILENAME}', 'steam/apps/730/../../${FILENAME}']) {
    const data = metadata(); data.response.store_items[2].assets.asset_url_format = template
    assert.equal(assembleSteamChart(parseSteamRanks(ranks(), now), data, now).items[0].artwork, null)
  }
})

test('does not replace missing titles with app IDs or software and expires old caches', () => {
  const missing = metadata(); missing.response.store_items = [item(431960, 6)]
  assert.throws(() => assembleSteamChart(parseSteamRanks(ranks(), now), missing, now), /Empty/)
  const result = chart()
  assert.equal(selectSteamChart(result, now).status, 'ready')
  assert.equal(selectSteamChart(result, now + 601_000).isStale, true)
  assert.equal(selectSteamChart(result, now + STEAM_CHART_MAX_AGE_MS + 1).status, 'unavailable')
  assert.deepEqual(selectSteamChart(null, now).items, [])
})

test('fetches a ranked snapshot then batches only those app IDs using the selected language', async () => {
  for (const language of ['ko', 'en'] as const) {
    const calls: string[] = []
    const fetcher = (async (url, init) => {
      calls.push(String(url))
      assert.ok(init?.signal)
      assert.equal(init?.redirect, 'error')
      return Response.json(calls.length === 1 ? ranks() : metadata())
    }) as typeof fetch
    assert.equal((await fetchSteamChart(fetcher, language)).items.length, 2)
    assert.deepEqual(calls, [STEAM_CHART_URL, steamItemsUrl([730, 431960, 570], language)])
    const input = JSON.parse(new URL(calls[1]).searchParams.get('input_json')!)
    assert.equal(input.context.country_code, language === 'ko' ? 'KR' : 'US')
    assert.equal(input.data_request.include_basic_info, true)
  }
  await assert.rejects(fetchSteamChart((async () => new Response('Unavailable', { status: 503 })) as typeof fetch, 'ko'), /HTTP/)
})
