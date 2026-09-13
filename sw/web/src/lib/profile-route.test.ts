import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import ts from 'typescript'
import { failure, type ActionResult } from './errors'

const require = createRequire(import.meta.url)

function load<T>(file: URL, mocks: Record<string, unknown> = {}): T {
  const compiled = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const loaded = { exports: {} }
  new Function('require', 'module', 'exports', compiled)(
    (id: string) => mocks[id] ?? require(id), loaded, loaded.exports,
  )
  return loaded.exports as T
}

interface UrlModule {
  getCelebProfileUrl: (target: { id: string; slug?: string | null }) => string
  isProfileId: (value: string) => boolean
}

interface ProfileRoutes {
  getCelebRouteProfile: (slugOrId: string, locale: string, suffix?: string) => Promise<unknown>
  getMemberRouteProfile: (userId: string, locale: string) => Promise<unknown>
}

interface RouteLookups {
  getCelebSlugById: (id: string) => Promise<string | null>
  getCelebBySlug: (slug: string, locale: string) => Promise<ActionResult<unknown>>
  getUserProfile: (id: string) => Promise<ActionResult<unknown>>
}

class NotFoundSignal extends Error {}
class RedirectSignal extends Error {
  constructor(readonly destination: { href: string; locale: string }) {
    super('redirect')
  }
}

const urls = load<UrlModule>(new URL('./url.ts', import.meta.url))
const celebId = '11111111-2222-4333-8444-555555555555'
const memberId = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
const missing = failure('NOT_FOUND', 'Missing profile')

function setup(overrides: Partial<RouteLookups> = {}) {
  const calls: { name: keyof RouteLookups; args: string[] }[] = []
  const lookups: RouteLookups = {
    getCelebSlugById: async () => null,
    getCelebBySlug: async () => missing,
    getUserProfile: async () => missing,
    ...overrides,
  }
  const routes = load<ProfileRoutes>(new URL('./profile-route.ts', import.meta.url), {
    'server-only': {},
    react: { cache: (fn: unknown) => fn },
    'next/navigation': { notFound: () => { throw new NotFoundSignal() } },
    '@/i18n/navigation': { redirect: (destination: { href: string; locale: string }) => { throw new RedirectSignal(destination) } },
    '@/lib/url': urls,
    '@/actions/celebs/getCelebSlugById': {
      getCelebSlugById: async (id: string) => {
        calls.push({ name: 'getCelebSlugById', args: [id] })
        return lookups.getCelebSlugById(id)
      },
    },
    '@/actions/user/getCelebBySlug': {
      getCelebBySlug: async (slug: string, locale: string) => {
        calls.push({ name: 'getCelebBySlug', args: [slug, locale] })
        return lookups.getCelebBySlug(slug, locale)
      },
    },
    '@/actions/user/getUserProfile': {
      getUserProfile: async (id: string) => {
        calls.push({ name: 'getUserProfile', args: [id] })
        return lookups.getUserProfile(id)
      },
    },
  })
  return { ...routes, calls }
}

function redirectedTo(href: string, locale: string) {
  return (error: unknown) => {
    assert.ok(error instanceof RedirectSignal)
    assert.deepEqual(error.destination, { href, locale })
    return true
  }
}

test('figure links always use the figure route, including old records without a slug', () => {
  assert.equal(urls.getCelebProfileUrl({ id: celebId, slug: 'bill-gates' }), '/celeb/bill-gates')
  assert.equal(urls.getCelebProfileUrl({ id: celebId }), `/celeb/${celebId}`)
  assert.equal(urls.getCelebProfileUrl({ id: celebId, slug: null }), `/celeb/${celebId}`)
  assert.equal(urls.getCelebProfileUrl({ id: celebId, slug: '' }), `/celeb/${celebId}`)
  assert.equal(urls.getCelebProfileUrl({ id: celebId, slug: 'uğur-şahin' }), '/celeb/u%C4%9Fur-%C5%9Fahin')
})

for (const locale of ['ko', 'en']) {
  test(`figure slug returns its profile without consulting members (${locale})`, async () => {
    const profile = { id: celebId, slug: 'bill-gates', nickname: 'Bill Gates' }
    const routes = setup({ getCelebBySlug: async () => ({ success: true, data: profile }) })
    assert.equal(await routes.getCelebRouteProfile('bill-gates', locale), profile)
    assert.deepEqual(routes.calls, [{ name: 'getCelebBySlug', args: ['bill-gates', locale] }])
  })

  test(`figure ID redirects to its canonical slug before rendering (${locale})`, async () => {
    const routes = setup({ getCelebSlugById: async () => 'bill-gates' })
    await assert.rejects(routes.getCelebRouteProfile(celebId, locale), redirectedTo('/celeb/bill-gates', locale))
    assert.deepEqual(routes.calls, [{ name: 'getCelebSlugById', args: [celebId] }])
  })

  test(`figure ID redirect preserves records suffix and query (${locale})`, async () => {
    const routes = setup({ getCelebSlugById: async () => 'bill-gates' })
    const suffix = '/records?type=BOOK&sort=recent&search=hello%20world'
    await assert.rejects(routes.getCelebRouteProfile(celebId, locale, suffix), redirectedTo(`/celeb/bill-gates${suffix}`, locale))
  })

  test(`legacy member address redirects a known figure (${locale})`, async () => {
    const routes = setup({ getCelebSlugById: async () => 'bill-gates' })
    await assert.rejects(routes.getMemberRouteProfile(celebId, locale), redirectedTo('/celeb/bill-gates', locale))
    assert.deepEqual(routes.calls, [
      { name: 'getUserProfile', args: [celebId] },
      { name: 'getCelebSlugById', args: [celebId] },
    ])
  })
}

test('unknown figure ID returns 404 without querying a slug or member', async () => {
  const routes = setup()
  await assert.rejects(routes.getCelebRouteProfile(celebId, 'ko'), NotFoundSignal)
  assert.deepEqual(routes.calls, [{ name: 'getCelebSlugById', args: [celebId] }])
})

test('unknown figure slug returns 404', async () => {
  const routes = setup()
  await assert.rejects(routes.getCelebRouteProfile('missing-figure', 'en'), NotFoundSignal)
})

test('figure ID lookup rejection remains an error instead of a missing profile', async () => {
  const failure = new Error('Figure ID database unavailable')
  const routes = setup({ getCelebSlugById: async () => { throw failure } })
  await assert.rejects(routes.getCelebRouteProfile(celebId, 'ko'), (error) => error === failure)
})

test('figure profile action failure remains an error instead of 404', async () => {
  const routes = setup({
    getCelebBySlug: async () => failure('INTERNAL_ERROR', 'Figure database unavailable'),
  })
  await assert.rejects(routes.getCelebRouteProfile('bill-gates', 'ko'), (error) => {
    assert.ok(error instanceof Error && !(error instanceof NotFoundSignal))
    assert.equal(error.message, 'Figure database unavailable')
    return true
  })
})

test('figure profile rejected lookup is propagated', async () => {
  const failure = new Error('Figure query rejected')
  const routes = setup({ getCelebBySlug: async () => { throw failure } })
  await assert.rejects(routes.getCelebRouteProfile('bill-gates', 'ko'), (error) => error === failure)
})

test('member profile is returned without figure lookups', async () => {
  const profile = { id: memberId, nickname: 'Member' }
  const routes = setup({ getUserProfile: async () => ({ success: true, data: profile }) })
  assert.equal(await routes.getMemberRouteProfile(memberId, 'ko'), profile)
  assert.deepEqual(routes.calls, [{ name: 'getUserProfile', args: [memberId] }])
})

test('address that belongs to neither a member nor a figure returns 404', async () => {
  const routes = setup()
  await assert.rejects(routes.getMemberRouteProfile(memberId, 'en'), NotFoundSignal)
  assert.deepEqual(routes.calls.map((call) => call.name), ['getUserProfile', 'getCelebSlugById'])
})

test('member action failure is not replaced with a figure fallback or 404', async () => {
  const routes = setup({
    getUserProfile: async () => failure('INTERNAL_ERROR', 'Member database unavailable'),
    getCelebSlugById: async () => 'bill-gates',
  })
  await assert.rejects(routes.getMemberRouteProfile(memberId, 'ko'), (error) => {
    assert.ok(error instanceof Error && !(error instanceof NotFoundSignal))
    assert.equal(error.message, 'Member database unavailable')
    return true
  })
  assert.deepEqual(routes.calls, [{ name: 'getUserProfile', args: [memberId] }])
})

test('member rejected lookup is propagated without figure fallback', async () => {
  const failure = new Error('Member query rejected')
  const routes = setup({ getUserProfile: async () => { throw failure } })
  await assert.rejects(routes.getMemberRouteProfile(memberId, 'ko'), (error) => error === failure)
  assert.deepEqual(routes.calls, [{ name: 'getUserProfile', args: [memberId] }])
})

test('figure fallback lookup failure on a legacy address remains an error', async () => {
  const failure = new Error('Legacy figure lookup unavailable')
  const routes = setup({ getCelebSlugById: async () => { throw failure } })
  await assert.rejects(routes.getMemberRouteProfile(celebId, 'en'), (error) => error === failure)
})
