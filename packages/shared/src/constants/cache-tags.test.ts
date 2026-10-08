import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CACHE_TAGS,
  bulkTag,
  cloudflarePurgeExpectationForTags,
  detailCacheTags,
  domainRevalidationTags,
  isCompleteCacheRevalidationResponse,
  isAllowedCacheTag,
  itemTag,
  itemRevalidationTags,
  revalidationApiPathForTags,
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

test('item-only tag builders reject the reserved bulk sentinel', () => {
  assert.throws(
    () => itemTag(CACHE_TAGS.CONTENTS, '__all__'),
    /bulkTag/,
  )
  assert.throws(
    () => itemRevalidationTags([{ domain: CACHE_TAGS.CONTENTS, id: ' __all__ ' }]),
    /bulkTag/,
  )
  assert.equal(bulkTag(CACHE_TAGS.CONTENTS), 'contents:__all__')
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
      urls: [
        'https://feelandnote.com/content/item-1',
        'https://feelandnote.com/en/content/item-1',
      ],
    },
  }

  assert.equal(
    isCompleteCacheRevalidationResponse(response, ['contents:item-1']),
    true,
  )
  assert.equal(
    isCompleteCacheRevalidationResponse(response, ['contents:other']),
    false,
  )
  assert.equal(
    isCompleteCacheRevalidationResponse({
      ...response,
      cloudflare: { ...response.cloudflare, urls: [123] },
    }, ['contents:item-1']),
    false,
  )
  assert.equal(
    isCompleteCacheRevalidationResponse({
      ...response,
      cloudflare: {
        ...response.cloudflare,
        urls: ['https://feelandnote.com/content/item-1'],
      },
    }, ['contents:item-1']),
    false,
  )
})

test('prefix completion requires non-empty unique string prefixes and string URL arrays', () => {
  const response = {
    revalidated: true,
    complete: true,
    tags: ['contents:__all__'],
    cloudflare: {
      ok: true,
      status: 'purged',
      mode: 'prefix',
      prefixes: [
        'feelandnote.com/content/',
        'feelandnote.com/en/content/',
        'feelandnote.com/celeb/',
        'feelandnote.com/en/celeb/',
      ],
      urls: [],
    },
  }

  assert.equal(
    isCompleteCacheRevalidationResponse(response, ['contents:__all__']),
    true,
  )
  for (const prefixes of [
    [],
    ['feelandnote.com/content/', 'feelandnote.com/content/'],
    ['feelandnote.com/content/', 123],
    ['one/', 'two/', 'three/', 'four/', 'five/'],
  ]) {
    assert.equal(
      isCompleteCacheRevalidationResponse({
        ...response,
        cloudflare: { ...response.cloudflare, prefixes },
      }, ['contents:__all__']),
      false,
    )
  }
  assert.equal(
    isCompleteCacheRevalidationResponse({
      ...response,
      cloudflare: { ...response.cloudflare, urls: [123] },
    }, ['contents:__all__']),
    false,
  )
  assert.equal(
    isCompleteCacheRevalidationResponse({
      ...response,
      cloudflare: {
        ...response.cloudflare,
        prefixes: response.cloudflare.prefixes.slice(0, -1),
      },
    }, ['contents:__all__']),
    false,
  )
})

test('data revalidation never accepts zone-wide everything as completion', () => {
  assert.equal(
    isCompleteCacheRevalidationResponse({
      revalidated: true,
      complete: true,
      tags: ['contents:__all__'],
      cloudflare: {
        ok: true,
        status: 'purged',
        mode: 'everything',
        urls: [],
      },
    }, ['contents:__all__']),
    false,
  )
})

test('nonbulk cannot claim prefix mode and mixed bulk must match every exact URL and prefix', () => {
  assert.equal(
    isCompleteCacheRevalidationResponse({
      revalidated: true,
      complete: true,
      tags: ['contents:item-1'],
      cloudflare: {
        ok: true,
        status: 'purged',
        mode: 'prefix',
        urls: [
          'https://feelandnote.com/content/item-1',
          'https://feelandnote.com/en/content/item-1',
        ],
        prefixes: ['feelandnote.com/content/'],
      },
    }, ['contents:item-1']),
    false,
  )

  const tags = ['contents:__all__', 'contents:item-1']
  const cloudflare = {
    ok: true,
    status: 'purged',
    mode: 'prefix',
    urls: [
      'https://feelandnote.com/content/item-1',
      'https://feelandnote.com/en/content/item-1',
    ],
    prefixes: [
      'feelandnote.com/content/',
      'feelandnote.com/en/content/',
      'feelandnote.com/celeb/',
      'feelandnote.com/en/celeb/',
    ],
  }
  const response = { revalidated: true, complete: true, tags, cloudflare }
  assert.equal(isCompleteCacheRevalidationResponse(response, tags), true)
  assert.equal(isCompleteCacheRevalidationResponse({
    ...response,
    cloudflare: { ...cloudflare, urls: cloudflare.urls.slice(0, 1) },
  }, tags), false)
  assert.equal(isCompleteCacheRevalidationResponse({
    ...response,
    cloudflare: { ...cloudflare, prefixes: cloudflare.prefixes.slice(0, -1) },
  }, tags), false)
})

test('request tags determine the exact Cloudflare mode, URL set, and prefix set', () => {
  assert.deepEqual(
    cloudflarePurgeExpectationForTags(['contents:item-1']),
    {
      mode: 'targeted',
      urls: [
        'https://feelandnote.com/content/item-1',
        'https://feelandnote.com/en/content/item-1',
      ],
      prefixes: [],
    },
  )
  assert.deepEqual(
    cloudflarePurgeExpectationForTags([
      'contents:__all__',
      'contents:item-1',
      'celebs:alpha',
    ]),
    {
      mode: 'prefix',
      urls: [
        'https://feelandnote.com/content/item-1',
        'https://feelandnote.com/en/content/item-1',
        'https://feelandnote.com/celeb/alpha',
        'https://feelandnote.com/en/celeb/alpha',
      ],
      prefixes: [
        'feelandnote.com/content/',
        'feelandnote.com/en/content/',
        'feelandnote.com/celeb/',
        'feelandnote.com/en/celeb/',
      ],
    },
  )
})

test('bulk endpoint routing is versioned and unsupported bulk domains fail closed', () => {
  assert.equal(
    revalidationApiPathForTags(['contents:item-1']),
    '/api/revalidate',
  )
  assert.equal(
    revalidationApiPathForTags(['contents:item-1', 'contents:__all__']),
    '/api/revalidate/v2',
  )
  assert.throws(
    () => revalidationApiPathForTags(['curated:__all__']),
    /Unsupported bulk cache tag/,
  )
  assert.deepEqual(
    cloudflarePurgeExpectationForTags(['celebs:__all__']).prefixes,
    ['feelandnote.com/celeb/', 'feelandnote.com/en/celeb/'],
  )
  assert.deepEqual(
    cloudflarePurgeExpectationForTags(['figure-books:__all__']).prefixes,
    ['feelandnote.com/celeb/', 'feelandnote.com/en/celeb/'],
  )
})
