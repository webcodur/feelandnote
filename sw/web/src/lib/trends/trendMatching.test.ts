import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getTrendCountryOptions, parseTrendCountry, TREND_PERIOD_HOURS } from '../../constants/trendCountries'
import { matchTrendingPeople, parseTrendPage, resolveCountryTrendingPeople } from './trendMatching'

const now = Date.UTC(2026, 8, 13, 10, 50)
const seconds = Math.floor(now / 1000)
const page = (rows: unknown[]) => `<html><script>AF_initDataCallback({key: 'ds:0', hash: '2', data:${JSON.stringify([null, rows])}, sideChannel: {}});</script></html>`
const row = (title: string, volume: number, start = seconds - 3600, related: string[] = [title]) => [title, null, 'KR', [start], null, null, volume, null, 1000, related]
const searches = (...titles: string[]) => titles.map((title) => ({ title, related: [] }))

test('full page dataset includes an actual Dario trend missing from the ten-item RSS', () => {
  // Captured primary query/start/volume from Google's KR 24-hour page on 2026-09-13.
  const dario = row('다리오 아모데이', 500, 1789283400)
  const rows = [...Array.from({ length: 30 }, (_, i) => row(`Other ${i}`, 100)), dario]
  const trends = parseTrendPage(page(rows), 'KR', now)
  assert.equal(trends.length, 31)
  assert.deepEqual(trends[0], { title: '다리오 아모데이', related: ['다리오 아모데이'] })
  assert.deepEqual(matchTrendingPeople(trends, [{ id: 'dario', nickname: '다리오 아모데이', nickname_en: 'Dario Amodei' }]), ['dario'])
})

test('sorts volume then start then title, keeps related queries and excludes trends older than the period', () => {
  const trends = parseTrendPage(page([
    row('Older', 99999, seconds - (TREND_PERIOD_HOURS + 1) * 3600),
    row('서울 날씨', 500, seconds - 3600, ['서울 날씨', ' 가을 ', '']),
    row('B', 500, seconds - 100), row('A', 500, seconds - 100),
    row('Most searched', 1000),
  ]), 'KR', now)
  assert.deepEqual(trends.map((trend) => trend.title), ['Most searched', 'A', 'B', '서울 날씨'])
  assert.deepEqual(trends[3].related, ['서울 날씨', '가을'])
})

test('related queries match multi-word names only; one-word names need the primary title', () => {
  // Captured from Google's KR 48-hour page on 2026-09-16: 이강인 surged under a match title.
  const directory = [
    { id: 'gaeul', nickname: '가을', nickname_en: 'Gaeul' },
    { id: 'kangin', nickname: '이강인', nickname_en: 'Lee Kang-in' },
  ]
  assert.deepEqual(matchTrendingPeople([{ title: '레알 소시에다드 대 아틀레티코', related: ['이강인', '가을'] }], directory), ['kangin'])
  assert.deepEqual(matchTrendingPeople(searches('가을'), directory), ['gaeul'])
})

test('historic namesakes never match, so the modern person with the same name is no longer ambiguous', () => {
  // Captured from Google's KR 7-day page on 2026-09-16: "박지원" was politics news, "법정" was court news.
  const directory = [
    { id: 'yeonam', nickname: '박지원', nickname_en: 'Park Ji-won', birth_date: '1737' },
    { id: 'fazheng', nickname: '법정', nickname_en: 'Fa Zheng', birth_date: '176' },
    { id: 'tiger', nickname: '호랑이', nickname_en: 'Tiger', birth_date: '-2400' },
    { id: 'politician', nickname: '박지원', nickname_en: 'Park Jie-won', birth_date: '1942-06-05' },
  ]
  assert.deepEqual(matchTrendingPeople(searches('박지원', '법정', 'tiger'), directory), ['politician'])
})

test('fails closed on missing, malformed, wrong-country or invalid timestamp data', () => {
  assert.deepEqual(parseTrendPage(page([]), 'KR', now), [])
  const badCountry = row('Name', 100); badCountry[2] = 'US'
  const badTime = row('Name', 100); badTime[3] = ['yesterday']
  const badVolume = row('Name', 100); badVolume[6] = '100K+'
  const badRelated = row('Name', 100); badRelated[9] = 'Name'
  for (const html of ['<html>Unavailable</html>', page([badCountry]), page([badTime]), page([badVolume]), page([badRelated]),
    page([row('Future', 100, seconds + 3600)]), page([row('Valid', 100)]) + page([]),
    `<script>AF_initDataCallback({key:'ds:0',data: [null, alert('x')], sideChannel:{}})</script>`]) {
    assert.throws(() => parseTrendPage(html, 'KR', now))
  }
})

test('matches normalized names regardless of spacing, preserves order and deduplicates bilingual hits', () => {
  const directory = [
    { id: 'bill', nickname: '빌 게이츠', nickname_en: 'Bill Gates' },
    { id: 'dario', nickname: '다리오 아모데이', nickname_en: 'Dario Amodei' },
  ]
  assert.deepEqual(matchTrendingPeople(searches('  DARIO  AMODEI ', 'Ｂｉｌｌ Gates', '빌게이츠', 'Microsoft', 'Bill Gates news', '게이츠'), directory), ['dario', 'bill'])
})

test('rejects globally ambiguous names, including a collision after the first 1000 people', () => {
  const directory = Array.from({ length: 1001 }, (_, index) => ({ id: String(index), nickname: `Person ${index}`, nickname_en: index === 0 || index === 1000 ? 'Alex Kim' : null }))
  assert.deepEqual(matchTrendingPeople(searches('Alex Kim', 'Person 1000'), directory), ['1000'])
  assert.deepEqual(matchTrendingPeople(searches('Alex Kim'), [{ id: 'same', nickname: 'Alex Kim', nickname_en: 'Alex Kim' }]), ['same'])
})

test('country whitelist prevents arbitrary feed URLs; errors differ from a valid feed with no matches', async () => {
  assert.equal(parseTrendCountry(' kr '), 'KR')
  assert.equal(parseTrendCountry('de'), 'DE')
  assert.equal(parseTrendCountry('KP'), undefined)
  assert.equal(parseTrendCountry(['US']), undefined)
  let called = false
  assert.deepEqual(await resolveCountryTrendingPeople('US&geo=KR', async () => { called = true; return [] }), { ids: [], available: false })
  assert.equal(called, false)
  assert.deepEqual(await resolveCountryTrendingPeople('US', async () => []), { ids: [], available: true })
  for (const error of [new Error('HTTP 503'), new Error('directory page failed'), new DOMException('Timed out', 'TimeoutError')]) {
    assert.deepEqual(await resolveCountryTrendingPeople('KR', async () => { throw error }), { ids: [], available: false })
  }
})

test('country options put the visitor first, then pinned countries, then a shared selection', () => {
  assert.deepEqual(getTrendCountryOptions('JP', 'KR'), ['JP', 'KR', 'US'])
  assert.deepEqual(getTrendCountryOptions(undefined, 'DE'), ['KR', 'US', 'DE'])
  assert.deepEqual(getTrendCountryOptions('US', 'US'), ['US', 'KR'])
})
