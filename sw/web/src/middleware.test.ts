import assert from 'node:assert/strict'
import test from 'node:test'
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server'
import { NextRequest } from 'next/server'

import { config, middleware } from './middleware'

function matches(pathname: string) {
  return unstable_doesMiddlewareMatch({
    config,
    nextConfig: {},
    url: `https://feelandnote.com${pathname}`,
  })
}

test('SEO image functions bypass middleware entirely', () => {
  assert.equal(matches('/seo-image/content/content-id'), false)
  assert.equal(matches('/seo-image/celeb/celeb-slug'), false)
  assert.equal(matches('/opengraph-image'), false)
})

test('localized pages and authentication routes still use middleware', () => {
  assert.equal(matches('/celeb/example'), true)
  assert.equal(matches('/en/content/content-id'), true)
  assert.equal(matches('/login'), true)
})

test('API and static asset paths continue to bypass middleware', () => {
  assert.equal(matches('/api/revalidate'), false)
  assert.equal(matches('/_next/static/chunk.js'), false)
  assert.equal(matches('/icon.png'), false)
  assert.equal(matches('/models/myth-troy/hero.glb'), false)
  assert.equal(matches('/models/myth-troy/scene.gltf'), false)
  assert.equal(matches('/models/myth-troy/scene.bin'), false)
})

for (const prefix of ['', '/ko', '/en']) {
  test(`figure UUID bypasses the slug ISR while preserving its query (${prefix || 'default'})`, async () => {
    const id = '11111111-2222-4333-8444-555555555555'
    const response = await middleware(new NextRequest(`https://feelandnote.com${prefix}/celeb/${id}?focus=book&tag=a&tag=b`))
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('location'), null)
    assert.equal(response.headers.get('x-middleware-rewrite'), `https://feelandnote.com${prefix || '/ko'}/celeb/id/${id}?focus=book&tag=a&tag=b`)
  })
}

test('canonical figure and records routes keep their existing locale routing', async () => {
  for (const path of ['/celeb/bill-gates', '/celeb/11111111-2222-4333-8444-555555555555/records/2']) {
    const response = await middleware(new NextRequest(`https://feelandnote.com${path}`))
    assert.equal(response.headers.get('x-middleware-rewrite'), `https://feelandnote.com/ko${path}`)
  }
})

test('old myth shortcuts move permanently to each myth address and keep other query', async () => {
  const cases: Array<[string, string]> = [
    ['/explore/myth?myth=homer-odyssey', 'https://feelandnote.com/explore/myth/homer-odyssey'],
    ['/en/explore/myth?myth=myth-japan&group=gods', 'https://feelandnote.com/en/explore/myth/myth-japan?group=gods'],
  ]
  for (const [path, location] of cases) {
    const response = await middleware(new NextRequest(`https://feelandnote.com${path}`))
    assert.equal(response.status, 308)
    assert.equal(response.headers.get('location'), location)
  }
  const hub = await middleware(new NextRequest('https://feelandnote.com/explore/myth'))
  assert.notEqual(hub.status, 308)
})

test('foreign first entry redirects home and deep links to English without losing query', async () => {
  for (const path of ['/?utm_source=test', '/celeb/bill-gates?focus=book', '/login', '/celeb/11111111-2222-4333-8444-555555555555']) {
    const response = await middleware(new NextRequest(`https://feelandnote.com${path}`, { headers: { 'CF-IPCountry': 'SG' } }))
    assert.equal(response.status, 307)
    assert.equal(response.headers.get('location'), `https://feelandnote.com/en${path.replace(/^\/(?=\?|$)/, '')}`)
    assert.equal(response.headers.get('cache-control'), 'private, no-store')
  }
})

test('legacy automatic Korean cookie does not strand foreign visitors in Korean', async () => {
  const response = await middleware(new NextRequest('https://feelandnote.com/', {
    headers: { 'CF-IPCountry': 'SG', cookie: 'NEXT_LOCALE=ko' },
  }))
  assert.equal(response.headers.get('location'), 'https://feelandnote.com/en')
})

test('explicit locales, manual Korean choice, Korea, unknown country, and crawlers stay stable', async () => {
  for (const [path, headers] of [
    ['/en', { 'CF-IPCountry': 'KR' }], ['/ko', { 'CF-IPCountry': 'SG' }],
    ['/', { 'CF-IPCountry': 'SG', cookie: 'fn_locale_preference=ko' }],
    ['/', { 'CF-IPCountry': 'KR' }], ['/', { 'CF-IPCountry': 'XX' }],
    ['/', { 'CF-IPCountry': 'SG', 'user-agent': 'Googlebot/2.1' }],
  ] as Array<[string, Record<string, string>]>) {
    const response = await middleware(new NextRequest(`https://feelandnote.com${path}`, { headers }))
    assert.notEqual(response.headers.get('location'), 'https://feelandnote.com/en')
  }
})

test('manual English choice survives a return to the Korean home address', async () => {
  const response = await middleware(new NextRequest('https://feelandnote.com/', {
    headers: { 'CF-IPCountry': 'KR', cookie: 'fn_locale_preference=en' },
  }))
  assert.equal(response.headers.get('location'), 'https://feelandnote.com/en')
})

test('an English session stays English through authentication redirects in Korea', async () => {
  const response = await middleware(new NextRequest('https://feelandnote.com/login', {
    headers: { 'CF-IPCountry': 'KR', cookie: 'NEXT_LOCALE=en' },
  }))
  assert.equal(response.headers.get('location'), 'https://feelandnote.com/en/login')
})

test('explicit Korean address records the choice before removing the default prefix', async () => {
  const response = await middleware(new NextRequest('https://feelandnote.com/ko/login', {
    headers: { 'CF-IPCountry': 'SG', cookie: 'NEXT_LOCALE=en' },
  }))
  assert.equal(response.headers.get('location'), 'https://feelandnote.com/login')
  assert.equal(response.cookies.get('fn_locale_preference')?.value, 'ko')
})
