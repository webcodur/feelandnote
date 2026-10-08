import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'

const compiled = ts.transpileModule(readFileSync(new URL('./route.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

test('content lookup and rendering failures are uncached, while missing sources and recovered images are cacheable', async () => {
  let failure: 'db' | 'image' | null = 'db'
  let rows: { locale: string; thumbnail_url: string }[] = [{ locale: 'en', thumbnail_url: 'cover-en' }]
  let source: string | null | undefined
  const builder = {
    select: () => builder,
    eq: () => builder,
    maybeSingle: async () => ({ data: { content_locales: rows }, error: failure === 'db' ? new Error('DB unavailable') : null }),
  }
  const mocks: Record<string, unknown> = {
    '@feelandnote/shared/constants/cache-tags': { CACHE_TAGS: { CONTENTS: 'contents' } },
    '@/lib/cache': { cachedDetail: async (_tag: string, _id: string, _keys: string[], fetcher: () => Promise<unknown>) => fetcher() },
    '@/lib/db/static': { createStaticClient: () => ({ from: () => builder }) },
    '@/lib/seoImage': {
      createSquareSeoImage: async (url: string | null, variant: string) => {
        assert.equal(variant, 'content')
        source = url
        if (failure === 'image') throw new Error('download failed')
        return Buffer.from('image')
      },
      createSeoImageResponse: () => new Response('image', { headers: { 'Cache-Control': 'public, max-age=86400' } }),
      createSeoImageFailureResponse: (variant: string) => {
        assert.equal(variant, 'content')
        return new Response('fallback', { status: 503, headers: { 'Cache-Control': 'no-store' } })
      },
    },
  }
  const loaded = { exports: {} as { dynamic: string; GET: (request: unknown, context: object) => Promise<Response> } }
  new Function('require', 'module', 'exports', compiled)((id: string) => {
    assert.ok(id in mocks, `Unexpected import: ${id}`)
    return mocks[id]
  }, loaded, loaded.exports)
  assert.equal(loaded.exports.dynamic, 'force-dynamic')
  const request = { nextUrl: new URL('https://feelandnote.com/seo-image/content/book?locale=ko') }
  const context = { params: Promise.resolve({ contentId: 'book' }) }
  for (const cause of ['db', 'image'] as const) {
    failure = cause
    const response = await loaded.exports.GET(request, context)
    assert.equal(response.status, 503)
    assert.equal(response.headers.get('cache-control'), 'no-store')
  }
  failure = null
  const recovered = await loaded.exports.GET(request, context)
  assert.equal(recovered.status, 200)
  assert.equal(source, 'cover-en', 'alternate locale remains available')
  assert.match(recovered.headers.get('cache-control')!, /public/)
  rows = []
  const missing = await loaded.exports.GET(request, context)
  assert.equal(missing.status, 200)
  assert.equal(source, null)
  assert.match(missing.headers.get('cache-control')!, /public/)
})
