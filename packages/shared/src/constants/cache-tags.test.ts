import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CACHE_TAGS,
  bulkTag,
  detailCacheTags,
  domainRevalidationTags,
  isCompleteCacheRevalidationResponse,
  isAllowedCacheTag,
  itemRevalidationTags,
} from './cache-tags'

test('domain invalidation explicitly targets list and bulk-detail tags', () => {
  assert.deepEqual(
    domainRevalidationTags([CACHE_TAGS.CELEBS, CACHE_TAGS.CONTENTS]),
    [
      CACHE_TAGS.CELEBS,
      bulkTag(CACHE_TAGS.CELEBS),
      CACHE_TAGS.CONTENTS,
      bulkTag(CACHE_TAGS.CONTENTS),
    ],
  )
})

test('item invalidation keeps list refresh separate from bulk detail refresh', () => {
  assert.deepEqual(
    itemRevalidationTags(
      [
        { domain: CACHE_TAGS.CELEBS, id: 'celeb-id' },
        { domain: CACHE_TAGS.CELEBS, id: 'celeb-slug' },
      ],
      [CACHE_TAGS.CELEBS, CACHE_TAGS.DIALOGUES],
    ),
    [
      'celebs:celeb-id',
      'celebs:celeb-slug',
      CACHE_TAGS.CELEBS,
      CACHE_TAGS.DIALOGUES,
    ],
  )
})

test('detail cache listens to matching item aliases and explicit bulk tags', () => {
  assert.deepEqual(
    detailCacheTags(CACHE_TAGS.SPECTRUM, 'celeb-1', [CACHE_TAGS.CELEBS]),
    [
      'spectrum:celeb-1',
      'celebs:celeb-1',
      bulkTag(CACHE_TAGS.SPECTRUM),
      bulkTag(CACHE_TAGS.CELEBS),
    ],
  )
})

test('detail cache refuses an empty identifier', () => {
  assert.throws(
    () => detailCacheTags(CACHE_TAGS.CONTENTS, null),
    /Cache item identifier is required for contents/,
  )
})

test('item invalidation refuses an empty identifier instead of purging a domain', () => {
  assert.throws(
    () => itemRevalidationTags([{ domain: CACHE_TAGS.CELEBS, id: '  ' }]),
    /identifier/i,
  )
})

test('bulk tags are accepted by the revalidation API validator', () => {
  assert.equal(isAllowedCacheTag(bulkTag(CACHE_TAGS.CELEBS)), true)
})

test('public Unicode slugs and provider identifiers are accepted safely', () => {
  assert.equal(isAllowedCacheTag('celebs:uğur-şahin'), true)
  assert.equal(isAllowedCacheTag("celebs:d'arcy"), true)
  assert.equal(isAllowedCacheTag('contents:NYPL:33433039351980'), true)
})

test('route-breaking identifiers are rejected', () => {
  for (const tag of [
    'celebs:two words',
    'celebs:parent/child',
    'celebs:parent\\child',
    'celebs:slug?preview=1',
    'celebs:slug#fragment',
    'celebs:encoded%2Fslash',
    'celebs:..',
    `celebs:left${String.fromCodePoint(0x0081)}right`,
    `celebs:left${String.fromCodePoint(0x200b)}right`,
    `celebs:left${String.fromCodePoint(0x202e)}right`,
    `celebs:left${String.fromCharCode(0xd800)}right`,
  ]) {
    assert.equal(isAllowedCacheTag(tag), false, tag)
  }
})

test('cache revalidation completion contract verifies tags and Cloudflare mode', () => {
  const response = {
    revalidated: true,
    complete: true,
    tags: ['contents:item-1'],
    cloudflare: {
      ok: true,
      status: 'purged',
      mode: 'targeted',
      urls: ['https://feelandnote.com/content/item-1'],
    },
  }

  assert.equal(
    isCompleteCacheRevalidationResponse(response, ['contents:item-1'], 'targeted'),
    true,
  )
  assert.equal(
    isCompleteCacheRevalidationResponse(response, ['contents:other'], 'targeted'),
    false,
  )
  assert.equal(
    isCompleteCacheRevalidationResponse({
      ...response,
      cloudflare: { ...response.cloudflare, urls: [123] },
    }, ['contents:item-1'], 'targeted'),
    false,
  )
})
