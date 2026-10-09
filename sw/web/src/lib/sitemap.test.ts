import assert from 'node:assert/strict'
import { AsyncLocalStorage } from 'node:async_hooks'
import { createRequire } from 'node:module'
import test from 'node:test'
import type { MetadataRoute } from 'next'

import { INFLUENCE_RANKING_FIELDS, getInfluenceRankingHref } from '@/constants/influenceRanking'

// 직군 목록도 실제 Next 캐시를 거친다. 서버 저장소를 마련하고 각 호출은 빈 캐시에서 검증한다.
Object.assign(globalThis, { AsyncLocalStorage })
const require = createRequire(import.meta.url)
const { workAsyncStorage } = require('next/dist/server/app-render/work-async-storage.external')
const { workUnitAsyncStorage } = require('next/dist/server/app-render/work-unit-async-storage.external')
const sitemap = require('./sitemap') as typeof import('./sitemap')
const { serializeSitemap } = sitemap
function getSitemapEntries(name: string) {
  const incrementalCache = { generateCacheKey: async (key: string) => key, get: async () => null, set: async () => {} }
  return workAsyncStorage.run({ route: '/sitemaps/core', incrementalCache }, () =>
    workUnitAsyncStorage.run({ type: 'prerender-legacy', phase: 'render', tags: null, revalidate: Infinity }, () => sitemap.getSitemapEntries(name))) as ReturnType<typeof sitemap.getSitemapEntries>
}

const CREATED_AT = '2026-08-01T00:00:00.000Z'

test('works and curated URLs use canonical explore paths in both locales', async (t) => {
  const previousUrl = process.env.NEXT_PUBLIC_DB_API_URL
  const previousKey = process.env.NEXT_PUBLIC_DB_PUBLISHABLE_KEY
  const previousFetch = globalThis.fetch
  process.env.NEXT_PUBLIC_DB_API_URL = 'https://db.example'
  process.env.NEXT_PUBLIC_DB_PUBLISHABLE_KEY = 'test-anon-key'
  globalThis.fetch = async (input) => {
    const path = new URL(String(input)).pathname
    if (path === '/rest/v1/celeb_professions') return Response.json([{ value: 'scientist', label: '과학자', label_en: 'Scientist' }])
    if (path === '/rest/v1/faction_lv2') {
      return Response.json([
        { id: 'm1', slug: 'homer-odyssey', is_myth: true, published: true, is_featured: false },
        { id: 'm2', slug: 'closed-myth', is_myth: true, published: false, is_featured: false },
        { id: 'f1', slug: 'openai', is_myth: false, published: false, is_featured: true },
        { id: 'f2', slug: 'empty-faction', is_myth: false, published: false, is_featured: true },
      ])
    }
    if (path === '/rest/v1/faction_member_rows') return Response.json([{ lv2_id: 'm1' }, { lv2_id: 'm2' }, { lv2_id: 'f1' }])
    return Response.json([{ slug: 'example', curated_lists: [
      ...Array.from({ length: 25 }, (_, index) => ({ slug: index === 0 ? 'list' : `book-${index}`, content_type: 'BOOK', is_featured: true })),
      ...Array.from({ length: 13 }, (_, index) => ({ slug: `video-${index}`, content_type: 'VIDEO', is_featured: true })),
      { slug: 'hidden-music', content_type: 'MUSIC', is_featured: false },
    ] }])
  }
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
    for (const suffix of ['', '/popular?mode=classics', '/museum', '/academy', '/curated', '/curated/example', '/curated/example/list']) {
      const entry: MetadataRoute.Sitemap[number] | undefined = entries.find(({ url }) => url === `https://feelandnote.com${prefix}/explore/works${suffix}`)
      assert.ok(entry, `missing ${prefix}/explore/works${suffix}`)
      assert.equal(entry.alternates?.languages?.ko, `https://feelandnote.com/explore/works${suffix}`)
      assert.equal(entry.alternates?.languages?.en, `https://feelandnote.com/en/explore/works${suffix}`)
    }
  }
  assert.ok(entries.every(({ url }) => !url.includes('/library')))
  // 신화·세력은 화면이 여는 것만 — 닫힌 신화와 인물 없는 세력은 싣지 않는다
  const urls = entries.map(({ url }) => url)
  for (const path of ['/support', '/shop']) {
    const entry = entries.find(({ url }) => url === `https://feelandnote.com${path}`)
    assert.ok(entry)
    assert.equal(entry.alternates?.languages?.en, undefined)
    assert.ok(!urls.includes(`https://feelandnote.com/en${path}`))
  }
  for (const path of ['/explore/myth/homer-odyssey', '/en/explore/myth/homer-odyssey', '/explore/faction/openai', '/en/explore/faction/openai']) {
    assert.ok(urls.includes(`https://feelandnote.com${path}`), `missing ${path}`)
  }
  assert.ok(!urls.some((url) => /closed-myth|empty-faction/.test(url)))
  // 베스트셀러는 작품 첫 화면이 맡는다 — 옮겨 가는 옛 주소를 싣지 않는다
  assert.ok(entries.every(({ url }) => !/\/explore\/works\/popular$/.test(url)))
  for (const prefix of ['', '/en']) {
    for (const suffix of ['?page=2', '?page=3', '?media=VIDEO', '?media=VIDEO&page=2']) {
      assert.ok(urls.includes(`https://feelandnote.com${prefix}/explore/works/curated${suffix}`))
    }
    for (const field of INFLUENCE_RANKING_FIELDS) {
      assert.ok(urls.includes(`https://feelandnote.com${prefix}${getInfluenceRankingHref(field)}`))
    }
  }
  assert.ok(!urls.some((url) => /media=MUSIC|page=4/.test(url)))
  assert.equal(new Set(urls).size, urls.length)
  assert.match(serializeSitemap(entries), /media=VIDEO&amp;page=2/)
})

test('인물 조회 중 두 번째 페이지가 실패하면 부분 사이트맵을 돌려주지 않는다', async (t) => {
  const previousUrl = process.env.NEXT_PUBLIC_DB_API_URL
  const previousKey = process.env.NEXT_PUBLIC_DB_PUBLISHABLE_KEY
  const previousFetch = globalThis.fetch
  process.env.NEXT_PUBLIC_DB_API_URL = 'https://db.example'
  process.env.NEXT_PUBLIC_DB_PUBLISHABLE_KEY = 'test-key'
  let failures = 0
  globalThis.fetch = async (input) => {
    if (new URL(String(input)).searchParams.get('offset') === '0') {
      return Response.json(Array.from({ length: 1000 }, (_, index) => ({ slug: `person-${index}`, created_at: CREATED_AT, updated_at: null })))
    }
    failures += 1
    return new Response('Unavailable', { status: 503 })
  }
  t.after(() => {
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_DB_API_URL
    else process.env.NEXT_PUBLIC_DB_API_URL = previousUrl
    if (previousKey === undefined) delete process.env.NEXT_PUBLIC_DB_PUBLISHABLE_KEY
    else process.env.NEXT_PUBLIC_DB_PUBLISHABLE_KEY = previousKey
    globalThis.fetch = previousFetch
  })
  await assert.rejects(getSitemapEntries('celebs'), /REST failed: 503/)
  assert.equal(failures, 2)
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

test('기관·도감 조회도 1,000행을 넘어 끝까지 읽고 실패한 묶음을 조용히 빼지 않는다', async (t) => {
  const previousUrl = process.env.NEXT_PUBLIC_DB_API_URL
  const previousKey = process.env.NEXT_PUBLIC_DB_PUBLISHABLE_KEY
  const previousFetch = globalThis.fetch
  process.env.NEXT_PUBLIC_DB_API_URL = 'https://db.example'
  process.env.NEXT_PUBLIC_DB_PUBLISHABLE_KEY = 'test-key'
  t.after(() => {
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_DB_API_URL
    else process.env.NEXT_PUBLIC_DB_API_URL = previousUrl
    if (previousKey === undefined) delete process.env.NEXT_PUBLIC_DB_PUBLISHABLE_KEY
    else process.env.NEXT_PUBLIC_DB_PUBLISHABLE_KEY = previousKey
    globalThis.fetch = previousFetch
  })
  let failedTable = ''
  globalThis.fetch = async (input) => {
    const url = new URL(String(input))
    const table = url.pathname.split('/').pop()
    if (table === 'celeb_professions') return Response.json([{ value: 'scientist', label: '과학자', label_en: 'Scientist' }])
    if (table === failedTable) return new Response('Bad Gateway', { status: 502 })
    const offset = Number(url.searchParams.get('offset'))
    const ids = Array.from({ length: offset === 0 ? 1000 : 1 }, (_, index) => offset + index)
    if (table === 'curators') return Response.json(ids.map((id) => ({ slug: `curator-${id}`, curated_lists: [] })))
    if (table === 'faction_lv2') return Response.json(ids.map((id) => ({ id: `f-${id}`, slug: `faction-${id}`, is_myth: false, is_featured: true, published: false })))
    return Response.json(ids.map((id) => ({ lv2_id: `f-${id}` })))
  }
  const entries = await getSitemapEntries('core')
  assert.ok(entries)
  for (const prefix of ['', '/en']) {
    assert.ok(entries.some(({ url }) => url === `https://feelandnote.com${prefix}/explore/works/curated/curator-1000`))
    assert.ok(entries.some(({ url }) => url === `https://feelandnote.com${prefix}/explore/faction/faction-1000`))
  }
  for (const table of ['curators', 'faction_lv2', 'faction_member_rows']) {
    failedTable = table
    await assert.rejects(getSitemapEntries('core'), /REST failed: 502/)
  }
})
