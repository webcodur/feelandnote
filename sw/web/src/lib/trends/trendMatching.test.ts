import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseTrendCountry } from '../../constants/trendCountries'
import { matchTrendingPeople, parseTrendPage, resolveCountryTrendingPeople } from './trendMatching'

const now = Date.UTC(2026, 8, 13, 10, 50)
const seconds = Math.floor(now / 1000)
const page = (rows: unknown[]) => `<html><script>AF_initDataCallback({key: 'ds:0', hash: '2', data:${JSON.stringify([null, rows])}, sideChannel: {}});</script></html>`
const row = (title: string, volume: number, start = seconds - 3600, related: string[] = [title]) => [title, null, 'KR', [start], null, null, volume, null, 1000, related]

test('full page dataset includes an actual Dario trend missing from the ten-item RSS', () => {
  // Captured primary query/start/volume from Google's KR 24-hour page on 2026-09-13.
  const dario = row('다리오 아모데이', 500, 1789283400)
  const rows = [...Array.from({ length: 30 }, (_, i) => row(`Other ${i}`, 100)), dario]
  const titles = parseTrendPage(page(rows), 'KR', now)
  assert.equal(titles.length, 31)
  assert.equal(titles[0], '다리오 아모데이')
  assert.deepEqual(matchTrendingPeople(titles, [{ id: 'dario', nickname: '다리오 아모데이', nickname_en: 'Dario Amodei' }]), ['dario'])
})

test('uses primary query only, sorts volume then start then title, and excludes older trends', () => {
  const titles = parseTrendPage(page([
    row('Older', 99999, seconds - 25 * 3600),
    row('서울 날씨', 500, seconds - 3600, ['서울 날씨', '가을']),
    row('B', 500, seconds - 100), row('A', 500, seconds - 100),
    row('Most searched', 1000),
  ]), 'KR', now)
  assert.deepEqual(titles, ['Most searched', 'A', 'B', '서울 날씨'])
  assert.deepEqual(matchTrendingPeople(titles, [{ id: 'gaeul', nickname: '가을', nickname_en: 'Gaeul' }]), [])
})

test('fails closed on missing, malformed, wrong-country or invalid timestamp data', () => {
  assert.deepEqual(parseTrendPage(page([]), 'KR', now), [])
  const badCountry = row('Name', 100); badCountry[2] = 'US'
  const badTime = row('Name', 100); badTime[3] = ['yesterday']
  const badVolume = row('Name', 100); badVolume[6] = '100K+'
  for (const html of ['<html>Unavailable</html>', page([badCountry]), page([badTime]), page([badVolume]),
    page([row('Future', 100, seconds + 3600)]), page([row('Valid', 100)]) + page([]),
    `<script>AF_initDataCallback({key:'ds:0',data: [null, alert('x')], sideChannel:{}})</script>`]) {
    assert.throws(() => parseTrendPage(html, 'KR', now))
  }
})

test('matches normalized exact names, preserves order and deduplicates bilingual hits', () => {
  const directory = [
    { id: 'bill', nickname: '빌 게이츠', nickname_en: 'Bill Gates' },
    { id: 'dario', nickname: '다리오 아모데이', nickname_en: 'Dario Amodei' },
  ]
  assert.deepEqual(matchTrendingPeople(['  DARIO  AMODEI ', 'Ｂｉｌｌ Gates', '빌 게이츠', 'Microsoft', 'Bill Gates news', '게이츠'], directory), ['dario', 'bill'])
})

test('rejects globally ambiguous names, including a collision after the first 1000 people', () => {
  const directory = Array.from({ length: 1001 }, (_, index) => ({ id: String(index), nickname: `Person ${index}`, nickname_en: index === 0 || index === 1000 ? 'Alex Kim' : null }))
  assert.deepEqual(matchTrendingPeople(['Alex Kim', 'Person 1000'], directory), ['1000'])
  assert.deepEqual(matchTrendingPeople(['Alex Kim'], [{ id: 'same', nickname: 'Alex Kim', nickname_en: 'Alex Kim' }]), ['same'])
})

test('country whitelist prevents arbitrary feed URLs; errors differ from a valid feed with no matches', async () => {
  assert.equal(parseTrendCountry(' kr '), 'KR')
  assert.equal(parseTrendCountry('DE'), undefined)
  assert.equal(parseTrendCountry(['US']), undefined)
  let called = false
  assert.deepEqual(await resolveCountryTrendingPeople('US&geo=KR', async () => { called = true; return [] }), { ids: [], available: false })
  assert.equal(called, false)
  assert.deepEqual(await resolveCountryTrendingPeople('US', async () => []), { ids: [], available: true })
  for (const error of [new Error('HTTP 503'), new Error('directory page failed'), new DOMException('Timed out', 'TimeoutError')]) {
    assert.deepEqual(await resolveCountryTrendingPeople('KR', async () => { throw error }), { ids: [], available: false })
  }
})
