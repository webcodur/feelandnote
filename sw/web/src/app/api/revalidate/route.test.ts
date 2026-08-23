import assert from 'node:assert/strict'
import { test, type TestContext } from 'node:test'
import { NextRequest } from 'next/server'
import { createRevalidationHandler } from './handler'

function request(tag: string | string[]) {
  return new NextRequest('https://feelandnote.com/api/revalidate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tag, secret: 'test-secret' }),
  })
}

function rawRequest(body: BodyInit) {
  return new NextRequest('https://feelandnote.com/api/revalidate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  })
}

function configureSecret(t: TestContext) {
  const original = process.env.CRON_SECRET
  process.env.CRON_SECRET = 'test-secret'
  t.after(() => {
    if (original === undefined) delete process.env.CRON_SECRET
    else process.env.CRON_SECRET = original
  })
}

test('Cloudflare API 실패를 HTTP 502로 전파한다', async (t) => {
  configureSecret(t)
  const expired: string[] = []
  const handleRevalidation = createRevalidationHandler({
    expireTag: (tag) => expired.push(tag),
    purgeByTags: async () => ({
      urls: ['https://feelandnote.com/content/abc123'],
      ok: false,
      status: 'failed',
      mode: 'targeted',
      failedBatches: 1,
    }),
  })
  const response = await handleRevalidation(request('contents:abc123'))

  assert.equal(response.status, 502)
  assert.deepEqual(expired, ['contents:abc123'])
  assert.deepEqual(await response.json(), {
    revalidated: true,
    complete: false,
    tags: ['contents:abc123'],
    cloudflare: {
      urls: ['https://feelandnote.com/content/abc123'],
      ok: false,
      status: 'failed',
      mode: 'targeted',
      failedBatches: 1,
    },
    error: 'Next cache was revalidated, but the Cloudflare purge did not complete.',
  })
})

test('Cloudflare 설정 누락을 HTTP 503으로 전파한다', async (t) => {
  configureSecret(t)
  const handleRevalidation = createRevalidationHandler({
    expireTag: () => undefined,
    purgeByTags: async () => ({
      urls: ['https://feelandnote.com/content/abc123'],
      ok: false,
      status: 'not_configured',
      mode: 'targeted',
    }),
  })
  const response = await handleRevalidation(request('contents:abc123'))

  assert.equal(response.status, 503)
  assert.equal((await response.json()).complete, false)
})

test('targeted purge가 성공하면 기존 HTTP 200 흐름을 유지한다', async (t) => {
  configureSecret(t)
  const handleRevalidation = createRevalidationHandler({
    expireTag: () => undefined,
    purgeByTags: async () => ({
      urls: [
        'https://feelandnote.com/content/abc123',
        'https://feelandnote.com/en/content/abc123',
      ],
      ok: true,
      status: 'purged',
      mode: 'targeted',
    }),
  })
  const response = await handleRevalidation(request(['contents:abc123', 'contents:abc123']))

  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), {
    revalidated: true,
    complete: true,
    tags: ['contents:abc123'],
    cloudflare: {
      urls: [
        'https://feelandnote.com/content/abc123',
        'https://feelandnote.com/en/content/abc123',
      ],
      ok: true,
      status: 'purged',
      mode: 'targeted',
    },
  })
})

test('legacy endpoint는 bulk tag를 Next·Cloudflare mutation 전에 거부한다', async (t) => {
  configureSecret(t)
  const expired: string[] = []
  let purges = 0
  const handleRevalidation = createRevalidationHandler({
    expireTag: (tag) => expired.push(tag),
    purgeByTags: async () => {
      purges += 1
      return { urls: [], ok: true, status: 'not_needed', mode: 'none' }
    },
  })
  const response = await handleRevalidation(request(['contents:item-1', 'contents:__all__']))

  assert.equal(response.status, 400)
  assert.deepEqual(expired, [])
  assert.equal(purges, 0)
  assert.match((await response.json()).error, /\/api\/revalidate\/v2/)
})

test('v2 endpoint는 bulk가 포함된 mixed prefix+exact 요청만 처리한다', async (t) => {
  configureSecret(t)
  const expired: string[] = []
  let purges = 0
  const handleRevalidation = createRevalidationHandler({
    expireTag: (tag) => expired.push(tag),
    purgeByTags: async () => {
      purges += 1
      return {
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
        ok: true,
        status: 'purged',
        mode: 'prefix',
      }
    },
  }, 'bulk')
  const tags = ['contents:__all__', 'contents:item-1']
  const response = await handleRevalidation(request(tags))

  assert.equal(response.status, 200)
  assert.deepEqual(expired, tags)
  assert.equal(purges, 1)
  assert.deepEqual(await response.json(), {
    revalidated: true,
    complete: true,
    tags,
    cloudflare: {
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
      ok: true,
      status: 'purged',
      mode: 'prefix',
    },
  })
})

test('v2 endpoint는 targeted-only 요청을 mutation 전에 거부한다', async (t) => {
  configureSecret(t)
  let expired = 0
  let purges = 0
  const handleRevalidation = createRevalidationHandler({
    expireTag: () => { expired += 1 },
    purgeByTags: async () => {
      purges += 1
      return { urls: [], ok: true, status: 'not_needed', mode: 'none' }
    },
  }, 'bulk')

  const response = await handleRevalidation(request('contents:item-1'))
  assert.equal(response.status, 400)
  assert.equal(expired, 0)
  assert.equal(purges, 0)
  assert.match((await response.json()).error, /legacy endpoint/)
})

test('v2 endpoint는 지원 근거가 없는 bulk domain을 mutation 전에 거부한다', async (t) => {
  configureSecret(t)
  let expired = 0
  let purges = 0
  const handleRevalidation = createRevalidationHandler({
    expireTag: () => { expired += 1 },
    purgeByTags: async () => {
      purges += 1
      return { urls: [], ok: true, status: 'not_needed', mode: 'none' }
    },
  }, 'bulk')

  const response = await handleRevalidation(request('curated:__all__'))
  assert.equal(response.status, 400)
  assert.equal(expired, 0)
  assert.equal(purges, 0)
  assert.match((await response.json()).error, /Unsupported bulk cache tag/)
})

test('handler는 Cloudflare의 one-URL false green을 완료로 내보내지 않는다', async (t) => {
  configureSecret(t)
  const handleRevalidation = createRevalidationHandler({
    expireTag: () => undefined,
    purgeByTags: async () => ({
      urls: ['https://feelandnote.com/content/abc123'],
      ok: true,
      status: 'purged',
      mode: 'targeted',
    }),
  })

  const response = await handleRevalidation(request('contents:abc123'))
  assert.equal(response.status, 502)
  assert.equal((await response.json()).complete, false)
})

test('잘못된 JSON·객체가 아닌 body·과도한 태그를 400으로 거부한다', async (t) => {
  configureSecret(t)
  let purges = 0
  const handleRevalidation = createRevalidationHandler({
    expireTag: () => undefined,
    purgeByTags: async () => {
      purges += 1
      return { urls: [], ok: true, status: 'not_needed', mode: 'none' }
    },
  })

  assert.equal((await handleRevalidation(rawRequest('{'))).status, 400)
  assert.equal((await handleRevalidation(rawRequest('null'))).status, 400)
  assert.equal(
    (await handleRevalidation(rawRequest(JSON.stringify({ tag: [123], secret: 'test-secret' })))).status,
    400,
  )
  assert.equal((await handleRevalidation(request(
    Array.from({ length: 201 }, (_, index) => `contents:item-${index}`),
  ))).status, 400)
  assert.equal(purges, 0)
})

test('DB trigger chunk boundary인 정확히 200개 태그는 수락한다', async (t) => {
  configureSecret(t)
  const expired: string[] = []
  let purged: readonly string[] = []
  const handleRevalidation = createRevalidationHandler({
    expireTag: (tag) => expired.push(tag),
    purgeByTags: async (tags) => {
      purged = tags
      return {
        urls: tags.flatMap((tag) => {
          const id = tag.slice('contents:'.length)
          return [
            `https://feelandnote.com/content/${id}`,
            `https://feelandnote.com/en/content/${id}`,
          ]
        }),
        ok: true,
        status: 'purged',
        mode: 'targeted',
      }
    },
  })
  const tags = Array.from({ length: 200 }, (_, index) => `contents:item-${index}`)
  const response = await handleRevalidation(request(tags))

  assert.equal(response.status, 200)
  assert.deepEqual(expired, tags)
  assert.deepEqual(purged, tags)
})

test('비밀키 누락·불일치와 허용되지 않은 태그를 각각 구분한다', async (t) => {
  const original = process.env.CRON_SECRET
  delete process.env.CRON_SECRET
  t.after(() => {
    if (original === undefined) delete process.env.CRON_SECRET
    else process.env.CRON_SECRET = original
  })
  const handleRevalidation = createRevalidationHandler({
    expireTag: () => undefined,
    purgeByTags: async () => ({ urls: [], ok: true, status: 'not_needed', mode: 'none' }),
  })

  assert.equal((await handleRevalidation(request('contents:item-1'))).status, 503)
  process.env.CRON_SECRET = 'different-secret'
  assert.equal((await handleRevalidation(request('contents:item-1'))).status, 401)
  process.env.CRON_SECRET = 'test-secret'
  assert.equal((await handleRevalidation(request('unknown:item-1'))).status, 400)
})
