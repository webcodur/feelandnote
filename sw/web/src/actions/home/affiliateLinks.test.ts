import assert from 'node:assert/strict'
import test from 'node:test'
import { findAffiliateLink } from './affiliateLinks'

test('returns the requested affiliate link from a valid JSON array', () => {
  assert.deepEqual(
    findAffiliateLink(
      [
        { platform: 'aladin', url: 'https://example.com/aladin' },
        { platform: 'coupang', url: 'https://example.com/coupang' },
      ],
      'coupang',
    ),
    { platform: 'coupang', url: 'https://example.com/coupang' },
  )
})

test('ignores a legacy string instead of throwing', () => {
  assert.equal(findAffiliateLink('https://search.example.com/book', 'coupang'), undefined)
})

test('ignores malformed JSON values and malformed array entries', () => {
  const malformedValues: unknown[] = [
    null,
    undefined,
    1,
    { platform: 'coupang', url: 'https://example.com' },
    [{ platform: 'coupang' }],
    [{ platform: 'coupang', url: 123 }],
  ]

  for (const value of malformedValues) {
    assert.equal(findAffiliateLink(value, 'coupang'), undefined)
  }
})
