import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseTrendCountry } from '../../constants/trendCountries'
import { matchTrendingPeople, parseTrendRss, resolveCountryTrendingPeople } from './trendMatching'

test('RSS only reads item titles, decoding entities and CDATA in feed order', () => {
  assert.deepEqual(parseTrendRss('<rss><channel><title>US</title><item><title><![CDATA[Bill Gates]]></title><news><title>Other</title></news></item><item><title>A &amp; B</title></item></channel></rss>'), ['Bill Gates', 'A & B'])
  assert.deepEqual(parseTrendRss('<rss><channel></channel></rss>'), [])
  for (const invalid of ['<html>Unavailable</html>', '<rss><channel>', '<rss><channel><item/></channel></rss>', '<!DOCTYPE rss><rss><channel/></rss>']) {
    assert.throws(() => parseTrendRss(invalid))
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
