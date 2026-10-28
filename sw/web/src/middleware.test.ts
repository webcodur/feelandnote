import assert from 'node:assert/strict'
import test from 'node:test'
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server'
import { NextRequest } from 'next/server'

import { config, middleware } from './middleware'

// Existing route cases use a Korean browser; fallback cases below provide their own headers.
function koreanBrowserRequest(url: string, init?: ConstructorParameters<typeof NextRequest>[1]) {
  const headers = new Headers(init?.headers)
  if (!headers.has('accept-language')) headers.set('accept-language', 'ko-KR,ko;q=0.9')
  return new NextRequest(url, { ...init, headers })
}

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
    const response = await middleware(koreanBrowserRequest(`https://feelandnote.com${prefix}/celeb/${id}?focus=book&tag=a&tag=b`))
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('location'), null)
    assert.equal(response.headers.get('x-middleware-rewrite'), `https://feelandnote.com${prefix || '/ko'}/celeb/id/${id}?focus=book&tag=a&tag=b`)
  })
}

test('canonical figure and records routes keep their existing locale routing', async () => {
  for (const path of ['/celeb/bill-gates', '/celeb/11111111-2222-4333-8444-555555555555/records/2']) {
    const response = await middleware(koreanBrowserRequest(`https://feelandnote.com${path}`))
    assert.equal(response.headers.get('x-middleware-rewrite'), `https://feelandnote.com/ko${path}`)
  }
})

test('Daum and search preview crawlers keep the requested Korean and English URL abroad', async () => {
  for (const userAgent of ['Mozilla/5.0 (compatible; Daum/4.1; +https://cs.daum.net/)', 'ChatGPT-User/1.0', 'kakaotalk-scrap/1.0']) {
    for (const prefix of ['', '/en']) {
      const response = await middleware(koreanBrowserRequest(`https://feelandnote.com${prefix}/celeb/bill-gates`, {
        headers: { 'CF-IPCountry': 'US', 'user-agent': userAgent, cookie: 'fn_locale_preference=en' },
      }))
      assert.equal(response.status, 200)
      assert.equal(response.headers.get('location'), null)
      assert.equal(response.headers.get('x-middleware-rewrite'), prefix ? null : 'https://feelandnote.com/ko/celeb/bill-gates')
    }
  }
})

test('retired myth figure slugs keep Korean and English search links alive with their query', async () => {
  for (const [oldSlug, canonicalSlug] of [
    ['electra', 'electra-of-mycenae'],
    ['sarpedon', 'sarpedon-of-lycia'],
  ]) {
    for (const prefix of ['', '/en']) {
      const response = await middleware(koreanBrowserRequest(
        `https://feelandnote.com${prefix}/celeb/${oldSlug}?focus=book&tag=a&tag=b`,
      ))
      assert.equal(response.status, 308)
      assert.equal(response.headers.get('location'),
        `https://feelandnote.com${prefix}/celeb/${canonicalSlug}?focus=book&tag=a&tag=b`)
    }
  }
})

test('old myth shortcuts move permanently to each myth address and keep other query', async () => {
  const cases: Array<[string, string]> = [
    ['/explore/myth?myth=homer-odyssey', 'https://feelandnote.com/explore/myth/homer-odyssey'],
    ['/en/explore/myth?myth=myth-japan&group=gods', 'https://feelandnote.com/en/explore/myth/myth-japan?group=gods'],
  ]
  for (const [path, location] of cases) {
    const response = await middleware(koreanBrowserRequest(`https://feelandnote.com${path}`))
    assert.equal(response.status, 308)
    assert.equal(response.headers.get('location'), location)
  }
  const hub = await middleware(koreanBrowserRequest('https://feelandnote.com/explore/myth'))
  assert.notEqual(hub.status, 308)
})

test('retired cinema factions redirect old slugs, IDs and share links to the matching group', async () => {
  for (const [slug, id, group] of [
    ['hollywood-blacklist', '15b98aa8-6372-48bd-a6ce-a365c2147a07', '할리우드 블랙리스트'],
    ['dogme-95', '799450d5-6671-43af-9c22-2f886e1de8fd', '도그마 95'],
    ['french-new-wave', 'd843e24d-77a9-4b1c-8f25-6bc84ef28fc2', '누벨바그'],
  ]) {
    for (const prefix of ['', '/ko', '/en']) {
      for (const oldPath of [
        `/explore/faction/${slug}`, `/explore/faction/${id}`,
        `/explore/faction?tag=${id}`, `/explore/faction?faction=${id}`,
      ]) {
        const response = await middleware(koreanBrowserRequest(
          `https://feelandnote.com${prefix}${oldPath}${oldPath.includes('?') ? '&' : '?'}group=old-group&person=person-a&utm_source=share`,
        ))
        assert.equal(response.status, 308)
        const destination = new URL(response.headers.get('location')!)
        assert.equal(destination.pathname, `${prefix === '/en' ? '/en' : ''}/explore/faction/cinema`)
        assert.equal(destination.searchParams.get('group'), group)
        assert.equal(destination.searchParams.get('person'), 'person-a')
        assert.equal(destination.searchParams.get('utm_source'), 'share')
        assert.equal(destination.searchParams.has('tag'), false)
        assert.equal(destination.searchParams.has('faction'), false)
        if (prefix) assert.equal(response.cookies.get('fn_locale_preference')?.value, prefix.slice(1))
      }
    }
  }
})

test('retired faction redirects do not reopen other private factions or redirect canonical cinema', async () => {
  for (const path of ['/explore/faction/illuminati', '/explore/faction/freemasons', '/explore/faction/cinema']) {
    const response = await middleware(koreanBrowserRequest(`https://feelandnote.com${path}`))
    assert.equal(response.headers.get('location'), null)
  }
})

test('discarded roster links return to the faction hub without stale positions', async () => {
  for (const oldPath of ['/explore/faction/economists', '/explore/faction/b3ef4a3e-c17f-4e79-bc2e-e2c98a3a91c4', '/explore/faction?tag=software-legends']) {
    const response = await middleware(koreanBrowserRequest(`https://feelandnote.com/en${oldPath}${oldPath.includes('?') ? '&' : '?'}person=old&group=old&utm_source=saved`))
    assert.equal(response.status, 308)
    const location = new URL(response.headers.get('location')!)
    assert.equal(location.pathname, '/en/explore/faction')
    assert.equal(location.searchParams.get('utm_source'), 'saved')
    for (const key of ['person', 'group', 'tag', 'faction']) assert.equal(location.searchParams.has(key), false)
  }
  const canonical = await middleware(koreanBrowserRequest('https://feelandnote.com/en/explore/faction'))
  assert.equal(canonical.headers.get('location'), null)
})

test('Cold War frontline legacy addresses restore the merged chapter', async () => {
  const response = await middleware(koreanBrowserRequest('https://feelandnote.com/explore/faction/cold-war-frontlines?person=arkhipov'))
  const destination = new URL(response.headers.get('location')!)
  assert.equal(response.status, 308)
  assert.equal(destination.pathname, '/explore/faction/cold-war')
  assert.equal(destination.searchParams.get('group'), '냉전의 현장')
  assert.equal(destination.searchParams.get('person'), 'arkhipov')
})

test('foreign first entry redirects home and deep links to English without losing query', async () => {
  for (const path of ['/?utm_source=test', '/celeb/bill-gates?focus=book', '/login', '/celeb/11111111-2222-4333-8444-555555555555']) {
    const response = await middleware(koreanBrowserRequest(`https://feelandnote.com${path}`, { headers: { 'CF-IPCountry': 'SG' } }))
    assert.equal(response.status, 307)
    assert.equal(response.headers.get('location'), `https://feelandnote.com/en${path.replace(/^\/(?=\?|$)/, '')}`)
    assert.equal(response.headers.get('cache-control'), 'private, no-store')
  }
})

test('legacy automatic Korean cookie does not strand foreign visitors in Korean', async () => {
  const response = await middleware(koreanBrowserRequest('https://feelandnote.com/', {
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
    const response = await middleware(koreanBrowserRequest(`https://feelandnote.com${path}`, { headers }))
    assert.notEqual(response.headers.get('location'), 'https://feelandnote.com/en')
  }
})

test('manual English choice survives a return to the Korean home address', async () => {
  const response = await middleware(koreanBrowserRequest('https://feelandnote.com/', {
    headers: { 'CF-IPCountry': 'KR', cookie: 'fn_locale_preference=en' },
  }))
  assert.equal(response.headers.get('location'), 'https://feelandnote.com/en')
})

test('an English session stays English through authentication redirects in Korea', async () => {
  const response = await middleware(koreanBrowserRequest('https://feelandnote.com/login', {
    headers: { 'CF-IPCountry': 'KR', cookie: 'NEXT_LOCALE=en' },
  }))
  assert.equal(response.headers.get('location'), 'https://feelandnote.com/en/login')
})

test('explicit Korean address records the choice before removing the default prefix', async () => {
  const response = await middleware(koreanBrowserRequest('https://feelandnote.com/ko/login', {
    headers: { 'CF-IPCountry': 'SG', cookie: 'NEXT_LOCALE=en' },
  }))
  assert.equal(response.headers.get('location'), 'https://feelandnote.com/login')
  assert.equal(response.cookies.get('fn_locale_preference')?.value, 'ko')
})


test('unknown countries use the highest-priority browser language, defaulting to English', async () => {
  for (const country of [null, 'XX', 'T1', '', 'invalid']) {
    for (const [language, expected] of [
      ['ko-KR,ko;q=0.9,en;q=0.8', 'ko'],
      ['en-US,en;q=0.9,ko;q=0.8', 'en'],
      ['ja-JP,ko;q=0.8,en;q=0.7', 'en'],
      ['en;q=0.4,ko-KR;q=0.9', 'ko'],
      ['en;q=0.9,ko;q=0.4', 'en'],
      ['en;q=0.8,ko;q=0.8', 'en'],
      ['ko;q=0,en;q=0.8', 'en'],
      ['ko;q=invalid,en;q=0.8', 'en'],
      ['ko;q=2,en;q=0.8', 'en'],
      ['ko;q=0', 'en'],
      ['*', 'en'],
      ['', 'en'],
      [null, 'en'],
    ]) {
      const headers = new Headers()
      if (country !== null) headers.set('CF-IPCountry', country)
      if (language !== null) headers.set('accept-language', language)
      const response = await middleware(new NextRequest('https://feelandnote.com/celeb/bill-gates?focus=book', { headers }))
      assert.equal(response.status, expected === 'en' ? 307 : 200, JSON.stringify({ country, language }))
      assert.equal(response.headers.get('location'), expected === 'en' ? 'https://feelandnote.com/en/celeb/bill-gates?focus=book' : null)
      if (expected === 'en') {
        assert.equal(response.headers.get('cache-control'), 'private, no-store')
        assert.match(response.headers.get('vary') ?? '', /Accept-Language/)
      }
    }
  }
})

test('browser fallback does not override countries, choices, explicit URLs or crawlers', async () => {
  for (const [path, headers, location] of [
    ['/', { 'CF-IPCountry': 'KR', 'accept-language': 'en-US' }, null],
    ['/', { 'CF-IPCountry': 'US', 'accept-language': 'ko-KR' }, 'https://feelandnote.com/en'],
    ['/', { 'accept-language': 'en-US', cookie: 'fn_locale_preference=ko' }, null],
    ['/', { 'accept-language': 'ko-KR', cookie: 'fn_locale_preference=en' }, 'https://feelandnote.com/en'],
    ['/', { 'accept-language': 'en-US', cookie: 'NEXT_LOCALE=ko' }, 'https://feelandnote.com/en'],
    ['/', { 'accept-language': 'ko-KR', cookie: 'NEXT_LOCALE=en' }, 'https://feelandnote.com/en'],
    ['/en', { 'accept-language': 'ko-KR' }, null],
    ['/ko', { 'accept-language': 'en-US' }, 'https://feelandnote.com/'],
    ['/', { 'accept-language': 'en-US', 'user-agent': 'Googlebot/2.1' }, null],
  ] as Array<[string, Record<string, string>, string | null]>) {
    const response = await middleware(new NextRequest('https://feelandnote.com' + path, { headers }))
    assert.equal(response.headers.get('location'), location)
  }
})
