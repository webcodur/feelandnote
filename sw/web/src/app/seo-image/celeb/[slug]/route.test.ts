import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'

const compiled = ts.transpileModule(readFileSync(new URL('./route.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

async function imageSource(celeb: object | null, members: object[] = [], factions: object[] = []) {
  let source: string | null | undefined
  let variant: string | undefined
  const queries: { table: string; operations: unknown[][] }[] = []
  const rows: Record<string, unknown> = { celebs: celeb, faction_member_rows: members, faction_lv2: factions }
  const db = { from(table: string) {
    const query = { table, operations: [] as unknown[][] }
    queries.push(query)
    const builder: Record<string, unknown> = {}
    for (const method of ['select', 'eq', 'not', 'in', 'order', 'maybeSingle']) {
      builder[method] = (...args: unknown[]) => { query.operations.push([method, ...args]); return builder }
    }
    builder.then = (resolve: (value: object) => void) => resolve({ data: rows[table], error: null })
    return builder
  } }
  const mocks: Record<string, unknown> = {
    '@feelandnote/shared/constants/cache-tags': { CACHE_TAGS: { CELEBS: 'celebs', FACTIONS: 'factions' } },
    '@/lib/cache': { cachedDetail: async (_tag: string, _slug: string, _keys: string[], fetcher: () => Promise<unknown>, options: object) => {
      assert.deepEqual(options, { revalidate: 604800, extraTags: ['factions'] })
      return fetcher()
    } },
    '@/lib/db/static': { createStaticClient: () => db },
    '@/lib/seoImage': { createSquareSeoImage: async (url: string | null, imageVariant: string) => { source = url; variant = imageVariant; return Buffer.from('image') },
      createSeoImageResponse: () => new Response('image') },
  }
  const loaded = { exports: {} as { GET: (request: unknown, context: object) => Promise<Response> } }
  new Function('require', 'module', 'exports', compiled)((id: string) => {
    assert.ok(id in mocks, `Unexpected import: ${id}`)
    return mocks[id]
  }, loaded, loaded.exports)
  await loaded.exports.GET(null, { params: Promise.resolve({ slug: 'example' }) })
  return { source, variant, queries }
}

test('representative photo wins over avatar without querying factions', async () => {
  const { source, variant, queries } = await imageSource({ id: 'person', portrait_url: 'photo', avatar_url: 'avatar' })
  assert.equal(source, 'photo')
  assert.equal(variant, 'person')
  assert.equal(queries.length, 1)
})

test('missing representative photo uses the first visible faction artwork before avatar', async () => {
  const { source, variant, queries } = await imageSource({ id: 'person', portrait_url: null, avatar_url: 'avatar' },
    [{ lv2_id: 'private', image_url: 'private-photo' }, { lv2_id: 'first', image_url: 'first-photo' }, { lv2_id: 'second', image_url: 'second-photo' }],
    [{ id: 'private', slug: null }, { id: 'first', slug: 'first' }, { id: 'second', slug: 'second' }])
  assert.equal(source, 'first-photo')
  assert.equal(variant, 'person')
  assert.ok(queries[1].operations.some(operation => JSON.stringify(operation) === JSON.stringify(['eq', 'hidden', false])))
  assert.ok(queries[1].operations.some(operation => JSON.stringify(operation) === JSON.stringify(['order', 'sort_order', { ascending: true }])))
  assert.ok(queries[2].operations.some(operation => JSON.stringify(operation) === JSON.stringify(['eq', 'is_featured', true])))
})

test('avatar remains the fallback when there is no eligible artwork', async () => {
  const fallback = await imageSource({ id: 'person', portrait_url: null, avatar_url: 'avatar' })
  assert.equal(fallback.source, 'avatar')
  assert.equal(fallback.variant, 'avatar')
  assert.equal((await imageSource({ id: 'person', portrait_url: null, avatar_url: 'avatar' },
    [{ lv2_id: 'private', image_url: 'private-photo' }], [])).source, 'avatar')
})

test('missing or imageless person uses the default image', async () => {
  assert.equal((await imageSource(null)).source, null)
  assert.equal((await imageSource({ id: 'person', portrait_url: null, avatar_url: null })).source, null)
})
