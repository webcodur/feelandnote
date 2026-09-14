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
