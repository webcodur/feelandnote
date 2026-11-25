import assert from 'node:assert/strict'
import { AsyncLocalStorage } from 'node:async_hooks'
import { createRequire } from 'node:module'
import test from 'node:test'
import type { MetadataRoute } from 'next'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'

import { INFLUENCE_RANKING_FIELDS, getInfluenceRankingHref } from '@/constants/influenceRanking'
import { celebPriorityQuota } from './sitemapCelebPriority'

// 직군 목록도 실제 Next 캐시를 거친다. 서버 저장소를 마련하고 각 호출은 빈 캐시에서 검증한다.
Object.assign(globalThis, { AsyncLocalStorage })
const require = createRequire(import.meta.url)
const { workAsyncStorage } = require('next/dist/server/app-render/work-async-storage.external')
const { workUnitAsyncStorage } = require('next/dist/server/app-render/work-unit-async-storage.external')
const sitemap = require('./sitemap') as typeof import('./sitemap')
const { serializeSitemap } = sitemap
function getSitemapEntries(name: string) {
  const incrementalCache = { generateSimpleCacheKey: async (key: string) => key, get: async () => null, set: async () => {} }
  return workAsyncStorage.run({ route: '/sitemaps/core', incrementalCache }, () =>
    workUnitAsyncStorage.run({ type: 'prerender-legacy', phase: 'render', tags: null, revalidate: Infinity }, () => sitemap.getSitemapEntries(name))) as ReturnType<typeof sitemap.getSitemapEntries>
}

const CREATED_AT = '2026-08-01T00:00:00.000Z'

test('특수문자 인물 slug도 상세 페이지와 같은 정본 주소와 한영 대체 주소를 싣는다', async (t) => {
  const previousUrl = process.env.NEXT_PUBLIC_DB_API_URL
  const previousKey = process.env.NEXT_PUBLIC_DB_PUBLISHABLE_KEY
  const previousFetch = globalThis.fetch
  process.env.NEXT_PUBLIC_DB_API_URL = 'https://db.example'
  process.env.NEXT_PUBLIC_DB_PUBLISHABLE_KEY = 'test-key'
  globalThis.fetch = async () => Response.json([
    { slug: 'e:u', created_at: CREATED_AT, updated_at: null },
    { slug: '홍길동', created_at: CREATED_AT, updated_at: null },
    { slug: 'person?#&name', created_at: CREATED_AT, updated_at: null },
  ])
  t.after(() => {
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_DB_API_URL
    else process.env.NEXT_PUBLIC_DB_API_URL = previousUrl
    if (previousKey === undefined) delete process.env.NEXT_PUBLIC_DB_PUBLISHABLE_KEY
    else process.env.NEXT_PUBLIC_DB_PUBLISHABLE_KEY = previousKey
    globalThis.fetch = previousFetch
  })

  const entries = await getSitemapEntries('celebs')
  assert.ok(entries)
  assert.equal(entries.length, 6)
  for (const slug of ['e%3Au', '%ED%99%8D%EA%B8%B8%EB%8F%99', 'person%3F%23%26name']) {
    const ko = `https://feelandnote.com/celeb/${slug}`
    const en = `https://feelandnote.com/en/celeb/${slug}`
    for (const url of [ko, en]) {
      const entry: MetadataRoute.Sitemap[number] | undefined = entries.find((item) => item.url === url)
      assert.ok(entry, `missing canonical ${url}`)
      assert.deepEqual(entry.alternates?.languages, { ko, en, 'x-default': ko })
      assert.equal(new URL(url).search, '')
      assert.equal(new URL(url).hash, '')
    }
  }
  assert.ok(!serializeSitemap(entries).includes('/celeb/e:u'))
})

test('공개 데이터의 갱신 태그가 해당 사이트맵의 모든 조회에 연결된다', async (t) => {
  const previousUrl = process.env.NEXT_PUBLIC_DB_API_URL
  const previousKey = process.env.NEXT_PUBLIC_DB_PUBLISHABLE_KEY
  const previousFetch = globalThis.fetch
  process.env.NEXT_PUBLIC_DB_API_URL = 'https://db.example'
  process.env.NEXT_PUBLIC_DB_PUBLISHABLE_KEY = 'test-key'
  const tagsByTable = new Map<string, string[] | undefined>()
  globalThis.fetch = async (input, init) => {
    const table = new URL(String(input)).pathname.split('/').pop()!
    const options = init as RequestInit & { next?: { tags?: string[] } }
    tagsByTable.set(table, options.next?.tags)
    return Response.json([])
  }
  t.after(() => {
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_DB_API_URL
    else process.env.NEXT_PUBLIC_DB_API_URL = previousUrl
    if (previousKey === undefined) delete process.env.NEXT_PUBLIC_DB_PUBLISHABLE_KEY
    else process.env.NEXT_PUBLIC_DB_PUBLISHABLE_KEY = previousKey
    globalThis.fetch = previousFetch
  })

  await getSitemapEntries('celebs')
  await getSitemapEntries('core')
  assert.deepEqual(tagsByTable.get('celebs'), [CACHE_TAGS.CELEBS])
  assert.deepEqual(tagsByTable.get('get_celebs_sorted'), [CACHE_TAGS.CELEBS])
  assert.deepEqual(tagsByTable.get('get_celebs_trending'), [CACHE_TAGS.CELEBS])
  assert.deepEqual(tagsByTable.get('curators'), [CACHE_TAGS.CURATED])
  assert.deepEqual(tagsByTable.get('faction_lv2'), [CACHE_TAGS.FACTIONS])
  assert.deepEqual(tagsByTable.get('faction_member_rows'), [CACHE_TAGS.FACTIONS])
})

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
    return Response.json([
      { slug: 'example', curated_lists: [
        ...Array.from({ length: 25 }, (_, index) => ({ slug: index === 0 ? 'list' : `book-${index}`, content_type: 'BOOK', is_featured: true })),
        ...Array.from({ length: 13 }, (_, index) => ({ slug: `video-${index}`, content_type: 'VIDEO', is_featured: true })),
        { slug: 'hidden-music', content_type: 'MUSIC', is_featured: false },
      ] },
      ...Array.from({ length: 24 }, (_, index) => ({ slug: `book-curator-${index}`, curated_lists: [
        { slug: `book-list-${index}`, content_type: 'BOOK', is_featured: true },
      ] })),
      ...Array.from({ length: 12 }, (_, index) => ({ slug: `video-curator-${index}`, curated_lists: [
        { slug: `video-list-${index}`, content_type: 'VIDEO', is_featured: true },
      ] })),
    ])
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
  // 25개의 도서 기관·13개의 영상 기관이다. 한 기관의 여러 목록이 페이지 수를 늘리지 않는다.
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
  for (const prefix of ['', '/en']) {
    for (const mode of ['faction', 'myth']) {
      const path = `/explore?mode=${mode}`
      const modeEntry: MetadataRoute.Sitemap[number] | undefined = entries.find(({ url }) => url === `https://feelandnote.com${prefix}${path}`)
      assert.ok(modeEntry, `missing ${prefix}${path}`)
      assert.equal(modeEntry.alternates?.languages?.ko, `https://feelandnote.com${path}`)
      assert.equal(modeEntry.alternates?.languages?.en, `https://feelandnote.com/en${path}`)
      assert.ok(!urls.includes(`https://feelandnote.com${prefix}/explore/${mode}`))
    }
  }
  for (const path of ['/support', '/shop']) {
    const entry: MetadataRoute.Sitemap[number] | undefined = entries.find(({ url }) => url === `https://feelandnote.com${path}`)
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
    const url = new URL(String(input))
    if (url.pathname !== '/rest/v1/celebs') return Response.json([])
    if (url.searchParams.get('offset') === '0') {
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
  await assert.rejects(getSitemapEntries('naver'), /REST failed: 503/)
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

    if (url.pathname !== '/rest/v1/celebs') return Response.json([])

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

  const entries = await getSitemapEntries('naver')
  assert.ok(entries)

  const urls = entries.map((entry) => entry.url).filter((url) => url.includes('/celeb/'))
  assert.equal(urls.length, 1001)
  assert.equal(new Set(urls).size, 1001)
  assert.ok(urls.includes('https://feelandnote.com/celeb/celeb-1001'))
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

test('Google 인덱스는 우선 명단만 싣고 네이버용 파일은 전체 명단의 한국어 주소만 싣는다', async (t) => {
  const previousUrl = process.env.NEXT_PUBLIC_DB_API_URL
  const previousKey = process.env.NEXT_PUBLIC_DB_PUBLISHABLE_KEY
  const previousFetch = globalThis.fetch
  process.env.NEXT_PUBLIC_DB_API_URL = 'https://db.example'
  process.env.NEXT_PUBLIC_DB_PUBLISHABLE_KEY = 'test-key'
  const celebs = Array.from({ length: 1500 }, (_, index) => ({ slug: `c-${String(index).padStart(4, '0')}`, created_at: CREATED_AT, updated_at: null }))
  const page = <T>(rows: T[], url: URL) => {
    const offset = Number(url.searchParams.get('offset'))
    return Response.json(rows.slice(offset, offset + Number(url.searchParams.get('limit'))))
  }
  globalThis.fetch = async (input) => {
    const url = new URL(String(input))
    if (url.pathname.endsWith('/rpc/get_celebs_sorted')) return page(celebs.map(({ slug }, index) => ({ slug, content_count: index < 600 ? 20 : 0 })), url)
    if (url.pathname.endsWith('/rpc/get_celebs_trending')) return page([{ slug: 'c-1499', recent_views: 900 }], url)
    if (url.pathname.endsWith('/celeb_professions')) return Response.json([{ value: 'scientist', label: '과학자', label_en: 'Scientist' }])
    if (url.pathname.endsWith('/curators')) return Response.json([{ slug: 'example', curated_lists: [{ slug: 'list', content_type: 'BOOK', is_featured: true }] }])
    if (!url.pathname.endsWith('/celebs')) return Response.json([])
    return page(celebs, url)
  }
  t.after(() => {
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_DB_API_URL
    else process.env.NEXT_PUBLIC_DB_API_URL = previousUrl
    if (previousKey === undefined) delete process.env.NEXT_PUBLIC_DB_PUBLISHABLE_KEY
    else process.env.NEXT_PUBLIC_DB_PUBLISHABLE_KEY = previousKey
    globalThis.fetch = previousFetch
  })

  const index = sitemap.serializeSitemapIndex()
  assert.ok(index.includes('/sitemaps/celebs.xml'))
  assert.ok(!index.includes('naver'), '전체 명단은 robots.txt 경로로 Google에 내밀지 않는다')

  const naver = await getSitemapEntries('naver')
  const core = await getSitemapEntries('core')
  assert.ok(naver && core)
  const isEnglish = (url: string) => /^\/en(\/|$)/.test(new URL(url).pathname)
  const naverUrls = naver.map(({ url }) => url)
  assert.deepEqual(naverUrls, [
    ...core.map(({ url }) => url).filter((url) => !isEnglish(url)),
    ...celebs.map(({ slug }) => `https://feelandnote.com/celeb/${slug}`),
  ])
  assert.ok(naverUrls.includes('https://feelandnote.com'), '한국어 홈')
  assert.ok(naverUrls.includes('https://feelandnote.com/explore/directory/scientist'))
  assert.ok(naverUrls.includes('https://feelandnote.com/explore/works/curated/example/list'))
  assert.ok(naverUrls.includes('https://feelandnote.com/support'), '한국어에만 있는 화면')
  const naverXml = serializeSitemap(naver)
  assert.ok(!naverXml.includes('feelandnote.com/en'), '본 주소와 hreflang 어디에도 영문이 없다')
  assert.ok(!naverXml.includes('hreflang'))
  const priority = await getSitemapEntries('celebs')
  const quota = celebPriorityQuota(new Date())
  assert.equal(priority?.length, quota * 2, '한·영 주소 한 쌍씩 오늘 크기만큼')
  const urls = new Set(priority?.map(({ url }) => url))
  assert.ok(urls.has('https://feelandnote.com/celeb/c-1499'), '기록이 없어도 방문이 몰린 인물은 들어간다')
  assert.ok(urls.has('https://feelandnote.com/celeb/c-0000'))
  assert.ok(!urls.has('https://feelandnote.com/celeb/c-1000'), '기록도 방문도 없는 인물은 빠진다')
})
