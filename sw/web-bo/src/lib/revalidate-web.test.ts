import assert from 'node:assert/strict'
import test from 'node:test'
import {
  assertRevalidationResponse,
  normalizeRevalidationWebUrl,
  revalidateWebItems,
  revalidateWebLists,
  webContentRevalidationTags,
  type WebContentRevalidationSnapshot,
} from './revalidate-web'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'

const fullSnapshot: WebContentRevalidationSnapshot = {
  contentId: '11111111-1111-1111-1111-111111111111',
  externalId: 'tmdb-77',
  celebLibraries: [
    { id: '22222222-2222-2222-2222-222222222222', slug: 'alpha' },
    { id: '33333333-3333-3333-3333-333333333333', slug: null },
  ],
}

test('작품 상세 전용 저장은 UUID와 external_id만 무효화한다', () => {
  assert.deepEqual(
    webContentRevalidationTags(fullSnapshot, { includeCelebLibraries: false }),
    [
      'contents:11111111-1111-1111-1111-111111111111',
      'contents:tmdb-77',
    ],
  )
})

test('인물 서가 영향 저장은 작품 별칭과 인물 UUID·slug를 함께 무효화한다', () => {
  assert.deepEqual(
    webContentRevalidationTags(fullSnapshot, {
      includeCelebLibraries: true,
      listDomains: [CACHE_TAGS.CONTENTS, CACHE_TAGS.CELEBS],
    }),
    [
      'contents:11111111-1111-1111-1111-111111111111',
      'contents:tmdb-77',
      'celebs:22222222-2222-2222-2222-222222222222',
      'celebs:alpha',
      'celebs:33333333-3333-3333-3333-333333333333',
      'contents',
      'celebs',
    ],
  )
})

test('인물 식별자를 조회하지 않은 스냅샷으로 인물 서가를 비우지 못한다', () => {
  assert.throws(
    () => webContentRevalidationTags(
      { ...fullSnapshot, celebLibraries: null },
      { includeCelebLibraries: true },
    ),
    /인물 식별자/,
  )
})

test('CRON_SECRET 누락을 로컬 성공으로 가장하지 않는다', async () => {
  const original = process.env.CRON_SECRET
  delete process.env.CRON_SECRET
  try {
    await assert.rejects(revalidateWebLists(CACHE_TAGS.CONTENTS), /CRON_SECRET/)
  } finally {
    if (original === undefined) delete process.env.CRON_SECRET
    else process.env.CRON_SECRET = original
  }
})

test('재검증 주소는 운영 origin과 loopback만 허용한다', () => {
  assert.equal(normalizeRevalidationWebUrl('https://feelandnote.com/'), 'https://feelandnote.com')
  assert.equal(normalizeRevalidationWebUrl('http://127.0.0.1:3000'), 'http://127.0.0.1:3000')
  assert.throws(() => normalizeRevalidationWebUrl('https://evil.example'), /origin만 허용/)
  assert.throws(() => normalizeRevalidationWebUrl('https://feelandnote.com/path'), /origin만 허용/)
})

test('대량 태그를 50개씩 나누고 각 응답 태그를 확인한다', async (t) => {
  const originalSecret = process.env.CRON_SECRET
  const originalWebUrl = process.env.NEXT_PUBLIC_WEB_URL
  process.env.CRON_SECRET = 'test-secret'
  process.env.NEXT_PUBLIC_WEB_URL = 'https://feelandnote.com'
  const received: string[][] = []

  t.mock.method(globalThis, 'fetch', async (
    _input: string | URL | Request,
    init?: RequestInit,
  ) => {
    const requestBody = JSON.parse(String(init?.body)) as { tag: string[] }
    received.push(requestBody.tag)
    return Response.json({
      revalidated: true,
      complete: true,
      tags: requestBody.tag,
      cloudflare: {
        ok: true,
        status: 'purged',
        mode: 'targeted',
        urls: ['https://feelandnote.com/content/item'],
      },
    })
  })
  t.after(() => {
    if (originalSecret === undefined) delete process.env.CRON_SECRET
    else process.env.CRON_SECRET = originalSecret
    if (originalWebUrl === undefined) delete process.env.NEXT_PUBLIC_WEB_URL
    else process.env.NEXT_PUBLIC_WEB_URL = originalWebUrl
  })

  await revalidateWebItems(Array.from({ length: 51 }, (_, index) => ({
    domain: CACHE_TAGS.CONTENTS,
    id: `item-${index}`,
  })))

  assert.deepEqual(received.map((chunk) => chunk.length), [50, 1])
})

test('Next와 Cloudflare 무효화가 모두 완료된 응답만 통과시킨다', () => {
  assert.doesNotThrow(() => assertRevalidationResponse({
    revalidated: true,
    complete: true,
    tags: ['contents:tmdb-77'],
    cloudflare: {
      ok: true,
      status: 'purged',
      mode: 'targeted',
      urls: ['https://feelandnote.com/content/tmdb-77'],
    },
  }, ['contents:tmdb-77']))

  assert.throws(
    () => assertRevalidationResponse({
      revalidated: true,
      complete: false,
      tags: ['contents:tmdb-77'],
      error: 'Next cache was revalidated, but the Cloudflare purge did not complete.',
      cloudflare: {
        ok: false,
        status: 'failed',
        mode: 'targeted',
        urls: ['https://feelandnote.com/content/tmdb-77'],
      },
    }, ['contents:tmdb-77']),
    /캐시 무효화 미완료: Next cache was revalidated/,
  )
  assert.throws(
    () => assertRevalidationResponse({
      revalidated: true,
      tags: ['contents:tmdb-77'],
      cloudflare: {
        ok: true,
        status: 'purged',
        mode: 'targeted',
        urls: [],
      },
    }, ['contents:tmdb-77']),
    /캐시 무효화 미완료/,
  )
  assert.throws(
    () => assertRevalidationResponse({
      revalidated: false,
      complete: false,
      tags: ['contents:tmdb-77'],
      cloudflare: { ok: true, status: 'not_needed', mode: 'none', urls: [] },
    }, ['contents:tmdb-77']),
    /Next 캐시 무효화 확인 실패/,
  )
  assert.throws(
    () => assertRevalidationResponse({
      revalidated: true,
      complete: true,
      tags: ['contents:tmdb-77'],
      cloudflare: { ok: true, status: 'purged', mode: 'targeted' },
    }, ['contents:tmdb-77']),
    /캐시 무효화 완료 응답 계약/,
  )
  assert.throws(
    () => assertRevalidationResponse({
      revalidated: true,
      complete: true,
      tags: ['contents:other'],
      cloudflare: {
        ok: true,
        status: 'purged',
        mode: 'targeted',
        urls: ['https://feelandnote.com/content/other'],
      },
    }, ['contents:tmdb-77']),
    /캐시 무효화 완료 응답 계약/,
  )
})
