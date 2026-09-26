import assert from 'node:assert/strict'
import test from 'node:test'
import type { MetadataRoute } from 'next'

import { getSitemapEntries } from './sitemap'

const CREATED_AT = '2026-08-01T00:00:00.000Z'

test('works and curated URLs use canonical explore paths in both locales', async (t) => {
  const previousUrl = process.env.NEXT_PUBLIC_DB_API_URL
  const previousKey = process.env.NEXT_PUBLIC_DB_PUBLISHABLE_KEY
  const previousFetch = globalThis.fetch
  process.env.NEXT_PUBLIC_DB_API_URL = 'https://db.example'
  process.env.NEXT_PUBLIC_DB_PUBLISHABLE_KEY = 'test-anon-key'
  globalThis.fetch = async () => Response.json([{ slug: 'example', curated_lists: [{ slug: 'list' }] }])
  t.after(() => {
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_DB_API_URL
    else process.env.NEXT_PUBLIC_DB_API_URL = previousUrl
    if (previousKey === undefined) delete process.env.NEXT_PUBLIC_DB_PUBLISHABLE_KEY
    else process.env.NEXT_PUBLIC_DB_PUBLISHABLE_KEY = previousKey
    globalThis.fetch = previousFetch
  })
  const entries = await getSitemapEntries('core')
  assert.ok(entries)
  for (const prefix of ['', '/en']) {
    for (const suffix of ['', '/popular', '/popular?mode=classics', '/museum', '/academy', '/curated', '/curated/example', '/curated/example/list']) {
      const entry: MetadataRoute.Sitemap[number] | undefined = entries.find(({ url }) => url === `https://feelandnote.com${prefix}/explore/works${suffix}`)
      assert.ok(entry, `missing ${prefix}/explore/works${suffix}`)
      assert.equal(entry.alternates?.languages?.ko, `https://feelandnote.com/explore/works${suffix}`)
      assert.equal(entry.alternates?.languages?.en, `https://feelandnote.com/en/explore/works${suffix}`)
    }
  }
  assert.ok(entries.every(({ url }) => !url.includes('/library')))
})

test('동일 생성 시각이 페이지 경계를 넘어도 모든 인물을 한 번씩 싣는다', async (t) => {
  const previousUrl = process.env.NEXT_PUBLIC_DB_API_URL
  const previousKey = process.env.NEXT_PUBLIC_DB_PUBLISHABLE_KEY
  const previousFetch = globalThis.fetch

  process.env.NEXT_PUBLIC_DB_API_URL = 'https://db.example'
  process.env.NEXT_PUBLIC_DB_PUBLISHABLE_KEY = 'test-anon-key'

  const celebs = Array.from({ length: 1001 }, (_, index) => ({
    slug: `celeb-${String(index + 1).padStart(4, '0')}`,
    created_at: CREATED_AT,
    updated_at: null,
  }))

  globalThis.fetch = async (input) => {
    const url = new URL(String(input))
    const offset = Number(url.searchParams.get('offset'))
    const order = url.searchParams.get('order')

    assert.equal(url.pathname, '/rest/v1/celebs')

    if (offset === 0) {
      return Response.json(celebs.slice(0, 1000))
    }

    if (offset === 1000) {
      return Response.json(
        order === 'created_at.asc,id.asc' ? [celebs[1000]] : [celebs[999]],
      )
    }

    return Response.json([])
  }

  t.after(() => {
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_DB_API_URL
    else process.env.NEXT_PUBLIC_DB_API_URL = previousUrl

    if (previousKey === undefined) delete process.env.NEXT_PUBLIC_DB_PUBLISHABLE_KEY
    else process.env.NEXT_PUBLIC_DB_PUBLISHABLE_KEY = previousKey

    globalThis.fetch = previousFetch
  })

  const entries = await getSitemapEntries('celebs')
  assert.ok(entries)

  const urls = entries.map((entry) => entry.url)
  assert.equal(urls.length, 2002)
  assert.equal(new Set(urls).size, 2002)
  assert.ok(urls.includes('https://feelandnote.com/celeb/celeb-1001'))
  assert.ok(urls.includes('https://feelandnote.com/en/celeb/celeb-1001'))
})
