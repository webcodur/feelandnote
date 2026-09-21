import assert from 'node:assert/strict'
import test from 'node:test'
import type { AffiliateLink } from '../../constants/affiliatePlatforms'
import { getEnglishBookPurchaseLinks } from './amazonBookSearch'

test('English search uses normalized title and author with safe query encoding and the associate tag', () => {
  const [link] = getEnglishBookPurchaseLinks({ locale: 'en', title: '  Pride &\n Prejudice ', creator: ' Jane   Austen ' })
  const url = new URL(link.url)
  assert.equal(link.platform, 'amazon')
  assert.equal(link.linkKind, 'search')
  assert.equal(url.origin + url.pathname, 'https://www.amazon.com/s')
  assert.equal(url.searchParams.get('i'), 'stripbooks')
  assert.equal(url.searchParams.get('k'), 'Pride & Prejudice Jane Austen')
  assert.equal(url.searchParams.get('tag'), 'feelandnote-20')
  assert.equal(url.searchParams.size, 3)
  assert.ok(link.url.includes('%26'))
})

test('search requires a title but accepts missing author', () => {
  for (const title of [null, undefined, '', ' \n\t ']) {
    assert.deepEqual(getEnglishBookPurchaseLinks({ locale: 'en', title, creator: 'Jane Austen' }), [])
  }
  const [link] = getEnglishBookPurchaseLinks({ locale: 'en', title: 'Emma' })
  assert.equal(new URL(link.url).searchParams.get('k'), 'Emma')
})

test('non-English locale does not add links', () => {
  assert.deepEqual(getEnglishBookPurchaseLinks({ locale: 'ko', title: 'Emma' }), [])
})

test('registered Amazon link takes precedence, even with absent title or stale search', () => {
  const cases: Array<[string, string]> = [
    ['https://www.amazon.com/dp/0141439513?tag=example-20', 'https://www.amazon.com/dp/0141439513?tag=feelandnote-20'],
    ['https://www.amazon.com/dp/0141439513', 'https://www.amazon.com/dp/0141439513?tag=feelandnote-20'],
    ['https://amazon.co.uk/dp/0141439513', 'https://amazon.co.uk/dp/0141439513'],
    ['https://amazon.de/dp/0141439513', 'https://amazon.de/dp/0141439513'],
    ['https://amzn.to/example', 'https://amzn.to/example'],
  ]
  for (const [url, expected] of cases) {
    const link: AffiliateLink = { platform: 'amazon', url }
    const oldSearch: AffiliateLink = { platform: 'amazon', url: 'https://www.amazon.com/s?k=wrong', linkKind: 'search' }
    assert.deepEqual(getEnglishBookPurchaseLinks({ locale: 'en', links: [oldSearch, link] }), [{ ...link, url: expected }])
  }
})

test('Amazon links to non-Amazon hosts are rejected and fall back to tagged search', () => {
  const links: AffiliateLink[] = [{ platform: 'amazon', url: 'https://evil.test/dp/123' }]
  const [link] = getEnglishBookPurchaseLinks({ locale: 'en', title: 'Emma', links })
  assert.equal(link.linkKind, 'search')
  assert.equal(new URL(link.url).searchParams.get('tag'), 'feelandnote-20')
})

test('unsafe URLs and Korean store links cannot suppress Amazon search', () => {
  const invalidUrls = ['javascript:alert(1)', 'bad url', 'https://amazon.com@evil.test/dp/123', 'https://user:pass@amazon.com/dp/123']
  for (const url of invalidUrls) {
    const links: AffiliateLink[] = [{ platform: 'amazon', url }, { platform: 'coupang', url: 'https://link.coupang.com/a/example' }]
    const result = getEnglishBookPurchaseLinks({ locale: 'en', title: 'Emma', links })
    assert.equal(result.length, 1)
    assert.equal(result[0].linkKind, 'search')
  }
})

test('other registered English links survive and search updates without duplication', () => {
  const google: AffiliateLink = { platform: 'google_books', url: 'https://books.google.com/books?id=example' }
  const links = getEnglishBookPurchaseLinks({ locale: 'en', title: 'Emma', links: [google] })
  const result = getEnglishBookPurchaseLinks({ locale: 'en', title: 'Persuasion', links })
  assert.equal(result.length, 2)
  assert.deepEqual(result[0], google)
  assert.equal(new URL(result[1].url).searchParams.get('k'), 'Persuasion')
})
