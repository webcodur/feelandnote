import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CACHE_TAGS,
  bulkTag,
  detailCacheTags,
  domainRevalidationTags,
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
