import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  purgeCloudflareByTags,
  tagToUrls,
  tagsToUrls,
} from './cloudflarePurge'

test('slug 태그는 인물 상세 두 언어 URL로', () => {
  assert.deepEqual(tagToUrls('celebs:elon-musk'), ['/celeb/elon-musk', '/en/celeb/elon-musk'])
})
test('uuid 태그는 URL이 없다', () => {
  assert.deepEqual(tagToUrls('celebs:c8ac8c9d-c229-4570-ad5f-0b68a59153c0'), [])
})
test('도메인 태그 celebs는 목록 화면만', () => {
  assert.equal(tagToUrls('celebs').length, 4)
  assert.deepEqual(tagToUrls('dialogues'), [])
})
test('작품 태그는 uuid·external_id 그대로 URL', () => {
  assert.deepEqual(tagToUrls('contents:abc123'), ['/content/abc123', '/en/content/abc123'])
})
test('legitimate Unicode slugs and provider IDs become normalized public URLs', () => {
  assert.deepEqual(tagsToUrls(['celebs:uğur-şahin']), [
    'https://feelandnote.com/celeb/u%C4%9Fur-%C5%9Fahin',
    'https://feelandnote.com/en/celeb/u%C4%9Fur-%C5%9Fahin',
  ])
  assert.deepEqual(tagsToUrls(["celebs:d'arcy"]), [
    "https://feelandnote.com/celeb/d'arcy",
    "https://feelandnote.com/en/celeb/d'arcy",
  ])
  assert.deepEqual(tagsToUrls(['contents:NYPL:33433039351980']), [
    'https://feelandnote.com/content/NYPL:33433039351980',
    'https://feelandnote.com/en/content/NYPL:33433039351980',
  ])
})
test('중복 URL은 하나로', () => {
  assert.equal(tagsToUrls(['celebs:x', 'celebs:x']).length, 2)
})

test('지울 URL이 없으면 Cloudflare 설정 없이도 not_needed로 끝난다', async (t) => {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID
  const token = process.env.CLOUDFLARE_API_TOKEN
  delete process.env.CLOUDFLARE_ZONE_ID
  delete process.env.CLOUDFLARE_API_TOKEN
  t.after(() => {
    if (zoneId === undefined) delete process.env.CLOUDFLARE_ZONE_ID
    else process.env.CLOUDFLARE_ZONE_ID = zoneId
    if (token === undefined) delete process.env.CLOUDFLARE_API_TOKEN
    else process.env.CLOUDFLARE_API_TOKEN = token
  })

  assert.deepEqual(await purgeCloudflareByTags(['dialogues']), {
    urls: [],
    ok: true,
    status: 'not_needed',
    mode: 'none',
  })
})

test('지울 URL이 있는데 Cloudflare 설정이 없으면 실패로 구분한다', async (t) => {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID
  const token = process.env.CLOUDFLARE_API_TOKEN
  delete process.env.CLOUDFLARE_ZONE_ID
  delete process.env.CLOUDFLARE_API_TOKEN
  t.mock.method(console, 'error', () => undefined)
  t.after(() => {
    if (zoneId === undefined) delete process.env.CLOUDFLARE_ZONE_ID
    else process.env.CLOUDFLARE_ZONE_ID = zoneId
    if (token === undefined) delete process.env.CLOUDFLARE_API_TOKEN
    else process.env.CLOUDFLARE_API_TOKEN = token
  })

  const result = await purgeCloudflareByTags(['contents:abc123'])
  assert.equal(result.ok, false)
  assert.equal(result.status, 'not_configured')
  assert.equal(result.mode, 'targeted')
  assert.equal(result.urls.length, 2)
})

test('Cloudflare가 success:true를 반환하면 targeted purge가 성공한다', async (t) => {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID
  const token = process.env.CLOUDFLARE_API_TOKEN
  process.env.CLOUDFLARE_ZONE_ID = 'test-zone'
  process.env.CLOUDFLARE_API_TOKEN = 'test-token'
  const fetchMock = t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    assert.match(String(input), /zones\/test-zone\/purge_cache$/)
    assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer test-token')
    assert.deepEqual(JSON.parse(String(init?.body)), {
      files: ['https://feelandnote.com/content/abc123', 'https://feelandnote.com/en/content/abc123'],
    })
    return new Response(JSON.stringify({ success: true }), { status: 200 })
  })
  t.after(() => {
    if (zoneId === undefined) delete process.env.CLOUDFLARE_ZONE_ID
    else process.env.CLOUDFLARE_ZONE_ID = zoneId
    if (token === undefined) delete process.env.CLOUDFLARE_API_TOKEN
    else process.env.CLOUDFLARE_API_TOKEN = token
  })

  assert.deepEqual(await purgeCloudflareByTags(['contents:abc123']), {
    urls: [
      'https://feelandnote.com/content/abc123',
      'https://feelandnote.com/en/content/abc123',
    ],
    ok: true,
    status: 'purged',
    mode: 'targeted',
  })
  assert.equal(fetchMock.mock.callCount(), 1)
})

test('Cloudflare HTTP 오류는 실패로 반환한다', async (t) => {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID
  const token = process.env.CLOUDFLARE_API_TOKEN
  process.env.CLOUDFLARE_ZONE_ID = 'test-zone'
  process.env.CLOUDFLARE_API_TOKEN = 'test-token'
  t.mock.method(console, 'error', () => undefined)
  t.mock.method(globalThis, 'fetch', async () => new Response('forbidden', { status: 403 }))
  t.after(() => {
    if (zoneId === undefined) delete process.env.CLOUDFLARE_ZONE_ID
    else process.env.CLOUDFLARE_ZONE_ID = zoneId
    if (token === undefined) delete process.env.CLOUDFLARE_API_TOKEN
    else process.env.CLOUDFLARE_API_TOKEN = token
  })

  const result = await purgeCloudflareByTags(['contents:abc123'])
  assert.deepEqual(result, {
    urls: [
      'https://feelandnote.com/content/abc123',
      'https://feelandnote.com/en/content/abc123',
    ],
    ok: false,
    status: 'failed',
    mode: 'targeted',
    failedBatches: 1,
  })
})

test('Cloudflare의 HTTP 200 success:false도 실패로 반환한다', async (t) => {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID
  const token = process.env.CLOUDFLARE_API_TOKEN
  process.env.CLOUDFLARE_ZONE_ID = 'test-zone'
  process.env.CLOUDFLARE_API_TOKEN = 'test-token'
  t.mock.method(console, 'error', () => undefined)
  t.mock.method(
    globalThis,
    'fetch',
    async () => new Response(JSON.stringify({ success: false, errors: [{ code: 1000 }] }), { status: 200 }),
  )
  t.after(() => {
    if (zoneId === undefined) delete process.env.CLOUDFLARE_ZONE_ID
    else process.env.CLOUDFLARE_ZONE_ID = zoneId
    if (token === undefined) delete process.env.CLOUDFLARE_API_TOKEN
    else process.env.CLOUDFLARE_API_TOKEN = token
  })

  const result = await purgeCloudflareByTags(['contents:abc123'])
  assert.equal(result.ok, false)
  assert.equal(result.status, 'failed')
  assert.equal(result.mode, 'targeted')
})

test('Cloudflare 네트워크 오류도 실패로 반환한다', async (t) => {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID
  const token = process.env.CLOUDFLARE_API_TOKEN
  process.env.CLOUDFLARE_ZONE_ID = 'test-zone'
  process.env.CLOUDFLARE_API_TOKEN = 'test-token'
  t.mock.method(console, 'error', () => undefined)
  t.mock.method(globalThis, 'fetch', async () => {
    throw new TypeError('network unavailable')
  })
  t.after(() => {
    if (zoneId === undefined) delete process.env.CLOUDFLARE_ZONE_ID
    else process.env.CLOUDFLARE_ZONE_ID = zoneId
    if (token === undefined) delete process.env.CLOUDFLARE_API_TOKEN
    else process.env.CLOUDFLARE_API_TOKEN = token
  })

  const result = await purgeCloudflareByTags(['contents:abc123'])
  assert.equal(result.ok, false)
  assert.equal(result.status, 'failed')
  assert.equal(result.mode, 'targeted')
})

test('100 URL을 넘는 targeted purge는 Cloudflare 요청을 나눈다', async (t) => {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID
  const token = process.env.CLOUDFLARE_API_TOKEN
  process.env.CLOUDFLARE_ZONE_ID = 'test-zone'
  process.env.CLOUDFLARE_API_TOKEN = 'test-token'
  const batchSizes: number[] = []
  const fetchMock = t.mock.method(
    globalThis,
    'fetch',
    async (_input: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { files: string[] }
      batchSizes.push(body.files.length)
      return new Response(JSON.stringify({ success: true }), { status: 200 })
    },
  )
  t.after(() => {
    if (zoneId === undefined) delete process.env.CLOUDFLARE_ZONE_ID
    else process.env.CLOUDFLARE_ZONE_ID = zoneId
    if (token === undefined) delete process.env.CLOUDFLARE_API_TOKEN
    else process.env.CLOUDFLARE_API_TOKEN = token
  })

  const tags = Array.from({ length: 51 }, (_, index) => `contents:item-${index}`)
  const result = await purgeCloudflareByTags(tags)

  assert.equal(result.ok, true)
  assert.equal(result.urls.length, 102)
  assert.deepEqual(batchSizes, [100, 2])
  assert.equal(fetchMock.mock.callCount(), 2)
})

test('__all__ 태그는 URL 열거 대신 purge_everything을 정확히 한 번 호출한다', async (t) => {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID
  const token = process.env.CLOUDFLARE_API_TOKEN
  process.env.CLOUDFLARE_ZONE_ID = 'test-zone'
  process.env.CLOUDFLARE_API_TOKEN = 'test-token'
  const fetchMock = t.mock.method(
    globalThis,
    'fetch',
    async (_input: string | URL | Request, init?: RequestInit) => {
      assert.deepEqual(JSON.parse(String(init?.body)), { purge_everything: true })
      return new Response(JSON.stringify({ success: true }), { status: 200 })
    },
  )
  t.after(() => {
    if (zoneId === undefined) delete process.env.CLOUDFLARE_ZONE_ID
    else process.env.CLOUDFLARE_ZONE_ID = zoneId
    if (token === undefined) delete process.env.CLOUDFLARE_API_TOKEN
    else process.env.CLOUDFLARE_API_TOKEN = token
  })

  assert.deepEqual(
    await purgeCloudflareByTags([
      'contents:__all__',
      'contents:abc123',
      'celebs:__all__',
      'celebs:elon-musk',
    ]),
    {
      urls: [],
      ok: true,
      status: 'purged',
      mode: 'everything',
    },
  )
  assert.equal(fetchMock.mock.callCount(), 1)
})

test('__all__ 전량 퍼지도 Cloudflare 설정 누락을 실패로 반환한다', async (t) => {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID
  const token = process.env.CLOUDFLARE_API_TOKEN
  delete process.env.CLOUDFLARE_ZONE_ID
  delete process.env.CLOUDFLARE_API_TOKEN
  t.mock.method(console, 'error', () => undefined)
  t.after(() => {
    if (zoneId === undefined) delete process.env.CLOUDFLARE_ZONE_ID
    else process.env.CLOUDFLARE_ZONE_ID = zoneId
    if (token === undefined) delete process.env.CLOUDFLARE_API_TOKEN
    else process.env.CLOUDFLARE_API_TOKEN = token
  })

  assert.deepEqual(await purgeCloudflareByTags(['contents:__all__']), {
    urls: [],
    ok: false,
    status: 'not_configured',
    mode: 'everything',
  })
})
