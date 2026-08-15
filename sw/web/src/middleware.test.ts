import assert from 'node:assert/strict'
import test from 'node:test'
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server'

import { config } from './middleware'

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
