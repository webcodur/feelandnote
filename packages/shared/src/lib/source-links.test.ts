import assert from 'node:assert/strict'
import test from 'node:test'
import { formatSourceUrls, parseSourceUrls } from './source-links'

test('existing source and archive URLs retain their original address', () => {
  const archive = 'https://web.archive.org/web/20220208061955/https://twitter.com/daniellevy__/status/1490932113595514883'
  assert.deepEqual(parseSourceUrls(archive), [archive])
  assert.equal(formatSourceUrls(archive), archive)
})

test('multiple sources keep order while removing whitespace, blanks and duplicates', () => {
  const value = ' https://example.com/reading | |\n https://example.com/explanation | https://example.com/reading '
  assert.deepEqual(parseSourceUrls(value), ['https://example.com/reading', 'https://example.com/explanation'])
  assert.equal(formatSourceUrls(value), 'https://example.com/reading | https://example.com/explanation')
})

test('encoded pipes in a URL remain part of that source', () => {
  const first = 'https://example.com/search?q=one%7Ctwo&lang=en'
  assert.deepEqual(parseSourceUrls(`${first}|https://example.com/second`), [first, 'https://example.com/second'])
})

test('invalid or unsafe URLs cannot be stored or shown as clickable sources', () => {
  const value = 'https://example.com/reading | javascript:alert(1) | not-a-url'
  assert.deepEqual(parseSourceUrls(value), ['https://example.com/reading'])
  assert.throws(() => formatSourceUrls(value), /valid HTTP or HTTPS/)
})

test('missing source values remain empty', () => {
  for (const value of [null, undefined, '', ' | | ']) {
    assert.deepEqual(parseSourceUrls(value), [])
    assert.equal(formatSourceUrls(value), null)
  }
})

test('credentials, control characters and backslashes cannot become sources', () => {
  for (const url of ['https://name:pass@example.com/a', 'https://example.com/a\nb', 'https://example.com/a b', 'https://example.com\\evil']) {
    assert.deepEqual(parseSourceUrls(url), [])
    assert.throws(() => formatSourceUrls(url), /valid HTTP or HTTPS/)
  }
})
